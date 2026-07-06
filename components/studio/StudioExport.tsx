"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { useStudio } from "@/lib/studioStore";
import { exportStudio, type ExportFormat } from "@/lib/studioExport";
import { saveBlob } from "@/lib/download";

// 左パネル下部：作ったものを SVG / PNG / JPEG / WebP で保存する。
// スコープ＝全体 or 選択中の要素だけ。保存時は保存先フォルダを選べる（対応ブラウザ）。
const FORMATS: { key: ExportFormat; label: string; ext: string; mime: string }[] = [
  { key: "svg", label: "SVG", ext: "svg", mime: "image/svg+xml" },
  { key: "png", label: "PNG", ext: "png", mime: "image/png" },
  { key: "jpeg", label: "JPEG", ext: "jpg", mime: "image/jpeg" },
  { key: "webp", label: "WebP", ext: "webp", mime: "image/webp" },
];

export default function StudioExport() {
  const elements = useStudio((s) => s.elements);
  const selectedIds = useStudio((s) => s.selectedIds);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [scope, setScope] = useState<"all" | "selected">("all");

  const hasSel = selectedIds.length > 0;
  const useSelected = scope === "selected" && hasSel;
  const targets = useSelected ? elements.filter((e) => selectedIds.includes(e.id)) : elements;

  const run = async (fmt: { key: ExportFormat; ext: string; mime: string }) => {
    if (targets.length === 0) { window.alert(useSelected ? "要素が選択されていません。" : "書き出す要素がありません。"); return; }
    setBusy(fmt.key);
    try {
      const blob = await exportStudio(targets, fmt.key);
      await saveBlob(blob, `${useSelected ? "studio-selection" : "studio"}.${fmt.ext}`, { [fmt.mime]: [`.${fmt.ext}`] });
    } catch (e) {
      window.alert("書き出しに失敗しました：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="border-t border-slate-100 p-2">
      <p className="mb-1.5 flex items-center gap-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        <Download size={11} /> 書き出し
      </p>

      {/* スコープ切替（全体 / 選択） */}
      <div className="mb-1.5 flex gap-1 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setScope("all")}
          className={`flex-1 rounded-md py-1 text-[11px] font-semibold transition ${scope === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          全体
        </button>
        <button
          onClick={() => setScope("selected")}
          disabled={!hasSel}
          className={`flex-1 rounded-md py-1 text-[11px] font-semibold transition disabled:opacity-40 ${scope === "selected" && hasSel ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          選択{hasSel ? `（${selectedIds.length}）` : ""}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {FORMATS.map((f) => (
          <button
            key={f.key}
            onClick={() => run(f)}
            disabled={busy !== null}
            className="flex items-center justify-center rounded-md border border-slate-200 bg-white px-1 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-900 disabled:opacity-50"
          >
            {busy === f.key ? "…" : f.label}
          </button>
        ))}
      </div>
      <p className="mt-1 px-1 text-[10px] leading-relaxed text-slate-400">中身の範囲で書き出します（PNG/WebPは透過・JPEGは白背景）。</p>
    </div>
  );
}
