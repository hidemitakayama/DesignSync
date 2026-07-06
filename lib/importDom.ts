// 「見た目ごと」取り込むインポータ。
// HTMLを隠しiframeで実際に描画し（CSS/Tailwind適用済み）、各要素の computedStyle を読み取って
// ビルダーのページ構造（Flexbox＋text/image/svg）へ変換する。Tailwind/shadcn等の“描画結果”を取り込む。
// ※ ビルダーはFlexboxベースなので、Grid・複雑な絶対配置・擬似要素・レスポンシブ・JSは近似/省略される。

import {
  type Page,
  type SceneNode,
  type ContainerNode,
  type AtomNode,
  type FlexDirection,
  type JustifyContent,
  type AlignItems,
  isContainer,
} from "./types";
import { uploadFromSrc, refToDataUri, isDriveRef } from "./imageStore";

let ic = 0;
const iid = (p: string) => `imp${++ic}-${p}`;
let count = 0;
const MAX_NODES = 2500;

const num = (v: string | null | undefined): number => {
  const n = parseFloat(v ?? "");
  return isFinite(n) ? n : 0;
};

// computed の色（rgb/rgba）→ hex or rgba。透明は undefined。
function toColor(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const m = /rgba?\(([^)]+)\)/i.exec(v);
  if (!m) return v.startsWith("#") ? v : undefined;
  const p = m[1].split(",").map((s) => parseFloat(s.trim()));
  const [r, g, b] = p;
  const a = p[3] === undefined ? 1 : p[3];
  if (a === 0) return undefined;
  const hex = "#" + [r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")).join("");
  return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : hex;
}

// 背景（グラデ画像があればそれ、なければ背景色）
function bgOf(cs: CSSStyleDeclaration): string | undefined {
  const img = cs.backgroundImage;
  if (img && img !== "none" && /gradient/i.test(img)) return img;
  return toColor(cs.backgroundColor);
}

const JSET = new Set(["flex-start", "center", "flex-end", "space-between", "space-around"]);
function mapJustify(v: string): JustifyContent {
  if (v === "start" || v === "normal" || v === "left") return "flex-start";
  if (v === "end" || v === "right") return "flex-end";
  if (v === "space-evenly") return "space-around";
  return (JSET.has(v) ? v : "flex-start") as JustifyContent;
}
const ASET = new Set(["flex-start", "center", "flex-end", "stretch"]);
function mapAlign(v: string): AlignItems {
  if (v === "start") return "flex-start";
  if (v === "end") return "flex-end";
  if (v === "normal" || v === "baseline") return "stretch";
  return (ASET.has(v) ? v : "stretch") as AlignItems;
}
function mapTextAlign(v: string): "left" | "center" | "right" | undefined {
  if (v === "center") return "center";
  if (v === "right" || v === "end") return "right";
  if (v === "left" || v === "start" || v === "justify") return "left";
  return undefined;
}

function nameOf(el: Element): string {
  const dn = el.getAttribute("data-name") || el.getAttribute("aria-label");
  if (dn) return dn.slice(0, 24);
  if (el.id) return "#" + el.id;
  return el.tagName.toLowerCase();
}

function addSpacing(node: ContainerNode | AtomNode, cs: CSSStyleDeclaration) {
  const pt = num(cs.paddingTop), pr = num(cs.paddingRight), pb = num(cs.paddingBottom), pl = num(cs.paddingLeft);
  if (pt || pr || pb || pl) {
    if (pt === pr && pr === pb && pb === pl) node.padding = pt;
    else { node.paddingTop = pt; node.paddingRight = pr; node.paddingBottom = pb; node.paddingLeft = pl; }
  }
  const mt = num(cs.marginTop), mr = num(cs.marginRight), mb = num(cs.marginBottom), ml = num(cs.marginLeft);
  if (mt || mr || mb || ml) {
    if (mt === mr && mr === mb && mb === ml) node.margin = mt;
    else { node.marginTop = mt; node.marginRight = mr; node.marginBottom = mb; node.marginLeft = ml; }
  }
}

const SKIP = new Set(["SCRIPT", "STYLE", "LINK", "META", "NOSCRIPT", "HEAD", "TITLE", "BR", "TEMPLATE", "HR", "IFRAME"]);

