// 選択できるフォント一覧（すべて Google Fonts ＝ 商用利用も無料）。
// 保存データには「フォントのid」だけを持ち、描画時にこの表から css を引く（後で差し替えやすい）。
//
// gf（Google Fonts の family と weight）もこの表で一元管理する。ここから
//   ・アプリ用の <link>（GOOGLE_FONTS_HREF＝全フォント）
//   ・書き出しHTML用の <link>（googleFontsHref(使用フォントだけ)）
//   ・完全埋め込み用のサブセット取得（lib/fontEmbed.ts）
// をすべて生成するので、フォントを足すときはこの配列に1行足すだけでよい。
// ※ 欧文フォントは日本語フォールバック（Noto Sans/Serif JP）も一緒に読み込む。

import type { Page, SceneNode } from "./types";
import { isContainer } from "./types";

export type FontId =
  // 日本語：基本
  | "sans" | "serif" | "rounded" | "kaku" | "mincho"
  // 日本語：ゴシック系
  | "murecho" | "bizgothic" | "zenmaru" | "rocknroll" | "stick"
  // 日本語：明朝系
  | "zenold" | "bizmincho" | "kaisei" | "sawarabi"
  // 日本語：デザイン・手書き
  | "klee" | "yuji" | "yusei" | "hachimaru" | "dela" | "reggae" | "potta"
  // 日本語：重厚・インパクト（装甲明朝のような“重い/メカっぽい”用途）
  | "tokumin" | "shipporib1" | "tegomin" | "rampart" | "trainone" | "dotgothic"
  | "chokoku"
  // 欧文（＋日本語フォールバック）
  | "inter" | "notosans" | "notoserif"
  | "montserrat" | "poppins" | "oswald" | "bebas" | "anton" | "spacegrotesk"
  | "playfair" | "lora" | "cormorant" | "jetbrains"
  // 欧文：SF・ミリタリー（メカ／装甲っぽい見出し）
  | "orbitron" | "michroma" | "chakra" | "blackops" | "stencil" | "teko";

export interface FontDef {
  id: FontId;
  label: string; // セレクトに出す名前（「分類（フォント名）」）
  css: string;   // 実際の font-family
  gf: { family: string; weights: number[] }[]; // Google Fonts の family（欧文は和文フォールバックも）
  // 欧文専用＝日本語のグリフを持たない。日本語は2つ目の family（Noto Sans/Serif JP）で表示されるため、
  // 和文の見た目は変わらない。UIで注意書きを出すためのフラグ。
  latinOnly?: boolean;
}

const JP_SANS = { family: "Noto Sans JP", weights: [400, 700, 800] };
const JP_SERIF = { family: "Noto Serif JP", weights: [400, 700] };

