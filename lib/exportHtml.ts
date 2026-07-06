// ページツリー → 単一の完結HTML。プレビュー(Renderer.tsx)と同じ規則でスタイルを生成し、
// 「見たまま」を静的HTMLとして再現する。フォントは <link>、画像/SVG は埋め込み（自己完結）。

import { type Page, type SceneNode, type ContainerNode, type AtomNode, isContainer, isAtom, paddingCss, marginCss } from "./types";
import { fontCss, GOOGLE_FONTS_HREF } from "./fonts";
import { svgScalable } from "./svg";

const isFreeAtom = (n: SceneNode): n is AtomNode => isAtom(n) && !!n.free;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// [prop, value] の配列を CSS 文字列へ（undefined/空は除外）
function css(pairs: Array<[string, string | undefined]>): string {
  return pairs.filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${k}:${v}`).join(";");
}
const pxOf = (n?: number) => (n != null ? `${n}px` : undefined);

// Renderer の itemFlex と同一
function itemFlex(n: SceneNode, basisOverride?: string): string | undefined {
  if (basisOverride) return `0 0 ${basisOverride}`;
  if (n.basis != null) return `${n.grow ? 1 : 0} 1 ${n.basis}px`;
  return n.grow ? "1 1 0" : undefined;
}
const alignSelfOf = (n: SceneNode) => (n.alignSelf && n.alignSelf !== "auto" ? n.alignSelf : undefined);

function serializeNode(node: SceneNode, basisOverride?: string): string {
  return isContainer(node) ? serializeContainer(node, basisOverride) : serializeAtom(node, basisOverride);
}

function serializeContainer(node: ContainerNode, basisOverride?: string): string {
  const useColumns = node.direction === "row" && !!node.columns && node.columns > 0;
  const childBasis = useColumns ? `calc((100% - ${(node.columns! - 1) * node.gap}px) / ${node.columns})` : undefined;
  const wrapped = node.wrap || useColumns;

  const flowChildren = node.children.filter((c) => !isFreeAtom(c));
  const freeChildren = node.children.filter(isFreeAtom);
  const hasFree = freeChildren.length > 0;

  const style = css([
    ["display", "flex"],
    ["flex-direction", node.direction],
    ["flex-wrap", wrapped ? "wrap" : undefined],
    ["justify-content", node.justify],
    ["align-items", node.align],
    ["gap", pxOf(node.gap)],
    ["padding", paddingCss(node)],
    ["margin", marginCss(node)],
    ["background", node.background],
    ["border-radius", pxOf(node.radius)],
    ["min-height", pxOf(node.minHeight)],
    ["flex", itemFlex(node, basisOverride)],
    ["align-self", alignSelfOf(node)],
    ["position", hasFree ? "relative" : undefined],
    ["isolation", hasFree ? "isolate" : undefined],
  ]);

  const freeHtml = freeChildren.map(serializeFree).join("");
  const flowHtml = flowChildren
    .map((c) => {
      const el = serializeNode(c, childBasis);
      // breakAfter：flex-basis:100% の不可視要素で次行へ送る（親がwrap時）
      return c.breakAfter && wrapped ? el + `<div aria-hidden style="flex-basis:100%;width:0;height:0"></div>` : el;
    })
    .join("");

  return `<div style="${style}">${freeHtml}${flowHtml}</div>`;
}

function serializeAtom(node: AtomNode, basisOverride?: string): string {
  if (node.atomType === "text") {
    const st = node.style ?? {};
    const style = css([
      ["color", st.color],
      ["font-size", pxOf(st.fontSize)],
      ["font-weight", st.fontWeight != null ? String(st.fontWeight) : undefined],
      ["font-family", fontCss(st.fontFamily)],
      ["text-align", st.align],
      ["padding", paddingCss(node)],
      ["margin", marginCss(node)],
      ["flex", itemFlex(node, basisOverride)],
      ["white-space", "pre-wrap"],
      ["align-self", alignSelfOf(node)],
    ]);
    return `<div style="${style}">${esc(node.text ?? "")}</div>`;
  }

  const wrap = css([
    ["position", "relative"],
    ["width", pxOf(node.width)],
    ["height", pxOf(node.height)],
    ["margin", marginCss(node)],
    ["flex", itemFlex(node, basisOverride)],
    ["align-self", alignSelfOf(node)],
  ]);
  return `<div style="${wrap}">${atomInner(node)}</div>`;
}

// 自由配置（absolute）の要素
function serializeFree(node: AtomNode): string {
  const style = css([
    ["position", "absolute"],
    ["left", pxOf(node.x ?? 0)],
    ["top", pxOf(node.y ?? 0)],
    ["width", pxOf(node.width)],
    ["height", pxOf(node.height)],
    ["z-index", node.front ? "10" : "-1"],
  ]);
  return `<div style="${style}">${atomInner(node)}</div>`;
}

// テキスト / 画像 / SVG の中身
function atomInner(node: AtomNode): string {
  if (node.atomType === "text") {
    const st = node.style ?? {};
    const s = css([["color", st.color], ["font-size", pxOf(st.fontSize)], ["font-weight", st.fontWeight != null ? String(st.fontWeight) : undefined], ["font-family", fontCss(st.fontFamily)], ["text-align", st.align], ["white-space", "pre-wrap"]]);
    return `<div style="${s}">${esc(node.text ?? "")}</div>`;
  }
  if (node.atomType === "image") {
    return `<img src="${esc(node.src ?? "")}" alt="${esc(node.alt ?? "")}" style="width:100%;height:100%;object-fit:cover;display:block">`;
  }
  return `<div style="width:100%;height:100%">${svgScalable(node.svg ?? "")}</div>`;
}

export function pageToHtml(page: Page): string {
  const body = page.children.map((s) => serializeNode(s)).join("\n");
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${GOOGLE_FONTS_HREF}">
<style>*,*::before,*::after{box-sizing:border-box}body{margin:0}</style>
</head>
<body>
<div style="width:960px;max-width:100%;margin:0 auto;background:#fff;overflow:hidden">
${body}
</div>
</body>
</html>`;
}
