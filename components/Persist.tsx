"use client";
import { useEffect } from "react";
import { useBuilder, builderHistory } from "@/lib/store";
import { useStudio, studioHistory } from "@/lib/studioStore";
import { useUi } from "@/lib/uiStore";

// マウント後に localStorage から復元する。
// （store は skipHydration にしてあるので、SSR/初回描画は初期状態のまま＝不一致を回避）
// 復元自体は undo 対象にしたくないので、復元完了後に履歴をクリアする。
export default function Persist() {
  useEffect(() => {
    Promise.resolve(useBuilder.persist.rehydrate()).then(() => builderHistory.clear());
    Promise.resolve(useStudio.persist.rehydrate()).then(() => studioHistory.clear());
    useUi.persist.rehydrate();
  }, []);
  return null;
}
