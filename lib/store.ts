// design-sync の状態ストア（Zustand）。ページツリーが唯一の真実。
// プレビュー・レイヤー一覧・プロパティ編集はすべてこの page から導出される。

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { wireHistory } from "./undoable";
import {
  type Page,
  type SceneNode,
  type ContainerNode,
  type AtomNode,
  type AtomType,
  type Mode,
  type AssetItem,
  type View,
  type PageTemplate,
  isContainer,
} from "./types";

// ---- ツリー操作（すべて不変更新） --------------------------------------------
// どちらの種類のノードにも当てられる部分更新。type は種類を決める判別子なので
// 変更対象から外す（ContainerNode & AtomNode をそのまま交差すると type が never 化する）。
export type NodePatch = Partial<Omit<ContainerNode, "type"> & Omit<AtomNode, "type">>;

function patchTree(nodes: SceneNode[], id: string, patch: NodePatch): SceneNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, ...patch } as SceneNode;
    if (isContainer(n)) return { ...n, children: patchTree(n.children, id, patch) };
    return n;
  });
}

function removeFromTree(nodes: SceneNode[], id: string): SceneNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => (isContainer(n) ? { ...n, children: removeFromTree(n.children, id) } : n));
}

// 配列内の要素を from→to へ移動（不変）
function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// activeId と overId が“同じ親”に属するときだけ、その並びを入れ替える（＝同一コンテナ内の並び替え）。
// これにより出力は order の変化のみ＝Flexbox制約を完全に維持する。
function reorderTree(nodes: SceneNode[], activeId: string, overId: string): SceneNode[] {
  const ai = nodes.findIndex((n) => n.id === activeId);
  const oi = nodes.findIndex((n) => n.id === overId);
  if (ai !== -1 && oi !== -1) return arrayMove(nodes, ai, oi);
  return nodes.map((n) => (isContainer(n) ? { ...n, children: reorderTree(n.children, activeId, overId) } : n));
}

function insertChild(nodes: SceneNode[], parentId: string, child: SceneNode): SceneNode[] {
  return nodes.map((n) => {
    if (!isContainer(n)) return n;
    if (n.id === parentId) return { ...n, children: [...n.children, child] };
    return { ...n, children: insertChild(n.children, parentId, child) };
  });
}

export function findNode(page: Page, id: string | null): SceneNode | null {
  if (!id) return null;
  const walk = (nodes: SceneNode[]): SceneNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (isContainer(n)) {
        const hit = walk(n.children);
        if (hit) return hit;
      }
    }
    return null;
  };
  return walk(page.children);
}

// 挿入先コンテナの決定：選択がコンテナならそこ、Atomならその親、無ければ最後のSection
function resolveParentId(page: Page, selectedId: string | null): string | null {
  const sel = findNode(page, selectedId);
  if (sel && isContainer(sel)) return sel.id;
  if (sel) {
    // Atom の親コンテナを探す
    const findParent = (nodes: SceneNode[], childId: string): string | null => {
      for (const n of nodes) {
        if (isContainer(n)) {
          if (n.children.some((c) => c.id === childId)) return n.id;
          const deep = findParent(n.children, childId);
          if (deep) return deep;
        }
      }
      return null;
    };
    const p = findParent(page.children, sel.id);
    if (p) return p;
  }
  return page.children.length ? page.children[page.children.length - 1].id : null;
}

// ---- ID 採番（クライアント操作のみ・SSR不一致は起きない） ---------------------
let uid = 0;
const nid = (prefix: string) => `n${++uid}-${prefix}`;

// コピー＆ペースト用のクリップボード（アプリ内・保存しない）
let builderClipboard: SceneNode | null = null;

// ノード（サブツリー）を新しいIDで複製する
function cloneNodeNewIds(n: SceneNode): SceneNode {
  if (isContainer(n)) return { ...n, id: nid(n.type), children: n.children.map(cloneNodeNewIds) };
  return { ...n, id: nid(n.atomType) };
}

