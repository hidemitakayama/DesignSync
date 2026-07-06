// スタジオ機能の状態ストア（Zustand）。要素の平坦な配列が唯一の真実。
// 配列の並び＝重なり順（index 0 が最背面、末尾が最前面）。style.zIndex は
// 常に index と同期させ、描画にもレイヤー一覧にもそのまま使えるようにする。

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type StudioElement, type StudioElementType, type StudioStyle, type PathNode } from "./types";
import { wireHistory } from "./undoable";

// 要素の部分更新。position/size/style は入れ子なので浅くマージする。
export interface StudioPatch {
  type?: StudioElementType;
  content?: string;
  position?: Partial<StudioElement["position"]>;
  size?: Partial<StudioElement["size"]>;
  style?: Partial<StudioStyle>;
  points?: StudioElement["points"];
  closed?: boolean;
}

// ---- ID 採番（クライアント操作のみ・SSR不一致は起きない） ---------------------
let uid = 0;
const sid = (t: string) => `s${++uid}-${t}`;

// コピー＆ペースト用のクリップボード（アプリ内・保存しない）
let studioClipboard: StudioElement[] = [];

// ---- ペンツール（イラレ風） -------------------------------------------------
// クリックで点を打ち、直線でつなぐ。直角モード中は前の点から水平/垂直だけに制限。
// 確定すると、パスを描いた1つのSVG要素（stroke=currentColor）に変換する。
export interface Pt { x: number; y: number }
export type Tool = "select" | "pen" | "node";

// 直角スナップ：from から to へ、横移動が大きければ水平、縦が大きければ垂直に寄せる。
export function orthoSnap(from: Pt, to: Pt): Pt {
  return Math.abs(to.x - from.x) >= Math.abs(to.y - from.y) ? { x: to.x, y: from.y } : { x: from.x, y: to.y };
}

const r1 = (v: number) => Math.round(v * 10) / 10; // 座標を小数1桁に丸める

// 点列から SVG の d を生成（曲線ツールの中核）。
// Catmull-Rom スプラインを 3次ベジェへ変換して「点を通る滑らかな曲線」を自動生成する。
// isCorner の点はその側のハンドルを 0 にして角ばらせる（両隣が角なら直線になる）。
// closed=true は始点と終点をつないで塗り。座標系はローカル/絶対どちらでも同じ式で使える。
export function nodesToPathD(nodes: PathNode[], closed: boolean): string {
  const n = nodes.length;
  if (n === 0) return "";
  if (n === 1) return `M ${r1(nodes[0].x)} ${r1(nodes[0].y)}`;
  // 端の扱い：開パスは端でクランプ、閉パスは巡回。
  const at = (i: number) => (closed ? nodes[((i % n) + n) % n] : nodes[Math.max(0, Math.min(n - 1, i))]);
  let d = `M ${r1(nodes[0].x)} ${r1(nodes[0].y)}`;
  const segs = closed ? n : n - 1;
  for (let s = 0; s < segs; s++) {
    const p0 = at(s - 1), p1 = at(s), p2 = at(s + 1), p3 = at(s + 2);
    const c1x = p1.isCorner ? p1.x : p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.isCorner ? p1.y : p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.isCorner ? p2.x : p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.isCorner ? p2.y : p2.y - (p3.y - p1.y) / 6;
    d += ` C ${r1(c1x)} ${r1(c1y)} ${r1(c2x)} ${r1(c2y)} ${r1(p2.x)} ${r1(p2.y)}`;
  }
  if (closed) d += " Z";
  return d;
}

// ローカル座標の点列から SVG 文字列を作る。閉パス=塗り、開パス=線。
function svgFromNodes(local: PathNode[], w: number, h: number, closed: boolean): string {
  const d = nodesToPathD(local, closed);
  const paint = closed
    ? 'fill="currentColor" stroke="none"'
    : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  // 曲線が枠を少しはみ出しても切れないよう overflow="visible"。
  return `<svg viewBox="0 0 ${w} ${h}" overflow="visible" ${paint}><path d="${d}"/></svg>`;
}

const PATH_PAD = 10; // 端の線・曲線のふくらみが切れないための余白

