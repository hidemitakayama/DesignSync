// ページツリー → 単一の完結HTML。プレビュー(Renderer.tsx)と同じ規則でスタイルを生成し、
// 「見たまま」を静的HTMLとして再現する。フォントは <link>、画像/SVG は埋め込み（自己完結）。

import { type Page, type SceneNode, type ContainerNode, type AtomNode, isContainer, isAtom, paddingCss, marginCss } from "./types";
import { fontCss, GOOGLE_FONTS_HREF } from "./fonts";
import { svgScalable } from "./svg";
import { sectionPaddingCss } from "./layout";
import { resolveBackground, resolveBackgroundNoImage, needsBgLayer, bgImageLayerCssText, bgOverlayLayerCssText } from "./patterns";
import { maskCssPairs, hasMask } from "./mask";
import { spCssText, SP_MAX } from "./responsive";

// SP（レスポンシブ）ルールの収集：sp を持つ要素にクラスを振り、@media で上書きする。
// pageToHtml の先頭でリセットする（同期的に直列化するので競合しない）。
let spRules: string[] = [];
let spN = 0;
// sp上書き＋hiddenPc（PCで非表示＝SPのみ表示）をクラス化。restoreは SP で戻す display 値。
function spClassName(node: SceneNode, restoreDisplay = "block"): string {
  let t = spCssText(node.sp);
  if (node.hiddenPc) t = (t ? t + ";" : "") + `display:${restoreDisplay}!important`; // SPでは表示に戻す
  if (!t) return "";
  const cls = `dsr-${++spN}`;
  spRules.push(`.${cls}{${t}}`);
  return cls;
}

