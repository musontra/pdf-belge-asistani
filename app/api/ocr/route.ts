import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT =
  "Bu görseldeki / belgedeki tüm metni aynen çıkar. " +
  "Format ve satır düzenini olabildiğince koru. " +
  "Yalnızca metni ver, ek yorum veya açıklama ekleme.";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Dosya eksik." }, { status: 400 });
    }

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const isPdf = file.type === "application/pdf";

    const block = isPdf
      ? ({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        } as Anthropic.DocumentBlockParam)
      : ({
          type: "image",
          source: {
            type: "base64",
            media_type: file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: base64,
          },
        } as Anthropic.ImageBlockParam);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [block, { type: "text", text: PROMPT }],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[ocr]", err);
    return NextResponse.json({ error: "OCR işlemi başarısız oldu." }, { status: 500 });
  }
}