// 絶対配置（absolute/fixed）の atom を自由配置ノードにする。x/y は直近の親ボックス基準。
function markFree(node: SceneNode, cs: CSSStyleDeclaration, rect: DOMRect, parentRect?: DOMRect): SceneNode {
  if (node.type !== "atom" || !parentRect) return node;
  if (cs.position === "absolute" || cs.position === "fixed") {
    node.free = true;
    node.x = Math.round(rect.left - parentRect.left);
    node.y = Math.round(rect.top - parentRect.top);
    node.front = num(cs.zIndex) > 0 || cs.position === "fixed";
  }
  return node;
}

function build(el: Element, win: Window, depth: number, parentRect?: DOMRect): SceneNode | null {
  if (depth > 40 || count > MAX_NODES) return null;
  if (SKIP.has(el.tagName)) return null;
  const cs = win.getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return null;
  count++;

  const rect = el.getBoundingClientRect();
  const tag = el.tagName.toLowerCase();
  if (tag === "img") return markFree(imageAtom(el as HTMLImageElement, cs), cs, rect, parentRect);
  if (tag === "svg") return markFree(svgAtom(el, cs), cs, rect, parentRect);

  const elemChildren = Array.from(el.children);
  const kids: SceneNode[] = [];
  elemChildren.forEach((c) => { const n = build(c, win, depth + 1, rect); if (n) kids.push(n); });

  if (kids.length === 0) {
    const text = (el.textContent || "").trim();
    if (text) return markFree(textAtom(el, cs, text), cs, rect, parentRect);
    // 中身なし：背景か高さがあれば色ボックスとして残す。無ければ捨てる。
    const bg = bgOf(cs);
    const h = num(cs.height);
    if (bg || h > 4) {
      const box: ContainerNode = { id: iid("group"), type: "group", name: nameOf(el), direction: "column", justify: "flex-start", align: "stretch", gap: 0, children: [] };
      if (bg) box.background = bg;
      if (num(cs.minHeight) || h) box.minHeight = num(cs.minHeight) || h;
      const rad = num(cs.borderTopLeftRadius); if (rad) box.radius = rad;
      addSpacing(box, cs);
      return box;
    }
    return null;
  }

  return container(el, cs, kids, depth);
}

function container(el: Element, cs: CSSStyleDeclaration, kids: SceneNode[], depth: number): ContainerNode {
  const isFlex = cs.display.includes("flex");
  const dir: FlexDirection = isFlex && cs.flexDirection.startsWith("row") ? "row" : "column";
  const node: ContainerNode = {
    id: iid(depth === 0 ? "section" : "group"),
    type: depth === 0 ? "section" : "group",
    name: nameOf(el),
    direction: dir,
    justify: isFlex ? mapJustify(cs.justifyContent) : "flex-start",
    align: isFlex ? mapAlign(cs.alignItems) : "stretch",
    gap: num(cs.rowGap || cs.gap) || 0,
    children: kids,
  };
  addSpacing(node, cs);
  const bg = bgOf(cs); if (bg) node.background = bg;
  const rad = num(cs.borderTopLeftRadius); if (rad) node.radius = rad;
  const mh = num(cs.minHeight); if (mh) node.minHeight = mh;
  if (cs.flexWrap === "wrap") node.wrap = true;
  return node;
}

function textAtom(el: Element, cs: CSSStyleDeclaration, text: string): AtomNode {
  const node: AtomNode = {
    id: iid("text"), type: "atom", atomType: "text", name: text.slice(0, 10) || "テキスト", text,
    style: { color: toColor(cs.color), fontSize: Math.round(num(cs.fontSize)) || undefined, fontWeight: num(cs.fontWeight) || undefined, align: mapTextAlign(cs.textAlign) },
  };
  addSpacing(node, cs);
  return node;
}

function imageAtom(el: HTMLImageElement, cs: CSSStyleDeclaration): AtomNode {
  const w = Math.round(num(cs.width)) || el.naturalWidth || 240;
  const h = Math.round(num(cs.height)) || el.naturalHeight || 160;
  const node: AtomNode = { id: iid("image"), type: "atom", atomType: "image", name: el.getAttribute("alt") || "画像", src: el.currentSrc || el.src || el.getAttribute("src") || "", alt: el.getAttribute("alt") || "", width: w, height: h };
  addSpacing(node, cs);
  return node;
}

