// design-sync の状態ストア（Zustand）。ページツリーが唯一の真実。
// プレビュー・レイヤー一覧・プロパティ編集はすべてこの page から導出される。

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { wireHistory } from "./undoable";
import { guardedStorage, setPersistWritable } from "./persistGuard";
import { seedTemplates, classifyKind, SEED_TEMPLATE_KIND } from "./templateSeed";
import { svgToPoints, pointsToShapeSvg, colorOfSvg } from "./pathedit";
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
  type TemplateKind,
  type PathNode,
  isContainer,
  isAtom,
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

// --- 階層をまたいだ移動（レイヤーの細かい並び替え）用のヘルパー ---
// node のサブツリー（自分含む）に id が含まれるか（自分の中へは移動させない）
function subtreeHasId(node: SceneNode, id: string): boolean {
  if (node.id === id) return true;
  return isContainer(node) ? node.children.some((c) => subtreeHasId(c, id)) : false;
}
// id の“親のid”を返す（トップレベルは null）。見つからなければ undefined。
function parentIdOf(nodes: SceneNode[], id: string, parent: string | null = null): string | null | undefined {
  for (const n of nodes) {
    if (n.id === id) return parent;
    if (isContainer(n)) {
      const r = parentIdOf(n.children, id, n.id);
      if (r !== undefined) return r;
    }
  }
  return undefined;
}
// overId の直前に node を挿入（overId と同じ親の中に入る）
function insertBeforeId(nodes: SceneNode[], overId: string, node: SceneNode): SceneNode[] {
  const oi = nodes.findIndex((n) => n.id === overId);
  if (oi !== -1) {
    const next = nodes.slice();
    next.splice(oi, 0, node);
    return next;
  }
  return nodes.map((n) => (isContainer(n) ? { ...n, children: insertBeforeId(n.children, overId, node) } : n));
}
// containerId の子の先頭に node を挿入（コンテナに重ねてネストさせる）
function insertIntoStart(nodes: SceneNode[], containerId: string, node: SceneNode): SceneNode[] {
  return nodes.map((n) => {
    if (!isContainer(n)) return n;
    if (n.id === containerId) return { ...n, children: [node, ...n.children] };
    return { ...n, children: insertIntoStart(n.children, containerId, node) };
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

// ページを新IDで複製（別デバイス版の作成に使う）
function clonePage(p: Page, name: string): Page {
  return { id: nid("page"), name, children: p.children.map(cloneNodeNewIds) as ContainerNode[] };
}
// レスポンシブ用の上書き(sp/hiddenPc)を全ノードから除去（独立SPページはクリーンに）
function stripResponsive(nodes: SceneNode[]): void {
  for (const n of nodes) {
    delete (n as { sp?: unknown }).sp;
    delete (n as { hiddenPc?: unknown }).hiddenPc;
    if (isContainer(n)) stripResponsive(n.children);
  }
}

// ---- 自動バックアップ（ページ全置換の前に現ページを退避）------------------------
// テンプレ適用・初期化など「今のページを丸ごと置き換える」操作の直前に呼び、
// 現ページをテンプレートとして自動保存する。テンプレートは永続化されるので、
// リロード後でも一覧の「（自動保存）…」から復元でき、編集データが失われない。
export const AUTO_BACKUP_PREFIX = "（自動保存）";
const MAX_AUTO_BACKUPS = 8;
const isAutoBackup = (t: PageTemplate) => t.name.startsWith(AUTO_BACKUP_PREFIX);
function stampNow(): string {
  try { return new Date().toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}
// 現ページを自動保存テンプレとして先頭に足した templates を返す（自動保存は最大 MAX_AUTO_BACKUPS 件）。
// 現在の PC版 / SP版 を editing から取り出す（保存・退避で必ずペアにするため）。
function pcSpOf(s: { page: Page; altPage: Page | null; editing: "pc" | "sp" }): { pc: Page; sp: Page | null } {
  return { pc: s.editing === "pc" ? s.page : (s.altPage ?? s.page), sp: s.editing === "sp" ? s.page : s.altPage };
}
// 現ページを自動保存テンプレとして退避。★PC版・SP版を必ずペアで保存する
// （以前は編集中の片方だけ保存していたため、SP編集中の自動保存を開くとPC版が崩れていた）。
function withAutoBackup(templates: PageTemplate[], pc: Page, sp?: Page | null): PageTemplate[] {
  if (!pc?.children?.length) return templates; // 空ページは退避しない
  const snap = (p: Page): Page => ({ ...p, id: nid("tplpage"), children: p.children.map(cloneNodeNewIds) as ContainerNode[] });
  const backup: PageTemplate = {
    id: nid("autobak"),
    name: `${AUTO_BACKUP_PREFIX}${pc.name || "ページ"}・${stampNow()}`,
    page: snap(pc),
    spPage: sp ? snap(sp) : null, // SP版もペアで退避
    updatedAt: Date.now(),
  };
  const autos: PageTemplate[] = [], rest: PageTemplate[] = [];
  for (const t of templates) (isAutoBackup(t) ? autos : rest).push(t);
  const capped = [backup, ...autos].slice(0, MAX_AUTO_BACKUPS); // 新しい順に上限件数だけ残す
  return [...rest, ...capped]; // 通常テンプレの後ろに自動保存をまとめる
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
  return { id: nid("text"), type: "atom", atomType: "text", name: "テキスト", text: "", style: { fontSize: 16, fontWeight: 500, color: "#0f172a", align: "left" } };
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
// シンプルなラインアイコン（24x24・stroke）。id は安定させておく（migrateの重複判定に使用）。
const SEED_ICONS: { id: string; name: string; tags: string[]; d: string }[] = [
  // 基本・確認
  { id: "check", name: "チェック", tags: ["確認", "基本"], d: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>' },
  { id: "check-plain", name: "チェック（線）", tags: ["確認", "基本"], d: '<path d="M20 6 9 17l-5-5"/>' },
  { id: "close", name: "閉じる", tags: ["UI", "基本"], d: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>' },
  { id: "plus", name: "プラス", tags: ["UI", "基本"], d: '<path d="M5 12h14"/><path d="M12 5v14"/>' },
  { id: "minus", name: "マイナス", tags: ["UI", "基本"], d: '<path d="M5 12h14"/>' },
  { id: "menu", name: "メニュー", tags: ["UI"], d: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>' },
  { id: "more", name: "点（メニュー）", tags: ["UI"], d: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>' },
  // 矢印
  { id: "arrow", name: "右矢印", tags: ["矢印"], d: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>' },
  { id: "arrow-left", name: "左矢印", tags: ["矢印"], d: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>' },
  { id: "arrow-up", name: "上矢印", tags: ["矢印"], d: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>' },
  { id: "arrow-down", name: "下矢印", tags: ["矢印"], d: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>' },
  { id: "chevron-right", name: "山括弧・右", tags: ["矢印"], d: '<path d="m9 18 6-6-6-6"/>' },
  { id: "chevron-left", name: "山括弧・左", tags: ["矢印"], d: '<path d="m15 18-6-6 6-6"/>' },
  { id: "chevron-up", name: "山括弧・上", tags: ["矢印"], d: '<path d="m18 15-6-6-6 6"/>' },
  { id: "chevron-down", name: "山括弧・下", tags: ["矢印"], d: '<path d="m6 9 6 6 6-6"/>' },
  // UI
  { id: "search", name: "検索", tags: ["UI"], d: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>' },
  { id: "bell", name: "ベル", tags: ["UI", "通知"], d: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>' },
  { id: "info", name: "情報", tags: ["UI"], d: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>' },
  { id: "alert", name: "警告", tags: ["UI"], d: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>' },
  { id: "help", name: "疑問", tags: ["UI"], d: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>' },
  { id: "trash", name: "ゴミ箱", tags: ["UI"], d: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' },
  { id: "edit", name: "編集", tags: ["UI"], d: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
  { id: "settings", name: "設定", tags: ["UI"], d: '<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>' },
  { id: "filter", name: "フィルター", tags: ["UI"], d: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>' },
  { id: "refresh", name: "更新", tags: ["UI"], d: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>' },
  { id: "eye", name: "目", tags: ["UI"], d: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>' },
  { id: "lock", name: "ロック", tags: ["UI"], d: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>' },
  // 通信
  { id: "mail", name: "メール", tags: ["通信"], d: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>' },
  { id: "phone", name: "電話", tags: ["通信"], d: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>' },
  { id: "chat", name: "チャット", tags: ["通信"], d: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>' },
  { id: "send", name: "送信", tags: ["通信"], d: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>' },
  { id: "share", name: "共有", tags: ["通信"], d: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>' },
  { id: "link", name: "リンク", tags: ["通信"], d: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>' },
  { id: "globe", name: "地球", tags: ["通信"], d: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>' },
  // 人・場所・物
  { id: "home", name: "ホーム", tags: ["場所"], d: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>' },
  { id: "user", name: "ユーザー", tags: ["人"], d: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
  { id: "users", name: "ユーザー（複数）", tags: ["人"], d: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
  { id: "calendar", name: "カレンダー", tags: ["場所", "予定"], d: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/>' },
  { id: "clock", name: "時計", tags: ["予定"], d: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>' },
  { id: "pin", name: "地図ピン", tags: ["場所"], d: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>' },
  { id: "camera", name: "カメラ", tags: ["メディア"], d: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/>' },
  { id: "image", name: "画像", tags: ["メディア"], d: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>' },
  { id: "folder", name: "フォルダ", tags: ["ファイル"], d: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>' },
  { id: "file", name: "ファイル", tags: ["ファイル"], d: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/>' },
  { id: "bookmark", name: "ブックマーク", tags: ["UI"], d: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>' },
  { id: "gift", name: "ギフト", tags: ["装飾"], d: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>' },
  { id: "cart", name: "カート", tags: ["ビジネス"], d: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>' },
  { id: "card", name: "カード", tags: ["ビジネス"], d: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>' },
  { id: "briefcase", name: "かばん", tags: ["ビジネス"], d: '<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>' },
  { id: "book", name: "本", tags: ["ビジネス"], d: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>' },
  // メディア操作
  { id: "play", name: "再生", tags: ["メディア"], d: '<polygon points="6 3 20 12 6 21 6 3"/>' },
  { id: "pause", name: "一時停止", tags: ["メディア"], d: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>' },
  { id: "download", name: "ダウンロード", tags: ["メディア"], d: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>' },
  { id: "upload", name: "アップロード", tags: ["メディア"], d: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>' },
  { id: "music", name: "音符", tags: ["メディア"], d: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>' },
  // 天気・自然・装飾
  { id: "heart", name: "ハート", tags: ["装飾"], d: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>' },
  { id: "star", name: "スター", tags: ["装飾"], d: '<path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>' },
  { id: "sun", name: "太陽", tags: ["天気"], d: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>' },
  { id: "moon", name: "月", tags: ["天気"], d: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>' },
  { id: "cloud", name: "雲", tags: ["天気"], d: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>' },
  { id: "droplet", name: "雫", tags: ["天気"], d: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7Z"/>' },
  { id: "flame", name: "炎", tags: ["装飾"], d: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>' },
  { id: "leaf", name: "葉", tags: ["装飾", "自然"], d: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>' },
  { id: "zap", name: "稲妻", tags: ["装飾"], d: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>' },
  { id: "shield", name: "シールド", tags: ["装飾"], d: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>' },
  { id: "award", name: "賞", tags: ["装飾"], d: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>' },
  { id: "bulb", name: "電球", tags: ["装飾"], d: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>' },
  { id: "rocket", name: "ロケット", tags: ["装飾"], d: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>' },
  { id: "target", name: "ターゲット", tags: ["装飾"], d: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' },
  { id: "chart-bar", name: "棒グラフ", tags: ["ビジネス"], d: '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>' },
  { id: "trending", name: "上昇グラフ", tags: ["ビジネス"], d: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>' },
  // 図形
  { id: "circle", name: "円", tags: ["図形"], d: '<circle cx="12" cy="12" r="9"/>' },
  { id: "square", name: "四角", tags: ["図形"], d: '<rect x="4" y="4" width="16" height="16" rx="2"/>' },
  { id: "triangle", name: "三角", tags: ["図形"], d: '<path d="M12 3 22 20H2Z"/>' },
];

function seedAssets(): AssetItem[] {
  const svg = (paths: string) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  const icons: AssetItem[] = SEED_ICONS.map((i) => ({ id: `asset-${i.id}`, name: i.name, kind: "svg" as const, tags: ["アイコン", ...i.tags], svg: svg(i.d) }));
  return [
    ...icons,
    { id: "asset-photo", name: "サンプル写真", kind: "image", tags: ["画像"], src: "https://placehold.co/240x160/e2e8f0/64748b?text=Photo" },
  ];
}

// 保存データから既存の連番ID(nN-)の最大値を求め、採番カウンタを進めて衝突を防ぐ。
// テンプレート（そのページ/SPページ含む）も走査しないと、次回の保存で既存テンプレIDと
// 衝突する（例：n1-tpl の二重採番）。ページ・アセット・テンプレートすべてを対象にする。
function maxUid(page: Page, assets: AssetItem[], templates: PageTemplate[] = []): number {
  let max = 0;
  const scan = (id: string) => {
    const m = /^n(\d+)-/.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  };
  const walk = (nodes: SceneNode[]) => nodes.forEach((n) => { scan(n.id); if (isContainer(n)) walk(n.children); });
  walk(page.children);
  assets.forEach((a) => scan(a.id));
  for (const t of templates) {
    scan(t.id);
    if (t.page) walk(t.page.children);
    if (t.spPage) walk(t.spPage.children);
  }
  return max;
}

// 取り込み（applyProject）後などに、採番カウンタを既存IDの最大値以上へ引き上げる。
// これをしないと、実行中に取り込んだプロジェクトのID（例: n3310-autobak）と
// 新規採番 nid() が衝突し、自動保存テンプレ等でIDが重複する（React key重複の原因）。
export function bumpUid(page: Page, assets: AssetItem[] = [], templates: PageTemplate[] = []): void {
  uid = Math.max(uid, maxUid(page, assets, templates));
}

// テンプレートIDの重複を解消（先頭優先）。過去の二重採番で生まれた重複IDを一意にする。
// nid（uid依存）は移行時にまだ小さい値の場合があり再衝突しうるので、決定的な連番サフィックスで振り直す。
function dedupeTemplateIds(templates: PageTemplate[]): PageTemplate[] {
  const seen = new Set<string>();
  return templates.map((t) => {
    if (!seen.has(t.id)) { seen.add(t.id); return t; }
    let n = 2, id = `${t.id}-${n}`;
    while (seen.has(id)) { n++; id = `${t.id}-${n}`; }
    seen.add(id);
    return { ...t, id };
  });
}

// ---- ストア本体 --------------------------------------------------------------
// Undo/Redo が復元する対象（ドキュメント＝page と assets）。
interface BuilderSnapshot {
  page: Page;
  assets: AssetItem[];
  editing: "pc" | "sp"; // どの版の編集かも記録（版切替は履歴に積まない判定に使う）
}

// 選択状態のヘルパー：単一選択をセットするとき selectedId と selectedIds を同期させる。
const sel = (id: string | null): { selectedId: string | null; selectedIds: string[] } => ({ selectedId: id, selectedIds: id ? [id] : [] });

interface BuilderState {
  page: Page; // 現在編集中のページ（editing に応じて PC版 / SP版）
  altPage: Page | null; // 反対デバイスのページ（編集中でない方）。SP版を作ると入る。
  editing: "pc" | "sp"; // どちらのデバイス版を編集しているか
  setEditing: (target: "pc" | "sp") => void; // PC/SP版の編集を切替（無ければSP版を複製生成）
  selectedId: string | null; // 主選択（プロパティ編集の対象）
  selectedIds: string[]; // 複数選択（主選択を含む）
  mode: Mode;
  view: View;
  assets: AssetItem[];
  templates: PageTemplate[];
  // Undo/Redo 履歴（保存対象外）
  undoPast: BuilderSnapshot[];
  undoFuture: BuilderSnapshot[];
  setMode: (m: Mode) => void;
  setView: (v: View) => void;
  select: (id: string | null, additive?: boolean) => void; // additive=Shift/⌘で追加・解除
  removeSelected: () => void; // 選択中の要素をまとめて削除
  groupSelected: () => void; // 選択中の兄弟要素を新グループにまとめる
  updateNode: (id: string, patch: NodePatch) => void;
  addSection: () => void;
  addGroup: () => void;
  addAtom: (kind: AtomType) => void;
  addAssetAtom: (asset: AssetItem) => void; // ①のアセットを要素としてキャンバスに挿入
  addShape: (svg: string, width?: number, height?: number) => void; // 基本図形（SVG）を挿入
  convertNodeToPath: (id: string) => void; // svg atom を編集可能パス（頂点）に変換
  updateNodePoints: (id: string, points: PathNode[]) => void; // パスの頂点を更新（svgも再生成）
  removeNode: (id: string) => void;
  copyNode: () => void; // 選択中の要素（サブツリー）をコピー
  pasteNode: () => void; // コピーした要素を貼り付け
  reorder: (activeId: string, overId: string) => void; // 同一コンテナ内の並び替え
  moveNode: (activeId: string, overId: string) => void; // 階層をまたいで移動（葉→直前 / コンテナ→ネスト）
  // ① アセットライブラリ
  addAsset: (input: Omit<AssetItem, "id">) => void;
  updateAsset: (id: string, patch: Partial<Omit<AssetItem, "id">>) => void;
  removeAsset: (id: string) => void;
  // テンプレート
  saveTemplate: (name: string, kind?: TemplateKind) => void; // 現在のページを「新規」テンプレート/クライアントとして登録
  applyTemplate: (id: string) => void; // テンプレートを複製して作業ページへ読み込む（元テンプレを記憶）
  updateTemplate: (id: string, name?: string) => void; // 既存テンプレートを現在のページで上書き
  renameTemplate: (id: string, name: string) => void; // 名前だけ変更（内容は保持）
  setTemplateKind: (id: string, kind: TemplateKind) => void; // テンプレート⇄クライアントの種別を変更
  removeTemplate: (id: string) => void;
  sourceTemplateId: string | null; // 「複製して編集」の元テンプレid（上書き保存の対象）
  backupCurrentPage: () => void; // 現ページを自動保存テンプレとして退避（全置換の直前に呼ぶ）
  // 保存・初期化
  resetAll: () => void; // 初期サンプルに戻す（保存も上書きされる）
}

// 作ったデータ（page と assets）を localStorage に自動保存。UIの状態(mode/view/選択)は保存しない。
// skipHydration + マウント後の rehydrate で、SSRとクライアント初期描画の不一致を避ける。
export const useBuilder = create<BuilderState>()(
  persist(
    (set, get) => ({
  page: samplePage(),
  altPage: null,
  editing: "pc",
  selectedId: "sec-hero",
  selectedIds: ["sec-hero"],
  mode: "client", // 管理者機能はパスワード入力で解錠する（TopBar の AdminGateModal）
  view: "builder",
  assets: seedAssets(),
  templates: seedTemplates(),
  sourceTemplateId: null,
  undoPast: [],
  undoFuture: [],

  setMode: (m) =>
    set((s) => {
      // クライアント中は保存・同期を一切行わない（localStorage への書き込みを止める）
      setPersistWritable(m === "admin");
      // クライアントは管理者専用画面(アセット/スタジオ)に居られないのでビルダーへ戻す
      const adminOnly = s.view === "assets" || s.view === "studio";
      return m === "client" && adminOnly ? { mode: m, view: "builder" } : { mode: m };
    }),
  setView: (v) => set({ view: v }),
  select: (id, additive) =>
    set((s) => {
      if (id === null) return sel(null);
      if (!additive) return sel(id);
      const has = s.selectedIds.includes(id);
      const ids = has ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id];
      return { selectedId: has ? (ids[ids.length - 1] ?? null) : id, selectedIds: ids };
    }),
  removeSelected: () =>
    set((s) => {
      const ids = s.selectedIds.length ? s.selectedIds : s.selectedId ? [s.selectedId] : [];
      if (!ids.length) return s;
      let children: SceneNode[] = s.page.children;
      for (const id of ids) children = removeFromTree(children, id);
      return { page: { ...s.page, children: children as ContainerNode[] }, ...sel(null) };
    }),

  // 選択中の兄弟要素を1つの新グループにまとめる（親の並び方向を継承して見た目を保つ）。
  // 最初に見つかった「選択を直接含む親」の中でグループ化する（親をまたぐ選択はそこの分だけ対象）。
  groupSelected: () =>
    set((s) => {
      const ids = s.selectedIds.length ? s.selectedIds : s.selectedId ? [s.selectedId] : [];
      if (!ids.length) return s;
      const idset = new Set(ids);
      let newId: string | null = null;
      const process = (nodes: SceneNode[], parentDir: "row" | "column", parentGap: number): SceneNode[] => {
        if (!newId) {
          const idxs = nodes.map((n, i) => (idset.has(n.id) ? i : -1)).filter((i) => i >= 0);
          if (idxs.length) {
            const groupChildren = idxs.map((i) => nodes[i]);
            const firstIdx = idxs[0];
            const g: ContainerNode = { id: nid("group"), type: "group", name: "グループ", direction: parentDir, justify: "flex-start", align: "stretch", gap: parentGap || 12, children: groupChildren };
            newId = g.id;
            const out: SceneNode[] = [];
            nodes.forEach((n, i) => { if (i === firstIdx) out.push(g); if (!idset.has(n.id)) out.push(n); });
            return out;
          }
        }
        return nodes.map((n) => (isContainer(n) ? { ...n, children: process(n.children, n.direction, n.gap ?? 0) } : n));
      };
      const children = process(s.page.children, "column", 0);
      if (!newId) return s;
      return { page: { ...s.page, children: children as ContainerNode[] }, ...sel(newId) };
    }),

  updateNode: (id, patch) => set((s) => ({ page: { ...s.page, children: patchTree(s.page.children, id, patch) as ContainerNode[] } })),

  addSection: () =>
    set((s) => {
      const sec: ContainerNode = { ...newSection(), children: [] };
      return { page: { ...s.page, children: [...s.page.children, sec] }, selectedId: sec.id, selectedIds: [sec.id] };
    }),

  addGroup: () =>
    set((s) => {
      const parentId = resolveParentId(s.page, s.selectedId);
      if (!parentId) return s;
      const g = newGroup();
      return { page: { ...s.page, children: insertChild(s.page.children, parentId, g) as ContainerNode[] }, selectedId: g.id, selectedIds: [g.id] };
    }),

  addAtom: (kind) =>
    set((s) => {
      const parentId = resolveParentId(s.page, s.selectedId);
      if (!parentId) return s;
      const a = newAtom(kind);
      return { page: { ...s.page, children: insertChild(s.page.children, parentId, a) as ContainerNode[] }, selectedId: a.id, selectedIds: [a.id] };
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
      return { page: { ...s.page, children: insertChild(s.page.children, parentId, a) as ContainerNode[] }, selectedId: a.id, selectedIds: [a.id] };
    }),

  addShape: (svg, width = 160, height = 160) =>
    set((s) => {
      const parentId = resolveParentId(s.page, s.selectedId);
      if (!parentId) return s;
      // 図形は SVG atom として「前面に自由配置」で挿入（移動・変形しやすい）。
      const a: AtomNode = { id: nid("svg"), type: "atom", atomType: "svg", name: "図形", width, height, svg, free: true, front: true, x: 40, y: 40 };
      return { page: { ...s.page, children: insertChild(s.page.children, parentId, a) as ContainerNode[] }, selectedId: a.id, selectedIds: [a.id] };
    }),

  convertNodeToPath: (id) =>
    set((s) => {
      const node = findNode(s.page, id);
      if (!node || !isAtom(node) || node.atomType !== "svg" || !node.svg) return s;
      const parsed = svgToPoints(node.svg);
      if (!parsed) return s; // 変換不可（曲線・角丸等）。UI側でボタンを無効化して案内する。
      const patch = { points: parsed.points, closed: parsed.closed, svg: pointsToShapeSvg(parsed.points, parsed.closed, colorOfSvg(node.svg)), free: true };
      return { page: { ...s.page, children: patchTree(s.page.children, id, patch) as ContainerNode[] } };
    }),

  updateNodePoints: (id, points: PathNode[]) =>
    set((s) => {
      const node = findNode(s.page, id);
      if (!node || !isAtom(node)) return s;
      const patch = { points, svg: pointsToShapeSvg(points, node.closed ?? true, colorOfSvg(node.svg ?? "")) };
      return { page: { ...s.page, children: patchTree(s.page.children, id, patch) as ContainerNode[] } };
    }),

  removeNode: (id) =>
    set((s) => ({
      page: { ...s.page, children: removeFromTree(s.page.children, id) as ContainerNode[] },
      selectedId: null, selectedIds: [],
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
        return { page: { ...s.page, children: [...s.page.children, clone as ContainerNode] }, selectedId: clone.id, selectedIds: [clone.id] };
      }
      const parentId = resolveParentId(s.page, s.selectedId);
      if (!parentId) return s;
      return { page: { ...s.page, children: insertChild(s.page.children, parentId, clone) as ContainerNode[] }, selectedId: clone.id, selectedIds: [clone.id] };
    }),

  reorder: (activeId, overId) =>
    set((s) => (activeId === overId ? s : { page: { ...s.page, children: reorderTree(s.page.children, activeId, overId) as ContainerNode[] } })),

  // 階層をまたいだ移動：同じ親なら並び替え、違う親なら取り出して over の位置へ挿入。
  // over が葉 → その直前（同じ親）へ。over がコンテナ → その中の先頭へ（ネスト）。
  moveNode: (activeId, overId) =>
    set((s) => {
      if (activeId === overId) return s;
      const active = findNode(s.page, activeId);
      const over = findNode(s.page, overId);
      if (!active || !over) return s;
      // 自分自身の中へは移動できない
      if (subtreeHasId(active, overId)) return s;

      const ap = parentIdOf(s.page.children, activeId);
      const op = parentIdOf(s.page.children, overId);
      // 同じ親なら従来どおり並び替え（滑らかさを維持）
      if (ap !== undefined && ap === op) {
        return { page: { ...s.page, children: reorderTree(s.page.children, activeId, overId) as ContainerNode[] } };
      }
      // トップレベル（セクション）はページ直下にのみ置ける＝アトム等を最上位へは出さない
      const pruned = removeFromTree(s.page.children, activeId);
      let next: SceneNode[];
      if (isContainer(over)) {
        next = insertIntoStart(pruned, overId, active); // コンテナに重ねてネスト
      } else {
        next = insertBeforeId(pruned, overId, active); // 葉の直前へ（over と同じ親）
      }
      return { page: { ...s.page, children: next as ContainerNode[] }, selectedId: activeId, selectedIds: [activeId] };
    }),

  // ① アセットライブラリ
  addAsset: (input) => set((s) => ({ assets: [{ ...input, id: nid("asset") }, ...s.assets] })),
  updateAsset: (id, patch) => set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
  removeAsset: (id) => set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),

  // テンプレート
  saveTemplate: (name, kind = "template") =>
    set((s) => {
      const pc = s.editing === "pc" ? s.page : (s.altPage ?? s.page);
      const sp = s.editing === "sp" ? s.page : s.altPage;
      const snap = (p: Page, nm?: string): Page => ({ ...p, id: nid("tplpage"), name: nm ?? p.name, children: p.children.map(cloneNodeNewIds) as ContainerNode[] });
      const tpl: PageTemplate = { id: nid("tpl"), name: name || pc.name || "テンプレート", kind, page: snap(pc, name), spPage: sp ? snap(sp) : null, updatedAt: Date.now() };
      // 新規登録したら、以降の「上書き」対象をこの新テンプレにする
      return { templates: [tpl, ...s.templates], sourceTemplateId: tpl.id };
    }),
  updateTemplate: (id, name) =>
    set((s) => {
      if (!s.templates.some((t) => t.id === id)) return s;
      const pc = s.editing === "pc" ? s.page : (s.altPage ?? s.page);
      const sp = s.editing === "sp" ? s.page : s.altPage;
      const snap = (p: Page, nm?: string): Page => ({ ...p, id: nid("tplpage"), name: nm ?? p.name, children: p.children.map(cloneNodeNewIds) as ContainerNode[] });
      // 現在のビルダー状態（PC版＋SP版）を丸ごとテンプレへ保存
      return {
        templates: s.templates.map((t) => (t.id === id ? { ...t, name: name ?? t.name, page: snap(pc, name), spPage: sp ? snap(sp) : null, updatedAt: Date.now() } : t)),
        sourceTemplateId: id,
      };
    }),
  applyTemplate: (id) =>
    set((s) => {
      const tpl = s.templates.find((t) => t.id === id);
      if (!tpl) return s;
      // ★ 置き換え前に、いまのページを自動バックアップ（PC/SPペアで。リロードしても復元できる）
      const { pc: bpc, sp: bsp } = pcSpOf(s);
      const templates = withAutoBackup(s.templates, bpc, bsp);
      const mk = (p: Page): Page => ({ id: nid("page"), name: p.name, children: p.children.map(cloneNodeNewIds) as ContainerNode[] });
      const page = mk(tpl.page);
      const altPage = tpl.spPage ? mk(tpl.spPage) : null; // SP版も一緒に復元
      // 複製元を記憶しておき、あとで「上書き保存」できるようにする
      return { page, altPage, editing: "pc", templates, selectedId: null, selectedIds: [], view: "builder", sourceTemplateId: id };
    }),
  // 名前だけ変更（内容は保持）。テンプレート名とページ名(PC/SP)を揃える。
  renameTemplate: (id, name) =>
    set((s) => {
      const nm = name.trim();
      if (!nm) return s;
      return {
        templates: s.templates.map((t) =>
          t.id === id
            ? { ...t, name: nm, page: { ...t.page, name: nm }, spPage: t.spPage ? { ...t.spPage, name: nm } : t.spPage, updatedAt: Date.now() }
            : t,
        ),
      };
    }),
  setTemplateKind: (id, kind) =>
    set((s) => ({ templates: s.templates.map((t) => (t.id === id ? { ...t, kind, updatedAt: Date.now() } : t)) })),
  removeTemplate: (id) =>
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id), sourceTemplateId: s.sourceTemplateId === id ? null : s.sourceTemplateId })),
  backupCurrentPage: () => set((s) => { const { pc, sp } = pcSpOf(s); return { templates: withAutoBackup(s.templates, pc, sp) }; }),
  // PC/SP版の編集を切替。page と altPage を入れ替えるだけ（編集アクションは常に page を対象）。
  // まだSP版が無ければ、現ページを複製してSP版を新規作成（上書きは外してクリーンに）。
  setEditing: (target) =>
    set((s) => {
      if (s.editing === target) return s;
      let alt = s.altPage;
      if (!alt) {
        alt = clonePage(s.page, target === "sp" ? `${s.page.name}（SP）` : s.page.name.replace(/（SP）$/, ""));
        if (target === "sp") stripResponsive(alt.children);
      }
      return { page: alt, altPage: s.page, editing: target, selectedId: null, selectedIds: [] };
    }),

  resetAll: () =>
    set((s) => { const { pc, sp } = pcSpOf(s); return { page: samplePage(), assets: seedAssets(), templates: withAutoBackup(s.templates, pc, sp), selectedId: null, selectedIds: [], view: "builder" }; }),
    }),
    {
      name: "design-sync-v1",
      version: 14,
      // クライアントモード中は書き込まない（読み込みのみ）
      storage: guardedStorage(),
      // 保存するのは作ったデータだけ（UIの一時状態は保存しない）
      partialize: (s) => ({ page: s.page, altPage: s.altPage, editing: s.editing, assets: s.assets, templates: s.templates }),
      // migrate は「不足しているサンプルを“追加するだけ”」に統一する。
      // 既存のテンプレート/ページ/アセット（複製して編集・上書き保存したものを含む）は絶対に上書き・削除しない。
      migrate: (persisted, version) => {
        const s = persisted as { templates?: PageTemplate[]; assets?: AssetItem[] } | undefined;
        // 既定テンプレートのうち、ユーザーがまだ持っていないものだけ先頭に追加（既存は保持）。
        // 追加サンプル（アップ進学ゼミ／Manabill等）を、既存ユーザーにも安全に取り込む。
        if (s && version < 10) {
          const have = new Set((s.templates ?? []).map((t) => t.id));
          const add = seedTemplates().filter((t) => !have.has(t.id));
          if (add.length) s.templates = [...add, ...(s.templates ?? [])];
        }
        // 種別(kind)を持たない既存データを「テンプレート/クライアント」に初期分類。
        // 既定シード(の名前/ID)＝テンプレート、それ以外＝クライアント。既存の kind は尊重する。
        if (s && version < 11) {
          s.templates = (s.templates ?? []).map((t) => (t.kind ? t : { ...t, kind: classifyKind(t) }));
        }
        // 過去の二重採番で生まれた重複テンプレIDを一意化（Reactキー衝突・リネーム誤爆の防止）。
        if (s && version < 12) {
          s.templates = dedupeTemplateIds(s.templates ?? []);
        }
        // 既定シードの種別を正す（旧分類でアップ進学ゼミ/Manabillがテンプレート側に入っていたのをクライアントへ）。
        if (s && version < 13) {
          s.templates = (s.templates ?? []).map((t) =>
            t.id in SEED_TEMPLATE_KIND ? { ...t, kind: SEED_TEMPLATE_KIND[t.id] } : t,
          );
        }
        // 最終更新日時を持たない既存テンプレートに、現在時刻を初期値として付与（表示用）。
        if (s && version < 14) {
          const now = Date.now();
          s.templates = (s.templates ?? []).map((t) => (t.updatedAt ? t : { ...t, updatedAt: now }));
        }
        // 既定アイコンのうち、まだ無いものだけ追加
        if (s && version < 7) {
          const have = new Set((s.assets ?? []).map((a) => a.id));
          const add = seedAssets().filter((a) => !have.has(a.id));
          if (add.length) s.assets = [...(s.assets ?? []), ...add];
        }
        return persisted;
      },
      // SSRと初期描画を一致させるため、初回は復元せずマウント後に手動で rehydrate する
      skipHydration: true,
      // 復元後、既存IDと衝突しないよう採番カウンタを進める
      onRehydrateStorage: () => (state) => {
        if (state) uid = maxUid(state.page, state.assets, state.templates);
      },
    },
  ),
);

// Undo/Redo（page と assets のスナップショット単位）。undo/redo は選択をクリアして齟齬を防ぐ。
export const builderHistory = wireHistory(useBuilder, {
  pick: (s) => ({ page: s.page, assets: s.assets, editing: s.editing }),
  // PC/SP版の切替（editing変化）は履歴に積まない＝Undoは同じ版の中の編集のみ対象。
  changed: (a, b) => a.editing === b.editing && (a.page !== b.page || a.assets !== b.assets),
  put: (snap) => ({ page: snap.page, assets: snap.assets, selectedId: null, selectedIds: [] }),
  readStacks: (s) => ({ past: s.undoPast, future: s.undoFuture }),
  writeStacks: (past, future) => ({ undoPast: past, undoFuture: future }),
});
