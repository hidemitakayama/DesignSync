"use client";
import { useEffect, useRef, useState } from "react";
import type { TextRun } from "@/lib/types";

// 文章の一部分だけ色を変えられる簡易リッチテキスト。
// 文字を選択 → 色を選んで「選択に適用」。内容は runs（色付き区間）として保存する。
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function rgbToHex(v: string): string {
  const m = /rgba?\(([^)]+)\)/i.exec(v);
  if (!m) return v;
  const [r, g, b] = m[1].split(",").map((x) => parseFloat(x));
  return "#" + [r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")).join("");
}

function runsToHtml(runs: TextRun[], text?: string): string {
  const rs = runs.length ? runs : [{ text: text ?? "" }];
  return rs.map((r) => {
    const t = escapeHtml(r.text).replace(/\n/g, "<br>");
    return r.color ? `<span style="color:${r.color}">${t}</span>` : t;
  }).join("");
}

const BLOCK_TAGS = new Set(["DIV", "P"]); // Enterで作られるブロック要素は改行として扱う

function domToRuns(root: HTMLElement): TextRun[] {
  const raw: TextRun[] = [];
  const endsWithNL = () => raw.length > 0 && raw[raw.length - 1].text.endsWith("\n");
  const walk = (node: Node, color?: string) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const t = child.textContent ?? "";
        if (t) raw.push({ text: t, color });
      } else if (child.nodeName === "BR") {
        raw.push({ text: "\n", color });
      } else if (child instanceof HTMLElement) {
        const isBlock = BLOCK_TAGS.has(child.nodeName);
        // ブロック要素の前で改行（先頭や直前が改行のときは重複させない）
        if (isBlock && raw.length && !endsWithNL()) raw.push({ text: "\n", color });
        // 空ブロック(<div><br></div>) は上の改行だけにして中の <br> はスキップ（二重改行を防ぐ）
        const onlyBr = child.childNodes.length === 1 && child.firstChild?.nodeName === "BR";
        if (!(isBlock && onlyBr)) walk(child, child.style.color ? rgbToHex(child.style.color) : color);
      }
    });
  };
  walk(root);
  const merged: TextRun[] = [];
  for (const r of raw) {
    const last = merged[merged.length - 1];
    if (last && (last.color ?? "") === (r.color ?? "")) last.text += r.text;
    else merged.push({ ...r });
  }
  return merged;
}

// 選択部分に適用できる色（OSのカラーパネルを開かず、その場のスウォッチで選ぶ）
const PRESET_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#22c55e", "#14b8a6", "#0ea5e9", "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#111827"];

export default function RichTextEditor({ runs, text, onChange }: { runs?: TextRun[]; text?: string; onChange: (runs: TextRun[] | undefined, text: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [hasSelection, setHasSelection] = useState(false); // 文字を選択中だけ色スウォッチを出す

  // 初期内容のみ設定（以降は非制御＝カーソル飛び防止）。key で要素切替時に再マウントされる前提。
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = runsToHtml(runs ?? [], text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = () => {
    const el = ref.current;
    if (!el) return;
    const rs = domToRuns(el);
    const plain = rs.map((r) => r.text).join("");
    onChange(rs.some((r) => r.color) ? rs : undefined, plain);
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
      setHasSelection(!sel.isCollapsed); // 範囲選択があるときだけ色スウォッチを表示
    }
  };

  const applyColor = (c: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (savedRange.current && sel) { sel.removeAllRanges(); sel.addRange(savedRange.current); }
    if (!sel || sel.isCollapsed) return; // 選択なしなら何もしない
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("foreColor", false, c);
    saveSelection();
    commit();
  };

  const clearColor = () => applyColor("inherit"); // 基本色に戻す

  return (
    <div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        // Enter はブロック(<div>)ではなく <br> を挿入させる（＝改行を確実に反映）
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); document.execCommand("insertLineBreak"); } }}
        onBlur={() => { commit(); setHasSelection(false); }}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        className="min-h-[4rem] w-full whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-sky-400"
      />
      {/* 文字を選択したときだけ色スウォッチを表示（内容の編集を妨げない） */}
      {hasSelection ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-slate-400">選択部分の色：</span>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyColor(c)}
              style={{ background: c }}
              className="h-5 w-5 rounded-full border border-slate-200 shadow-sm transition hover:scale-110"
              title="選択部分にこの色を適用"
            />
          ))}
          <button onMouseDown={(e) => e.preventDefault()} onClick={clearColor} className="ml-0.5 rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-400 hover:border-slate-400">色を解除</button>
        </div>
      ) : (
        <p className="mt-1 text-[10px] text-slate-400">文字を選択すると、一部だけ色を変えられます。</p>
      )}
    </div>
  );
}
