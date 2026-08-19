// 画像のトリミング（切り抜き表示）。枠（width/height）に対して
//   ・どの部分を見せるか  → object-position
//   ・どれだけ寄るか      → transform:scale（枠で切り取られる＝ズームイン）
// を決める。プレビュー(Renderer)・HTML書き出し・Tailwind書き出しで同じ結果になるよう、
// 計算はここに一本化する（背景画像の同等機能は lib/patterns.ts 側）。

export const DEFAULT_IMG_POS = 50; // 表示位置の既定＝中央
export const IMG_ZOOM_MIN = 1, IMG_ZOOM_MAX = 4;

// トリミングに関わる値だけを持つ最小の型（AtomNode / StudioElement どちらでも渡せる）
export interface CropSpec {
  posX?: number; // 表示位置 %（0=左端 / 50=中央 / 100=右端）
  posY?: number; // 表示位置 %（0=上端 / 50=中央 / 100=下端）
  zoom?: number; // 拡大率（1=等倍。1より大きいと枠からはみ出た分が切られる）
}

const clampPos = (n?: number) => Math.max(0, Math.min(100, n ?? DEFAULT_IMG_POS));
export const cropZoom = (c: CropSpec): number => Math.max(IMG_ZOOM_MIN, Math.min(IMG_ZOOM_MAX, c.zoom ?? 1));

// 位置の指定があるか。既定（中央）のままなら CSS に出さない（既存の書き出しと差分を出さない）。
export const hasCropPos = (c: CropSpec): boolean => c.posX != null || c.posY != null;
// object-position / transform-origin に使う "X% Y%"。
export const cropPosition = (c: CropSpec): string => `${clampPos(c.posX)}% ${clampPos(c.posY)}%`;
// 拡大トリミング中か。true のときだけ、はみ出しを切るための入れ物（overflow:hidden）が必要になる。
export const isCropZoomed = (c: CropSpec): boolean => cropZoom(c) > 1;

// 画像本体（img）に足すスタイル。拡大の基点は表示位置に合わせる（寄りたい所を保ったまま拡大）。
export function cropImgCss(c: CropSpec): { objectPosition?: string; transform?: string; transformOrigin?: string } {
  const pos = hasCropPos(c) || isCropZoomed(c) ? cropPosition(c) : undefined;
  if (!isCropZoomed(c)) return { objectPosition: pos };
  return { objectPosition: pos, transform: `scale(${cropZoom(c)})`, transformOrigin: pos };
}

// 上記の CSS 宣言ペア版（HTML書き出し用）。
export const cropCssPairs = (c: CropSpec): Array<[string, string | undefined]> => {
  const css = cropImgCss(c);
  return [["object-position", css.objectPosition], ["transform", css.transform], ["transform-origin", css.transformOrigin]];
};
