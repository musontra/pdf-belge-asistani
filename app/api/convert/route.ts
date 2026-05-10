import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from "docx";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── PDF Birleştir ─────────────────────────────────────────────────────────────

async function mergePDFs(files: File[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(pdf, pdf.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  return merged.save();
}

// ── PDF Böl ───────────────────────────────────────────────────────────────────

async function splitPDF(file: File, from: number, to: number): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  const total = pdf.getPageCount();
  const start = Math.max(1, from) - 1;
  const end = Math.min(total, to) - 1;
  const indices = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const newPdf = await PDFDocument.create();
  const pages = await newPdf.copyPages(pdf, indices);
  pages.forEach((p) => newPdf.addPage(p));
  return newPdf.save();
}

// ── PDF Sıkıştır ──────────────────────────────────────────────────────────────

async function compressPDF(file: File): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  return pdf.save({ useObjectStreams: true, addDefaultPage: false });
}

// ── Görsel → PDF ──────────────────────────────────────────────────────────────

async function imageToPDF(file: File): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.create();
  const isJpeg = file.type === "image/jpeg" || file.type === "image/jpg";
  const img = isJpeg ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
  const page = pdf.addPage([img.width, img.height]);
  page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  return pdf.save();
}

// ── Claude yardımcı ───────────────────────────────────────────────────────────

async function extractWithClaude(file: File, prompt: string): Promise<string> {
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          } as Anthropic.DocumentBlockParam,
          { type: "text", text: prompt },
        ],
      },
    ],
  });
  return response.content[0].type === "text" ? response.content[0].text : "";
}

// ── PDF → Word ────────────────────────────────────────────────────────────────

