import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Sadece PDF dosyaları kabul edilmektedir." }, { status: 400 });
    }

    // Vercel Hobby: 4.5 MB platform limit; Pro: 100 MB
    const MAX_SIZE = parseInt(process.env.MAX_PDF_SIZE_MB ?? "4") * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const limitMb = Math.round(MAX_SIZE / 1024 / 1024);
      return NextResponse.json(
        { error: `Dosya boyutu ${limitMb} MB'ı geçemez. Daha büyük dosyalar için Pro plan gereklidir.` },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // pdf-parse v2.x uses a class-based API; the old function call and
    // the lib/pdf-parse.js internal path from v1.x no longer exist.
    const parser = new PDFParse({ data: buffer });
    let result;
    try {
      result = await parser.getText();
    } finally {
      await parser.destroy();
    }

    const text = result.text.trim();
    if (!text) {
      return NextResponse.json(
        { error: "PDF içeriği okunamadı. Belge taranmış görüntü içeriyor olabilir." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      text,
      pageCount: result.total,
      fileName: file.name,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[parse-pdf]", detail, err);
    return NextResponse.json(
      { error: "PDF işlenirken bir hata oluştu.", detail },
      { status: 500 }
    );
  }
}