export const FONTS: FontDef[] = [
  // --- 日本語：基本 ---
  { id: "sans", label: "ゴシック（Noto Sans JP）", css: '"Noto Sans JP", system-ui, sans-serif', gf: [JP_SANS] },
  { id: "kaku", label: "ゴシック（Zen 角ゴシック）", css: '"Zen Kaku Gothic New", sans-serif', gf: [{ family: "Zen Kaku Gothic New", weights: [400, 700] }] },
  { id: "murecho", label: "ゴシック（Murecho・モダン）", css: '"Murecho", sans-serif', gf: [{ family: "Murecho", weights: [400, 700, 800] }] },
  { id: "bizgothic", label: "ゴシック（BIZ UDP・読みやすい）", css: '"BIZ UDPGothic", sans-serif', gf: [{ family: "BIZ UDPGothic", weights: [400, 700] }] },
  { id: "stick", label: "ゴシック（Stick・細い角ゴ）", css: '"Stick", sans-serif', gf: [{ family: "Stick", weights: [400] }] },
  // --- 日本語：丸ゴシック ---
  { id: "rounded", label: "丸ゴシック（M PLUS Rounded）", css: '"M PLUS Rounded 1c", sans-serif', gf: [{ family: "M PLUS Rounded 1c", weights: [400, 700, 800] }] },
  { id: "zenmaru", label: "丸ゴシック（Zen 丸ゴ・上品）", css: '"Zen Maru Gothic", sans-serif', gf: [{ family: "Zen Maru Gothic", weights: [400, 700, 900] }] },
  { id: "rocknroll", label: "丸ゴシック（RocknRoll・太め）", css: '"RocknRoll One", sans-serif', gf: [{ family: "RocknRoll One", weights: [400] }] },
  // --- 日本語：明朝 ---
  { id: "serif", label: "明朝（Noto Serif JP）", css: '"Noto Serif JP", serif', gf: [JP_SERIF] },
  { id: "mincho", label: "明朝（しっぽり明朝・上品）", css: '"Shippori Mincho", serif', gf: [{ family: "Shippori Mincho", weights: [400, 700, 800] }] },
  { id: "zenold", label: "明朝（Zen 老明朝・伝統的）", css: '"Zen Old Mincho", serif', gf: [{ family: "Zen Old Mincho", weights: [400, 700, 900] }] },
  { id: "bizmincho", label: "明朝（BIZ UDP・読みやすい）", css: '"BIZ UDPMincho", serif', gf: [{ family: "BIZ UDPMincho", weights: [400, 700] }] },
  { id: "kaisei", label: "明朝（Kaisei Decol・やわらかい）", css: '"Kaisei Decol", serif', gf: [{ family: "Kaisei Decol", weights: [400, 700] }] },
  { id: "sawarabi", label: "明朝（さわらび・軽い）", css: '"Sawarabi Mincho", serif', gf: [{ family: "Sawarabi Mincho", weights: [400] }] },
  // --- 日本語：デザイン・手書き ---
  { id: "klee", label: "手書き（Klee One・教科書体風）", css: '"Klee One", serif', gf: [{ family: "Klee One", weights: [400, 600] }] },
  { id: "yuji", label: "手書き（Yuji Syuku・筆書き）", css: '"Yuji Syuku", serif', gf: [{ family: "Yuji Syuku", weights: [400] }] },
  { id: "yusei", label: "手書き（Yusei Magic・ポップ）", css: '"Yusei Magic", sans-serif', gf: [{ family: "Yusei Magic", weights: [400] }] },
  { id: "hachimaru", label: "手書き（はちまるポップ・かわいい）", css: '"Hachi Maru Pop", cursive', gf: [{ family: "Hachi Maru Pop", weights: [400] }] },
  { id: "dela", label: "見出し（Dela Gothic One・極太）", css: '"Dela Gothic One", sans-serif', gf: [{ family: "Dela Gothic One", weights: [400] }] },
  { id: "reggae", label: "見出し（Reggae One・インパクト）", css: '"Reggae One", sans-serif', gf: [{ family: "Reggae One", weights: [400] }] },
  { id: "potta", label: "見出し（Potta One・極太明朝風）", css: '"Potta One", serif', gf: [{ family: "Potta One", weights: [400] }] },
  // --- 日本語：重厚・インパクト（装甲明朝のような重い書体の代替） ---
  { id: "tokumin", label: "重厚（Kaisei Tokumin・極太明朝）", css: '"Kaisei Tokumin", serif', gf: [{ family: "Kaisei Tokumin", weights: [400, 500, 700, 800] }] },
  { id: "shipporib1", label: "重厚（しっぽり明朝B1・太い）", css: '"Shippori Mincho B1", serif', gf: [{ family: "Shippori Mincho B1", weights: [400, 600, 800] }] },
  { id: "tegomin", label: "重厚（New Tegomin・骨太明朝）", css: '"New Tegomin", serif', gf: [{ family: "New Tegomin", weights: [400] }] },
  { id: "rampart", label: "重厚（Rampart One・立体的）", css: '"Rampart One", sans-serif', gf: [{ family: "Rampart One", weights: [400] }] },
  { id: "trainone", label: "重厚（Train One・中抜き）", css: '"Train One", sans-serif', gf: [{ family: "Train One", weights: [400] }] },
  { id: "dotgothic", label: "重厚（DotGothic16・ドット）", css: '"DotGothic16", sans-serif', gf: [{ family: "DotGothic16", weights: [400] }] },
  // 日本語グリフを持つメカ／装甲系。欧文専用のSF書体と違い、和文（漢字含む）にもそのまま効く。
  { id: "chokoku", label: "重厚（彫刻体・超極太）", css: '"Chokokutai", sans-serif', gf: [{ family: "Chokokutai", weights: [400] }] },
  // --- 欧文（＋日本語フォールバック） ---
  { id: "inter", label: "欧文専用（Inter）", css: '"Inter", "Noto Sans JP", system-ui, sans-serif', gf: [{ family: "Inter", weights: [400, 500, 600, 700, 800] }, JP_SANS], latinOnly: true },
  { id: "notosans", label: "欧文専用（Noto Sans）", css: '"Noto Sans", "Noto Sans JP", system-ui, sans-serif', gf: [{ family: "Noto Sans", weights: [400, 700, 800] }, JP_SANS], latinOnly: true },
  { id: "notoserif", label: "欧文専用（Noto Serif）", css: '"Noto Serif", "Noto Serif JP", serif', gf: [{ family: "Noto Serif", weights: [400, 700] }, JP_SERIF], latinOnly: true },
  { id: "montserrat", label: "欧文専用（Montserrat）", css: '"Montserrat", "Noto Sans JP", sans-serif', gf: [{ family: "Montserrat", weights: [400, 600, 700, 800] }, JP_SANS], latinOnly: true },
  { id: "poppins", label: "欧文専用（Poppins・幾何学）", css: '"Poppins", "Noto Sans JP", sans-serif', gf: [{ family: "Poppins", weights: [400, 600, 700] }, JP_SANS], latinOnly: true },
  { id: "oswald", label: "欧文専用（Oswald・縦長）", css: '"Oswald", "Noto Sans JP", sans-serif', gf: [{ family: "Oswald", weights: [400, 600, 700] }, JP_SANS], latinOnly: true },
  { id: "bebas", label: "欧文専用（Bebas Neue・見出し）", css: '"Bebas Neue", "Noto Sans JP", sans-serif', gf: [{ family: "Bebas Neue", weights: [400] }, JP_SANS], latinOnly: true },
  { id: "anton", label: "欧文専用（Anton・極太）", css: '"Anton", "Noto Sans JP", sans-serif', gf: [{ family: "Anton", weights: [400] }, JP_SANS], latinOnly: true },
  { id: "spacegrotesk", label: "欧文専用（Space Grotesk）", css: '"Space Grotesk", "Noto Sans JP", sans-serif', gf: [{ family: "Space Grotesk", weights: [400, 700] }, JP_SANS], latinOnly: true },
  { id: "playfair", label: "欧文専用（Playfair Display・優雅）", css: '"Playfair Display", "Noto Serif JP", serif', gf: [{ family: "Playfair Display", weights: [400, 700, 800] }, JP_SERIF], latinOnly: true },
  { id: "lora", label: "欧文専用（Lora・読みやすい）", css: '"Lora", "Noto Serif JP", serif', gf: [{ family: "Lora", weights: [400, 700] }, JP_SERIF], latinOnly: true },
  { id: "cormorant", label: "欧文専用（Cormorant・細い）", css: '"Cormorant Garamond", "Noto Serif JP", serif', gf: [{ family: "Cormorant Garamond", weights: [400, 600, 700] }, JP_SERIF], latinOnly: true },
  { id: "jetbrains", label: "欧文専用（JetBrains Mono・等幅）", css: '"JetBrains Mono", "Noto Sans JP", monospace', gf: [{ family: "JetBrains Mono", weights: [400, 700] }, JP_SANS], latinOnly: true },
  // --- 欧文：SF・ミリタリー（メカ／装甲っぽい見出し。和文は Noto Sans JP で出る） ---
  { id: "orbitron", label: "欧文専用・SF（Orbitron・メカ）", css: '"Orbitron", "Noto Sans JP", sans-serif', gf: [{ family: "Orbitron", weights: [400, 700, 900] }, JP_SANS], latinOnly: true },
  { id: "michroma", label: "欧文専用・SF（Michroma・ワイド）", css: '"Michroma", "Noto Sans JP", sans-serif', gf: [{ family: "Michroma", weights: [400] }, JP_SANS], latinOnly: true },
  { id: "chakra", label: "欧文専用・SF（Chakra Petch・テック）", css: '"Chakra Petch", "Noto Sans JP", sans-serif', gf: [{ family: "Chakra Petch", weights: [400, 600, 700] }, JP_SANS], latinOnly: true },
  { id: "blackops", label: "欧文専用・ミリタリー（Black Ops One・ステンシル）", css: '"Black Ops One", "Noto Sans JP", sans-serif', gf: [{ family: "Black Ops One", weights: [400] }, JP_SANS], latinOnly: true },
  { id: "stencil", label: "欧文専用・ミリタリー（Saira Stencil One）", css: '"Saira Stencil One", "Noto Sans JP", sans-serif', gf: [{ family: "Saira Stencil One", weights: [400] }, JP_SANS], latinOnly: true },
  { id: "teko", label: "欧文専用・見出し（Teko・縦長コンデンス）", css: '"Teko", "Noto Sans JP", sans-serif', gf: [{ family: "Teko", weights: [400, 600, 700] }, JP_SANS], latinOnly: true },
];

