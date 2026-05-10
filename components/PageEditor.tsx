"use client";

import { useState, useRef, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PageItem {
  id: string;
  pageNum: number;
  thumbnail: string;
}

// ── Sortable thumbnail card ───────────────────────────────────────────────────

function SortablePage({
  item,
  onDelete,
}: {
  item: PageItem;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : "auto",
        position: "relative",
      }}
      className="flex flex-col items-center gap-1.5"
    >
      <div
        {...attributes}
        {...listeners}
        className="w-full cursor-grab rounded-lg border-2 border-slate-200 bg-white overflow-hidden shadow-sm hover:border-blue-300 active:cursor-grabbing select-none"
      >
        <img
          src={item.thumbnail}
          alt={`Sayfa ${item.pageNum}`}
          className="block w-full"
          draggable={false}
        />
      </div>
      <span className="text-[11px] tabular-nums text-slate-400">{item.pageNum}. sayfa</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
        className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] shadow-sm hover:bg-red-600 transition-colors leading-none"
        aria-label={`Sayfa ${item.pageNum}'i sil`}
      >
        ✕
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface PageEditorProps {
  onPdfLoaded?: (file: File) => void;
}

export default function PageEditor({ onPdfLoaded }: PageEditorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<{ url: string; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadPDF = useCallback(
    async (f: File) => {
      if (f.type !== "application/pdf") return;
      setFile(f);
      setPages([]);
      setResult(null);
      setError(null);
      setLoadingThumbs(true);
      onPdfLoaded?.(f);

      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const data = new Uint8Array(await f.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data }).promise;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const vp = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(vp.width);
          canvas.height = Math.ceil(vp.height);
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
          const thumb = canvas.toDataURL("image/jpeg", 0.7);
          setPages((prev) => [
            ...prev,
            { id: `p${i}-${f.name}`, pageNum: i, thumbnail: thumb },
          ]);
        }
      } catch (err) {
        setError((err as Error).message || "PDF yüklenemedi.");
      } finally {
        setLoadingThumbs(false);
      }
    },
    [onPdfLoaded]
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setPages((prev) => {
        const from = prev.findIndex((p) => p.id === active.id);
        const to = prev.findIndex((p) => p.id === over.id);
        return arrayMove(prev, from, to);
      });
    }
  };

  const deletePage = useCallback((id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const createPDF = async () => {
    if (!file || pages.length === 0 || converting) return;
    setConverting(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("tool", "reorder");
      fd.append("files", file);
      fd.append("pages", JSON.stringify(pages.map((p) => p.pageNum)));

      const res = await fetch("/api/convert", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "PDF oluşturulamadı.");
      }

      const blob = await res.blob();
      setResult({
        url: URL.createObjectURL(blob),
        filename: file.name.replace(/\.pdf$/i, "") + "_düzenlendi.pdf",
      });
    } catch (err) {
      setError((err as Error).message || "PDF oluşturulamadı.");
    } finally {
      setConverting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPages([]);
    setResult(null);
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
          if (f) loadPDF(f);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) loadPDF(e.target.files[0]);
            e.target.value = "";
          }}
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">
            {dropActive ? "Dosyayı bırakın" : "Dosya seçin veya sürükleyin"}
          </p>
          <p className="mt-1 text-xs text-slate-400">Tek PDF dosyası</p>
        </div>
      </div>
    );
  }

  // ── Editor screen ─────────────────────────────────────────────────────────

  return (
    <div className="mt-5">
      {/* File strip */}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="truncate text-sm font-medium text-slate-700">{file.name}</span>
        </div>
        <button
          onClick={reset}
          className="ml-4 shrink-0 text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          Değiştir
        </button>
      </div>

      {/* Initial loading spinner */}
      {loadingThumbs && pages.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16">
          <svg className="h-6 w-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-slate-500">Sayfalar yükleniyor...</p>
        </div>
      )}

      {/* Thumbnail grid */}
      {pages.length > 0 && (
        <>
          <p className="mb-3 text-xs text-slate-400">
            {loadingThumbs
              ? `Yükleniyor... (${pages.length} sayfa)`
              : `${pages.length} sayfa · Sürükleyerek sıralayın`}
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 gap-4 pb-2">
                {pages.map((item) => (
                  <SortablePage key={item.id} item={item} onDelete={deletePage} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      {/* All pages deleted */}
      {!loadingThumbs && pages.length === 0 && (
        <div className="py-10 text-center">
          <p className="text-sm text-slate-500">Tüm sayfalar silindi.</p>
          <button onClick={reset} className="mt-2 text-sm text-blue-600 underline">
            Yeni dosya yükle
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create PDF button */}
      {pages.length > 0 && !loadingThumbs && (
        <button
          onClick={createPDF}
          disabled={converting}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {converting ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Oluşturuluyor...
            </>
          ) : (
            "PDF Oluştur"
          )}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">PDF oluşturuldu!</p>
              <p className="mt-0.5 text-xs text-emerald-600">{pages.length} sayfa</p>
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
            Düzenlenmiş PDF'i İndir
          </a>
        </div>
      )}
    </div>
  );
}
