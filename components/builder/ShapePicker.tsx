"use client";
import { useBuilder } from "@/lib/store";
import { SHAPES } from "@/lib/shapes";
import { svgScalable } from "@/lib/svg";

// ビルダーの「図形」から開く挿入モーダル。基本図形（SVG）をキャンバスに配置する。
export default function ShapePicker({ onClose }: { onClose: () => void }) {
  const addShape = useBuilder((s) => s.addShape);
  return (
    <div onPointerDown={onClose} className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div onPointerDown={(e) => e.stopPropagation()} className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">図形を挿入</h2>
            <p className="text-[11px] text-slate-400">クリックで配置。色・不透明度・マスク・パス変形はあとから編集できます。</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900">✕</button>
        </div>
        <div className="grid grid-cols-4 gap-3 overflow-y-auto p-4 sm:grid-cols-5">
          {SHAPES.map((sh) => (
            <button
              key={sh.key}
              title={sh.label}
              onClick={() => { addShape(sh.svg); onClose(); }}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-sky-500 hover:bg-sky-50"
            >
              <div className="h-10 w-10 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svgScalable(sh.svg) }} />
              <span className="w-full truncate text-center text-[11px] text-slate-600">{sh.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
