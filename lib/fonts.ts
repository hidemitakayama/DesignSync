// 選択できるフォント一覧（まずは日本語対応の5種）。
// css は実際の font-family。フォント実体は layout.tsx の Google Fonts <link> で読み込む。
// 保存データには「フォントのid」だけを持ち、描画時にこの表から css を引く（後で差し替えやすい）。

export type FontId = "sans" | "serif" | "rounded" | "kaku" | "mincho";

export const FONTS: { id: FontId; label: string; css: string }[] = [
  { id: "sans", label: "ゴシック", css: '"Noto Sans JP", system-ui, sans-serif' },
  { id: "serif", label: "明朝", css: '"Noto Serif JP", serif' },
  { id: "rounded", label: "丸ゴシック", css: '"M PLUS Rounded 1c", sans-serif' },
  { id: "kaku", label: "角ゴシック", css: '"Zen Kaku Gothic New", sans-serif' },
  { id: "mincho", label: "明朝（上品）", css: '"Shippori Mincho", serif' },
];

// フォントid → 実際の font-family（未指定/不明なら undefined＝継承）
export const fontCss = (id?: string): string | undefined => FONTS.find((f) => f.id === id)?.css;

// Google Fonts の stylesheet URL（layout の <link> と 書き出しHTML で共用）
export const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700;800&family=Noto+Sans+JP:wght@400;700;800&family=Noto+Serif+JP:wght@400;700&family=Shippori+Mincho:wght@400;700;800&family=Zen+Kaku+Gothic+New:wght@400;700&display=swap";
