import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60; // Hobby: 10s cap, Pro: 60s

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MAX_DOC_CHARS = 150_000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, documentText, documentName } = body as {
      messages: Message[];
      documentText: string;
      documentName: string;
    };

    if (!messages?.length || !documentText) {
      return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
    }

    const truncatedDoc =
      documentText.length > MAX_DOC_CHARS
        ? documentText.slice(0, MAX_DOC_CHARS) + "\n\n[Belge çok uzun olduğu için kısaltıldı...]"
        : documentText;

    const systemPrompt = `Sen bir PDF belge asistanısın. Kullanıcı sana "${documentName}" adlı belge hakkında sorular soruyor.

Belgenin içeriği aşağıda verilmiştir:

<belge>
${truncatedDoc}
</belge>

Talimatlar:
- Tüm cevaplarını Türkçe ver.
- Sadece belgede bulunan bilgilere dayanarak cevap ver.
- Belgede olmayan bilgileri uydurmama, bunun yerine "Belgede bu konuyla ilgili bilgi bulunmamaktadır." de.
- Cevaplarını açık, anlaşılır ve düzenli bir şekilde ver.
- Gerektiğinde madde listesi veya numaralı liste kullan.`;

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              const data = JSON.stringify({ text: chunk.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch {
          controller.error("Stream hatası oluştu.");
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Yapay zeka yanıt üretirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