// ---- 新規ノードのひな型 ------------------------------------------------------
function newSection(): Omit<ContainerNode, "children"> {
  return {
    id: nid("section"),
    type: "section",
    name: "新しいセクション",
    direction: "column",
    justify: "flex-start",
    align: "stretch",
    gap: 16,
    padding: 48,
    background: "#ffffff",
  };
  // children は呼び出し側で付与する
}
function newGroup(): ContainerNode {
  return {
    id: nid("group"),
    type: "group",
    name: "新しいグループ",
    direction: "column",
    justify: "flex-start",
    align: "stretch",
    gap: 12,
    padding: 16,
    background: "#f8fafc",
    radius: 8,
    children: [],
  };
}
function newAtom(kind: AtomType): AtomNode {
  if (kind === "image") {
    return { id: nid("image"), type: "atom", atomType: "image", name: "画像", src: "https://placehold.co/240x160/e2e8f0/64748b?text=Image", alt: "", width: 240, height: 160 };
  }
  if (kind === "svg") {
    return {
      id: nid("svg"),
      type: "atom",
      atomType: "svg",
      name: "SVG",
      width: 48,
      height: 48,
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    };
  }
  return { id: nid("text"), type: "atom", atomType: "text", name: "テキスト", text: "テキストを入力", style: { fontSize: 16, fontWeight: 500, color: "#0f172a", align: "left" } };
}

