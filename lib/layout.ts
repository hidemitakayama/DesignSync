// フルブリード・レイアウトの共有ルール（ビルダーRenderer / HTML書き出し / Tailwind書き出しで共用）。
// 最上位セクションは「背景は全幅・中身は中央に制約」。ページ枠を全幅にし、
// セクションの左右パディングを max(指定値, (100% - CONTENT_MAX)/2) にして中身を中央寄せする。

import type { ItemProps } from "./types";

export const CONTENT_MAX = 1120; // 中身（コンテンツ）の最大幅(px)。これを超える幅は左右余白になる。

const side = (u?: number, s?: number) => s ?? u ?? 0; // 各辺 = 個別指定 ?? 一括 ?? 0
type SectionLike = ItemProps & { contentAlign?: "center" | "left" };

// 最上位セクション用の padding 文字列（CSS shorthand: T R B L）。背景は常に全幅。
// contentAlign="center"(既定)：左右とも max(指定, 中央寄せ) で中身を中央に。
// contentAlign="left"：左は指定ガター固定、右で余りを吸収 → 中身(最大幅)を常に画面左へ。
export function sectionPaddingCss(n: SectionLike): string {
  const T = side(n.padding, n.paddingTop), R = side(n.padding, n.paddingRight), B = side(n.padding, n.paddingBottom), L = side(n.padding, n.paddingLeft);
  if (n.contentAlign === "left") {
    return `${T}px max(${R}px, calc(100% - ${L}px - ${CONTENT_MAX}px)) ${B}px ${L}px`;
  }
  const c = (px: number) => `max(${px}px, calc((100% - ${CONTENT_MAX}px) / 2))`;
  return `${T}px ${c(R)} ${B}px ${c(L)}`;
}

// Tailwind 用：セクション左右パディングの任意値クラス（calc内スペースは _ に）。
export function sectionPadTwClasses(n: SectionLike): string[] {
  const T = side(n.padding, n.paddingTop), R = side(n.padding, n.paddingRight), B = side(n.padding, n.paddingBottom), L = side(n.padding, n.paddingLeft);
  if (n.contentAlign === "left") {
    return [`pt-[${T}px]`, `pb-[${B}px]`, `pl-[${L}px]`, `pr-[max(${R}px,calc(100%_-_${L}px_-_${CONTENT_MAX}px))]`];
  }
  const c = (px: number) => `max(${px}px,calc((100%_-_${CONTENT_MAX}px)/2))`;
  return [`pt-[${T}px]`, `pb-[${B}px]`, `pl-[${c(L)}]`, `pr-[${c(R)}]`];
}
