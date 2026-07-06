// ページツリー → Tailwindクラス付きHTML / React(JSX)コンポーネント。
// Cursor(Next.js + Tailwind)にそのまま貼れる形にする。
// オプション：
//  - sections : トップレベルのセクションを個別コンポーネント（<Section1/> 等）に分割（JSXのみ）
//  - tokens   : 色を CSS変数(--ds-n) にトークン化し bg-[color:var(--ds-n)] で参照 + colors.ts / :root を同梱
//  - snap     : 任意値[..]を可能ならTailwindスケール（p-16 等）へ寄せる

import { type Page, type SceneNode, type AtomNode, isContainer, isAtom } from "./types";
import { fontCss, GOOGLE_FONTS_HREF } from "./fonts";
import { svgScalable } from "./svg";

export interface TwOpts { jsx: boolean; snap: boolean; sections: boolean; tokens: Record<string, string> | null; nextImage: boolean }

const isFreeAtom = (n: SceneNode): n is AtomNode => isAtom(n) && !!n.free;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const isGradient = (v?: string) => !!v && /gradient/i.test(v);

const JUSTIFY: Record<string, string> = { "flex-start": "justify-start", center: "justify-center", "flex-end": "justify-end", "space-between": "justify-between", "space-around": "justify-around" };
const ALIGN: Record<string, string> = { "flex-start": "items-start", center: "items-center", "flex-end": "items-end", stretch: "items-stretch" };
const SELF: Record<string, string> = { "flex-start": "self-start", center: "self-center", "flex-end": "self-end", stretch: "self-stretch", auto: "self-auto" };
const TALIGN: Record<string, string> = { left: "text-left", center: "text-center", right: "text-right" };

// px → Tailwindスペーシング単位（4px=1）
const SP_UNITS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96];
const PX_TO_SP = new Map<number, string>(SP_UNITS.map((u) => [u * 4, String(u)]));
const RADIUS = new Map<number, string>([[0, "-none"], [2, "-sm"], [4, ""], [6, "-md"], [8, "-lg"], [12, "-xl"], [16, "-2xl"], [24, "-3xl"], [9999, "-full"]]);

// 余白1辺のクラス
function sp(prefix: "p" | "m", side: string, v: number | undefined, snap: boolean): string {
  if (v == null) return "";
  const neg = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  if (snap && PX_TO_SP.has(abs)) return `${neg}${prefix}${side}-${PX_TO_SP.get(abs)}`;
  return `${neg}${prefix}${side}-[${abs}px]`;
}
function spacing(prefix: "p" | "m", snap: boolean, u?: number, t?: number, r?: number, b?: number, l?: number): string[] {
  const T = t ?? u, R = r ?? u, B = b ?? u, L = l ?? u;
  if (T == null && R == null && B == null && L == null) return [];
  if (T === R && R === B && B === L && T != null) return [sp(prefix, "", T, snap)];
  return [sp(prefix, "t", T, snap), sp(prefix, "r", R, snap), sp(prefix, "b", B, snap), sp(prefix, "l", L, snap)].filter(Boolean);
}
const gapClass = (v: number, snap: boolean) => (snap && PX_TO_SP.has(v) ? `gap-${PX_TO_SP.get(v)}` : `gap-[${v}px]`);
const roundedClass = (v: number, snap: boolean) => (snap && RADIUS.has(v) ? `rounded${RADIUS.get(v)}` : `rounded-[${v}px]`);

// 色クラス（tokens があれば var 参照）。gradient は null（styleにフォールバック）。
function colorClass(kind: "bg" | "text", value: string | undefined, tokens: Record<string, string> | null): string | null {
  if (!value || isGradient(value)) return null;
  const v = tokens?.[value.toLowerCase()];
  return v ? `${kind}-[color:var(${v})]` : `${kind}-[${value}]`;
}

