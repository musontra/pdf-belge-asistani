"use client";

import { useState } from "react";
import PDFUploader from "@/components/PDFUploader";
import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  const [documentText, setDocumentText] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [hasDocument, setHasDocument] = useState(false);

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
        {/* Sol panel – PDF yükleme */}
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
          />
        </section>
      </main>
    </div>
  );
}
