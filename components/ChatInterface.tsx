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
  { label: "Belgeyi özetle", prompt: "Bu belgeyi ana başlıklar altında kısaca özetle." },
  { label: "Önemli bilgileri listele", prompt: "Bu belgedeki en önemli bilgileri madde madde listele." },
  { label: "Verileri çıkar", prompt: "Bu belgede geçen sayısal verileri, tarihleri ve kritik bilgileri çıkar." },
  { label: "Belgeyi analiz et", prompt: "Bu belgenin içeriğini, yapısını ve önemli noktalarını analiz et." },
];

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
      setMessages([
        {
          role: "assistant",
          content: `**${documentName}** yüklendi. Belge hakkında sorularınızı sorabilirsiniz.`,
        },
      ]);
    }
  }, [isReady, documentName, messages.length]);

  // Belge değişince mesajları sıfırla
  useEffect(() => {
    if (!isReady) {
      setMessages([]);
    }
  }, [isReady, documentName]);

  const autoResizeTextarea = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  };

  const sendMessage = async (promptOverride?: string) => {
    const trimmed = (promptOverride ?? input).trim();
    if (!trimmed || isStreaming || !isReady || isLimitReached) return;

    onMessageSent();
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
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              accumulated += JSON.parse(data).text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: accumulated };
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

  if (!isReady) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-xs text-slate-500">Araçlardan PDF yükleyin,<br />AI asistanı devreye girecek.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Mesaj listesi */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-700 text-white"
                }`}
              >
                {msg.role === "user" ? "S" : "AI"}
              </div>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-tr-sm bg-blue-600 text-white"
                    : "rounded-tl-sm bg-slate-100 text-slate-800"
                }`}
              >
                {msg.content === "" && msg.role === "assistant" ? (
                  <div className="flex gap-1">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                        style={{ animationDelay: `${d * 0.15}s` }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{formatMessage(msg.content)}</div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Hızlı soru butonları */}
      <div className="border-t border-slate-100 px-3 pt-2 pb-1">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((item) => (
            <button
              key={item.label}
              onClick={() => sendMessage(item.prompt)}
              disabled={isStreaming || isLimitReached}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hata */}
      {error && (
        <div className="mx-3 mb-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Kapat</button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-200 bg-white p-3">
        {isLimitReached ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            Günlük ücretsiz kullanım hakkınız doldu. Yarın tekrar deneyin.
          </div>
        ) : (
          <>
            <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); autoResizeTextarea(); }}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                placeholder="Belge hakkında soru sorun..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none disabled:opacity-50"
              />
              {isStreaming ? (
                <button
                  onClick={() => { abortControllerRef.current?.abort(); setIsStreaming(false); }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600"
                >
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim()}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              )}
            </div>
            <p className="mt-1 text-center text-[10px] text-slate-400">Enter · Shift+Enter yeni satır</p>
          </>
        )}
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
