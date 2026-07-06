"use client";
import { ChevronDown, Check } from "lucide-react";
import type { ReactNode } from "react";

// カテゴリ名をクリックすると縦のドロップダウンを開く汎用メニュー（開閉は親が制御）。
export function Menu({ label, icon, open, onToggle, width = "w-56", children }: { label: string; icon?: ReactNode; open: boolean; onToggle: () => void; width?: string; children: ReactNode }) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-semibold transition ${open ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}
      >
        {icon}
        {label}
        <ChevronDown size={13} className="text-slate-400" />
      </button>
      {open && (
        <div className={`absolute left-0 top-full z-50 mt-1 ${width} rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl`}>{children}</div>
      )}
    </div>
  );
}

export function MenuItem({ icon, children, onClick, disabled, active, danger, hint }: { icon?: ReactNode; children: ReactNode; onClick?: () => void; disabled?: boolean; active?: boolean; danger?: boolean; hint?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold ${disabled ? "cursor-default opacity-40" : danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-100"}`}
    >
      <span className="grid w-4 shrink-0 place-items-center text-slate-400">{icon}</span>
      <span className="flex-1">{children}</span>
      {hint && <span className="shrink-0 text-[10px] font-normal text-slate-300">{hint}</span>}
      {active && <Check size={13} className="shrink-0 text-sky-500" />}
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1 border-t border-slate-100" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="px-2 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{children}</p>;
}
