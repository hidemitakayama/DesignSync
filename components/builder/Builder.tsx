"use client";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useBuilder } from "@/lib/store";
import PropertiesPanel from "./PropertiesPanel";

// Canvas / LayersPanel は dnd-kit を使う。dnd-kit の useSortable は SSR とクライアントで
// aria の採番がズレてハイドレーション不一致になりうるため、SSR無効で動的読み込みする。
const Canvas = dynamic(() => import("./Canvas"), {
  ssr: false,
  loading: () => <div className="flex-1 bg-slate-100" />,
});
const LayersPanel = dynamic(() => import("./LayersPanel"), {
  ssr: false,
  loading: () => <div className="w-64 shrink-0 border-r border-slate-200 bg-white" />,
});

// ビルダーの3ペイン：左＝レイヤー一覧 / 中央＝プレビュー / 右＝プロパティ編集。
// クライアントにはレイヤー一覧を出さない（構造は触らせず、文字の編集だけしてもらう）。
export default function Builder() {
  const admin = useBuilder((s) => s.mode === "admin");

  // キーボード：Delete=削除 / Esc=選択解除 / ⌘D=複製（入力中は無効）。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const st = useBuilder.getState();
      const admin = st.mode === "admin"; // クライアントは構造変更不可（内容編集のみ）
      if (e.key === "Escape") { st.select(null); return; }
      if (!admin) return;
      if ((e.key === "Delete" || e.key === "Backspace") && (st.selectedIds.length || st.selectedId)) { e.preventDefault(); st.removeSelected(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d" && st.selectedId) { e.preventDefault(); st.copyNode(); st.pasteNode(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden">
      {admin && <LayersPanel />}
      <Canvas />
      <PropertiesPanel />
    </div>
  );
}
