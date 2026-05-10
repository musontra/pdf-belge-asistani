"use client";

import { useState, useRef, useCallback } from "react";

interface PDFUploaderProps {
  onDocumentReady: (text: string, fileName: string, pageCount: number) => void;
  hasDocument: boolean;
  fileName: string;
  pageCount: number;
  onReset: () => void;
}

export default function PDFUploader({
  onDocumentReady,
  hasDocument,
  fileName,
  pageCount,
  onReset,
}: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setError("Lütfen bir PDF dosyası seçin.");
        return;
      }

      setIsLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/parse-pdf", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "PDF yüklenirken bir hata oluştu.");
          return;
        }

        onDocumentReady(data.text, data.fileName, data.pageCount);
      } catch {
        setError("Ağ hatası. Lütfen tekrar deneyin.");
      } finally {
        setIsLoading(false);
      }
    },
    [onDocumentReady]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  if (hasDocument) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-green-800">Belge Hazır</p>
              <p className="mt-0.5 truncate text-sm text-green-700" title={fileName}>
                {fileName}
              </p>
              <p className="mt-0.5 text-xs text-green-600">{pageCount} sayfa</p>
            </div>
          </div>
        </div>

        <button
          onClick={onReset}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Farklı PDF Yükle
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          isDragging
            ? "border-blue-400 bg-blue-50"
            : "border-slate-300 bg-white hover:border-blue-300 hover:bg-slate-50"
        } ${isLoading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {isLoading ? (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <div>
              <p className="text-sm font-medium text-slate-700">PDF işleniyor...</p>
              <p className="text-xs text-slate-500">Lütfen bekleyin</p>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
              <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {isDragging ? "Dosyayı bırakın" : "PDF sürükleyin veya seçin"}
              </p>
              <p className="mt-1 text-xs text-slate-500">Maksimum 20 MB</p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}
