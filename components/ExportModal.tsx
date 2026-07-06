"use client";
import { useEffect, useState } from "react";
import { useBuilder } from "@/lib/store";
import { pageToHtml } from "@/lib/exportHtml";
import { pageToTailwindHtml, pageToJsx } from "@/lib/exportTailwind";
import { pageHasDriveImages, resolveDriveImages } from "@/lib/importDom";
import { saveBlob } from "@/lib/download";

type Format = "inline" | "tailwind" | "jsx";
const FORMATS: { key: Format; label: string; hint: string; ext: string; mime: string }[] = [
  { key: "inline", label: "HTML（インラインstyle）", hint: "そのまま表示できる完結HTML。フォント・画像・SVG込み。", ext: "html", mime: "text/html" },
  { key: "tailwind", label: "HTML（Tailwind）", hint: "Tailwindクラス付き。Next.js/Tailwindに移しやすい。数値は任意値[..]で厳密一致。", ext: "html", mime: "text/html" },
  { key: "jsx", label: "React（JSX）", hint: "Tailwind付きのReactコンポーネント。Cursor/Next.jsにそのまま貼れる。", ext: "tsx", mime: "text/plain" },
];

// 現在のページを書き出すモーダル。形式を選んでコピー / ダウンロードできる。
export default function ExportModal({ onClose }: { onClose: () => void }) {
  const [format, setFormat] = useState<Format>("tailwind");
  const [copied, setCopied] = useState(false);
  // Tailwind/JSX 用オプション
  const [sections, setSections] = useState(true);
  const [tokens, setTokens] = useState(true);
  const [snap, setSnap] = useState(true);
  const [nextImage, setNextImage] = useState(false);

  const [code, setCode] = useState("生成中…");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let page = useBuilder.getState().page;
      if (pageHasDriveImages(page)) page = await resolveDriveImages(page); // drive:// を dataURI に
      const c = format === "inline" ? pageToHtml(page) : format === "tailwind" ? pageToTailwindHtml(page, { snap, tokens }) : pageToJsx(page, { snap, tokens, sections, nextImage });
      if (!cancelled) setCode(c);
    })();
    return () => { cancelled = true; };
  }, [format, snap, tokens, sections, nextImage]);

  const fmt = FORMATS.find((f) => f.key === format)!;
  const showOpts = format !== "inline";

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
