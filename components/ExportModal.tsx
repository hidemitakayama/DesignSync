"use client";
import { useEffect, useState } from "react";
import { useBuilder } from "@/lib/store";
import { pageToHtml, pageToResponsiveHtml } from "@/lib/exportHtml";
import type { Page } from "@/lib/types";
import { pageToTailwindHtml, pageToJsx } from "@/lib/exportTailwind";
import { pageHasDriveImages, resolveDriveImages } from "@/lib/importDom";
import { buildEmbeddedFontCss } from "@/lib/fontEmbed";
import { buildCursorPrompt } from "@/lib/exportPrompt";
import { saveBlob } from "@/lib/download";

type Format = "prompt" | "inline" | "tailwind" | "jsx";
const FORMATS: { key: Format; label: string; hint: string; ext: string; mime: string }[] = [
  { key: "prompt", label: "Cursorプロンプト", hint: "Cursorに貼るだけでそっくり再現。JSX＋忠実再現の指示＋使用フォントを1つにまとめたコピペ用。", ext: "md", mime: "text/plain" },
  { key: "inline", label: "HTML（インラインstyle）", hint: "どこでも同じに表示できる完全自己完結HTML。フォント（埋め込み）・画像・SVG込み、外部依存ゼロ。", ext: "html", mime: "text/html" },
  { key: "tailwind", label: "HTML（Tailwind）", hint: "Tailwindクラス付き。Next.js/Tailwindに移しやすい。数値は任意値[..]で厳密一致。", ext: "html", mime: "text/html" },
  { key: "jsx", label: "React（JSX）", hint: "Tailwind付きのReactコンポーネント。Cursor/Next.jsにそのまま貼れる。", ext: "tsx", mime: "text/plain" },
];

// 現在のページを書き出すモーダル。形式を選んでコピー / ダウンロードできる。
export default function ExportModal({ onClose }: { onClose: () => void }) {
  const [format, setFormat] = useState<Format>("prompt");
  const [copied, setCopied] = useState(false);
  // Tailwind/JSX 用オプション
  const [sections, setSections] = useState(true);
  const [tokens, setTokens] = useState(true);
  const [snap, setSnap] = useState(true);
  const [nextImage, setNextImage] = useState(false);
  const [embedFonts, setEmbedFonts] = useState(true); // インラインHTMLでフォントも埋め込み＝完全再現

  const [code, setCode] = useState("生成中…");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const b = useBuilder.getState();
      // PC版・SP版を正規化して取得（SP版があれば1つのHTMLに両方入れる）
      let pc = b.editing === "pc" ? b.page : (b.altPage ?? b.page);
      let sp = b.editing === "sp" ? b.page : b.altPage;
      if (pageHasDriveImages(pc)) pc = await resolveDriveImages(pc); // drive:// を dataURI に
      if (sp && pageHasDriveImages(sp)) sp = await resolveDriveImages(sp);
      let c: string;
      if (format === "prompt") {
        c = buildCursorPrompt(pc, sp);
      } else if (format === "inline") {
        c = sp ? pageToResponsiveHtml(pc, sp) : pageToHtml(pc);
        if (embedFonts) {
          if (!cancelled) setCode("フォントを埋め込み中…（初回は数秒かかります）");
          // PC/SP 両ページの使用文字を集めて埋め込む
          const fontPage: Page = sp ? { id: "f", name: pc.name, children: [...pc.children, ...sp.children] } : pc;
          const faces = await buildEmbeddedFontCss(fontPage).catch(() => "");
          if (faces) {
            // 外部フォント（link/preconnect）を、埋め込み @font-face に置き換え＝外部依存ゼロ
            c = c
              .replace(/\s*<link rel="preconnect"[^>]*>/g, "")
              .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^"]*">/, `<style>\n${faces}\n</style>`);
          }
        }
      } else if (format === "tailwind") {
        c = pageToTailwindHtml(pc, { snap, tokens });
      } else {
        c = pageToJsx(pc, { snap, tokens, sections, nextImage });
      }
      if (!cancelled) setCode(c);
    })();
    return () => { cancelled = true; };
  }, [format, snap, tokens, sections, nextImage, embedFonts]);

  const fmt = FORMATS.find((f) => f.key === format)!;
  const showOpts = format === "tailwind" || format === "jsx";

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  const download = async () => {
    const name = (useBuilder.getState().page.name || "page").replace(/[^\w\-ぁ-んァ-ヶ一-龠]/g, "_");
    await saveBlob(new Blob([code], { type: `${fmt.mime};charset=utf-8` }), `${name}.${fmt.ext}`, { [fmt.mime]: [`.${fmt.ext}`] });
  };

  return (
    <div onPointerDown={onClose} className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div onPointerDown={(e) => e.stopPropagation()} className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">書き出し</h2>
            <p className="text-[11px] text-slate-400">{fmt.hint}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900">✕</button>
        </div>

        {/* 形式タブ */}
        <div className="flex gap-1 border-b border-slate-100 px-5 pt-3">
          {FORMATS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFormat(f.key)}
              className={`rounded-t-md px-3 py-1.5 text-xs font-semibold transition ${format === f.key ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-2">
          <button onClick={copy} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:border-slate-900">
            {copied ? "✅ コピーしました" : "⧉ コードをコピー"}
          </button>
          <button onClick={download} className="rounded-md border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
            ⭳ ダウンロード（.{fmt.ext}）
          </button>
          {format === "inline" && (
            <label className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-slate-500" title="使っている文字だけをサブセット埋め込みし、外部フォント読み込み無しで完全再現します">
              <input type="checkbox" checked={embedFonts} onChange={(e) => setEmbedFonts(e.target.checked)} /> フォント埋め込み（完全再現）
            </label>
          )}
          {showOpts && (
            <div className="ml-auto flex items-center gap-3 text-[11px] font-semibold text-slate-500">
              {format === "jsx" && (
                <label className="flex items-center gap-1"><input type="checkbox" checked={sections} onChange={(e) => setSections(e.target.checked)} /> セクション分割</label>
              )}
              {format === "jsx" && (
                <label className="flex items-center gap-1"><input type="checkbox" checked={nextImage} onChange={(e) => setNextImage(e.target.checked)} /> next/image</label>
              )}
              <label className="flex items-center gap-1"><input type="checkbox" checked={tokens} onChange={(e) => setTokens(e.target.checked)} /> 色をトークン化</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} /> スケールに寄せる</label>
            </div>
          )}
        </div>

        <pre className="flex-1 overflow-auto bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-100">{code}</pre>
      </div>
    </div>
  );
}
