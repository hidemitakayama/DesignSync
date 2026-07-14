// 文字を「ベクターパス（SVG）」へ変換する（＝Illustratorのアウトライン化）。
// opentype.js で実フォントを読み、各グリフの輪郭をパスデータ化する。
// フォントは woff2 非対応のため、静的TTF（@expo-google-fonts の Noto Sans JP）を既定に使う。
import opentype from "opentype.js";

// 既定フォント（日本語対応の静的TTF）。ウェイト別に用意。必要なら setOutlineFontBase で差し替え可。
let FONT_BASE = "https://cdn.jsdelivr.net/npm/@expo-google-fonts/noto-sans-jp/";
const WEIGHT_FILES: [number, string][] = [
  [400, "NotoSansJP_400Regular.ttf"],
  [500, "NotoSansJP_500Medium.ttf"],
  [700, "NotoSansJP_700Bold.ttf"],
  [900, "NotoSansJP_900Black.ttf"],
];
export function setOutlineFontBase(url: string) { FONT_BASE = url.endsWith("/") ? url : url + "/"; }

// フォントウェイトに最も近いファイルURLを返す。
export function fontUrlForWeight(weight = 400): string {
  let best = WEIGHT_FILES[0];
  for (const w of WEIGHT_FILES) if (Math.abs(w[0] - weight) < Math.abs(best[0] - weight)) best = w;
  return FONT_BASE + best[1];
}

// フォントは重い（数MB）ので URL 単位でキャッシュ。
const cache = new Map<string, Promise<opentype.Font>>();
export function loadFont(url: string): Promise<opentype.Font> {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`フォント取得に失敗 (${r.status})`); return r.arrayBuffer(); })
      .then((buf) => opentype.parse(buf));
    cache.set(url, p);
  }
  return p;
}

export interface OutlineResult { d: string; width: number; height: number }

// 複数行テキストを1つのパスデータ(d)へ。ボックス左上(0,0)基準、行間1.25、指定寄せ。
export function textToOutline(
  font: opentype.Font,
  text: string,
  fontSize: number,
  opts?: { lineHeight?: number; align?: "left" | "center" | "right" },
): OutlineResult {
  const lines = (text || "").split("\n");
  const lh = (opts?.lineHeight ?? 1.25) * fontSize;
  const ascent = (font.ascender / font.unitsPerEm) * fontSize;
  const widths = lines.map((l) => (l ? font.getAdvanceWidth(l, fontSize) : 0));
  const maxW = Math.max(1, ...widths);
  const align = opts?.align ?? "left";
  let d = "";
  lines.forEach((l, i) => {
    if (!l) return;
    const x = align === "center" ? (maxW - widths[i]) / 2 : align === "right" ? maxW - widths[i] : 0;
    const y = ascent + i * lh; // ベースライン
    d += font.getPath(l, x, y, fontSize).toPathData(2) + " ";
  });
  return { d: d.trim(), width: Math.ceil(maxW), height: Math.ceil(Math.max(1, lines.length * lh)) };
}

// テキスト要素 → アウトライン化した SVG（文字列）と自然サイズを返す。
export async function outlineTextElement(
  content: string,
  fontSize: number,
  fontWeight: number,
  align: "left" | "center" | "right",
  color: string,
): Promise<{ svg: string; width: number; height: number }> {
  const font = await loadFont(fontUrlForWeight(fontWeight));
  const { d, width, height } = textToOutline(font, content, fontSize, { align });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="${color}"><path d="${d}"/></svg>`;
  return { svg, width, height };
}
