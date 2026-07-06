// エクスポートした（またはそれに準じた）HTML を、ビルダーのページツリーへ逆変換する。
// DesignSync 自身の書き出しはほぼそのまま往復でき、外部のHTMLもベストエフォートで取り込む。
// data-name 属性があればノード名として使う（1st_build_designsync.md の方針）。
// ※ DOMParser を使うのでクライアント（読み込み操作時）でのみ呼ぶこと。

import {
  type Page,
  type SceneNode,
  type ContainerNode,
  type JustifyContent,
  type AlignItems,
  type FlexDirection,
} from "./types";

let ic = 0;
const iid = (p: string) => `imp${++ic}-${p}`;

const num = (v: string | null | undefined): number | undefined => {
  const n = parseFloat(v ?? "");
  return isFinite(n) ? n : undefined;
};

const JUSTIFY: JustifyContent[] = ["flex-start", "center", "flex-end", "space-between", "space-around"];
const ALIGN: AlignItems[] = ["flex-start", "center", "flex-end", "stretch"];
const oneOf = <T extends string>(v: string, allow: T[], fallback: T): T => (allow.includes(v as T) ? (v as T) : fallback);

// padding/margin のショートハンドを上下左右へ。全辺同じなら uniform を返す。
function spacing(css: string): { u?: number; t?: number; r?: number; b?: number; l?: number } {
  const p = css.trim().split(/\s+/).map((x) => parseFloat(x)).filter((n) => isFinite(n));
  let t: number, r: number, b: number, l: number;
  if (p.length === 1) [t, r, b, l] = [p[0], p[0], p[0], p[0]];
  else if (p.length === 2) [t, r, b, l] = [p[0], p[1], p[0], p[1]];
  else if (p.length === 3) [t, r, b, l] = [p[0], p[1], p[2], p[1]];
  else if (p.length === 4) [t, r, b, l] = [p[0], p[1], p[2], p[3]];
  else return {};
  return t === r && r === b && b === l ? { u: t } : { t, r, b, l };
}

function parseNode(el: HTMLElement, depth: number): SceneNode {
  const tag = el.tagName.toLowerCase();
  const st = el.style;
  const dataName = el.getAttribute("data-name") || undefined;

  if (tag === "img") {
    return {
      id: iid("image"), type: "atom", atomType: "image", name: dataName || el.getAttribute("alt") || "画像",
      src: el.getAttribute("src") || "", alt: el.getAttribute("alt") || "",
      width: num(st.width) ?? num(el.getAttribute("width")) ?? 240, height: num(st.height) ?? num(el.getAttribute("height")) ?? 160,
    };
  }
  if (tag === "svg") {
    return { id: iid("svg"), type: "atom", atomType: "svg", name: dataName || "SVG", svg: el.outerHTML, width: num(st.width) ?? 96, height: num(st.height) ?? 96 };
  }

  const children = Array.from(el.children).filter((c): c is HTMLElement => c instanceof HTMLElement);

  // 自由配置（absolute）ラッパー：中の img/svg を free atom として取り込む
  if (st.position === "absolute" && children.length === 1) {
    const inner = parseNode(children[0], depth + 1);
    if (inner.type === "atom" && (inner.atomType === "image" || inner.atomType === "svg")) {
      inner.free = true;
      inner.x = num(st.left) ?? 0;
      inner.y = num(st.top) ?? 0;
      inner.width = num(st.width) ?? inner.width;
      inner.height = num(st.height) ?? inner.height;
      inner.front = (num(st.zIndex) ?? 0) > 0;
      if (dataName) inner.name = dataName;
      return inner;
    }
  }

  // 画像/SVG を包む relative ラッパー（display:flex でない単一子）は剥がして atom にする
  if (st.display !== "flex" && children.length === 1) {
    const inner = parseNode(children[0], depth);
    if (inner.type === "atom" && (inner.atomType === "image" || inner.atomType === "svg")) {
      const w = num(st.width);
      const h = num(st.height);
      if (w) inner.width = w;
      if (h) inner.height = h;
      if (dataName) inner.name = dataName;
      return inner;
    }
  }

  // 子要素が無ければテキスト（葉）
  if (children.length === 0) {
    const text = (el.textContent || "").trim();
    const align: "left" | "center" | "right" | undefined =
      st.textAlign === "center" || st.textAlign === "right" || st.textAlign === "left" ? st.textAlign : undefined;
    return {
      id: iid("text"), type: "atom", atomType: "text", name: dataName || text.slice(0, 8) || "テキスト", text,
      style: { color: st.color || undefined, fontSize: num(st.fontSize), fontWeight: num(st.fontWeight), align },
    };
  }

  // 子要素があればコンテナ（トップ=section / それ以外=group）
  const dir: FlexDirection = st.flexDirection === "row" ? "row" : "column";
  const pad = spacing(st.padding || "");
  const mar = spacing(st.margin || "");
  return {
    id: iid(depth === 0 ? "section" : "group"),
    type: depth === 0 ? "section" : "group",
    name: dataName || (depth === 0 ? "セクション" : "グループ"),
    direction: dir,
    justify: oneOf(st.justifyContent, JUSTIFY, "flex-start"),
    align: oneOf(st.alignItems, ALIGN, "stretch"),
    gap: num(st.gap) ?? 0,
    padding: pad.u, paddingTop: pad.t, paddingRight: pad.r, paddingBottom: pad.b, paddingLeft: pad.l,
    margin: mar.u, marginTop: mar.t, marginRight: mar.r, marginBottom: mar.b, marginLeft: mar.l,
    background: st.background || st.backgroundColor || undefined,
    radius: num(st.borderRadius),
    minHeight: num(st.minHeight),
    wrap: st.flexWrap === "wrap" ? true : undefined,
    children: children.map((c) => parseNode(c, depth + 1)),
  };
}

function emptySection(): ContainerNode {
  return { id: iid("section"), type: "section", name: "セクション", direction: "column", justify: "flex-start", align: "stretch", gap: 16, padding: 48, background: "#ffffff", children: [] };
}

export function htmlToPage(html: string, name = "読み込んだページ"): Page {
  ic = 0;
  const doc = new DOMParser().parseFromString(html, "text/html");
  let container: HTMLElement = doc.body;
  // 960px 等の外側ラッパーを1段はがす（DesignSync書き出し対策）
  const only = container.children.length === 1 ? (container.children[0] as HTMLElement) : null;
  if (only && only.tagName === "DIV" && only.children.length > 0) container = only;

  const tops = Array.from(container.children).filter((c): c is HTMLElement => c instanceof HTMLElement);
  const sections: ContainerNode[] = tops.map((el) => {
    const node = parseNode(el, 0);
    if (node.type === "atom") {
      // トップがアトムならセクションで包む
      return { ...emptySection(), name: node.name, padding: 24, children: [node] };
    }
    return { ...(node as ContainerNode), type: "section" };
  });

  return { id: iid("page"), name, children: sections.length ? sections : [emptySection()] };
}