const isFreeAtom = (n: SceneNode): n is AtomNode => isAtom(n) && !!n.free;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// [prop, value] の配列を CSS 文字列へ（undefined/空は除外）
// 値内のダブルクォート（font-family:"Noto Sans JP" 等）は style="..." を途中で壊すので単一引用符へ。
// これが無いと font-family 以降（text-align/line-height/letter-spacing/white-space）がブラウザに無視される。
function css(pairs: Array<[string, string | undefined]>): string {
  return pairs.filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${k}:${(v as string).replace(/"/g, "'")}`).join(";");
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
  const cols = useColumns ? Math.min(4, Math.max(2, node.columns!)) : 0;
  const wrapped = node.wrap && !useColumns;

  const flowChildren = node.children.filter((c) => !isFreeAtom(c));
  const freeChildren = node.children.filter(isFreeAtom);
  const hasFree = freeChildren.length > 0;
  const bgLayer = needsBgLayer(node.bgImage); // 反転/拡大のある背景画像は変形レイヤーで
  const relative = hasFree || bgLayer;

  // columns はレスポンシブ・グリッド（.ds-grid）。display 等はスタイルシート側で指定。
  const style = css([
    ...(useColumns
      ? []
      : ([
          ["display", "flex"],
          ["flex-direction", node.direction],
          ["flex-wrap", wrapped ? "wrap" : undefined],
          ["justify-content", node.justify],
          ["align-items", node.align],
        ] as Array<[string, string | undefined]>)),
    ["gap", pxOf(node.gap)],
    ["padding", node.type === "section" ? sectionPaddingCss(node) : paddingCss(node)],
    ["margin", marginCss(node)],
    ["background", bgLayer ? resolveBackgroundNoImage(node) : resolveBackground(node)],
    ["border-radius", pxOf(node.radius)],
    ["border", node.borderWidth ? `${node.borderWidth}px solid ${node.borderColor ?? "#e5e7eb"}` : undefined],
    ["box-shadow", node.boxShadow],
    ["opacity", node.opacity != null && node.opacity !== 1 ? String(node.opacity) : undefined],
    ["width", pxOf(node.width)],
    ["min-height", node.fullHeight ? "100vh" : pxOf(node.minHeight)],
    ["flex", itemFlex(node, basisOverride)],
    ["align-self", alignSelfOf(node)],
    ["position", relative ? "relative" : undefined],
    ["isolation", relative ? "isolate" : undefined],
    ["overflow", bgLayer ? "hidden" : undefined],
  ]);
  const bgLayerHtml = bgLayer && node.bgImage
    ? `<div aria-hidden style="${bgImageLayerCssText(node.bgImage)}"></div>` + (node.bgImage.overlay ? `<div aria-hidden style="${bgOverlayLayerCssText(node.bgImage.overlay)}"></div>` : "")
    : "";
  const clsList = [useColumns ? `ds-grid ds-cols-${cols}` : "", spClassName(node, useColumns ? "grid" : "flex")].filter(Boolean).join(" ");
  const cls = clsList ? ` class="${clsList}"` : "";

  const freeHtml = freeChildren.map(serializeFree).join("");
  const flowHtml = flowChildren
    .map((c) => {
      const el = serializeNode(c, useColumns ? undefined : basisOverride);
      // breakAfter：flex-basis:100% の不可視要素で次行へ送る（Flex・wrap時のみ）
      return c.breakAfter && wrapped ? el + `<div aria-hidden style="flex-basis:100%;width:0;height:0"></div>` : el;
    })
    .join("");

  return `<div${cls} style="${node.hiddenPc ? style + ";display:none" : style}">${bgLayerHtml}${freeHtml}${flowHtml}</div>`;
}

function serializeAtom(node: AtomNode, basisOverride?: string): string {
  const spc = spClassName(node);
  const spAttr = spc ? ` class="${spc}"` : "";
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
      ["border", st.borderWidth ? `${st.borderWidth}px solid ${st.borderColor ?? "#0f172a"}` : undefined],
      ["border-radius", st.borderRadius ? pxOf(st.borderRadius) : undefined],
      ["flex", itemFlex(node, basisOverride)],
      ["line-height", st.lineHeight != null ? String(st.lineHeight) : undefined],
      ["letter-spacing", st.letterSpacing != null ? `${st.letterSpacing}px` : undefined],
      ["white-space", st.preserveBreaks === false ? "normal" : "pre-wrap"],
      ["align-self", alignSelfOf(node)],
      ["opacity", node.opacity != null && node.opacity !== 1 ? String(node.opacity) : undefined],
    ]);
    return `<div${spAttr} style="${node.hiddenPc ? style + ";display:none" : style}">${textContent(node)}</div>`;
  }

  // 画像/SVG は既定の flex:0 1 auto だと横だけ縮み、preserveAspectRatio="none" と相まって歪む。
  const wrap = css([
    ["position", "relative"],
    ["width", pxOf(node.width)],
    ["height", pxOf(node.height)],
    ["margin", marginCss(node)],
    ["flex", itemFlex(node, basisOverride) ?? "0 0 auto"],
    ["align-self", alignSelfOf(node)],
    ["opacity", node.opacity != null && node.opacity !== 1 ? String(node.opacity) : undefined],
  ]);
  return `<div${spAttr} style="${node.hiddenPc ? wrap + ";display:none" : wrap}">${atomInner(node)}</div>`;
}

// 自由配置（absolute）の要素
function serializeFree(node: AtomNode): string {
  const spc = spClassName(node);
  const spAttr = spc ? ` class="${spc}"` : "";
  const style = css([
    ["position", "absolute"],
    ["left", pxOf(node.x ?? 0)],
    ["top", pxOf(node.y ?? 0)],
    ["width", pxOf(node.width)],
    ["height", pxOf(node.height)],
    ["z-index", node.front ? "10" : "-1"],
    ["opacity", node.opacity != null && node.opacity !== 1 ? String(node.opacity) : undefined],
  ]);
  return `<div${spAttr} style="${style}">${atomInner(node)}</div>`;
}

// テキストの中身（runs があれば色付き span で）
function textContent(node: AtomNode): string {
  if (node.runs && node.runs.length) {
    return node.runs.map((r) => (r.color ? `<span style="color:${r.color}">${esc(r.text)}</span>` : esc(r.text))).join("");
  }
  return esc(node.text ?? "");
}

