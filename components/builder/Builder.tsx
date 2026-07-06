"use client";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useBuilder } from "@/lib/store";
import LayersPanel from "./LayersPanel";
import PropertiesPanel from "./PropertiesPanel";

// Canvas は dnd-kit を使う。dnd-kit の useSortable はモジュール内カウンタで
// aria-describedby を採番するため SSR とクライアントで番号がズレ、ハイドレーション不一致になる。
// ビルダーはクライアント専用ツールでSSRの必要がないので、Canvas はSSR無効で動的読み込みする。
const Canvas = dynamic(() => import("./Canvas"), {
  ssr: false,
  loading: () => <div className="flex-1 bg-slate-100" />,
});

// ビルダーの3ペイン：左＝レイヤー一覧 / 中央＝プレビュー / 右＝プロパティ編集。
export default function Builder() {
  // キーボード：Delete=削除 / Esc=選択解除 / ⌘D=複製（入力中は無効）。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const st = useBuilder.getState();
      const admin = st.mode === "admin"; // クライアントは構造変更不可（内容編集のみ）
      if (e.key === "Escape") { st.select(null); return; }
      if (!admin) return;
      if ((e.key === "Delete" || e.key === "Backspace") && st.selectedId) { e.preventDefault(); st.removeNode(st.selectedId); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d" && st.selectedId) { e.preventDefault(); st.copyNode(); st.pasteNode(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden">
      <LayersPanel />
      <Canvas />
      <PropertiesPanel />
    </div>
  );
}
