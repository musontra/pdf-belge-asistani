import Link from "next/link";

const tools = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "PDF → Word",
    description: "PDF'i düzenlenebilir DOCX'e çevir.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M3 14h18M10 3v18M14 3v18M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      </svg>
    ),
    title: "PDF → Excel",
    description: "Tabloları ve verileri XLSX'e aktar.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Görsel → PDF",
    description: "JPG / PNG'yi PDF'e dönüştür.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
      </svg>
    ),
    title: "PDF Sıkıştır",
    description: "Dosya boyutunu küçült.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    title: "PDF Birleştir",
    description: "Birden fazla PDF'i tek dosyada birleştir.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
      </svg>
    ),
    title: "PDF Böl",
    description: "İstediğin sayfaları ayır.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Nav */}
      <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-slate-900">PDF Araç Seti</span>
        </div>
        <Link
          href="/app"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Uygulamayı Aç
        </Link>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-xs font-medium text-blue-700">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Dönüştürme araçları + Türkçe AI asistan
        </div>

        <h1 className="mt-6 max-w-2xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          PDF&apos;lerinizi{" "}
          <span className="text-blue-600">Dönüştürün, Anlayın, Yönetin</span>
        </h1>

        <p className="mt-5 max-w-lg text-lg text-slate-500">
          Dönüştürme araçları + Türkçe AI asistan. Tek platformda.
        </p>

        <Link
          href="/app"
          className="mt-10 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg active:scale-95"
        >
          Ücretsiz Kullan
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>

        {/* Araç kartları */}
        <div className="mt-20 grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
          {tools.map((t) => (
            <Link
              key={t.title}
              href="/app"
              className="group flex flex-col items-center rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:shadow"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600 transition group-hover:bg-blue-200">
                {t.icon}
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-800">{t.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.description}</p>
            </Link>
          ))}
        </div>

        {/* AI asistanı açıklama */}
        <div className="mt-16 flex w-full max-w-3xl items-center gap-6 rounded-2xl border border-slate-100 bg-slate-50 p-6 text-left">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-white">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Her araçta AI asistanı</h3>
            <p className="mt-1 text-sm text-slate-500">
              Bir PDF yüklediğinizde AI asistanı otomatik devreye girer. Belgeyi özetleyin, veri çıkarın ya da Türkçe sorular sorun — dönüştürme yaparken.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        PDF Araç Seti — Dönüştürme + Türkçe AI asistan
      </footer>
    </div>
  );
}