// ---- 初期サンプルページ ------------------------------------------------------
function samplePage(): Page {
  const t = (id: string, text: string, style: AtomNode["style"]): AtomNode => ({ id, type: "atom", atomType: "text", name: text.slice(0, 8) || "テキスト", text, style });
  return {
    id: "page-1",
    name: "サンプルLP",
    children: [
      {
        id: "sec-hero",
        type: "section",
        name: "ヒーロー",
        direction: "column",
        justify: "center",
        align: "center",
        gap: 20,
        padding: 64,
        background: "#0f172a",
        children: [
          {
            id: "grp-hero-copy",
            type: "group",
            name: "見出し群",
            direction: "column",
            justify: "center",
            align: "center",
            gap: 10,
            padding: 0,
            children: [
              t("atom-h1", "業務を、もっとシンプルに。", { fontSize: 40, fontWeight: 800, color: "#ffffff", align: "center" }),
              t("atom-sub", "制約付きビルダーで、デザインを100%再現。", { fontSize: 18, fontWeight: 400, color: "#cbd5e1", align: "center" }),
            ],
          },
          {
            id: "grp-cta",
            type: "group",
            name: "CTAボタン",
            direction: "row",
            justify: "center",
            align: "center",
            gap: 8,
            padding: 14,
            background: "#38bdf8",
            radius: 10,
            children: [t("atom-cta", "無料で始める", { fontSize: 16, fontWeight: 700, color: "#0f172a", align: "center" })],
          },
        ],
      },
      {
        id: "sec-features",
        type: "section",
        name: "特徴",
        direction: "column",
        justify: "flex-start",
        align: "stretch",
        gap: 24,
        padding: 48,
        background: "#ffffff",
        children: [
          t("atom-feat-title", "3つの特徴", { fontSize: 28, fontWeight: 800, color: "#0f172a", align: "center" }),
          {
            id: "grp-cards",
            type: "group",
            name: "特徴カード列",
            direction: "row",
            justify: "flex-start",
            align: "stretch",
            gap: 16,
            padding: 0,
            columns: 3, // 1行3枚。ここを2にすると2枚+1枚に折り返す
            children: [
              card("card-1", "100%再現", "データ通りに描画され、崩れません。"),
              card("card-2", "制約付き編集", "Flexboxの制約下で安全に配置。"),
              card("card-3", "2面性の権限", "管理者と顧客で操作を分離。"),
            ],
          },
        ],
      },
    ],
  };

  function card(id: string, title: string, body: string): ContainerNode {
    return {
      id,
      type: "group",
      name: title,
      direction: "column",
      justify: "flex-start",
      align: "flex-start",
      gap: 8,
      padding: 20,
      background: "#f1f5f9",
      radius: 12,
      grow: true,
      children: [
        { id: `${id}-svg`, type: "atom", atomType: "svg", name: "アイコン", width: 32, height: 32, svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>' },
        { id: `${id}-title`, type: "atom", atomType: "text", name: title, text: title, style: { fontSize: 18, fontWeight: 700, color: "#0f172a", align: "left" } },
        { id: `${id}-body`, type: "atom", atomType: "text", name: "本文", text: body, style: { fontSize: 14, fontWeight: 400, color: "#475569", align: "left" } },
      ],
    };
  }
}

// ---- ① アセットライブラリの初期サンプル ------------------------------------
function seedAssets(): AssetItem[] {
  const svg = (paths: string) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  return [
    { id: "asset-check", name: "チェック", kind: "svg", tags: ["アイコン", "確認"], svg: svg('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>') },
    { id: "asset-arrow", name: "右矢印", kind: "svg", tags: ["アイコン", "矢印"], svg: svg('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>') },
    { id: "asset-star", name: "スター", kind: "svg", tags: ["アイコン", "装飾"], svg: svg('<path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>') },
    { id: "asset-photo", name: "サンプル写真", kind: "image", tags: ["画像"], src: "https://placehold.co/240x160/e2e8f0/64748b?text=Photo" },
  ];
}

// 保存データから既存の連番ID(nN-)の最大値を求め、採番カウンタを進めて衝突を防ぐ。
function maxUid(page: Page, assets: AssetItem[]): number {
  let max = 0;
  const scan = (id: string) => {
    const m = /^n(\d+)-/.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  };
  const walk = (nodes: SceneNode[]) => nodes.forEach((n) => { scan(n.id); if (isContainer(n)) walk(n.children); });
  walk(page.children);
  assets.forEach((a) => scan(a.id));
  return max;
}

// ---- ストア本体 --------------------------------------------------------------
// Undo/Redo が復元する対象（ドキュメント＝page と assets）。
interface BuilderSnapshot {
  page: Page;
  assets: AssetItem[];
}

interface BuilderState {
  page: Page;
  selectedId: string | null;
  mode: Mode;
  view: View;
  assets: AssetItem[];
  templates: PageTemplate[];
  // Undo/Redo 履歴（保存対象外）
  undoPast: BuilderSnapshot[];
  undoFuture: BuilderSnapshot[];
  setMode: (m: Mode) => void;
  setView: (v: View) => void;
  select: (id: string | null) => void;
  updateNode: (id: string, patch: NodePatch) => void;
  addSection: () => void;
  addGroup: () => void;
  addAtom: (kind: AtomType) => void;
  addAssetAtom: (asset: AssetItem) => void; // ①のアセットを要素としてキャンバスに挿入
  removeNode: (id: string) => void;
  copyNode: () => void; // 選択中の要素（サブツリー）をコピー
  pasteNode: () => void; // コピーした要素を貼り付け
  reorder: (activeId: string, overId: string) => void; // 同一コンテナ内の並び替え
  // ① アセットライブラリ
  addAsset: (input: Omit<AssetItem, "id">) => void;
  updateAsset: (id: string, patch: Partial<Omit<AssetItem, "id">>) => void;
  removeAsset: (id: string) => void;
  // テンプレート
  saveTemplate: (name: string) => void; // 現在のページをテンプレートとして保存
  applyTemplate: (id: string) => void; // テンプレートを複製して作業ページへ読み込む
  removeTemplate: (id: string) => void;
  // 保存・初期化
  resetAll: () => void; // 初期サンプルに戻す（保存も上書きされる）
}

// 作ったデータ（page と assets）を localStorage に自動保存。UIの状態(mode/view/選択)は保存しない。
// skipHydration + マウント後の rehydrate で、SSRとクライアント初期描画の不一致を避ける。
export const useBuilder = create<BuilderState>()(
  persist(
    (set, get) => ({
  page: samplePage(),
  selectedId: "sec-hero",
  mode: "admin",
  view: "builder",
  assets: seedAssets(),
  templates: [],
  undoPast: [],
  undoFuture: [],

  setMode: (m) =>
    set((s) => {
      // クライアントは管理者専用画面(アセット/スタジオ)に居られないのでビルダーへ戻す
      const adminOnly = s.view === "assets" || s.view === "studio";
      return m === "client" && adminOnly ? { mode: m, view: "builder" } : { mode: m };
    }),
  setView: (v) => set({ view: v }),
  select: (id) => set({ selectedId: id }),

  updateNode: (id, patch) => set((s) => ({ page: { ...s.page, children: patchTree(s.page.children, id, patch) as ContainerNode[] } })),

  addSection: () =>
    set((s) => {
      const sec: ContainerNode = { ...newSection(), children: [] };
      return { page: { ...s.page, children: [...s.page.children, sec] }, selectedId: sec.id };
    }),

  addGroup: () =>
    set((s) => {
      const parentId = resolveParentId(s.page, s.selectedId);
      if (!parentId) return s;
      const g = newGroup();
      return { page: { ...s.page, children: insertChild(s.page.children, parentId, g) as ContainerNode[] }, selectedId: g.id };
    }),

  addAtom: (kind) =>
    set((s) => {
      const parentId = resolveParentId(s.page, s.selectedId);
      if (!parentId) return s;
      const a = newAtom(kind);
      return { page: { ...s.page, children: insertChild(s.page.children, parentId, a) as ContainerNode[] }, selectedId: a.id };
    }),

  addAssetAtom: (asset) =>
    set((s) => {
      const parentId = resolveParentId(s.page, s.selectedId);
      if (!parentId) return s;
      // 登録済みアセットを Atom 化。SVGは「背景として自由配置」で挿入（フローから外れる）。
      const a: AtomNode =
        asset.kind === "svg"
          ? { id: nid("svg"), type: "atom", atomType: "svg", name: asset.name, width: 160, height: 160, svg: asset.svg, free: true, x: 40, y: 40 }
          : { id: nid("image"), type: "atom", atomType: "image", name: asset.name, width: 240, height: 160, src: asset.src, alt: asset.name };
      return { page: { ...s.page, children: insertChild(s.page.children, parentId, a) as ContainerNode[] }, selectedId: a.id };
    }),

  removeNode: (id) =>
    set((s) => ({
      page: { ...s.page, children: removeFromTree(s.page.children, id) as ContainerNode[] },
      selectedId: null,
    })),

  copyNode: () => {
    const n = findNode(get().page, get().selectedId);
    if (n) builderClipboard = n; // ツリーは不変なので参照保持でOK
  },

  pasteNode: () =>
    set((s) => {
      if (!builderClipboard) return s;
      const clone = cloneNodeNewIds(builderClipboard);
      // セクションはトップレベルへ、それ以外は選択中の枠（無ければ最後のセクション）へ
      if (isContainer(clone) && clone.type === "section") {
        return { page: { ...s.page, children: [...s.page.children, clone as ContainerNode] }, selectedId: clone.id };
      }
      const parentId = resolveParentId(s.page, s.selectedId);
      if (!parentId) return s;
      return { page: { ...s.page, children: insertChild(s.page.children, parentId, clone) as ContainerNode[] }, selectedId: clone.id };
    }),

  reorder: (activeId, overId) =>
    set((s) => (activeId === overId ? s : { page: { ...s.page, children: reorderTree(s.page.children, activeId, overId) as ContainerNode[] } })),

  // ① アセットライブラリ
  addAsset: (input) => set((s) => ({ assets: [{ ...input, id: nid("asset") }, ...s.assets] })),
  updateAsset: (id, patch) => set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
  removeAsset: (id) => set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),

  // テンプレート
  saveTemplate: (name) =>
    set((s) => {
      const snapshot: Page = { ...s.page, id: nid("tplpage"), name: name || s.page.name, children: s.page.children.map(cloneNodeNewIds) as ContainerNode[] };
      const tpl: PageTemplate = { id: nid("tpl"), name: name || s.page.name || "テンプレート", page: snapshot };
      return { templates: [tpl, ...s.templates] };
    }),
  applyTemplate: (id) =>
    set((s) => {
      const tpl = s.templates.find((t) => t.id === id);
      if (!tpl) return s;
      const page: Page = { id: nid("page"), name: tpl.page.name, children: tpl.page.children.map(cloneNodeNewIds) as ContainerNode[] };
      return { page, selectedId: null, view: "builder" };
    }),
  removeTemplate: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),

  resetAll: () => set({ page: samplePage(), assets: seedAssets(), selectedId: null, view: "builder" }),
    }),
    {
      name: "design-sync-v1",
      version: 1,
      // 保存するのは作ったデータだけ（UIの一時状態は保存しない）
      partialize: (s) => ({ page: s.page, assets: s.assets, templates: s.templates }),
      // SSRと初期描画を一致させるため、初回は復元せずマウント後に手動で rehydrate する
      skipHydration: true,
      // 復元後、既存IDと衝突しないよう採番カウンタを進める
      onRehydrateStorage: () => (state) => {
        if (state) uid = maxUid(state.page, state.assets);
      },
    },
  ),
);

// Undo/Redo（page と assets のスナップショット単位）。undo/redo は選択をクリアして齟齬を防ぐ。
export const builderHistory = wireHistory(useBuilder, {
  pick: (s) => ({ page: s.page, assets: s.assets }),
  changed: (a, b) => a.page !== b.page || a.assets !== b.assets,
  put: (snap) => ({ page: snap.page, assets: snap.assets, selectedId: null }),
  readStacks: (s) => ({ past: s.undoPast, future: s.undoFuture }),
  writeStacks: (past, future) => ({ undoPast: past, undoFuture: future }),
});
