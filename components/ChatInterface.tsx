"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  documentText: string;
  documentName: string;
  isReady: boolean;
  isLimitReached: boolean;
  onMessageSent: () => void;
}

const QUICK_PROMPTS = [
  {
    label: "Ders notunu özetle",
    prompt: "Bu ders notunu kapsamlı şekilde özetle. Ana konuları, önemli kavramları ve kritik noktaları vurgula.",
  },
  {
    label: "Sınav sorusu üret",
    prompt: "Bu belgeden 5 sınav sorusu üret. Her soruyu numaralandır ve hemen altına cevabını yaz.",
  },
  {
    label: "Flashcard oluştur",
    prompt:
      "Bu belgeden 5-10 flashcard oluştur. SADECE aşağıdaki formatta yaz, başka hiçbir açıklama veya giriş cümlesi ekleme:\n\n[KART 1]\nSoru: ...\nCevap: ...\n\n[KART 2]\nSoru: ...\nCevap: ...",
  },
  {
    label: "Anlamadığım yeri açıkla",
    prompt:
      "Bu belgedeki en karmaşık veya anlaşılması zor kavramları basit bir dille açıkla. Öğrenci seviyesine uygun örnekler kullan.",
  },
];

// ── Flashcard yardımcıları ──────────────────────────────────────────────────

function isFlashcardContent(text: string) {
  return text.includes("[KART 1]") && text.includes("Soru:") && text.includes("Cevap:");
}

function parseFlashcards(text: string): { soru: string; cevap: string }[] {
  const cards: { soru: string; cevap: string }[] = [];
  const blocks = text.split(/\[KART \d+\]/);
  for (const block of blocks) {
    const soruMatch = block.match(/Soru:\s*(.+?)(?=\nCevap:)/s);
    const cevapMatch = block.match(/Cevap:\s*(.+?)(?=\n\n|$)/s);
    if (soruMatch && cevapMatch) {
      cards.push({ soru: soruMatch[1].trim(), cevap: cevapMatch[1].trim() });
    }
  }
  return cards;
}

function FlashcardDisplay({ content }: { content: string }) {
  const cards = parseFlashcards(content);
  if (cards.length === 0) {
    return <div className="whitespace-pre-wrap">{formatMessage(content)}</div>;
  }
  return (
    <div className="space-y-3 py-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {cards.length} flashcard oluşturuldu
      </p>
      {cards.map((card, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-indigo-50 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
              Kart {i + 1}
            </span>
          </div>
          <div className="px-3 py-2.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Soru</p>
            <p className="text-sm text-slate-800">{card.soru}</p>
          </div>
          <div className="border-t border-dashed border-slate-200 bg-emerald-50 px-3 py-2.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Cevap</p>
            <p className="text-sm text-slate-700">{card.cevap}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Ana bileşen ─────────────────────────────────────────────────────────────

export default function ChatInterface({
  documentText,
  documentName,
  isReady,
  isLimitReached,
  onMessageSent,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAsked, setHasAsked] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isReady && messages.length === 0) {
      setHasAsked(false);
      setMessages([
        {
          role: "assistant",
          content: `Belgeniz hazır! **${documentName}** dosyasını başarıyla yükledim. Aşağıdaki butonlardan birini seçebilir ya da kendi sorunuzu yazabilirsiniz.`,
        },
      ]);
    }
  }, [isReady, documentName, messages.length]);

  const autoResizeTextarea = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    }
  };

  const sendMessage = async (promptOverride?: string) => {
    const trimmed = (promptOverride ?? input).trim();
    if (!trimmed || isStreaming || !isReady || isLimitReached) return;

    onMessageSent();
    setHasAsked(true);
    const userMessage: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setError(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    setIsStreaming(true);
    setMessages([...updatedMessages, { role: "assistant", content: "" }]);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({ messages: updatedMessages, documentText, documentName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Yanıt alınamadı.");
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              accumulatedText += parsed.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: accumulatedText };
                return updated;
              });
            } catch {
              // partial chunk
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message || "Bir hata oluştu.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const stopStreaming = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  };

  if (!isReady) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100">
          <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold text-slate-700">Henüz ders notu yüklenmedi</p>
          <p className="mt-1 text-sm text-slate-500">Sol panelden PDF'ini yükle, ardından çalışmaya başla.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Mesaj listesi */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`message-appear flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-700 text-white"
                }`}
              >
                {msg.role === "user" ? "S" : "AI"}
              </div>

              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "max-w-[80%] rounded-tr-sm bg-blue-600 text-white"
                    : isFlashcardContent(msg.content)
                    ? "w-full max-w-[92%] rounded-tl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-100"
                    : "max-w-[80%] rounded-tl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-100"
                }`}
              >
                {msg.content === "" && msg.role === "assistant" ? (
                  <div className="flex gap-1">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                        style={{ animationDelay: `${d * 0.15}s` }}
                      />
                    ))}
                  </div>
                ) : msg.role === "assistant" && isFlashcardContent(msg.content) ? (
                  <FlashcardDisplay content={msg.content} />
                ) : (
                  <div className="whitespace-pre-wrap">{formatMessage(msg.content)}</div>
                )}
              </div>
            </div>
          ))}

          {/* Hazır prompt butonları */}
          {!hasAsked && (
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {QUICK_PROMPTS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => sendMessage(item.prompt)}
                  disabled={isStreaming || isLimitReached}
                  className="rounded-full border border-blue-200 bg-white px-3.5 py-1.5 text-xs font-medium text-blue-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Hata mesajı */}
      {error && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input alanı */}
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="mx-auto max-w-2xl">
          {isLimitReached ? (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
              <svg className="h-5 w-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-6v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-red-700">
                Günlük ücretsiz kullanım hakkınız doldu. Yarın tekrar deneyin.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); autoResizeTextarea(); }}
                  onKeyDown={handleKeyDown}
                  disabled={isStreaming}
                  placeholder="Ders notu hakkında Türkçe soru sor..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none disabled:opacity-50"
                />
                {isStreaming ? (
                  <button
                    onClick={stopStreaming}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white transition hover:bg-red-600"
                    title="Durdur"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim()}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Gönder (Enter)"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-center text-xs text-slate-400">
                Enter ile gönderin · Shift+Enter ile yeni satır
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatMessage(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
