// 完全再現のためのフォント埋め込み。
// ページで実際に使われている「フォント × 文字」だけを Google Fonts からサブセット取得し、
// woff2 を data-URI 化した @font-face CSS を作る。これで外部依存ゼロ＝どこでも同じ字面になる。

import type { Page, SceneNode, ContainerNode } from "./types";
import { isContainer } from "./types";
import type { FontId } from "./fonts";

// FontId → 埋め込む Google Fonts の family群（GOOGLE_FONTS_HREF と一致）。
// 欧文フォントは日本語フォールバック（Noto Sans/Serif JP）も一緒に埋め込み、和文も完全再現する。
const GF: Record<FontId, { family: string; weights: number[] }[]> = {
  sans: [{ family: "Noto Sans JP", weights: [400, 700, 800] }],
  serif: [{ family: "Noto Serif JP", weights: [400, 700] }],
  rounded: [{ family: "M PLUS Rounded 1c", weights: [400, 700, 800] }],
  kaku: [{ family: "Zen Kaku Gothic New", weights: [400, 700] }],
  mincho: [{ family: "Shippori Mincho", weights: [400, 700, 800] }],
  inter: [{ family: "Inter", weights: [400, 500, 600, 700, 800] }, { family: "Noto Sans JP", weights: [400, 700, 800] }],
  notosans: [{ family: "Noto Sans", weights: [400, 700, 800] }, { family: "Noto Sans JP", weights: [400, 700, 800] }],
  notoserif: [{ family: "Noto Serif", weights: [400, 700] }, { family: "Noto Serif JP", weights: [400, 700] }],
};

// フォントごとに「そのフォントで使われている文字」を集める（サブセットを最小化）
function collect(page: Page): Map<FontId, Set<string>> {
  const m = new Map<FontId, Set<string>>();
  const walk = (n: SceneNode) => {
    if (n.type === "atom" && n.atomType === "text") {
      const fid = n.style?.fontFamily as FontId | undefined;
      if (fid && GF[fid]) {
        const set = m.get(fid) ?? new Set<string>();
        const text = n.runs?.length ? n.runs.map((r) => r.text).join("") : n.text ?? "";
        for (const ch of text) set.add(ch);
        m.set(fid, set);
      }
    }
    if (isContainer(n)) (n as ContainerNode).children.forEach(walk);
  };
  page.children.forEach(walk);
  return m;
}

async function toDataUri(url: string): Promise<string> {
  const buf = await (await fetch(url)).arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return "data:font/woff2;base64," + btoa(bin);
}

// 使用フォント×使用文字だけをサブセット取得し、@font-face(data-URI) の CSS を返す。
// 取得に失敗した分はスキップ（オフライン等では空になり、呼び出し側が外部link版にフォールバック）。
export async function buildEmbeddedFontCss(page: Page): Promise<string> {
  const used = collect(page);
  if (used.size === 0) return "";
  const parts: string[] = [];
  for (const [id, chars] of used) {
    if (chars.size === 0) continue;
    const text = encodeURIComponent([...chars].join(""));
    // このフォントidに紐づく family群（欧文＋日本語フォールバック等）をそれぞれサブセット埋め込み
    for (const { family, weights } of GF[id]) {
      const fam = family.replace(/ /g, "+");
      const url = `https://fonts.googleapis.com/css2?family=${fam}:wght@${weights.join(";")}&text=${text}&display=swap`;
      let css: string;
      try {
        css = await (await fetch(url)).text();
      } catch {
        continue; // この family は埋め込めない → link版にフォールバック
      }
      const faces = css.match(/@font-face\s*{[^}]*}/g) ?? [];
      for (const face of faces) {
        // Google のサブセットは url(.../l/font?kit=...) format('woff2') 形式（.woff2拡張子ではない）
        const m = /url\((https:\/\/[^)]+)\)\s*format\((?:'|")woff2(?:'|")\)/.exec(face);
        if (!m) { parts.push(face); continue; }
        try {
          parts.push(face.replace(m[1], await toDataUri(m[1])));
        } catch {
          parts.push(face); // woff2 取得失敗 → 元のURLのまま（外部依存が残る）
        }
      }
    }
  }
  return parts.join("\n");
}