// 絶対座標の点列から、パス要素の position/size/content/points/closed を作り直す（正規化）。
// points は絶対座標のまま保持し、content はバウンディングボックス基準のローカル座標で描く。
function renormPath(nodesAbs: PathNode[], closed: boolean): Pick<StudioElement, "position" | "size" | "content" | "points" | "closed"> {
  const xs = nodesAbs.map((p) => p.x);
  const ys = nodesAbs.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX + PATH_PAD * 2;
  const h = Math.max(...ys) - minY + PATH_PAD * 2;
  const position = { x: minX - PATH_PAD, y: minY - PATH_PAD };
  const local = nodesAbs.map((p) => ({ ...p, x: p.x - position.x, y: p.y - position.y }));
  return { position, size: { width: w, height: h }, content: svgFromNodes(local, w, h, closed), points: nodesAbs, closed };
}

// 座標 {x,y} を PathNode 化（isCorner を指定）。
const toNode = (p: Pt, isCorner: boolean): PathNode => ({ id: sid("nd"), x: p.x, y: p.y, isCorner });

// ペンで打った点列から SVG（開いた線パス）要素を作る（2点未満なら null）。
// ペンは直線なので既定は角（isCorner=true）。あとで曲線ツールで滑らかにできる。
function elementFromPoints(points: Pt[], zIndex: number): StudioElement | null {
  if (points.length < 2) return null;
  return {
    id: sid("svg"),
    type: "svg",
    style: { backgroundColor: "transparent", color: "#0f172a", opacity: 1, borderRadius: 0, zIndex },
    ...renormPath(points.map((p) => toNode(p, true)), false),
  };
}