async function pdfToWord(file: File): Promise<Buffer> {
  const text = await extractWithClaude(
    file,
    "Bu PDF'in tüm metnini çıkar. Başlıkları '## Başlık' formatında göster, paragrafları boş satırla ayır. Yalnızca belgedeki metni ver, yorum ekleme."
  );

  const children: Paragraph[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      children.push(new Paragraph({ text: "" }));
    } else if (trimmed.startsWith("## ")) {
      children.push(new Paragraph({ text: trimmed.slice(3), heading: HeadingLevel.HEADING_2 }));
    } else if (trimmed.startsWith("# ")) {
      children.push(new Paragraph({ text: trimmed.slice(2), heading: HeadingLevel.HEADING_1 }));
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      children.push(new Paragraph({ text: trimmed.slice(2), bullet: { level: 0 } }));
    } else {
      children.push(new Paragraph({ children: [new TextRun(trimmed)] }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

// ── PDF Çevir ─────────────────────────────────────────────────────────────────

const LANG_CODES: Record<string, string> = {
  İngilizce: "EN", Almanca: "DE", Fransızca: "FR", İspanyolca: "ES",
  Arapça: "AR", Rusça: "RU", Japonca: "JA", Çince: "ZH",
};

async function translatePDF(file: File, targetLanguage: string): Promise<Buffer> {
  const text = await extractWithClaude(
    file,
    `Bu PDF belgesinin tüm içeriğini ${targetLanguage} diline çevir. Belgenin yapısını ve bölüm başlıklarını koru; başlıkları "## Başlık" formatında yaz. Yalnızca çeviriyi ver, yorum veya açıklama ekleme.`
  );

  const children: Paragraph[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      children.push(new Paragraph({ text: "" }));
    } else if (trimmed.startsWith("## ")) {
      children.push(new Paragraph({ text: trimmed.slice(3), heading: HeadingLevel.HEADING_2 }));
    } else if (trimmed.startsWith("# ")) {
      children.push(new Paragraph({ text: trimmed.slice(2), heading: HeadingLevel.HEADING_1 }));
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      children.push(new Paragraph({ text: trimmed.slice(2), bullet: { level: 0 } }));
    } else {
      children.push(new Paragraph({ children: [new TextRun(trimmed)] }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

// ── PDF → Excel ───────────────────────────────────────────────────────────────

async function pdfToExcel(file: File): Promise<Buffer> {
  const text = await extractWithClaude(
    file,
    "Bu PDF'deki tabloları ve yapısal verileri CSV formatında çıkar. Her satırı yeni satıra yaz, sütunları virgülle ayır. Eğer tablo yoksa belgedeki tüm metni iki sütunlu (Bölüm, İçerik) olarak düzenle."
  );

  const rows = text
    .split("\n")
    .filter(Boolean)
    .map((row) =>
      row
        .split(",")
        .map((cell) => cell.trim().replace(/^"|"$/g, ""))
    );

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Veri");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as ArrayBuffer);
}

// ── JPG/PNG → PDF ─────────────────────────────────────────────────────────────

async function jpgsToPDF(files: File[]): Promise<Uint8Array> {
  const { default: sharp } = await import("sharp");
  const pdf = await PDFDocument.create();

  for (const file of files) {
    const inputBuf = Buffer.from(await file.arrayBuffer());
    const jpegBuf = await sharp(inputBuf).jpeg({ quality: 90 }).toBuffer();
    const meta = await sharp(jpegBuf).metadata();
    const img = await pdf.embedJpg(jpegBuf);
    const w = meta.width ?? img.width;
    const h = meta.height ?? img.height;
    const page = pdf.addPage([w, h]);
    page.drawImage(img, { x: 0, y: 0, width: w, height: h });
  }

  return pdf.save();
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const tool = formData.get("tool") as string;
    const files = formData.getAll("files") as File[];

    if (!tool || files.length === 0) {
      return NextResponse.json({ error: "Araç veya dosya eksik." }, { status: 400 });
    }

    let resultBuffer: Uint8Array | Buffer;
    let mimeType: string;
    let filename: string;

    switch (tool) {
      case "merge": {
        resultBuffer = await mergePDFs(files);
        mimeType = "application/pdf";
        filename = "birlestirilmis.pdf";
        break;
      }
      case "split": {
        const from = parseInt(formData.get("from") as string) || 1;
        const to = parseInt(formData.get("to") as string) || 1;
        resultBuffer = await splitPDF(files[0], from, to);
        mimeType = "application/pdf";
        filename = `bolum_${from}-${to}.pdf`;
        break;
      }
      case "compress": {
        resultBuffer = await compressPDF(files[0]);
        mimeType = "application/pdf";
        filename = "sikistirilmis.pdf";
        break;
      }
      case "image-to-pdf": {
        resultBuffer = await imageToPDF(files[0]);
        mimeType = "application/pdf";
        filename = files[0].name.replace(/\.[^.]+$/, "") + ".pdf";
        break;
      }
      case "pdf-to-word": {
        resultBuffer = await pdfToWord(files[0]);
        mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        filename = files[0].name.replace(/\.pdf$/i, "") + ".docx";
        break;
      }
      case "pdf-to-excel": {
        resultBuffer = await pdfToExcel(files[0]);
        mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        filename = files[0].name.replace(/\.pdf$/i, "") + ".xlsx";
        break;
      }
      case "translate": {
        const lang = (formData.get("language") as string) || "İngilizce";
        const code = LANG_CODES[lang] ?? lang.slice(0, 2).toUpperCase();
        const base = files[0].name.replace(/\.pdf$/i, "");
        resultBuffer = await translatePDF(files[0], lang);
        mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        filename = `${base}_${code}.docx`;
        break;
      }
      case "jpg-to-pdf": {
        resultBuffer = await jpgsToPDF(files);
        mimeType = "application/pdf";
        filename =
          files.length === 1
            ? files[0].name.replace(/\.[^.]+$/, "") + ".pdf"
            : "gorseller.pdf";
        break;
      }
      default:
        return NextResponse.json({ error: "Geçersiz araç." }, { status: 400 });
    }

    const bodyBuffer: Buffer =
      resultBuffer instanceof Buffer ? resultBuffer : Buffer.from(resultBuffer);
    const arrayBuffer = bodyBuffer.buffer.slice(
      bodyBuffer.byteOffset,
      bodyBuffer.byteOffset + bodyBuffer.byteLength
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: mimeType });

    return new Response(blob, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": String(bodyBuffer.length),
      },
    });
  } catch (err) {
    console.error("[convert]", err);
    return NextResponse.json({ error: "Dönüştürme sırasında hata oluştu." }, { status: 500 });
  }
}
