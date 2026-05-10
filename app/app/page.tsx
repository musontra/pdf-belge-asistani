"use client";

import { useState } from "react";
import PDFUploader from "@/components/PDFUploader";
import ChatInterface from "@/components/ChatInterface";
import { useUsageLimit } from "@/hooks/useUsageLimit";

export default function Home() {
  const [documentText, setDocumentText] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [hasDocument, setHasDocument] = useState(false);
  const { count, isLimitReached, limit, increment, ready } = useUsageLimit();

  const handleDocumentReady = (text: string, name: string, pages: number) => {
    setDocumentText(text);
    setDocumentName(name);
    setPageCount(pages);
    setHasDocument(true);
  };

  const handleReset = () => {
    setDocumentText("");
    setDocumentName("");
    setPageCount(0);
    setHasDocument(false);
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900">PDF Belge Asistanı</h1>
          <p className="text-xs text-slate-500">Yapay zeka destekli belge analizi</p>
        </div>
      </header>

      {/* Ana içerik */}
      <main className="flex flex-1 overflow-hidden">
        {/* Sol panel */}
        <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-white p-5 lg:w-80">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">PDF Belgesi</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Analiz etmek istediğiniz PDF dosyasını yükleyin
            </p>
          </div>

          <PDFUploader
            onDocumentReady={handleDocumentReady}
            hasDocument={hasDocument}
            fileName={documentName}
            pageCount={pageCount}
            onReset={handleReset}
          />

          {/* Kullanım göstergesi */}
          {ready && (
            <div className={`rounded-lg p-4 ${isLimitReached ? "bg-red-50" : "bg-slate-50"}`}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Günlük Kullanım
              </p>
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-xs font-medium ${isLimitReached ? "text-red-600" : "text-slate-700"}`}>
                  {count}/{limit} soru kullanıldı
                </span>
                {isLimitReached && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-red-500">Doldu</span>
                )}
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${isLimitReached ? "bg-red-500" : "bg-blue-500"}`}
                  style={{ width: `${Math.min((count / limit) * 100, 100)}%` }}
                />
              </div>
              {!isLimitReached && (
                <p className="mt-2 text-[11px] text-slate-400">
                  {limit - count} soru hakkınız kaldı
                </p>
              )}
            </div>
          )}

          {!hasDocument && (
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nasıl Kullanılır
              </p>
              <ol className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">1</span>
                  PDF dosyanızı yükleyin
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">2</span>
                  Belge hazır olduğunda bildirim alırsınız
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">3</span>
                  Belge hakkında Türkçe soru sorun
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">4</span>
                  Yapay zeka yanıtınızı üretir
                </li>
              </ol>
            </div>
          )}
        </aside>

        {/* Sağ panel – Chat */}
        <section className="flex flex-1 flex-col overflow-hidden bg-slate-50">
          <ChatInterface
            documentText={documentText}
            documentName={documentName}
            isReady={hasDocument}
            isLimitReached={isLimitReached}
            onMessageSent={increment}
          />
        </section>
      </main>
    </div>
  );
}
