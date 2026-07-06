import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GOOGLE_FONTS_HREF } from "@/lib/fonts";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// テキストで選べる日本語フォントは Google Fonts を <link> で読み込む（ブラウザ側で取得）。
// next/font はビルド時にフォント実体を取得するため、この環境では使えない。URL は lib/fonts.ts で共用。

export const metadata: Metadata = {
  title: "DesignSync — 制約付きWebページビルダー",
  description: "デザインの再現性を保ちつつ、制作効率化とクライアント編集を両立するローコードツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
