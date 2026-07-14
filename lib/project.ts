// プロジェクト全体（ビルダー＋スタジオ）を1つのJSONに保存／復元する。
// データをそのまま入出力するので無劣化。バックアップ・別環境への移行・自動保存に使う。

import { useBuilder, bumpUid } from "./store";
import { useStudio } from "./studioStore";
import type { Page, AssetItem, StudioElement, PageTemplate } from "./types";

export interface ProjectFile {
  app: "designsync";
  version: number;
  builder: { page: Page; spPage?: Page | null; assets: AssetItem[]; templates?: PageTemplate[] };
  studio: { elements: StudioElement[] };
}

// 同梱の既定プロジェクト（public/designsync-seed.json）。
// デプロイ先を初めて開いたブラウザは、これを既定として読み込む（＝クライアントにも同じテンプレートが見える）。
export const SEED_PROJECT_URL = "/designsync-seed.json";

// 現在の全データをJSON文字列にする。page=PC版、spPage=SP版 を常に正規化して保存。
export function serializeProject(): string {
  const b = useBuilder.getState();
  const s = useStudio.getState();
  const pc = b.editing === "pc" ? b.page : b.altPage;
  const sp = b.editing === "sp" ? b.page : b.altPage;
  const data: ProjectFile = {
    app: "designsync",
    version: 1,
    builder: { page: pc ?? b.page, spPage: sp ?? null, assets: b.assets, templates: b.templates },
    studio: { elements: s.elements },
  };
  return JSON.stringify(data);
}

// JSON文字列を検証して両ストアへ反映（読み込み）。setState 経由なので Undo で戻せる。
export function applyProject(json: string): void {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("JSONを解析できませんでした（ファイルが壊れている可能性）");
  }
  if (!data || typeof data !== "object") throw new Error("プロジェクト形式ではありません");
  const d = data as Partial<ProjectFile>;

  const hasBuilder = !!d.builder?.page && Array.isArray(d.builder.page.children);
  const hasStudio = Array.isArray(d.studio?.elements);
  if (!hasBuilder && !hasStudio) throw new Error("DesignSyncのプロジェクトファイルではないようです");

  if (hasBuilder && d.builder) {
    const cur = useBuilder.getState();
    const assets = Array.isArray(d.builder.assets) && d.builder.assets.length ? d.builder.assets : cur.assets;
    const templates = Array.isArray(d.builder.templates) && d.builder.templates.length ? d.builder.templates : cur.templates;
    // 取り込むデータのIDに合わせて採番カウンタを引き上げる（新規採番との衝突＝ID重複を防ぐ）。
    bumpUid(d.builder.page, assets, templates);
    if (d.builder.spPage) bumpUid(d.builder.spPage, assets, templates);
    useBuilder.setState({
      page: d.builder.page, // 常にPC版を編集対象にして読み込む
      altPage: d.builder.spPage ?? null, // SP版（あれば）
      editing: "pc",
      // テンプレ/アセットを持たないファイル（ページのみ等）の読み込みで、既存を消さない（データ保護）。
      assets,
      templates,
      selectedId: null,
      selectedIds: [],
    });
  }
  if (hasStudio && d.studio) {
    useStudio.setState({ elements: d.studio.elements, selectedIds: [] });
  }
}
