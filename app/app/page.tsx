"use client";

import { useState, useRef, useCallback } from "react";
import ChatInterface from "@/components/ChatInterface";
import PageEditor from "@/components/PageEditor";
import { useUsageLimit } from "@/hooks/useUsageLimit";

// ── Tool tanımları ────────────────────────────────────────────────────────────

type ToolId = "pdf-to-word" | "pdf-to-excel" | "image-to-pdf" | "compress" | "merge" | "split" | "translate" | "pdf-to-jpg" | "jpg-to-pdf" | "page-edit" | "watermark";

interface Tool {
  id: ToolId;
  label: string;
  description: string;
  accept: string;
  multiple: boolean;
  icon: React.ReactNode;
  resultLabel: string;
}

const TOOLS: Tool[] = [
  {
    id: "pdf-to-word",
    label: "PDF → Word",
    description: "PDF dosyanızı düzenlenebilir DOCX formatına dönüştürün.",
    accept: ".pdf,application/pdf",
    multiple: false,
    resultLabel: "Word Dosyasını İndir",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: "pdf-to-excel",
    label: "PDF → Excel",
    description: "PDF'deki tabloları ve verileri XLSX formatına aktarın.",
    accept: ".pdf,application/pdf",
    multiple: false,
    resultLabel: "Excel Dosyasını İndir",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M3 14h18M10 3v18M14 3v18M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      </svg>
    ),
  },
  {
    id: "image-to-pdf",
    label: "Görsel → PDF",
    description: "JPG veya PNG görselinizi PDF dosyasına dönüştürün.",
    accept: "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp",
    multiple: false,
    resultLabel: "PDF'i İndir",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "compress",
    label: "PDF Sıkıştır",
    description: "PDF dosyanızın boyutunu küçültün.",
    accept: ".pdf,application/pdf",
    multiple: false,
    resultLabel: "Sıkıştırılmış PDF'i İndir",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
      </svg>
    ),
  },
  {
    id: "merge",
    label: "PDF Birleştir",
    description: "Birden fazla PDF'i tek bir dosyada birleştirin.",
    accept: ".pdf,application/pdf",
    multiple: true,
    resultLabel: "Birleştirilmiş PDF'i İndir",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "split",
    label: "PDF Böl",
    description: "PDF'den istediğiniz sayfaları ayırın.",
    accept: ".pdf,application/pdf",
    multiple: false,
    resultLabel: "Bölünmüş PDF'i İndir",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
      </svg>
    ),
  },
  {
    id: "translate",
    label: "PDF Çevir",
    description: "PDF belgenizi istediğiniz dile çevirin, DOCX olarak indirin.",
    accept: ".pdf,application/pdf",
    multiple: false,
    resultLabel: "Çeviriyi İndir",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
    ),
  },
  {
    id: "pdf-to-jpg",
    label: "PDF → JPG",
    description: "Her PDF sayfasını ayrı JPG görsellerine dönüştürün.",
    accept: ".pdf,application/pdf",
    multiple: false,
    resultLabel: "JPG İndir",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "jpg-to-pdf",
    label: "JPG → PDF",
    description: "Bir veya birden fazla görsel dosyasını tek PDF'e dönüştürün.",
    accept: "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp",
    multiple: true,
    resultLabel: "PDF'i İndir",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: "watermark",
    label: "Watermark Ekle",
    description: "PDF'in her sayfasına özel metin damgası ekleyin.",
    accept: ".pdf,application/pdf",
    multiple: false,
    resultLabel: "Watermarklı PDF'i İndir",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    id: "page-edit",
    label: "Sayfa Düzenle",
    description: "Sayfaları sürükle-bırak ile yeniden sıralayın, istemediğiniz sayfaları silin.",
    accept: ".pdf,application/pdf",
    multiple: false,
    resultLabel: "PDF Oluştur",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
  },
];

const LANGUAGES = [
  "İngilizce", "Almanca", "Fransızca", "İspanyolca",
  "Arapça", "Rusça", "Japonca", "Çince",
];

