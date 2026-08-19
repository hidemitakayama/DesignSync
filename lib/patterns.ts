// 背景パターン（ノート風の方眼/罫線/ドット）を CSS の background 一括値へ合成する。
// Renderer（プレビュー）と各書き出し（HTML/Tailwind）で同じ結果になるよう、ここに一本化する。

import type { BgPattern, BgPatternKind, BgImage, OverlayDir } from "./types";

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

// 背景画像の表示位置（background-position）。0=左/上端・50=中央（既定）・100=右/下端。
// cover で切れる部分を寄せる用（「中央より少し上を見せる」＝ posY を 50 未満に）。
export const DEFAULT_BG_POS = 50;
const clampPos = (n?: number) => Math.max(0, Math.min(100, n ?? DEFAULT_BG_POS));
export const bgPosition = (img: BgImage): string => `${clampPos(img.posX)}% ${clampPos(img.posY)}%`;

// 画像レイヤー（url(...) を cover/contain で敷く）。
// url は style 属性内でも壊れないよう単一引用符にし、値内の ' は %27 に退避。
function imageLayer(img: BgImage): string {
  const safe = img.src.trim().replace(/'/g, "%27");
  return `url('${safe}') ${bgPosition(img)} / ${img.fit ?? "cover"} no-repeat`;
}
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// 背景画像の上に重ねる調整レイヤーの色（暗く＝黒／明るく＝白）。Renderer・書き出しで共用する。
export const OVERLAY_DARK = "0,0,0";
export const OVERLAY_LIGHT = "255,255,255";

// 方向 → グラデーションの向き。「その辺が濃い」ので、grad は反対側へ向かって薄くする。
const OVERLAY_TO: Record<Exclude<OverlayDir, "all">, string> = {
  left: "to right", right: "to left", top: "to bottom", bottom: "to top",
};

// 適用幅（%）。方向指定時に「0%になりきる位置」。未指定=100（反対側の端で0）。
export const DEFAULT_OVERLAY_SPREAD = 100;
const clampSpread = (n?: number) => Math.max(1, Math.min(100, n ?? DEFAULT_OVERLAY_SPREAD));

// オーバーレイ1枚分の background 値。dir 未指定/"all" は全面均一、方向指定はその辺100%→spread%で0。
function overlayPaint(a: number, rgb: string, dir?: OverlayDir, spread?: number): string {
  const v = clamp01(a);
  if (!dir || dir === "all") return `linear-gradient(rgba(${rgb},${v}), rgba(${rgb},${v}))`;
  return `linear-gradient(${OVERLAY_TO[dir]}, rgba(${rgb},${v}) 0%, rgba(${rgb},0) ${clampSpread(spread)}%)`;
}

// 背景画像に重ねるオーバーレイの background 値を [暗く, 明るく] の順（上→下）で返す。
// 0/未指定のものは出さない。Renderer・HTML書き出し・Tailwind書き出しで共用する。
export function overlayPaints(img: BgImage): string[] {
  const out: string[] = [];
  if ((img.overlay ?? 0) > 0) out.push(overlayPaint(img.overlay!, OVERLAY_DARK, img.overlayDir, img.overlaySpread));
  if ((img.overlayLight ?? 0) > 0) out.push(overlayPaint(img.overlayLight!, OVERLAY_LIGHT, img.overlayDir, img.overlaySpread));
  return out;
}

// ノードの実効背景を返す。パターン・画像・オーバーレイ・単色ベースを1つの background 一括値に合成する。
// これらが一切無ければ background をそのまま返す（従来の単色/生CSSを壊さない）。
export function resolveBackground(node: { background?: string; bgPattern?: BgPattern; bgImage?: BgImage }): string | undefined {
  const hasPattern = !!node.bgPattern;
  const hasImage = !!node.bgImage?.src;
  if (!hasPattern && !hasImage) return node.background;

  // レイヤーは上→下の順に並べる：パターン → オーバーレイ(暗く→明るく) → 画像 → 単色ベース
  const layers: string[] = [];
  if (hasPattern) layers.push(patternLayers(node.bgPattern!));
  if (hasImage) layers.push(...overlayPaints(node.bgImage!));
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
    background: `url('${safe}') ${bgPosition(img)} / ${img.fit ?? "cover"} no-repeat`,
    transform: `scale(${sx}, ${sy})`,
    transformOrigin: "center",
    pointerEvents: "none",
  };
}
// オーバーレイ1枚分のスタイル。paint は overlayPaints() が返す background 値。
export function bgOverlayLayerCss(paint: string): Record<string, string | number> {
  return { position: "absolute", inset: 0, zIndex: -1, background: paint, pointerEvents: "none" };
}
// 上記の CSS 文字列版（HTML書き出し用）。inset/z-index 等は px 不要なのでそのまま出す。
const toCssText = (o: Record<string, string | number>): string =>
  Object.entries(o).map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}:${v}`).join(";");
export const bgImageLayerCssText = (img: BgImage): string => toCssText(bgImageLayerCss(img));
export const bgOverlayLayerCssText = (paint: string): string => toCssText(bgOverlayLayerCss(paint));
