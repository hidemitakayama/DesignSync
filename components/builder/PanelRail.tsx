"use client";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useUi } from "@/lib/uiStore";

// レールの幅(px)。境界線1pxを含む（box-sizing:border-box）。
// Canvas が「両方畳んだときの編集エリア幅（＝拡大率100%の基準幅）」を求めるのに使うので、
// クラスではなく style で指定して定数と実寸を必ず一致させる。
export const RAIL_W = 37;

// 左右サイドパネルを畳んだときに残す細いレール。クリックで開き直す。
// 畳んでいる間もどちらのパネルか分かるよう、縦書きのラベルを添える。
export default function PanelRail({ side, label }: { side: "left" | "right"; label: string }) {
  const toggle = useUi((s) => (side === "left" ? s.toggleLeftPanel : s.toggleRightPanel));
  const Icon = side === "left" ? PanelLeftOpen : PanelRightOpen;
  return (
    <aside
      style={{ width: RAIL_W }}
      className={`flex shrink-0 flex-col items-center gap-3 bg-white py-2.5 ${side === "left" ? "border-r" : "border-l"} border-slate-200`}
    >
      <button
        onClick={toggle}
        title={`${label}を開く`}
        aria-label={`${label}を開く`}
        className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <Icon size={15} />
      </button>
      <button
        onClick={toggle}
        tabIndex={-1}
        className="text-[11px] font-bold tracking-widest text-slate-400 transition hover:text-slate-700"
        style={{ writingMode: "vertical-rl" }}
      >
        {label}
      </button>
    </aside>
  );
}

// 開いているパネルのヘッダーに置く「畳む」ボタン。
export function PanelCollapseButton({ side }: { side: "left" | "right" }) {
  const toggle = useUi((s) => (side === "left" ? s.toggleLeftPanel : s.toggleRightPanel));
  const Icon = side === "left" ? PanelLeftClose : PanelRightClose;
  return (
    <button
      onClick={toggle}
      title="パネルを畳む"
      aria-label="パネルを畳む"
      className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
    >
      <Icon size={14} />
    </button>
  );
}
