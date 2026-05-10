import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;

export const runtime = "nodejs";
export const maxDuration = 30; // Hobby: 10s cap, Pro: 30s

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

    const data = await pdfParse(buffer);

    const text = data.text.trim();
    if (!text) {
      return NextResponse.json(
        { error: "PDF içeriği okunamadı. Belge taranmış görüntü içeriyor olabilir." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      text,
      pageCount: data.numpages,
      fileName: file.name,
    });
  } catch {
    return NextResponse.json(
      { error: "PDF işlenirken bir hata oluştu. Dosyayı kontrol edip tekrar deneyin." },
      { status: 500 }
    );
  }
}
