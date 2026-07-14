"use client";
import { useEffect } from "react";
import { useBuilder, builderHistory } from "@/lib/store";
import { useStudio, studioHistory } from "@/lib/studioStore";
import { useUi } from "@/lib/uiStore";
import { applyProject, mergeSeedTemplates, SEED_PROJECT_URL } from "@/lib/project";

const STORE_KEY = "design-sync-v1"; // useBuilder の persist キー

// マウント後に localStorage から復元する。
// （store は skipHydration にしてあるので、SSR/初回描画は初期状態のまま＝不一致を回避）
// 保存が無い（＝そのブラウザで初めて開いた）場合は、同梱の既定プロジェクト designsync-seed.json を読む。
// これでデプロイ先を見るクライアントにも、こちらと同じテンプレート一式が見える。
// 復元・読み込み自体は undo 対象にしたくないので、完了後に履歴をクリアする。
export default function Persist() {
  useEffect(() => {
    (async () => {
      const first = typeof window !== "undefined" && window.localStorage.getItem(STORE_KEY) === null;
      await Promise.resolve(useBuilder.persist.rehydrate());
      await Promise.resolve(useStudio.persist.rehydrate());
      useUi.persist.rehydrate();

      try {
        const res = await fetch(SEED_PROJECT_URL);
        if (res.ok) {
          const text = await res.text();
          // 初回：同梱プロジェクトをそのまま既定にする。
          // 2回目以降：既存データは触らず、まだ持っていないテンプレートだけ足す。
          if (first) applyProject(text);
          else mergeSeedTemplates(text);
        }
      } catch { /* 同梱ファイルが取れなくても通常どおり動く */ }

      builderHistory.clear();
      studioHistory.clear();
    })();
  }, []);
  return null;
}