function svgAtom(el: Element, cs: CSSStyleDeclaration): AtomNode {
  const w = Math.round(num(cs.width)) || 48;
  const h = Math.round(num(cs.height)) || 48;
  const node: AtomNode = { id: iid("svg"), type: "atom", atomType: "svg", name: "SVG", svg: el.outerHTML, width: w, height: h };
  addSpacing(node, cs);
  return node;
}

// body から「本文のルート」まで単一ラッパーを降りる
function contentRoot(body: HTMLElement): Element {
  let root: Element = body;
  let guard = 0;
  while (root.children.length === 1 && guard++ < 10) {
    const only = root.children[0];
    const directText = Array.from(root.childNodes).some((n) => n.nodeType === 3 && (n.textContent || "").trim());
    if (directText || SKIP.has(only.tagName) || only.tagName === "IMG" || only.tagName === "SVG") break;
    root = only;
  }
  return root;
}

// 描画済みドキュメント → Page
export function domToPage(body: HTMLElement, win: Window, name = "読み込んだページ"): Page {
  ic = 0; count = 0;
  const root = contentRoot(body);
  const rootRect = root.getBoundingClientRect();
  const sections: ContainerNode[] = [];
  Array.from(root.children).forEach((child) => {
    const node = build(child, win, 0, rootRect);
    if (!node) return;
    if (node.type === "atom") {
      sections.push({ id: iid("section"), type: "section", name: node.name, direction: "column", justify: "flex-start", align: "stretch", gap: 0, padding: 24, children: [node] });
    } else {
      sections.push({ ...node, type: "section" });
    }
  });
  if (sections.length === 0) sections.push({ id: iid("section"), type: "section", name: "セクション", direction: "column", justify: "flex-start", align: "stretch", gap: 16, padding: 48, background: "#ffffff", children: [] });
  return { id: iid("page"), name, children: sections };
}

// ページ内の画像atomを列挙
function imageAtoms(page: Page): AtomNode[] {
  const out: AtomNode[] = [];
  const walk = (nodes: SceneNode[]) => nodes.forEach((n) => { if (isContainer(n)) walk(n.children); else if (n.atomType === "image") out.push(n); });
  walk(page.children);
  return out;
}

// 取り込んだ画像を Drive フォルダに保存し drive:// 参照に置き換える（page を直接更新）。
export async function saveImagesToDrive(page: Page): Promise<{ ok: number; fail: number }> {
  let ok = 0, fail = 0;
  for (const img of imageAtoms(page)) {
    if (!img.src || isDriveRef(img.src)) continue;
    const ref = await uploadFromSrc(img.src, "imported");
    if (ref && isDriveRef(ref)) { img.src = ref; ok++; } else fail++;
  }
  return { ok, fail };
}

export function pageHasDriveImages(page: Page): boolean {
  return imageAtoms(page).some((n) => isDriveRef(n.src));
}

// 書き出し用：drive:// 画像を dataURI に解決した新しい Page を返す（元は変更しない）。
export async function resolveDriveImages(page: Page): Promise<Page> {
  const map = new Map<string, string>();
  for (const img of imageAtoms(page)) {
    if (isDriveRef(img.src) && !map.has(img.src!)) {
      const d = await refToDataUri(img.src!);
      if (d) map.set(img.src!, d);
    }
  }
  if (map.size === 0) return page;
  const swap = (nodes: SceneNode[]): SceneNode[] => nodes.map((n) => {
    if (isContainer(n)) return { ...n, children: swap(n.children) };
    if (n.atomType === "image" && n.src && map.has(n.src)) return { ...n, src: map.get(n.src) };
    return n;
  });
  return { ...page, children: swap(page.children) as ContainerNode[] };
}

// HTML文字列を隠しiframeで描画してから domToPage する（CSS/Tailwindを適用させるため待機あり）。
export async function htmlToPageRendered(html: string, name = "読み込んだページ", waitMs = 900): Promise<Page> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:1200px;height:2400px;border:0;visibility:hidden";
  document.body.appendChild(iframe);
  try {
    await new Promise<void>((resolve) => {
      iframe.addEventListener("load", () => resolve(), { once: true });
      iframe.srcdoc = html;
    });
    // 外部CSS / Tailwind CDN / フォント適用を待つ
    await new Promise((r) => setTimeout(r, waitMs));
    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc?.body) throw new Error("HTMLを描画できませんでした");
    return domToPage(doc.body, win, name);
  } finally {
    iframe.remove();
  }
}