// フォントid → 実際の font-family（未指定/不明なら undefined＝継承）
export const fontCss = (id?: string): string | undefined => FONTS.find((f) => f.id === id)?.css;

// フォントid → Google Fonts の family群（fontEmbed のサブセット取得で使う）
export const fontFamilies = (id: string): { family: string; weights: number[] }[] =>
  FONTS.find((f) => f.id === id)?.gf ?? [];

// Google Fonts の stylesheet URL を作る。ids 未指定＝全フォント。
// 同じ family が複数フォントから参照される（＝和文フォールバック）ので、family 単位で weight をまとめる。
export function googleFontsHref(ids?: FontId[]): string {
  const defs = ids ? FONTS.filter((f) => ids.includes(f.id)) : FONTS;
  const byFamily = new Map<string, Set<number>>();
  for (const d of defs) {
    for (const { family, weights } of d.gf) {
      const set = byFamily.get(family) ?? new Set<number>();
      weights.forEach((w) => set.add(w));
      byFamily.set(family, set);
    }
  }
  if (byFamily.size === 0) return "";
  const families = [...byFamily.entries()]
    .sort(([a], [b]) => a.localeCompare(b)) // 並びを安定させる（差分が出ないように）
    .map(([family, ws]) => `family=${family.replace(/ /g, "+")}:wght@${[...ws].sort((a, b) => a - b).join(";")}`);
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

// アプリ起動時に読む最小構成。残りは使用時に components/FontLoader.tsx が読み足す。
// ※ 全34フォントをまとめて読むと Google Fonts のCSSだけで約4.5MBになる（和文はサブセットが多いため）。
//    既定フォント1つなら約340KB。使うぶんだけ読む方式にして初期表示を軽く保つ。
export const GOOGLE_FONTS_CORE_HREF = googleFontsHref(["sans"]);

// ページ内で実際に使われているフォントidを集める。
// 書き出しHTMLでは、これで絞った <link> を出す（未使用フォントを読ませない＝表示が速い）。
export function usedFontIds(...pages: (Page | null | undefined)[]): FontId[] {
  const known = new Set(FONTS.map((f) => f.id as string));
  const found = new Set<FontId>();
  const walk = (n: SceneNode) => {
    if (n.type === "atom" && n.atomType === "text") {
      const id = n.style?.fontFamily;
      if (id && known.has(id)) found.add(id as FontId);
    }
    if (isContainer(n)) n.children.forEach(walk);
  };
  for (const p of pages) p?.children.forEach(walk);
  return FONTS.filter((f) => found.has(f.id)).map((f) => f.id); // 表の並び順で返す
}
