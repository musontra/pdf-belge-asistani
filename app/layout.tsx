import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PDF Belge Asistanı",
  description: "Yapay zeka destekli PDF belge asistanı",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${geist.variable} h-full`}>
      <body className="h-full bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
