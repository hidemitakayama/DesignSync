"use client";
import { useEffect } from "react";
import { useBuilder, builderHistory } from "@/lib/store";
import { useStudio, studioHistory } from "@/lib/studioStore";
import { useUi } from "@/lib/uiStore";
import { applyProject, SEED_PROJECT_URL } from "@/lib/project";

// マウント後に localStorage から復元する。
// （store は skipHydration にしてあるので、SSR/初回描画は初期状態のまま＝不一致を回避）
//
// 起動時は必ずクライアントモード。クライアントには「同梱の既定プロジェクト
// designsync-seed.json」を常に正として見せる（localStorage の内容は表示に使わない）。
// こうしないと、テンプレートを作り直してIDが変わったとき、以前の訪問で保存された
// 古いテンプレートがブラウザに残り、新旧が並んでしまう。
//
// 管理者は解錠時（TopBar の toAdmin）に localStorage から自分のデータへ復元する。
// なので rehydrate 自体はここで済ませておく。
// 復元・読み込みは undo 対象にしたくないので、完了後に履歴をクリアする。
export default function Persist() {
  useEffect(() => {
    (async () => {
      await Promise.resolve(useBuilder.persist.rehydrate());
      await Promise.resolve(useStudio.persist.rehydrate());
      useUi.persist.rehydrate();

      try {
        const res = await fetch(SEED_PROJECT_URL);
        // 同梱ファイルが取れないときは、復元した内容のまま動かす（従来どおり）。
        if (res.ok && useBuilder.getState().mode === "client") applyProject(await res.text());
      } catch { /* 取得失敗時も通常どおり動く */ }

      builderHistory.clear();
      studioHistory.clear();
    })();
  }, []);
  return null;
}
