// プロジェクトの3-wayマージ（同時編集用）。
// base=前回同期時点 / mine=ビルダー現在 / theirs=ファイル(Cursor)現在 を比較し、
// 「変更のあった側だけ」を採用して統合する。競合（両方が同じ対象を変更）は mine（ビルダー）優先。
// 粒度：ページ/SPページは「セクション単位」、アセット/テンプレ/スタジオ要素は「ID単位」。

import type { ProjectFile } from "./project";
import type { Page } from "./types";

const j = (x: unknown) => JSON.stringify(x ?? null);

interface HasId { id: string }

// ID配列の3-wayマージ。順序は mine を基本に、theirs で新規追加された要素を末尾へ足す。
function mergeItems<T extends HasId>(base: T[] = [], mine: T[] = [], theirs: T[] = []): T[] {
  const bm = new Map(base.map((x) => [x.id, x] as const));
  const mm = new Map(mine.map((x) => [x.id, x] as const));
  const tm = new Map(theirs.map((x) => [x.id, x] as const));

  const decide = (id: string): T | null => {
    const inB = bm.has(id), inM = mm.has(id), inT = tm.has(id);
    const b = bm.get(id), m = mm.get(id), t = tm.get(id);
    if (inM && inT) {
      const mChanged = !inB || j(m) !== j(b);
      const tChanged = !inB || j(t) !== j(b);
      if (mChanged && tChanged) return m!;      // 競合 → mine 優先
      if (tChanged) return t!;                  // theirs だけ変更
      return m!;                                // mine だけ変更 or どちらも不変
    }
    if (inM && !inT) {
      if (!inB) return m!;                      // mine の新規追加
      return j(m) !== j(b) ? m! : null;         // theirs が削除：mine変更ありなら残す、無ければ削除尊重
    }
    if (!inM && inT) {
      if (!inB) return t!;                      // theirs の新規追加 → 取り込む
      return null;                              // mine が削除 → mine 優先で削除
    }
    return null;
  };

  const out: T[] = [];
  const seen = new Set<string>();
  for (const x of mine) {
    const r = decide(x.id);
    if (r) out.push(r);
    seen.add(x.id);
  }
  for (const x of theirs) {
    if (seen.has(x.id)) continue;
    seen.add(x.id);
    if (!bm.has(x.id)) {                         // theirs 新規（base にも mine にも無い）
      const r = decide(x.id);
      if (r) out.push(r);
    }
  }
  return out;
}

// ページ（PC/SP）のマージ：children（＝セクション群）をID単位でマージ。ページ名等は mine を採用。
function mergePage(base: Page | null | undefined, mine: Page | null | undefined, theirs: Page | null | undefined): Page | null {
  if (!mine && !theirs) return null;
  if (!mine) return theirs ?? null;
  if (!theirs) return mine;
  return { ...mine, children: mergeItems(base?.children ?? [], mine.children ?? [], theirs.children ?? []) };
}

// 全体マージ。パースに失敗したら null（呼び出し側でフォールバック）。
export function mergeProject(baseStr: string, mineStr: string, theirsStr: string): ProjectFile | null {
  let mine: ProjectFile, theirs: ProjectFile, base: ProjectFile | null;
  try { mine = JSON.parse(mineStr); theirs = JSON.parse(theirsStr); } catch { return null; }
  try { base = JSON.parse(baseStr); } catch { base = null; }

  const bB = base?.builder ?? ({} as ProjectFile["builder"]);
  const mB = mine.builder ?? ({} as ProjectFile["builder"]);
  const tB = theirs.builder ?? ({} as ProjectFile["builder"]);

  const page = mergePage(bB.page, mB.page, tB.page) ?? mB.page;
  return {
    app: "designsync",
    version: mine.version ?? 1,
    builder: {
      page,
      spPage: mergePage(bB.spPage, mB.spPage, tB.spPage),
      assets: mergeItems(bB.assets, mB.assets, tB.assets),
      templates: mergeItems(bB.templates ?? [], mB.templates ?? [], tB.templates ?? []),
    },
    studio: { elements: mergeItems(base?.studio?.elements, mine.studio?.elements, theirs.studio?.elements) },
  };
}
