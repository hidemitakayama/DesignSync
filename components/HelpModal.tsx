"use client";
import { useEffect } from "react";
import { X, Keyboard } from "lucide-react";
import { SHORTCUTS } from "@/lib/shortcuts";

// ショートカットのマニュアル（一覧）。? キー、またはヘッダーの「?」から開く。
export default function HelpModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div onPointerDown={onClose} className="fixed inset-0 z-[70] grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div onPointerDown={(e) => e.stopPropagation()} className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-sky-500" />
            <h2 className="text-base font-extrabold text-slate-900">キーボードショートカット</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="閉じる（Esc）"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-5 overflow-auto p-5 sm:grid-cols-2">
          {SHORTCUTS.map((group) => (
            <section key={group.title} className="break-inside-avoid">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-sky-600">{group.title}</h3>
              <dl className="space-y-1">
                {group.items.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-md px-1 py-1 text-sm hover:bg-slate-50">
                    <dt className="text-slate-600">{s.desc}</dt>
                    <dd className="shrink-0">
                      {s.keys.split(" / ").map((k, j) => (
                        <span key={j}>
                          {j > 0 && <span className="mx-1 text-[10px] text-slate-300">/</span>}
                          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600 shadow-[0_1px_0_rgb(226_232_240)]">{k}</kbd>
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <div className="border-t border-slate-100 px-5 py-2.5 text-[11px] text-slate-400">
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px]">?</kbd> でいつでもこの一覧を開けます。⌘は Mac、Ctrl は Windows です。
        </div>
      </div>
    </div>
  );
}