// ── Yardımcılar ───────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ── Bileşen ───────────────────────────────────────────────────────────────────

export default function AppPage() {
  const [selectedTool, setSelectedTool] = useState<ToolId>("merge");
  const [files, setFiles] = useState<File[]>([]);
  const [splitFrom, setSplitFrom] = useState(1);
  const [splitTo, setSplitTo] = useState(1);
  const [targetLang, setTargetLang] = useState("İngilizce");
  const [watermarkText, setWatermarkText] = useState("");
  const [watermarkColor, setWatermarkColor] = useState("gray");
  const [watermarkOpacity, setWatermarkOpacity] = useState("medium");
  const [watermarkPosition, setWatermarkPosition] = useState("diagonal");
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<{ url: string; filename: string; originalSize?: number; resultSize?: number } | null>(null);
  const [convError, setConvError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // AI asistanı için
  const [documentText, setDocumentText] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [parsedPageCount, setParsedPageCount] = useState(0);
  const [parsing, setParsing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { count, isLimitReached, limit, increment, ready } = useUsageLimit();

  const tool = TOOLS.find((t) => t.id === selectedTool)!;

  // PDF'i AI asistanı için ayrıca parse et
  const parsePDFForAI = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") return;
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/parse-pdf", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setDocumentText(data.text);
        setDocumentName(data.fileName);
        setParsedPageCount(data.pageCount);
      }
    } catch {
      // AI parse başarısız olursa sessizce geç
    } finally {
      setParsing(false);
    }
  }, []);

  const handleFiles = useCallback(
    (incoming: FileList | File[]) => {
      const arr = Array.from(incoming);
      setFiles(tool.multiple ? arr : [arr[0]]);
      setResult(null);
      setConvError(null);
      // İlk PDF'i AI için parse et
      const firstPdf = arr.find((f) => f.type === "application/pdf");
      if (firstPdf) parsePDFForAI(firstPdf);
    },
    [tool.multiple, parsePDFForAI]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const selectTool = (id: ToolId) => {
    setSelectedTool(id);
    setFiles([]);
    setResult(null);
    setConvError(null);
  };

  const convert = async () => {
    if (files.length === 0 || converting) return;
    setConverting(true);
    setConvError(null);
    setResult(null);

    // PDF → JPG runs entirely in the browser (no server rendering needed)
    if (selectedTool === "pdf-to-jpg") {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const file = files[0];
        const data = new Uint8Array(await file.arrayBuffer());
        const pdfDoc = await pdfjsLib.getDocument({ data }).promise;
        const numPages = pdfDoc.numPages;
        const baseName = file.name.replace(/\.pdf$/i, "");
        const blobs: Blob[] = [];

        for (let i = 1; i <= numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas bağlamı oluşturulamadı");
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          const blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
              (b) => (b ? resolve(b) : reject(new Error("Görsel oluşturulamadı"))),
              "image/jpeg",
              0.9
            )
          );
          blobs.push(blob);
        }

        let url: string;
        let filename: string;
        let resultSize: number;

        if (blobs.length === 1) {
          url = URL.createObjectURL(blobs[0]);
          filename = `${baseName}.jpg`;
          resultSize = blobs[0].size;
        } else {
          const { default: JSZip } = await import("jszip");
          const zip = new JSZip();
          blobs.forEach((b, i) => zip.file(`${baseName}_sayfa_${i + 1}.jpg`, b));
          const zipBlob = await zip.generateAsync({ type: "blob" });
          url = URL.createObjectURL(zipBlob);
          filename = `${baseName}_sayfalar.zip`;
          resultSize = zipBlob.size;
        }

        setResult({ url, filename, originalSize: file.size, resultSize });
      } catch (err) {
        setConvError((err as Error).message || "Dönüştürme başarısız.");
      } finally {
        setConverting(false);
      }
      return;
    }

    try {
      const fd = new FormData();
      fd.append("tool", selectedTool);
      files.forEach((f) => fd.append("files", f));
      if (selectedTool === "split") {
        fd.append("from", String(splitFrom));
        fd.append("to", String(splitTo));
      }
      if (selectedTool === "translate") {
        fd.append("language", targetLang);
      }
      if (selectedTool === "watermark") {
        fd.append("text",     watermarkText);
        fd.append("color",    watermarkColor);
        fd.append("opacity",  watermarkOpacity);
        fd.append("position", watermarkPosition);
      }

      const res = await fetch("/api/convert", { method: "POST", body: fd });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Dönüştürme başarısız.");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const nameMatch = disposition.match(/filename\*?=(?:UTF-8'')?(.+)/i);
      const filename = nameMatch
        ? decodeURIComponent(nameMatch[1].replace(/"/g, ""))
        : "sonuc";

      const url = URL.createObjectURL(blob);
      setResult({
        url,
        filename,
        originalSize: files.reduce((a, f) => a + f.size, 0),
        resultSize: blob.size,
      });
    } catch (err) {
      setConvError((err as Error).message);
    } finally {
      setConverting(false);
    }
  };

  const canConvert =
    files.length > 0 &&
    !converting &&
    (selectedTool !== "watermark" || watermarkText.trim().length > 0);

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-3 shadow-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <span className="text-sm font-bold text-slate-900">PDF Araç Seti</span>

        {/* Kullanım göstergesi */}
        {ready && (
          <div className="ml-auto flex items-center gap-2">
            <span className={`text-xs font-medium ${isLimitReached ? "text-red-600" : "text-slate-500"}`}>
              AI: {count}/{limit} soru
            </span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${isLimitReached ? "bg-red-500" : "bg-blue-500"}`}
                style={{ width: `${Math.min((count / limit) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sol panel: araç menüsü ── */}
        <nav className="flex w-52 shrink-0 flex-col border-r border-slate-200 bg-white py-3">
          <p className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Araçlar
          </p>
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTool(t.id)}
              className={`flex items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                selectedTool === t.id
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  selectedTool === t.id ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                }`}
              >
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </nav>

        {/* ── Orta panel: araç arayüzü ── */}
        <main className="flex flex-1 flex-col overflow-y-auto p-6">
          <div className="mx-auto w-full max-w-xl">
            <h2 className="text-lg font-bold text-slate-900">{tool.label}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{tool.description}</p>

            {selectedTool === "page-edit" ? (
              <PageEditor onPdfLoaded={parsePDFForAI} />
            ) : (
              <>
                {/* Dosya yükleme alanı */}
                <div
                  className={`mt-5 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition ${
                    isDragging
                      ? "border-blue-400 bg-blue-50"
                      : "border-slate-300 bg-white hover:border-blue-300 hover:bg-slate-50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={tool.accept}
                    multiple={tool.multiple}
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }}
                  />
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                    {tool.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      {isDragging ? "Dosyayı bırakın" : "Dosya seçin veya sürükleyin"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {tool.multiple ? "Birden fazla dosya seçebilirsiniz" : "Tek dosya"}
                    </p>
                  </div>
                </div>

                {/* Seçili dosyalar */}
                {files.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {files.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{f.name}</span>
                        <span className="shrink-0 text-xs text-slate-400">{formatBytes(f.size)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFiles((prev) => prev.filter((_, j) => j !== i));
                          }}
                          className="ml-1 shrink-0 text-slate-300 hover:text-red-500"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Dil seçimi */}
                {selectedTool === "translate" && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                    <p className="mb-3 text-sm font-medium text-slate-700">Hedef Dil</p>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setTargetLang(lang)}
                          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                            targetLang === lang
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Watermark ayarları */}
                {selectedTool === "watermark" && (
                  <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                    {/* Metin */}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Watermark Metni</label>
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="GİZLİ, TASLAK, Şirket Adı..."
                        maxLength={50}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    {/* Renk */}
                    <div>
                      <p className="mb-1.5 text-sm font-medium text-slate-700">Renk</p>
                      <div className="flex flex-wrap gap-2">
                        {([
                          { key: "gray", label: "Gri",      dot: "bg-slate-400" },
                          { key: "red",  label: "Kırmızı",  dot: "bg-red-500"   },
                          { key: "blue", label: "Mavi",     dot: "bg-blue-500"  },
                        ] as const).map(({ key, label, dot }) => (
                          <button
                            key={key}
                            onClick={() => setWatermarkColor(key)}
                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                              watermarkColor === key
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <span className={`h-3 w-3 rounded-full ${dot}`} />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Opaklık */}
                    <div>
                      <p className="mb-1.5 text-sm font-medium text-slate-700">Opaklık</p>
                      <div className="flex flex-wrap gap-2">
                        {([
                          { key: "light",  label: "Hafif" },
                          { key: "medium", label: "Orta"  },
                          { key: "dark",   label: "Koyu"  },
                        ] as const).map(({ key, label }) => (
                          <button
                            key={key}
                            onClick={() => setWatermarkOpacity(key)}
                            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                              watermarkOpacity === key
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Konum */}
                    <div>
                      <p className="mb-1.5 text-sm font-medium text-slate-700">Konum</p>
                      <div className="flex flex-wrap gap-2">
                        {([
                          { key: "diagonal",     label: "Çapraz (Ortada)" },
                          { key: "bottom-right", label: "Sağ Alt"         },
                          { key: "bottom-left",  label: "Sol Alt"         },
                        ] as const).map(({ key, label }) => (
                          <button
                            key={key}
                            onClick={() => setWatermarkPosition(key)}
                            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                              watermarkPosition === key
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Split sayfaları */}
                {selectedTool === "split" && files.length > 0 && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                    <span className="text-sm text-slate-600">Sayfa aralığı:</span>
                    <input
                      type="number"
                      min={1}
                      value={splitFrom}
                      onChange={(e) => setSplitFrom(parseInt(e.target.value) || 1)}
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm outline-none focus:border-blue-400"
                    />
                    <span className="text-slate-400">—</span>
                    <input
                      type="number"
                      min={1}
                      value={splitTo}
                      onChange={(e) => setSplitTo(parseInt(e.target.value) || 1)}
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm outline-none focus:border-blue-400"
                    />
                  </div>
                )}

                {/* Hata */}
                {convError && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {convError}
                  </div>
                )}

                {/* Dönüştür butonu */}
                <button
                  onClick={convert}
                  disabled={!canConvert}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {converting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Dönüştürülüyor...
                    </>
                  ) : (
                    "Dönüştür"
                  )}
                </button>

                {/* AI parse durumu */}
                {parsing && (
                  <p className="mt-2 text-center text-xs text-slate-400">AI asistanı için belge okunuyor...</p>
                )}

                {/* İndirme alanı */}
                {result && (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                        <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-emerald-800">Dönüştürme tamamlandı!</p>
                        {result.originalSize && result.resultSize && (
                          <p className="mt-0.5 text-xs text-emerald-600">
                            {formatBytes(result.originalSize)} → {formatBytes(result.resultSize)}
                            {result.resultSize < result.originalSize && (
                              <span className="ml-1 font-medium">
                                (%{Math.round((1 - result.resultSize / result.originalSize) * 100)} küçüldü)
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <a
                      href={result.url}
                      download={result.filename}
                      className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {tool.resultLabel}
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* ── Sağ panel: AI asistanı ── */}
        <aside className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">AI Asistanı</p>
            <p className="text-xs text-slate-400">
              {documentName ? documentName : "Belge yüklenmedi"}
              {documentName && parsedPageCount > 0 && ` · ${parsedPageCount} sayfa`}
            </p>
          </div>
          <div className="flex flex-1 overflow-hidden">
            <ChatInterface
              documentText={documentText}
              documentName={documentName}
              isReady={documentText.length > 0}
              isLimitReached={isLimitReached}
              onMessageSent={increment}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
