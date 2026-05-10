"use client";

import { useState, useRef, useCallback } from "react";

const ACCEPT = ".pdf,application/pdf,image/jpeg,image/png,.jpg,.jpeg,.png";

interface OcrPanelProps {
  onFileLoaded?: (file: File) => void;
}

export default function OcrPanel({ onFileLoaded }: OcrPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback(
    (f: File) => {
      setFile(f);
      setText("");
      setError(null);
      onFileLoaded?.(f);
    },
    [onFileLoaded]
  );

  const runOCR = async (targetFile = file) => {
    if (!targetFile || processing) return;
    setProcessing(true);
    setError(null);
    setText("");

    try {
      const fd = new FormData();
      fd.append("file", targetFile);
      const res = await fetch("/api/ocr", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "OCR başarısız oldu.");
      }
      const data = await res.json();
      setText(data.text ?? "");
    } catch (err) {
      setError((err as Error).message || "Bir hata oluştu.");
    } finally {
      setProcessing(false);
    }
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (file?.name.replace(/\.[^.]+$/, "") ?? "metin") + ".txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDocx = async () => {
    const { Document, Paragraph, TextRun, Packer } = await import("docx");
    const children = text
      .split("\n")
      .map((line) => new Paragraph({ children: [new TextRun(line || " ")] }));
    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (file?.name.replace(/\.[^.]+$/, "") ?? "metin") + ".docx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setText("");
    setError(null);
  };

  // ── Upload screen ─────────────────────────────────────────────────────────

  if (!file) {
    return (
      <div
        className={`mt-5 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition ${
          dropActive
            ? "border-blue-400 bg-blue-50"
            : "border-slate-300 bg-white hover:border-blue-300 hover:bg-slate-50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDropActive(false);
          const f = e.dataTransfer.files[0];
          if (f) loadFile(f);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) loadFile(e.target.files[0]);
            e.target.value = "";
          }}
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">
            {dropActive ? "Dosyayı bırakın" : "Dosya seçin veya sürükleyin"}
          </p>
          <p className="mt-1 text-xs text-slate-400">PDF, JPG veya PNG</p>
        </div>
      </div>
    );
  }

  // ── Processing / result screen ────────────────────────────────────────────

  return (
    <div className="mt-5 space-y-4">
      {/* File strip */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="truncate text-sm font-medium text-slate-700">{file.name}</span>
        </div>
        <button onClick={reset} className="ml-4 shrink-0 text-xs text-slate-400 hover:text-red-500 transition-colors">
          Değiştir
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Run button (shown when no result yet) */}
      {!text && (
        <button
          onClick={() => runOCR()}
          disabled={processing}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {processing ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Metin tanınıyor...
            </>
          ) : (
            "Metni Tanı"
          )}
        </button>
      )}

      {/* Result */}
      {text && (
        <div className="space-y-3">
          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={copyText}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
            >
              {copied ? (
                <>
                  <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Kopyalandı
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Kopyala
                </>
              )}
            </button>

            <button
              onClick={downloadDocx}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Word (.docx)
            </button>

            <button
              onClick={downloadTxt}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              TXT
            </button>

            <button
              onClick={() => runOCR()}
              disabled={processing}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-40"
            >
              {processing ? "Taranıyor..." : "Yeniden Tara"}
            </button>
          </div>

          {/* Editable textarea */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={16}
            spellCheck={false}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-y"
          />
          <p className="text-right text-xs text-slate-400">
            {text.length} karakter · {text.split("\n").length} satır
          </p>
        </div>
      )}
    </div>
  );
}
