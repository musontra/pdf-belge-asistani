"use client";

import { useState } from "react";
import Link from "next/link";
import PDFUploader from "@/components/PDFUploader";

// ── Types ────────────────────────────────────────────────────────────────────

type QuizType = "multiple_choice" | "open_ended" | "mixed";
type Phase = "setup" | "generating" | "quiz" | "results";

interface MCQ {
  type: "mc";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}
interface OEQ {
  type: "open";
  question: string;
  sampleAnswer: string;
}
type Question = MCQ | OEQ;

interface Answer {
  mcIndex?: number;
  openText?: string;
  selfCorrect?: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const QUIZ_TYPES: { value: QuizType; label: string }[] = [
  { value: "multiple_choice", label: "Çoktan Seçmeli" },
  { value: "open_ended", label: "Açık Uçlu" },
  { value: "mixed", label: "Karışık" },
];
const QUESTION_COUNTS = [5, 10, 15, 20];

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeScore(questions: Question[], answers: Answer[]) {
  let correct = 0, pending = 0;
  questions.forEach((q, i) => {
    if (q.type === "mc") {
      if (answers[i]?.mcIndex === (q as MCQ).correctIndex) correct++;
    } else {
      const sg = answers[i]?.selfCorrect;
      if (sg === true) correct++;
      else if (sg === undefined) pending++;
    }
  });
  return { correct, total: questions.length, pending };
}

function optionLabel(i: number) {
  return String.fromCharCode(65 + i);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function QuizPage() {
  // Setup
  const [inputMode, setInputMode] = useState<"topic" | "pdf">("topic");
  const [topic, setTopic] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [hasDocument, setHasDocument] = useState(false);
  const [quizType, setQuizType] = useState<QuizType>("multiple_choice");
  const [questionCount, setQuestionCount] = useState(10);

  // Quiz
  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canGenerate =
    (inputMode === "topic" && topic.trim().length > 2) ||
    (inputMode === "pdf" && hasDocument);

  const answeredCount = questions.filter((q, i) =>
    q.type === "mc" ? answers[i]?.mcIndex !== undefined : (answers[i]?.openText ?? "").trim().length > 0
  ).length;

  const allAnswered = answeredCount === questions.length && questions.length > 0;

  const { correct, total, pending } = computeScore(questions, answers);

  // ── Actions ──

  const generateQuiz = async () => {
    if (!canGenerate) return;
    setPhase("generating");
    setError(null);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: inputMode === "topic" ? topic : undefined,
          documentText: inputMode === "pdf" ? documentText : undefined,
          quizType,
          questionCount,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Hata oluştu.");
      const data = await res.json();
      if (!data.questions?.length) throw new Error("Sorular üretilemedi.");
      setQuestions(data.questions);
      setAnswers(data.questions.map(() => ({})));
      setPhase("quiz");
    } catch (e) {
      setError((e as Error).message);
      setPhase("setup");
    }
  };

  const setMC = (qi: number, oi: number) =>
    setAnswers((prev) => prev.map((a, i) => (i === qi ? { ...a, mcIndex: oi } : a)));

  const setOpen = (qi: number, text: string) =>
    setAnswers((prev) => prev.map((a, i) => (i === qi ? { ...a, openText: text } : a)));

  const setSelf = (qi: number, val: boolean) =>
    setAnswers((prev) => prev.map((a, i) => (i === qi ? { ...a, selfCorrect: val } : a)));

  const resetQuiz = () => {
    setPhase("setup");
    setQuestions([]);
    setAnswers([]);
    setTopic("");
    setHasDocument(false);
    setDocumentText("");
    setDocumentName("");
    setPageCount(0);
    setError(null);
  };

  // ── Render ──

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Ana Sayfa
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-sm font-semibold text-slate-800">Konu Sınavı</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">

        {/* ── SETUP ── */}
        {phase === "setup" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Sınav Oluştur</h1>
              <p className="mt-1 text-sm text-slate-500">
                Konu gir veya PDF yükle, ayarları seç, başla.
              </p>
            </div>

            {/* Input mode tabs */}
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {(["topic", "pdf"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setInputMode(mode)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                    inputMode === mode
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {mode === "topic" ? "Konu Gir" : "PDF Yükle"}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              {inputMode === "topic" ? (
                <>
                  <label className="text-sm font-medium text-slate-700">Sınav Konusu</label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Örn: Osmanlı İmparatorluğu, Fotosentez, Türev ve İntegral..."
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
                  />
                </>
              ) : (
                <PDFUploader
                  onDocumentReady={(text, name, pages) => {
                    setDocumentText(text);
                    setDocumentName(name);
                    setPageCount(pages);
                    setHasDocument(true);
                  }}
                  hasDocument={hasDocument}
                  fileName={documentName}
                  pageCount={pageCount}
                  onReset={() => {
                    setDocumentText("");
                    setDocumentName("");
                    setPageCount(0);
                    setHasDocument(false);
                  }}
                />
              )}
            </div>

            {/* Settings */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
              <div>
                <p className="text-sm font-medium text-slate-700">Sınav Tipi</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUIZ_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setQuizType(t.value)}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                        quizType === t.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700">Soru Sayısı</p>
                <div className="mt-2 flex gap-2">
                  {QUESTION_COUNTS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setQuestionCount(n)}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                        questionCount === n
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={generateQuiz}
              disabled={!canGenerate}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sınav Oluştur
            </button>
          </div>
        )}

        {/* ── GENERATING ── */}
        {phase === "generating" && (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
              <svg className="h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-800">Sınav hazırlanıyor...</p>
            <p className="text-sm text-slate-500">Yapay zeka sorular oluşturuyor, lütfen bekleyin.</p>
          </div>
        )}

        {/* ── QUIZ ── */}
        {phase === "quiz" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Sınav</h2>
                <p className="mt-0.5 text-sm text-slate-500">{questions.length} soru · Tüm soruları cevapla</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {answeredCount}/{questions.length}
              </span>
            </div>

            {questions.map((q, qi) => {
              const a = answers[qi];
              return (
                <div key={qi} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {qi + 1}
                    </span>
                    <p className="text-sm font-medium leading-relaxed text-slate-800">{q.question}</p>
                  </div>

                  {q.type === "mc" ? (
                    <div className="ml-9 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(q as MCQ).options.map((opt, oi) => (
                        <button
                          key={oi}
                          onClick={() => setMC(qi, oi)}
                          className={`rounded-lg border px-3.5 py-2.5 text-left text-sm transition ${
                            a?.mcIndex === oi
                              ? "border-blue-500 bg-blue-50 text-blue-800"
                              : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <span className="mr-2 font-semibold text-blue-500">{optionLabel(oi)}.</span>
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="ml-9">
                      <textarea
                        value={a?.openText ?? ""}
                        onChange={(e) => setOpen(qi, e.target.value)}
                        placeholder="Cevabınızı buraya yazın..."
                        rows={3}
                        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => setPhase("results")}
              disabled={!allAnswered}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sınavı Bitir
            </button>
          </div>
        )}

        {/* ── RESULTS ── */}
        {phase === "results" && (
          <div className="space-y-5">
            {/* Score card */}
            <div className="rounded-2xl bg-blue-600 p-6 text-center text-white">
              <p className="text-sm font-medium text-blue-200">Sonuç</p>
              <p className="mt-1 text-6xl font-extrabold">
                {correct}
                <span className="text-3xl font-semibold text-blue-300">/{total}</span>
              </p>
              <p className="mt-2 text-sm text-blue-200">
                {pending > 0
                  ? `${pending} açık uçlu soru değerlendirme bekliyor`
                  : `%${Math.round((correct / total) * 100)} başarı`}
              </p>
              <div className="mx-auto mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-blue-500">
                <div
                  className="h-full rounded-full bg-white transition-all duration-700"
                  style={{ width: `${total > 0 ? Math.round((correct / total) * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Question review */}
            {questions.map((q, qi) => {
              const a = answers[qi];
              const isMC = q.type === "mc";
              const mcQ = q as MCQ;
              const oeQ = q as OEQ;
              const questionCorrect = isMC ? a.mcIndex === mcQ.correctIndex : a.selfCorrect === true;
              const questionWrong = isMC ? a.mcIndex !== mcQ.correctIndex : a.selfCorrect === false;

              return (
                <div
                  key={qi}
                  className={`rounded-xl border bg-white p-5 ${
                    questionCorrect
                      ? "border-emerald-200"
                      : questionWrong
                      ? "border-red-200"
                      : "border-amber-200"
                  }`}
                >
                  {/* Question header */}
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {qi + 1}
                      </span>
                      <p className="text-sm font-medium leading-relaxed text-slate-800">{q.question}</p>
                    </div>
                    {isMC && (
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          questionCorrect
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {questionCorrect ? "Doğru" : "Yanlış"}
                      </span>
                    )}
                  </div>

                  {/* MC review */}
                  {isMC ? (
                    <div className="ml-9 space-y-1.5">
                      {mcQ.options.map((opt, oi) => {
                        const isCorrectOpt = oi === mcQ.correctIndex;
                        const isSelectedOpt = a.mcIndex === oi;
                        return (
                          <div
                            key={oi}
                            className={`rounded-lg px-3 py-2 text-sm ${
                              isCorrectOpt
                                ? "bg-emerald-50 font-medium text-emerald-800"
                                : isSelectedOpt
                                ? "bg-red-50 text-red-800"
                                : "text-slate-600"
                            }`}
                          >
                            <span className="mr-2 font-semibold">{optionLabel(oi)}.</span>
                            {opt}
                            {isCorrectOpt && (
                              <span className="ml-2 text-xs text-emerald-600">✓ Doğru cevap</span>
                            )}
                            {isSelectedOpt && !isCorrectOpt && (
                              <span className="ml-2 text-xs text-red-500">✗ Seçtiğiniz</span>
                            )}
                          </div>
                        );
                      })}
                      {mcQ.explanation && (
                        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                          <span className="font-semibold">Açıklama: </span>
                          {mcQ.explanation}
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Open-ended review */
                    <div className="ml-9 space-y-3">
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Cevabınız
                        </p>
                        <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                          {a.openText || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Örnek Cevap
                        </p>
                        <p className="rounded-lg bg-blue-50 px-3 py-2.5 text-sm text-slate-700">
                          {oeQ.sampleAnswer}
                        </p>
                      </div>

                      {a.selfCorrect === undefined ? (
                        <div>
                          <p className="mb-2 text-xs text-slate-500">
                            Örnek cevapla karşılaştır ve kendini değerlendir:
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelf(qi, true)}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              Doğru Saydım
                            </button>
                            <button
                              onClick={() => setSelf(qi, false)}
                              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              Yanlış Saydım
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              a.selfCorrect
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {a.selfCorrect ? "Doğru Saydınız" : "Yanlış Saydınız"}
                          </span>
                          <button
                            onClick={() =>
                              setAnswers((prev) =>
                                prev.map((ans, i) =>
                                  i === qi ? { ...ans, selfCorrect: undefined } : ans
                                )
                              )
                            }
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            Değiştir
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={resetQuiz}
              className="w-full rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Yeni Sınav Oluştur
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
