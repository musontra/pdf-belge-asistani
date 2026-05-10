import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel Hobby caps at 10 s; Pro allows up to 60 s.
// Large PDFs may timeout on Hobby — upgrade to Pro for documents > ~10 pages.

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Sunucu yapılandırma hatası: API anahtarı eksik." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Sadece PDF dosyaları kabul edilmektedir." },
        { status: 400 }
      );
    }

    // Vercel Hobby request body limit: 4.5 MB. Pro: 100 MB.
    const MAX_SIZE = parseInt(process.env.MAX_PDF_SIZE_MB ?? "4") * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const limitMb = Math.round(MAX_SIZE / 1024 / 1024);
      return NextResponse.json(
        {
          error: `Dosya boyutu ${limitMb} MB'ı geçemez. Daha büyük dosyalar için Pro plan gereklidir.`,
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Use Claude's native PDF support — no local parsing library needed.
    // This is the only approach that is guaranteed to work in any serverless environment.
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            } as Anthropic.DocumentBlockParam,
            {
              type: "text",
              text: "Bu PDF belgesindeki tüm metni çıkar. Başlıklar, paragraflar ve listeler dahil her şeyi olduğu gibi döndür. Yorum veya açıklama ekleme, yalnızca belgede yazan metni ver.",
            },
          ],
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!text) {
      return NextResponse.json(
        { error: "PDF içeriği okunamadı. Belge boş veya yalnızca görüntü içeriyor olabilir." },
        { status: 422 }
      );
    }

    // Claude doesn't expose page count; estimate from character density (~2500 chars/page)
    const pageCount = Math.max(1, Math.ceil(text.length / 2500));

    return NextResponse.json({ text, pageCount, fileName: file.name });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[parse-pdf]", detail, err);
    return NextResponse.json(
      { error: "PDF işlenirken bir hata oluştu.", detail },
      { status: 500 }
    );
  }
}