// 配列の並び＝重なり順。並びが変わったら style.zIndex を index に振り直す。
function reindex(list: StudioElement[]): StudioElement[] {
  return list.map((el, i) => (el.style.zIndex === i ? el : { ...el, style: { ...el.style, zIndex: i } }));
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// ---- 新規要素のひな型 --------------------------------------------------------
// 追加のたび少しずつずらして置き、完全な重なりを避ける。
function newElement(type: StudioElementType, index: number, count: number): StudioElement {
  const offset = (count % 8) * 24;
  const position = { x: 96 + offset, y: 96 + offset };
  const base: Omit<StudioElement, "size" | "style" | "content"> = { id: sid(type), type, position };

  switch (type) {
    case "circle":
      return {
        ...base,
        size: { width: 120, height: 120 },
        style: { backgroundColor: "#38bdf8", opacity: 1, borderRadius: 9999, zIndex: index },
        content: "",
      };
    case "text":
      return {
        ...base,
        size: { width: 220, height: 56 },
        style: { backgroundColor: "transparent", color: "#0f172a", opacity: 1, borderRadius: 0, zIndex: index, fontSize: 24, fontWeight: 700, textAlign: "left" },
        content: "テキスト",
      };
    case "image":
      return {
        ...base,
        size: { width: 240, height: 160 },
        style: { backgroundColor: "#e2e8f0", opacity: 1, borderRadius: 8, zIndex: index },
        content: "https://placehold.co/240x160/e2e8f0/64748b?text=Image",
      };
    case "svg":
      return {
        ...base,
        size: { width: 96, height: 96 },
        style: { backgroundColor: "transparent", color: "#0ea5e9", opacity: 1, borderRadius: 0, zIndex: index },
        content:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>',
      };
    case "rectangle":
    default:
      return {
        ...base,
        size: { width: 180, height: 120 },
        style: { backgroundColor: "#38bdf8", opacity: 1, borderRadius: 12, zIndex: index },
        content: "",
      };
  }
}

// ---- 初期サンプル（スタジオを開いたとき手掛かりになるボタン風の作例） --------
function sampleElements(): StudioElement[] {
  const raw: StudioElement[] = [
    { id: "st-card", type: "rectangle", position: { x: 120, y: 120 }, size: { width: 320, height: 160 }, style: { backgroundColor: "#0f172a", backgroundGradient: "linear-gradient(135deg, #0ea5e9, #6366f1)", opacity: 1, borderRadius: 20, boxShadow: "0 10px 30px rgba(2,6,23,0.25)", zIndex: 0 }, content: "" },
    { id: "st-badge", type: "circle", position: { x: 152, y: 152 }, size: { width: 48, height: 48 }, style: { backgroundColor: "#ffffff", opacity: 0.16, borderRadius: 9999, zIndex: 1 }, content: "" },
    { id: "st-title", type: "text", position: { x: 152, y: 200 }, size: { width: 260, height: 40 }, style: { backgroundColor: "transparent", color: "#ffffff", opacity: 1, borderRadius: 0, zIndex: 2, fontSize: 26, fontWeight: 800, textAlign: "left" }, content: "カスタム部品" },
  ];
  return reindex(raw);
}

// 保存データから既存ID(sN-)の最大値を求め、採番カウンタを進めて衝突を防ぐ。
function maxUid(list: StudioElement[]): number {
  let max = 0;
  list.forEach((el) => {
    const m = /^s(\d+)-/.exec(el.id);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return max;
}

// 同じグループの要素IDを返す（グループ無しなら自分だけ）
function groupMemberIds(elements: StudioElement[], id: string): string[] {
  const el = elements.find((e) => e.id === id);
  if (!el) return [];
  if (el.groupId) return elements.filter((e) => e.groupId === el.groupId).map((e) => e.id);
  return [el.id];
}

// 要素を深く複製（points も新IDで複製）。少しずらして重ならないように。
function cloneElement(src: StudioElement, groupId: string | undefined): StudioElement {
  return {
    ...src,
    id: sid(src.type),
    position: { x: src.position.x + 24, y: src.position.y + 24 },
    style: { ...src.style },
    size: { ...src.size },
    points: src.points?.map((p) => ({ ...p, id: sid("nd") })),
    groupId,
  };
}

// ---- ストア本体 --------------------------------------------------------------
interface StudioState {
  elements: StudioElement[];
  selectedIds: string[]; // 複数選択。グループの要素を選ぶとメンバー全員が入る
  // Undo/Redo 履歴（保存対象外）。elements のスナップショット。
  undoPast: StudioElement[][];
  undoFuture: StudioElement[][];
  // ペンツールの状態（UIの一時状態＝保存しない）
  tool: Tool;
  draft: { points: Pt[]; ortho: boolean } | null; // 描画中のパス
  select: (id: string | null, additive?: boolean) => void; // additive=Shift/⌘での加算選択
  add: (type: StudioElementType) => void;
  update: (id: string, patch: StudioPatch) => void;
  remove: (id: string) => void;
  removeSelected: () => void; // 選択中すべてを削除
  duplicate: (id: string) => void;
  duplicateSelected: () => void; // 選択中すべてを複製
  copySelection: () => void; // 選択中をクリップボードへ
  paste: () => void; // クリップボードを貼り付け
  moveElements: (items: { id: string; x: number; y: number }[]) => void; // まとめて移動（グループドラッグ用）
  group: () => void; // 選択中をグループ化
  ungroup: () => void; // 選択中のグループを解除
  selectAll: () => void; // すべて選択
  nudgeSelected: (dx: number, dy: number) => void; // 選択中を相対移動（矢印キー）
  // 重なり順（配列の並び）を1つ前面/背面へ。
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  // ペンツール操作
  setTool: (t: Tool) => void;
  penAddPoint: (pt: Pt) => void;
  penRemoveLast: () => void;
  penToggleOrtho: () => void;
  penCommit: () => void;
  penCancel: () => void;
  // 図形→パス変換 & ノード編集
  convertToPath: (id: string) => void;
  movePathPoint: (id: string, index: number, abs: Pt) => void;
  insertPathPoint: (id: string, index: number, abs: Pt) => void;
  deletePathPoint: (id: string, index: number) => void;
  toggleNodeCorner: (id: string, index: number) => void; // 曲線⇄角の切替
  reset: () => void;
}

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      elements: sampleElements(),
      selectedIds: [],
      undoPast: [],
      undoFuture: [],
      tool: "select",
      draft: null,

      // クリック選択。グループの要素はメンバー全員を選ぶ。additive=Shift/⌘でトグル追加。
      select: (id, additive = false) =>
        set((s) => {
          if (id == null) return { selectedIds: [] };
          const members = groupMemberIds(s.elements, id);
          if (!additive) return { selectedIds: members };
          const set2 = new Set(s.selectedIds);
          const allIn = members.every((m) => set2.has(m));
          members.forEach((m) => (allIn ? set2.delete(m) : set2.add(m)));
          return { selectedIds: [...set2] };
        }),

      add: (type) =>
        set((s) => {
          const el = newElement(type, s.elements.length, s.elements.length);
          return { elements: [...s.elements, el], selectedIds: [el.id] };
        }),

      update: (id, patch) =>
        set((s) => ({
          elements: s.elements.map((el) => {
            if (el.id !== id) return el;
            const next: StudioElement = {
              ...el,
              ...(patch.type ? { type: patch.type } : {}),
              ...(patch.content !== undefined ? { content: patch.content } : {}),
              ...(patch.closed !== undefined ? { closed: patch.closed } : {}),
              position: { ...el.position, ...patch.position },
              size: { ...el.size, ...patch.size },
              style: { ...el.style, ...patch.style },
            };
            // 明示的な points 指定はそのまま採用
            if (patch.points) { next.points = patch.points; return next; }
            // パス要素を箱ごと移動/リサイズしたら、アンカー点も同じ変換で追従させる
            if (el.points && (patch.position || patch.size)) {
              const sx = el.size.width ? next.size.width / el.size.width : 1;
              const sy = el.size.height ? next.size.height / el.size.height : 1;
              next.points = el.points.map((p) => ({
                ...p, // id / isCorner を保つ
                x: next.position.x + (p.x - el.position.x) * sx,
                y: next.position.y + (p.y - el.position.y) * sy,
              }));
            }
            return next;
          }),
        })),

      remove: (id) =>
        set((s) => ({
          elements: reindex(s.elements.filter((el) => el.id !== id)),
          selectedIds: s.selectedIds.filter((sid) => sid !== id),
        })),

      removeSelected: () =>
        set((s) => {
          if (s.selectedIds.length === 0) return {};
          const rm = new Set(s.selectedIds);
          return { elements: reindex(s.elements.filter((el) => !rm.has(el.id))), selectedIds: [] };
        }),

      duplicate: (id) =>
        set((s) => {
          const src = s.elements.find((el) => el.id === id);
          if (!src) return s;
          const copy = cloneElement(src, undefined);
          return { elements: reindex([...s.elements, copy]), selectedIds: [copy.id] };
        }),

      duplicateSelected: () =>
        set((s) => {
          const srcs = s.elements.filter((el) => s.selectedIds.includes(el.id));
          if (srcs.length === 0) return {};
          const gid = srcs.length > 1 ? sid("grp") : undefined; // 複数複製はまとめて新グループに
          const copies = srcs.map((src) => cloneElement(src, gid));
          return { elements: reindex([...s.elements, ...copies]), selectedIds: copies.map((c) => c.id) };
        }),

      copySelection: () => {
        const { elements, selectedIds } = get();
        // 相対位置・グループ関係を保ったままスナップショット
        studioClipboard = elements
          .filter((e) => selectedIds.includes(e.id))
          .map((e) => ({ ...e, position: { ...e.position }, size: { ...e.size }, style: { ...e.style }, points: e.points?.map((p) => ({ ...p })) }));
      },

      paste: () =>
        set((s) => {
          if (studioClipboard.length === 0) return {};
          // グループは対応表で作り直す（コピー元のグループを保ったまま新IDに）
          const groupMap = new Map<string, string>();
          const copies = studioClipboard.map((src) => {
            let groupId = src.groupId;
            if (groupId) {
              if (!groupMap.has(groupId)) groupMap.set(groupId, sid("grp"));
              groupId = groupMap.get(groupId);
            }
            return cloneElement({ ...src, groupId }, groupId);
          });
          return { elements: reindex([...s.elements, ...copies]), selectedIds: copies.map((c) => c.id) };
        }),

      // まとめて絶対位置へ移動（グループドラッグ用）。パスの点も一緒にずらす。
      moveElements: (items) =>
        set((s) => {
          const map = new Map(items.map((it) => [it.id, it]));
          return {
            elements: s.elements.map((el) => {
              const it = map.get(el.id);
              if (!it) return el;
              const dx = it.x - el.position.x;
              const dy = it.y - el.position.y;
              const next: StudioElement = { ...el, position: { x: it.x, y: it.y } };
              if (el.points) next.points = el.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
              return next;
            }),
          };
        }),

      group: () =>
        set((s) => {
          if (s.selectedIds.length < 2) return {};
          const gid = sid("grp");
          const sel = new Set(s.selectedIds);
          return { elements: s.elements.map((el) => (sel.has(el.id) ? { ...el, groupId: gid } : el)) };
        }),

      ungroup: () =>
        set((s) => {
          const sel = new Set(s.selectedIds);
          return { elements: s.elements.map((el) => (sel.has(el.id) && el.groupId ? { ...el, groupId: undefined } : el)) };
        }),

      selectAll: () => set((s) => ({ selectedIds: s.elements.map((e) => e.id) })),

      nudgeSelected: (dx, dy) =>
        set((s) => {
          if (s.selectedIds.length === 0) return {};
          const sel = new Set(s.selectedIds);
          return {
            elements: s.elements.map((el) => {
              if (!sel.has(el.id)) return el;
              const next: StudioElement = { ...el, position: { x: el.position.x + dx, y: el.position.y + dy } };
              if (el.points) next.points = el.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
              return next;
            }),
          };
        }),

      bringForward: (id) =>
        set((s) => {
          const i = s.elements.findIndex((el) => el.id === id);
          if (i === -1) return s;
          return { elements: reindex(arrayMove(s.elements, i, i + 1)) };
        }),

      sendBackward: (id) =>
        set((s) => {
          const i = s.elements.findIndex((el) => el.id === id);
          if (i === -1) return s;
          return { elements: reindex(arrayMove(s.elements, i, i - 1)) };
        }),

      // --- ペンツール ---
      setTool: (t) =>
        set((s) => {
          if (t === s.tool) return {};
          // ペンを抜けるときは、使える下描き(2点以上)があれば確定してから切り替える
          let base: Partial<StudioState> = {};
          if (s.tool === "pen") {
            const el = elementFromPoints(s.draft?.points ?? [], s.elements.length);
            if (el) base = { elements: reindex([...s.elements, el]), selectedIds: [el.id] };
          }
          if (t === "pen") return { ...base, tool: "pen", draft: { points: [], ortho: false }, selectedIds: [] };
          // select / node は選択を保ったまま切り替え（node は選択中のパスをそのまま編集できる）
          return { ...base, tool: t, draft: null };
        }),

      penAddPoint: (pt) =>
        set((s) => {
          if (!s.draft) return {};
          const pts = s.draft.points;
          const p = s.draft.ortho && pts.length > 0 ? orthoSnap(pts[pts.length - 1], pt) : pt;
          return { draft: { ...s.draft, points: [...pts, p] } };
        }),

      penRemoveLast: () =>
        set((s) => (s.draft && s.draft.points.length > 0 ? { draft: { ...s.draft, points: s.draft.points.slice(0, -1) } } : {})),

      penToggleOrtho: () => set((s) => (s.draft ? { draft: { ...s.draft, ortho: !s.draft.ortho } } : {})),

      penCommit: () =>
        set((s) => {
          const el = elementFromPoints(s.draft?.points ?? [], s.elements.length);
          if (el) return { tool: "select", draft: null, elements: reindex([...s.elements, el]), selectedIds: [el.id] };
          return { tool: "select", draft: null };
        }),

      penCancel: () => set({ tool: "select", draft: null }),

      // --- 図形→パス変換 & ノード編集 ---
      convertToPath: (id) =>
        set((s) => ({
          elements: s.elements.map((el) => {
            if (el.id !== id) return el;
            if (el.type !== "rectangle" && el.type !== "circle") return el; // 変換対象は基本図形のみ
            const { x, y } = el.position;
            const { width: w, height: h } = el.size;
            let nodes: PathNode[];
            if (el.type === "rectangle") {
              // 四角形は全点を「角」に（シャープな矩形）
              nodes = [ { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h } ].map((p) => toNode(p, true));
            } else {
              // 円/楕円は8点の「曲線」点で近似（滑らかな輪郭になる）
              const N = 8;
              const cx = x + w / 2;
              const cy = y + h / 2;
              nodes = Array.from({ length: N }, (_, i) => {
                const a = (i / N) * Math.PI * 2 - Math.PI / 2;
                return toNode({ x: cx + Math.cos(a) * (w / 2), y: cy + Math.sin(a) * (h / 2) }, false);
              });
            }
            // 塗り色を currentColor に引き継ぐ（グラデは単色化）。図形の背景は透明に。
            const fill = el.style.backgroundColor && /^#/.test(el.style.backgroundColor) ? el.style.backgroundColor : el.style.color ?? "#38bdf8";
            return {
              ...el,
              type: "svg",
              style: { ...el.style, color: fill, backgroundColor: "transparent", backgroundGradient: undefined, borderRadius: 0 },
              ...renormPath(nodes, true),
            };
          }),
        })),

      movePathPoint: (id, index, abs) =>
        set((s) => ({
          elements: s.elements.map((el) => {
            if (el.id !== id || !el.points) return el;
            const nodes = el.points.map((p, i) => (i === index ? { ...p, x: abs.x, y: abs.y } : p));
            return { ...el, ...renormPath(nodes, !!el.closed) };
          }),
        })),

      insertPathPoint: (id, index, abs) =>
        set((s) => ({
          elements: s.elements.map((el) => {
            if (el.id !== id || !el.points) return el;
            const nodes = el.points.slice();
            nodes.splice(index, 0, toNode(abs, false)); // 挿入点は既定で曲線
            return { ...el, ...renormPath(nodes, !!el.closed) };
          }),
        })),

      deletePathPoint: (id, index) =>
        set((s) => ({
          elements: s.elements.map((el) => {
            if (el.id !== id || !el.points) return el;
            const min = el.closed ? 3 : 2; // これ以上は減らせない
            if (el.points.length <= min) return el;
            const nodes = el.points.filter((_, i) => i !== index);
            return { ...el, ...renormPath(nodes, !!el.closed) };
          }),
        })),

      // ダブルクリックで「曲線 ⇄ 角」を切り替える
      toggleNodeCorner: (id, index) =>
        set((s) => ({
          elements: s.elements.map((el) => {
            if (el.id !== id || !el.points) return el;
            const nodes = el.points.map((p, i) => (i === index ? { ...p, isCorner: !p.isCorner } : p));
            return { ...el, ...renormPath(nodes, !!el.closed) };
          }),
        })),

      reset: () => set({ elements: sampleElements(), selectedIds: [], tool: "select", draft: null }),
    }),
    {
      name: "design-sync-studio-v1",
      version: 2,
      partialize: (s) => ({ elements: s.elements }),
      skipHydration: true,
      // v1: points が {x,y}[] だった → PathNode[]（id/isCorner付き）へ移行。
      // 旧パスは直線だったので isCorner=true（角）で見た目を保つ。
      migrate: (persisted, version) => {
        const st = persisted as { elements?: StudioElement[] } | undefined;
        if (version < 2 && st?.elements) {
          st.elements = st.elements.map((el) => {
            const pts = (el as unknown as { points?: Array<{ id?: string; x: number; y: number; isCorner?: boolean }> }).points;
            if (!pts) return el;
            return {
              ...el,
              points: pts.map((p, i) => ({ id: typeof p.id === "string" ? p.id : `${el.id}-n${i}`, x: p.x, y: p.y, isCorner: typeof p.isCorner === "boolean" ? p.isCorner : true })),
            };
          });
        }
        return persisted;
      },
      onRehydrateStorage: () => (state) => {
        if (state) uid = Math.max(uid, maxUid(state.elements));
      },
    },
  ),
);

// Undo/Redo（elements のスナップショット単位）。undo/redo は選択をクリアして齟齬を防ぐ。
export const studioHistory = wireHistory(useStudio, {
  pick: (s) => s.elements,
  changed: (a, b) => a !== b,
  put: (snap) => ({ elements: snap, selectedIds: [] }),
  readStacks: (s) => ({ past: s.undoPast, future: s.undoFuture }),
  writeStacks: (past, future) => ({ undoPast: past, undoFuture: future }),
});
