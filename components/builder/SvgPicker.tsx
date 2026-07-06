"use client";
import { useBuilder } from "@/lib/store";
import { svgScalable } from "@/lib/svg";

// ビルダーの「SVG」から開く選択モーダル。
// ①アセットライブラリに登録済みの SVG を一覧し、クリックでキャンバスに挿入する。
export default function SvgPicker({ onClose }: { onClose: () => void }) {
  // セレクタ内で filter すると毎回新しい配列参照になり、useSyncExternalStore が
  // 無限ループ警告を出す。生の assets を購読し、フィルタはレンダー本体で行う。
  const assets = useBuilder((s) => s.assets);
  const addAssetAtom = useBuilder((s) => s.addAssetAtom);
  const setView = useBuilder((s) => s.setView);
  const svgAssets = assets.filter((a) => a.kind === "svg");

  return (
    <div onPointerDown={onClose} className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div onPointerDown={(e) => e.stopPropagation()} className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">SVGを選ぶ</h2>
            <p className="text-[11px] text-slate-400">アセットライブラリに登録済みのSVGから選んで配置します。</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {svgAssets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
              <p className="text-sm text-slate-500">登録済みのSVGがありません。</p>
              <button
                onClick={() => { setView("assets"); onClose(); }}
                className="mt-3 rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
              >
                アセットライブラリで登録する
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {svgAssets.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { addAssetAtom(a); onClose(); }}
                  title={a.name}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-sky-500 hover:bg-sky-50"
                >
                  <div className="h-12 w-12 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svgScalable(a.svg ?? "") }} />
                  <span className="w-full truncate text-center text-[11px] text-slate-600">{a.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
