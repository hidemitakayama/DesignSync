// レスポンシブ（SP上書き）の共有ロジック。
// 1つのデータで PC/SP 両対応。書き出しHTMLは @media (max-width: SP_MAX) で切り替える。
import type { SpOverride } from "./types";

export const SP_MAX = 640; // SPとみなす上限幅(px)

// SP上書き → CSS宣言文字列（!important付き。inlineのPC値に勝たせるため）。空なら ""。
export function spCssText(sp: SpOverride | undefined): string {
  if (!sp) return "";
  const d: string[] = [];
  if (sp.hidden) d.push("display:none");
  if (sp.fontSize != null) d.push(`font-size:${sp.fontSize}px`);
  if (sp.lineHeight != null) d.push(`line-height:${sp.lineHeight}`);
  if (sp.letterSpacing != null) d.push(`letter-spacing:${sp.letterSpacing}px`);
  if (sp.align) d.push(`text-align:${sp.align}`);
  if (sp.direction) d.push(`flex-direction:${sp.direction}`);
  if (sp.justify) d.push(`justify-content:${sp.justify}`);
  if (sp.alignItems) d.push(`align-items:${sp.alignItems}`);
  if (sp.gap != null) d.push(`gap:${sp.gap}px`);
  if (sp.width != null) d.push(`width:${sp.width}px`);
  if (sp.basis != null) d.push(`flex-basis:${sp.basis === "auto" ? "auto" : sp.basis + "px"}`);
  if (sp.minHeight != null) d.push(`min-height:${sp.minHeight}px`);
  if (sp.alignSelf) d.push(`align-self:${sp.alignSelf}`);
  if (sp.padding != null) d.push(`padding:${sp.padding}px`);
  else {
    if (sp.paddingY != null) d.push(`padding-top:${sp.paddingY}px`, `padding-bottom:${sp.paddingY}px`);
    if (sp.paddingX != null) d.push(`padding-left:${sp.paddingX}px`, `padding-right:${sp.paddingX}px`);
  }
  return d.map((x) => x + "!important").join(";");
}

export const hasSp = (sp: SpOverride | undefined): boolean => spCssText(sp).length > 0;
