import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

type QuizType = "multiple_choice" | "open_ended" | "mixed";

function buildPrompt(content: string, quizType: QuizType, questionCount: number, isDoc: boolean): string {
  const source = isDoc ? "Verilen belgeden" : `"${content.slice(0, 300)}" konusundan`;

  const mcCount =
    quizType === "multiple_choice" ? questionCount
    : quizType === "open_ended" ? 0
    : Math.ceil(questionCount / 2);
  const openCount = questionCount - mcCount;

  const typeInstr =
    quizType === "multiple_choice"
      ? `Tüm ${questionCount} soru çoktan seçmeli (type:"mc") olsun.`
      : quizType === "open_ended"
      ? `Tüm ${questionCount} soru açık uçlu (type:"open") olsun.`
      : `${mcCount} soru çoktan seçmeli (type:"mc"), ${openCount} soru açık uçlu (type:"open") olsun.`;

  return `${source} Türkçe ${questionCount} soruluk bir sınav hazırla. ${typeInstr}

YALNIZCA aşağıdaki JSON yapısını döndür. Başka hiçbir metin, açıklama veya markdown ekleme.

{
  "questions": [
    {
      "type": "mc",
      "question": "Soru metni",
      "options": ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı"],
      "correctIndex": 0,
      "explanation": "Kısa açıklama"
    },
    {
      "type": "open",
      "question": "Soru metni",
      "sampleAnswer": "Örnek doğru cevap"
    }
  ]
}
${isDoc ? `\nBelge:\n${content.slice(0, 10000)}` : ""}`;
}

export async function POST(req: NextRequest) {
  try {
    const { topic, documentText, quizType = "multiple_choice", questionCount = 10 } = await req.json();

    const isDoc = Boolean(documentText?.trim());
    const content = isDoc ? documentText.trim() : topic?.trim();
    if (!content) return NextResponse.json({ error: "Konu veya belge gerekli." }, { status: 400 });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: buildPrompt(content, quizType as QuizType, Number(questionCount), isDoc) }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Sınav formatı tanınamadı." }, { status: 500 });

    const quiz = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      return NextResponse.json({ error: "Sorular oluşturulamadı." }, { status: 500 });
    }

    return NextResponse.json(quiz);
  } catch (err) {
    console.error("[quiz]", err);
    return NextResponse.json({ error: "Sınav oluşturulamadı." }, { status: 500 });
  }
}
