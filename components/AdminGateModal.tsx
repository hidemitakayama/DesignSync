"use client";
import { useEffect, useRef, useState } from "react";
import { X, ShieldCheck } from "lucide-react";

const ADMIN_PASSWORD = "password";

// 管理者モードの解錠。トグルを管理者側に切り替えたときに出て、正しいパスワードでのみ解錠する。
export default function AdminGateModal({ onUnlock, onClose }: { onUnlock: () => void; onClose: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === ADMIN_PASSWORD) onUnlock();
    else { setError(true); setValue(""); inputRef.current?.focus(); }
  };

  return (
    <div onPointerDown={onClose} className="fixed inset-0 z-[70] grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-sky-500" />
            <h2 className="text-base font-extrabold text-slate-900">管理者モード</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="閉じる（Esc）"><X size={18} /></button>
        </div>

        <div className="space-y-3 p-5">
          <p className="text-sm text-slate-600">管理者機能を使うにはパスワードを入力してください。</p>
          <input
            ref={inputRef}
            type="password"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(false); }}
            placeholder="パスワード"
            autoComplete="current-password"
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 ${error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-sky-400 focus:ring-sky-100"}`}
          />
          {error && <p className="text-xs font-semibold text-rose-600">パスワードが違います。</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">キャンセル</button>
          <button type="submit" disabled={!value} className="rounded-md bg-sky-500 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-40">解錠</button>
        </div>
      </form>
    </div>
  );
}