// テキスト / 画像 / SVG の中身
function atomInner(node: AtomNode): string {
  if (node.atomType === "text") {
    const st = node.style ?? {};
    const s = css([["color", st.color], ["font-size", pxOf(st.fontSize)], ["font-weight", st.fontWeight != null ? String(st.fontWeight) : undefined], ["font-family", fontCss(st.fontFamily)], ["text-align", st.align], ["line-height", st.lineHeight != null ? String(st.lineHeight) : undefined], ["letter-spacing", st.letterSpacing != null ? `${st.letterSpacing}px` : undefined], ["white-space", st.preserveBreaks === false ? "normal" : "pre-wrap"]]);
    return `<div style="${s}">${textContent(node)}</div>`;
  }
  if (node.atomType === "image") {
    const m = { shape: node.maskShape, svg: node.maskSvg };
    const masked = hasMask(m);
    const s = css([
      ["width", "100%"], ["height", "100%"], ["object-fit", "cover"], ["display", "block"],
      ...maskCssPairs(m),
      ["box-shadow", masked ? undefined : node.boxShadow],
      ["filter", masked && node.boxShadow ? `drop-shadow(${node.boxShadow})` : undefined],
    ]);
    return `<img src="${esc(node.src ?? "")}" alt="${esc(node.alt ?? "")}" style="${s}">`;
  }
  const filter = node.boxShadow ? `;filter:drop-shadow(${node.boxShadow})` : "";
  return `<div style="width:100%;height:100%${filter}">${svgScalable(node.svg ?? "")}</div>`;
}

// 1ページ分の本文を直列化し、そのページ由来の SP上書きCSS も返す。
function renderBody(page: Page): { body: string; spCss: string } {
  spRules = []; spN = 0;
  const body = page.children.map((s) => serializeNode(s)).join("\n"); // ここで spRules が埋まる
  const spCss = spRules.length ? `@media (max-width:${SP_MAX}px){${spRules.join("")}}` : "";
  return { body, spCss };
}

// HTMLドキュメントの外枠（reset＋レスポンシブグリッド＋追加CSS）。
function htmlDoc(title: string, styleExtra: string, bodyInner: string): string {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${GOOGLE_FONTS_HREF}">
<style>
*,*::before,*::after{box-sizing:border-box}body{margin:0}
/* レスポンシブ・グリッド（columns）：ページ幅に応じて列数を変える */
.ds-page{container-type:inline-size}
.ds-grid{display:grid;grid-template-columns:minmax(0,1fr)}
.ds-grid>*{min-width:0}
@container (min-width:520px){.ds-cols-2,.ds-cols-3,.ds-cols-4{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container (min-width:760px){.ds-cols-3,.ds-cols-4{grid-template-columns:repeat(3,minmax(0,1fr))}}
@container (min-width:1000px){.ds-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}}${styleExtra}
</style>
</head>
<body>
${bodyInner}
</body>
</html>`;
}

export function pageToHtml(page: Page): string {
  const { body, spCss } = renderBody(page);
  return htmlDoc(page.name, spCss ? `\n${spCss}` : "", `<div class="ds-page" style="width:100%;background:#fff;overflow:hidden">\n${body}\n</div>`);
}

// PC版＋SP版を1つのHTMLに入れ、画面幅で自動切替（PC≧641 / SP≦640）。実サイトは1ファイルで両対応。
export function pageToResponsiveHtml(pc: Page, sp: Page): string {
  const P = renderBody(pc);
  const S = renderBody(sp); // renderBody は spRules をリセットするので順に呼ぶ
  const toggle = `\n/* PC/SP 自動切替 */\n@media (max-width:${SP_MAX}px){.ds-pc{display:none!important}}@media (min-width:${SP_MAX + 1}px){.ds-sp{display:none!important}}`;
  const styleExtra = `${toggle}${P.spCss ? `\n${P.spCss}` : ""}${S.spCss ? `\n${S.spCss}` : ""}`;
  const inner = `<div class="ds-page ds-pc" style="width:100%;background:#fff;overflow:hidden">\n${P.body}\n</div>\n<div class="ds-page ds-sp" style="width:100%;background:#fff;overflow:hidden">\n${S.body}\n</div>`;
  return htmlDoc(pc.name, styleExtra, inner);
}
