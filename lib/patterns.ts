// 背景パターン（ノート風の方眼/罫線/ドット）を CSS の background 一括値へ合成する。
// Renderer（プレビュー）と各書き出し（HTML/Tailwind）で同じ結果になるよう、ここに一本化する。

import type { BgPattern, BgPatternKind, BgImage } from "./types";

// 種類ごとの既定の間隔(px)
export const PATTERN_DEFAULT_SIZE: Record<BgPatternKind, number> = { grid: 28, ruled: 30, dot: 26 };

export const patternSize = (p: BgPattern): number => p.size ?? PATTERN_DEFAULT_SIZE[p.kind];

// 線/ドットのレイヤー群（単色ベースは含めない）。細線（0.75px）で控えめに。
function patternLayers(p: BgPattern): string {
  const c = p.color;
  const s = patternSize(p);
  if (p.kind === "grid") {
    return `linear-gradient(${c} 0.75px, transparent 0.75px) 0 0 / ${s}px ${s}px, ` +
      `linear-gradient(90deg, ${c} 0.75px, transparent 0.75px) 0 0 / ${s}px ${s}px`;
  }
  if (p.kind === "ruled") {
    return `linear-gradient(transparent ${s - 1}px, ${c} ${s - 1}px, ${c} ${s - 0.25}px, transparent ${s - 0.25}px) 0 0 / 100% ${s}px`;
  }
  // dot
  return `radial-gradient(${c} 1.6px, transparent 1.8px) 0 0 / ${s}px ${s}px`;
}

// 背景色フィールドが単色(HEX)ならその色、そうでなければ undefined。
export function baseColorOf(bg?: string): string | undefined {
  if (!bg) return undefined;
  return /^#[0-9a-fA-F]{3,8}$/.test(bg.trim()) ? bg.trim() : undefined;
}

// 画像レイヤー（url(...) を cover/contain で敷く）。
// url は style 属性内でも壊れないよう単一引用符にし、値内の ' は %27 に退避。
function imageLayer(img: BgImage): string {
  const safe = img.src.trim().replace(/'/g, "%27");
  return `url('${safe}') center / ${img.fit ?? "cover"} no-repeat`;
}
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// ノードの実効背景を返す。パターン・画像・オーバーレイ・単色ベースを1つの background 一括値に合成する。
// これらが一切無ければ background をそのまま返す（従来の単色/生CSSを壊さない）。
export function resolveBackground(node: { background?: string; bgPattern?: BgPattern; bgImage?: BgImage }): string | undefined {
  const hasPattern = !!node.bgPattern;
  const hasImage = !!node.bgImage?.src;
  if (!hasPattern && !hasImage) return node.background;

  // レイヤーは上→下の順に並べる：パターン → オーバーレイ → 画像 → 単色ベース
  const layers: string[] = [];
  if (hasPattern) layers.push(patternLayers(node.bgPattern!));
  if (hasImage && node.bgImage!.overlay) {
    const a = clamp01(node.bgImage!.overlay!);
    layers.push(`linear-gradient(rgba(0,0,0,${a}), rgba(0,0,0,${a}))`);
  }
  if (hasImage) layers.push(imageLayer(node.bgImage!));
  const base = baseColorOf(node.background);
  if (base) layers.push(`linear-gradient(${base}, ${base})`);
  return layers.join(", ");
}

// 背景画像に「反転」または「拡大縮小(≠1)」があるか。あるときは CSS background では表現できないので
// 変形可能なレイヤー（transform）で描画する。
export const needsBgLayer = (img?: BgImage): boolean =>
  !!img?.src && (!!img.flipH || !!img.flipV || (img.scale != null && img.scale !== 1));

// 変形レイヤー使用時の「背景（画像・オーバーレイを除く：パターン＋単色ベースのみ）」。
export function resolveBackgroundNoImage(node: { background?: string; bgPattern?: BgPattern }): string | undefined {
  if (!node.bgPattern) return node.background; // 画像を外すだけ＝元の単色/生CSSをそのまま
  const layers = [patternLayers(node.bgPattern)];
  const base = baseColorOf(node.background);
  if (base) layers.push(`linear-gradient(${base}, ${base})`);
  return layers.join(", ");
}

// 背景画像レイヤーのスタイル（拡大縮小＋反転を transform で適用）。要素の背後(z-index:-1)に敷く。
export function bgImageLayerCss(img: BgImage): Record<string, string | number> {
  const safe = img.src.trim().replace(/'/g, "%27");
  const s = img.scale ?? 1;
  const sx = (img.flipH ? -1 : 1) * s, sy = (img.flipV ? -1 : 1) * s;
  return {
    position: "absolute", inset: 0, zIndex: -1,
    background: `url('${safe}') center / ${img.fit ?? "cover"} no-repeat`,
    transform: `scale(${sx}, ${sy})`,
    transformOrigin: "center",
    pointerEvents: "none",
  };
}
export function bgOverlayLayerCss(a: number): Record<string, string | number> {
  return { position: "absolute", inset: 0, zIndex: -1, background: `rgba(0,0,0,${clamp01(a)})`, pointerEvents: "none" };
}
// 上記の CSS 文字列版（HTML書き出し用）。inset/z-index 等は px 不要なのでそのまま出す。
const toCssText = (o: Record<string, string | number>): string =>
  Object.entries(o).map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}:${v}`).join(";");
export const bgImageLayerCssText = (img: BgImage): string => toCssText(bgImageLayerCss(img));
export const bgOverlayLayerCssText = (a: number): string => toCssText(bgOverlayLayerCss(a));
