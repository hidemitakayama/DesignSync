// プロジェクト全体（ビルダー＋スタジオ）を1つのJSONに保存／復元する。
// データをそのまま入出力するので無劣化。バックアップ・別環境への移行・自動保存に使う。

import { useBuilder } from "./store";
import { useStudio } from "./studioStore";
import type { Page, AssetItem, StudioElement, PageTemplate } from "./types";

export interface ProjectFile {
  app: "designsync";
  version: number;
  builder: { page: Page; assets: AssetItem[]; templates?: PageTemplate[] };
  studio: { elements: StudioElement[] };
}

// 現在の全データをJSON文字列にする。
export function serializeProject(): string {
  const b = useBuilder.getState();
  const s = useStudio.getState();
  const data: ProjectFile = {
    app: "designsync",
    version: 1,
    builder: { page: b.page, assets: b.assets, templates: b.templates },
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
    useBuilder.setState({
      page: d.builder.page,
      assets: Array.isArray(d.builder.assets) ? d.builder.assets : [],
      templates: Array.isArray(d.builder.templates) ? d.builder.templates : [],
      selectedId: null,
    });
  }
  if (hasStudio && d.studio) {
    useStudio.setState({ elements: d.studio.elements, selectedIds: [] });
  }
}