function itemClasses(n: SceneNode, basisOverride: string | undefined, o: TwOpts, cls: string[], style: Record<string, string>) {
  spacing("m", o.snap, n.margin, n.marginTop, n.marginRight, n.marginBottom, n.marginLeft).forEach((c) => cls.push(c));
  if (n.alignSelf && n.alignSelf !== "auto") cls.push(SELF[n.alignSelf]);
  if (basisOverride) style["flexBasis"] = basisOverride;
  else if (n.basis != null) { cls.push(`basis-[${n.basis}px]`); if (n.grow) cls.push("grow"); }
  else if (n.grow) cls.push("flex-1");
}

function attrsOf(node: SceneNode, o: TwOpts, basisOverride?: string): { cls: string[]; style: Record<string, string> } {
  const cls: string[] = [];
  const style: Record<string, string> = {};

  if (isContainer(node)) {
    const useColumns = node.direction === "row" && !!node.columns && node.columns > 0;
    const wrapped = node.wrap || useColumns;
    cls.push("flex", node.direction === "row" ? "flex-row" : "flex-col");
    if (wrapped) cls.push("flex-wrap");
    cls.push(JUSTIFY[node.justify], ALIGN[node.align]);
    if (node.gap) cls.push(gapClass(node.gap, o.snap));
    spacing("p", o.snap, node.padding, node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft).forEach((c) => cls.push(c));
    if (node.background) { const bg = colorClass("bg", node.background, o.tokens); if (bg) cls.push(bg); else style["background"] = node.background; }
    if (node.radius) cls.push(roundedClass(node.radius, o.snap));
    if (node.minHeight) cls.push(`min-h-[${node.minHeight}px]`);
  } else if (node.atomType === "text") {
    const st = node.style ?? {};
    const tc = colorClass("text", st.color, o.tokens); if (tc) cls.push(tc);
    if (st.fontSize) cls.push(`text-[${st.fontSize}px]`);
    if (st.fontWeight) cls.push(`font-[${st.fontWeight}]`);
    if (st.align) cls.push(TALIGN[st.align]);
    const ff = fontCss(st.fontFamily); if (ff) style["fontFamily"] = ff;
    spacing("p", o.snap, node.padding, node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft).forEach((c) => cls.push(c));
    cls.push("whitespace-pre-wrap");
  } else {
    cls.push("relative");
    if (node.width) cls.push(`w-[${node.width}px]`);
    if (node.height) cls.push(`h-[${node.height}px]`);
  }

  itemClasses(node, basisOverride, o, cls, style);
  return { cls: cls.filter(Boolean), style };
}

