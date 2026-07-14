"use client";
import { MASK_SHAPES } from "@/lib/mask";

// 画像マスク（図形/SVGで切り抜き）の共通UI。ビルダー・スタジオ双方の画像設定で使う。
// onChange は { maskShape?, maskSvg? } を返す（空文字＝解除）。SVG があれば図形より優先。
export function MaskControls({
  shape,
  svg,
  onChange,
}: {
  shape?: string;
  svg?: string;
  onChange: (m: { maskShape?: string; maskSvg?: string }) => void;
}) {
  const customActive = !!(svg && svg.trim());
  const active = shape || customActive;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-600">マスク（切り抜き）</span>
        {active && (
          <button onClick={() => onChange({ maskShape: "", maskSvg: "" })} className="text-[10px] text-slate-400 underline hover:text-slate-700">
            解除
          </button>
        )}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {MASK_SHAPES.map((sh) => {
          const on = !customActive && shape === sh.key;
          return (
            <button
              key={sh.key}
              title={sh.label}
              onClick={() => onChange({ maskShape: sh.key, maskSvg: "" })}
              className={`grid aspect-square place-items-center rounded-md border p-1.5 transition ${on ? "border-sky-500 bg-sky-50" : "border-slate-200 hover:border-slate-400"}`}
            >
              <svg
                viewBox="0 0 100 100"
                className="h-full w-full"
                preserveAspectRatio="xMidYMid meet"
                dangerouslySetInnerHTML={{ __html: sh.inner.replace(/<(ellipse|rect|polygon|path)/, `<$1 fill="${on ? "#0ea5e9" : "#94a3b8"}"`) }}
              />
            </button>
          );
        })}
      </div>
      <textarea
        value={svg ?? ""}
        onChange={(e) => onChange({ maskSvg: e.target.value })}
        placeholder="任意SVGを貼り付け（塗り部分の形で切り抜き）"
        rows={2}
        className={`w-full rounded-md border px-2 py-1 text-[11px] ${customActive ? "border-sky-500 bg-sky-50" : "border-slate-300"}`}
      />
      <p className="text-[10px] leading-relaxed text-slate-400">図形を選ぶか、SVGを貼り付けると画像がその形に切り抜かれます（SVGが優先）。</p>
    </div>
  );
}
