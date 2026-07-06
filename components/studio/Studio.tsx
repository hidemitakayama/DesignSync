"use client";
import { useEffect } from "react";
import { useStudio } from "@/lib/studioStore";
import type { StudioElementType } from "@/lib/types";
import StudioLayers from "./StudioLayers";
import StudioCanvas from "./StudioCanvas";
import StudioProperties from "./StudioProperties";

const ADD_KEYS: Record<string, StudioElementType> = { r: "rectangle", o: "circle", t: "text", i: "image", s: "svg" };
const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

// スタジオ機能のメイン：左（ツール＋レイヤー）／中央（キャンバス）／右（プロパティ）の3ペイン。
export default function Studio() {
  const selectedIds = useStudio((s) => s.selectedIds);
  const tool = useStudio((s) => s.tool);
  const removeSelected = useStudio((s) => s.removeSelected);
  const select = useStudio((s) => s.select);
  const duplicateSelected = useStudio((s) => s.duplicateSelected);
  const group = useStudio((s) => s.group);
  const ungroup = useStudio((s) => s.ungroup);
  const penCommit = useStudio((s) => s.penCommit);
  const penCancel = useStudio((s) => s.penCancel);
  const setTool = useStudio((s) => s.setTool);

  // スタジオのキーボード操作（入力中は無効）。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const meta = e.metaKey || e.ctrlKey;
      const st = useStudio.getState();

      // ペン中：Enter=確定、Esc=取消（ツール切替キーは下で処理）
      if (tool === "pen") {
        if (e.key === "Enter") { e.preventDefault(); penCommit(); return; }
        if (e.key === "Escape") { penCancel(); return; }
      }

      // ツール切替・要素追加（メタ不要の1文字）
      if (!meta) {
        const key = e.key.toLowerCase();
        if (key === "v") { setTool("select"); return; }
        if (key === "p") { setTool("pen"); return; }
        if (key === "n") { setTool("node"); return; }
        if (ADD_KEYS[key]) { st.add(ADD_KEYS[key]); return; }
      }

      if (meta && e.key.toLowerCase() === "a") { e.preventDefault(); st.selectAll(); return; }
      if (meta && e.key.toLowerCase() === "g") { e.preventDefault(); if (e.shiftKey) ungroup(); else group(); return; }
      if (tool === "node" && e.key === "Escape") { setTool("select"); return; }

      if (selectedIds.length === 0) return;
      if (ARROWS[e.key]) { e.preventDefault(); const [dx, dy] = ARROWS[e.key]; const m = e.shiftKey ? 10 : 1; st.nudgeSelected(dx * m, dy * m); return; }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeSelected(); }
      else if (e.key === "Escape") { select(null); }
      else if (meta && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSelected(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool, selectedIds, removeSelected, select, duplicateSelected, group, ungroup, penCommit, penCancel, setTool]);

  return (
    <div className="flex flex-1 overflow-hidden">
      <StudioLayers />
      <StudioCanvas />
      <StudioProperties />
    </div>
  );
}