const styleToHtml = (s: Record<string, string>) => Object.entries(s).map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}:${v}`).join(";");
const styleToJsx = (s: Record<string, string>) => `{{ ${Object.entries(s).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ")} }}`;

function openTag(tag: string, cls: string[], style: Record<string, string>, name: string | undefined, o: TwOpts): string {
  const classAttr = cls.length ? (o.jsx ? ` className="${cls.join(" ")}"` : ` class="${cls.join(" ")}"`) : "";
  const styleAttr = Object.keys(style).length ? (o.jsx ? ` style=${styleToJsx(style)}` : ` style="${styleToHtml(style)}"`) : "";
  const nameAttr = name ? ` data-name="${esc(name)}"` : "";
  return `<${tag}${classAttr}${styleAttr}${nameAttr}>`;
}

function atomInner(node: AtomNode, o: TwOpts): string {
  if (node.atomType === "text") {
    const st = node.style ?? {};
    const cls: string[] = ["whitespace-pre-wrap"];
    const tc = colorClass("text", st.color, o.tokens); if (tc) cls.push(tc);
    if (st.fontSize) cls.push(`text-[${st.fontSize}px]`);
    if (st.fontWeight) cls.push(`font-[${st.fontWeight}]`);
    if (st.align) cls.push(TALIGN[st.align]);
    const style = fontCss(st.fontFamily) ? ` style=${o.jsx ? `{{ fontFamily: ${JSON.stringify(fontCss(st.fontFamily))} }}` : `"font-family:${fontCss(st.fontFamily)}"`}` : "";
    return `<div ${o.jsx ? "className" : "class"}="${cls.join(" ")}"${style}>${esc(node.text ?? "")}</div>`;
  }
  if (node.atomType === "image") {
    const src = esc(node.src ?? "");
    const alt = esc(node.alt ?? "");
    if (o.jsx && o.nextImage) {
      // next/image：fill で親(relative/absolute・サイズ指定済み)を埋める。dataURLは最適化対象外なので unoptimized。
      const unopt = (node.src ?? "").startsWith("data:") ? " unoptimized" : "";
      const sizes = node.width ? ` sizes="${node.width}px"` : "";
      return `<Image src="${src}" alt="${alt}" fill${sizes} className="object-cover"${unopt} />`;
    }
    return `<img src="${src}" alt="${alt}" ${o.jsx ? "className" : "class"}="w-full h-full object-cover block" />`;
  }
  const svg = svgScalable(node.svg ?? "");
  if (o.jsx) return `<span className="block w-full h-full" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(svg)} }} />`;
  return `<div class="w-full h-full">${svg}</div>`;
}

function serialize(node: SceneNode, o: TwOpts, tag: string, basisOverride?: string): string {
  if (isContainer(node)) {
    const useColumns = node.direction === "row" && !!node.columns && node.columns > 0;
    const childBasis = useColumns ? `calc((100% - ${(node.columns! - 1) * node.gap}px) / ${node.columns})` : undefined;
    const wrapped = node.wrap || useColumns;
    const { cls, style } = attrsOf(node, o, basisOverride);
    const flow = node.children.filter((c) => !isFreeAtom(c));
    const free = node.children.filter(isFreeAtom);
    if (free.length) cls.push("relative", "isolate");
    const freeHtml = free.map((f) => serializeFree(f, o)).join("");
    const flowHtml = flow
      .map((c) => {
        const el = serialize(c, o, "div", childBasis);
        return c.breakAfter && wrapped ? el + (o.jsx ? `<div aria-hidden className="basis-full w-0 h-0" />` : `<div aria-hidden class="basis-full w-0 h-0"></div>`) : el;
      })
      .join("");
    return `${openTag(tag, cls, style, node.name, o)}${freeHtml}${flowHtml}</${tag}>`;
  }
  if (node.atomType === "text") {
    const { cls, style } = attrsOf(node, o);
    return `${openTag("div", cls, style, node.name, o)}${esc(node.text ?? "")}</div>`;
  }
  const { cls, style } = attrsOf(node, o);
  return `${openTag("div", cls, style, node.name, o)}${atomInner(node, o)}</div>`;
}

function serializeFree(node: AtomNode, o: TwOpts): string {
  const cls = ["absolute", `left-[${node.x ?? 0}px]`, `top-[${node.y ?? 0}px]`];
  if (node.width) cls.push(`w-[${node.width}px]`);
  if (node.height) cls.push(`h-[${node.height}px]`);
  cls.push(node.front ? "z-10" : "-z-10");
  return `${openTag("div", cls, {}, node.name, o)}${atomInner(node, o)}</div>`;
}

// --- 色トークン収集 ---
function collectColorTokens(page: Page): Record<string, string> {
  const order: string[] = [];
  const push = (v?: string) => { if (v && /^#[0-9a-fA-F]{3,8}$/.test(v)) { const k = v.toLowerCase(); if (!order.includes(k)) order.push(k); } };
  const walk = (nodes: SceneNode[]) => nodes.forEach((n) => {
    if (isContainer(n)) { push(n.background); walk(n.children); }
    else if (n.atomType === "text") push(n.style?.color);
  });
  walk(page.children);
  const map: Record<string, string> = {};
  order.forEach((hex, i) => { map[hex] = `--ds-${i + 1}`; });
  return map;
}
function tokenName(cssVar: string) { return cssVar.replace(/^--/, "").replace(/-/g, ""); } // --ds-1 -> ds1

// ページに画像アトムが1つでもあるか（next/image の import 要否判定）
function hasImage(page: Page): boolean {
  const walk = (nodes: SceneNode[]): boolean => nodes.some((n) => (isContainer(n) ? walk(n.children) : n.atomType === "image"));
  return walk(page.children);
}

function colorsFiles(tokens: Record<string, string>): string {
  const entries = Object.entries(tokens); // [hex, --ds-n]
  const rootLines = entries.map(([hex, v]) => `  ${v}: ${hex};`).join("\n");
  const tsLines = entries.map(([hex, v]) => `  ${tokenName(v)}: "${hex}",`).join("\n");
  return `/* ── globals.css の :root に追記 ────────────── */
:root {
${rootLines}
}

/* ── colors.ts（トークン一覧・任意で利用） ────── */
export const colors = {
${tsLines}
} as const;

`;
}

// --- 公開関数 ---
export function pageToTailwindHtml(page: Page, opt?: { snap?: boolean; tokens?: boolean }): string {
  const tokens = opt?.tokens ? collectColorTokens(page) : null;
  const o: TwOpts = { jsx: false, snap: !!opt?.snap, sections: false, tokens, nextImage: false };
  const rootCss = tokens ? `<style>:root{${Object.entries(tokens).map(([hex, v]) => `${v}:${hex}`).join(";")}}</style>` : "";
  const body = page.children.map((s) => serialize(s, o, "section")).join("\n");
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${GOOGLE_FONTS_HREF}">
<script src="https://cdn.tailwindcss.com"></script>
${rootCss}
</head>
<body class="m-0">
<div class="w-[960px] max-w-full mx-auto bg-white overflow-hidden">
${body}
</div>
</body>
</html>`;
}

// セクション名 → 有効なコンポーネント名（英数字のみ採用、無ければ SectionN）
function compNameFor(name: string, i: number): string {
  const ascii = (name || "").replace(/[^A-Za-z0-9]/g, "");
  return ascii ? ascii[0].toUpperCase() + ascii.slice(1) : `Section${i + 1}`;
}

export function pageToJsx(page: Page, opt?: { snap?: boolean; tokens?: boolean; sections?: boolean; nextImage?: boolean }): string {
  const tokens = opt?.tokens ? collectColorTokens(page) : null;
  const o: TwOpts = { jsx: true, snap: !!opt?.snap, sections: !!opt?.sections, tokens, nextImage: !!opt?.nextImage };
  const header = tokens ? colorsFiles(tokens) : "";
  const useImg = o.nextImage && hasImage(page);
  const imgImport = useImg ? `import Image from "next/image";\n` : "";
  const imgNote = useImg
    ? `// next/image を使用。外部URLの画像を最適化するには next.config に許可を追加してください：\n//   images: { remotePatterns: [{ protocol: "https", hostname: "**" }] }\n`
    : "";
  const fontNote = `// フォントは globals.css / layout で Google Fonts を読み込んでください：${GOOGLE_FONTS_HREF}\n`;

  if (o.sections) {
    // トップレベルを個別コンポーネントに分割
    const used = new Set<string>();
    const parts = page.children.map((sec, i) => {
      let cn = compNameFor(sec.name, i);
      while (used.has(cn)) cn += "_";
      used.add(cn);
      const jsx = serialize(sec, o, "section");
      return { cn, name: sec.name, jsx };
    });
    const subs = parts.map((p) => `// ${esc(p.name)}\nfunction ${p.cn}() {\n  return (\n    ${p.jsx}\n  );\n}`).join("\n\n");
    const compose = parts.map((p) => `      <${p.cn} />`).join("\n");
    return `${imgImport}${header}${fontNote}${imgNote}${subs}

export default function Page() {
  return (
    <div className="w-[960px] max-w-full mx-auto bg-white overflow-hidden">
${compose}
    </div>
  );
}
`;
  }

  const body = page.children.map((s) => "      " + serialize(s, o, "section")).join("\n");
  const compName = compNameFor(page.name, 0) || "Page";
  return `${imgImport}${header}${fontNote}${imgNote}export default function ${compName}() {
  return (
    <div className="w-[960px] max-w-full mx-auto bg-white overflow-hidden">
${body}
    </div>
  );
}
`;
}
