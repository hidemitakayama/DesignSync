// スタジオの合成物を SVG / PNG / JPEG / WebP で書き出す。
// 方針：StudioElement[] を「完結した1枚のSVG文字列」に変換し、
//   - SVG形式    … その文字列をそのまま Blob 化
//   - ラスター形式 … SVG を Image に読ませて Canvas に描画し toBlob（外部ライブラリ不要）
// 画像は CORS タイント回避のため、可能なら dataURI 化してからSVGに埋め込む。
// すべてブラウザAPIを使うので、呼び出しはクライアント（クリック時）で行うこと。

import type { StudioElement } from "./types";
import { isDriveRef, refToDataUri } from "./imageStore";
import { applyPathGradient } from "./svg";
import { svgMaskMarkup } from "./mask";

export type ExportFormat = "svg" | "png" | "jpeg" | "webp";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// 全要素を囲む最小の矩形（＝書き出しの領域。キャンバス全体ではなく中身に合わせて切り抜く）
function contentBounds(elements: StudioElement[]) {
  if (elements.length === 0) return { x: 0, y: 0, width: 1, height: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    minX = Math.min(minX, el.position.x);
    minY = Math.min(minY, el.position.y);
    maxX = Math.max(maxX, el.position.x + el.size.width);
    maxY = Math.max(maxY, el.position.y + el.size.height);
  }
  return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

// CSS linear-gradient(angle, c1, c2) を解析
function parseGradient(g: string) {
  const angle = Number(/(-?[\d.]+)deg/.exec(g)?.[1] ?? 135);
  const colors = g.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)/g) ?? ["#0ea5e9", "#6366f1"];
  return { angle: isFinite(angle) ? angle : 135, c1: colors[0], c2: colors[1] ?? colors[0] };
}
// CSS角度 → SVG linearGradient のベクトル（objectBoundingBox, y下向き）
function gradientVec(angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  const x = Math.sin(a), y = -Math.cos(a);
  return { x1: 0.5 - x / 2, y1: 0.5 - y / 2, x2: 0.5 + x / 2, y2: 0.5 + y / 2 };
}
// boxShadow "0 6px 16px rgba(...)" → feDropShadow
function parseShadow(sh: string) {
  const m = /(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8})/.exec(sh);
  return m ? { dx: +m[1], dy: +m[2], blur: +m[3], color: m[4] } : null;
}

// 画像URL → dataURI（失敗時 null）。ラスター書き出しのタイント回避に使う。
async function toDataUri(url: string): Promise<string | null> {
  try {
    if (url.startsWith("data:")) return url;
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// テキストを箱の内寸で折り返す（明示改行 \n も反映）。日本語も扱えるよう文字単位で貪欲に折る。
function wrapLines(text: string, maxWidth: number, font: string): string[] {
  const ctx = document.createElement("canvas").getContext("2d");
  if (ctx) ctx.font = font;
  const measure = (t: string) => (ctx ? ctx.measureText(t).width : t.length * 8);
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (para === "") { out.push(""); continue; }
    let line = "";
    for (const ch of Array.from(para)) {
      if (line !== "" && measure(line + ch) > maxWidth) { out.push(line); line = ch; }
      else line += ch;
    }
    out.push(line);
  }
  return out.length ? out : [""];
}

// 1要素を SVG 断片へ。defs には gradient/filter/clipPath を積む。
function elementSvg(el: StudioElement, defs: string[], i: number): string {
  const { x, y } = el.position;
  const { width: w, height: h } = el.size;
  const s = el.style;
  const op = s.opacity != null && s.opacity !== 1 ? ` opacity="${s.opacity}"` : "";

  let filterAttr = "";
  if (s.boxShadow) {
    const sh = parseShadow(s.boxShadow);
    if (sh) {
      const id = `sh${i}`;
      defs.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${sh.dx}" dy="${sh.dy}" stdDeviation="${sh.blur / 2}" flood-color="${sh.color}"/></filter>`);
      filterAttr = ` filter="url(#${id})"`;
    }
  }

  const fill = () => {
    if (s.backgroundGradient) {
      const { angle, c1, c2 } = parseGradient(s.backgroundGradient);
      const v = gradientVec(angle);
      const id = `grad${i}`;
      defs.push(`<linearGradient id="${id}" x1="${v.x1}" y1="${v.y1}" x2="${v.x2}" y2="${v.y2}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`);
      return `url(#${id})`;
    }
    return s.backgroundColor || "transparent";
  };

  if (el.type === "rectangle") {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${s.borderRadius || 0}" fill="${fill()}"${op}${filterAttr}/>`;
  }
  if (el.type === "circle") {
    return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill()}"${op}${filterAttr}/>`;
  }
  if (el.type === "text") {
    const pad = 4;
    const fs = s.fontSize ?? 16;
    const fw = s.fontWeight ?? 400;
    const lh = fs * 1.25;
    const lines = wrapLines(el.content || "", Math.max(1, w - pad * 2), `${fw} ${fs}px Arial, Helvetica, sans-serif`);
    const align = s.textAlign ?? "left";
    const anchor = align === "center" ? "middle" : align === "right" ? "end" : "start";
    const tx = align === "center" ? x + w / 2 : align === "right" ? x + w - pad : x + pad;
    const ty = y + pad + fs * 0.9; // 近似ベースライン
    const tspans = lines.map((ln, k) => `<tspan x="${tx.toFixed(1)}" ${k === 0 ? `y="${ty.toFixed(1)}"` : `dy="${lh.toFixed(1)}"`}>${esc(ln)}</tspan>`).join("");
    return `<text font-family="Arial, Helvetica, sans-serif" font-size="${fs}" font-weight="${fw}" fill="${s.color ?? "#0f172a"}" text-anchor="${anchor}"${op}${filterAttr}>${tspans}</text>`;
  }
  if (el.type === "image") {
    let clipAttr = "";
    const mk = svgMaskMarkup({ shape: el.maskShape, svg: el.maskSvg }, `imgmask${i}`, x, y, w, h);
    if (mk) {
      defs.push(mk);
      clipAttr = ` mask="url(#imgmask${i})"`;
    } else if (s.borderRadius) {
      const id = `clip${i}`;
      defs.push(`<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${s.borderRadius}"/></clipPath>`);
      clipAttr = ` clip-path="url(#${id})"`;
    }
    return `<image href="${esc(el.content)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"${clipAttr}${op}${filterAttr}/>`;
  }
  // svg（パス等）：保存済みの <svg viewBox=...> に位置・サイズ・色を差し込んで入れ子にする。
  // 表示(svgScalable)と同じく preserveAspectRatio="none" で枠いっぱいに。currentColor は style の color で解決。
  // グラデーション塗りのパスは applyPathGradient で <linearGradient> を埋め込んで適用（表示と同一結果）。
  const nested = applyPathGradient(
    el.content.replace(/^<svg\b/i, `<svg x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none" style="color:${s.color ?? "#0f172a"}"`),
    s.backgroundGradient,
    el.id,
  );
  return `<g${op}${filterAttr}>${nested}</g>`;
}

// 全要素 → 完結SVG文字列（+ 寸法）。画像は可能なら dataURI 化して埋め込む。
export async function buildStudioSvg(elements: StudioElement[]): Promise<{ svg: string; width: number; height: number }> {
  const b = contentBounds(elements);
  const inlined = await Promise.all(
    elements.map(async (el) => {
      if (el.type === "image" && el.content && !el.content.startsWith("data:")) {
        // drive:// はフォルダから、通常URLは fetch で dataURI 化
        const d = isDriveRef(el.content) ? await refToDataUri(el.content) : await toDataUri(el.content);
        return d ? { ...el, content: d } : el;
      }
      return el;
    }),
  );
  const defs: string[] = [];
  const body = inlined.map((el, i) => elementSvg(el, defs, i)).join("\n");
  const defsStr = defs.length ? `<defs>${defs.join("")}</defs>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${b.width}" height="${b.height}" viewBox="${b.x} ${b.y} ${b.width} ${b.height}">${defsStr}${body}</svg>`;
  return { svg, width: b.width, height: b.height };
}

// SVG文字列 → ラスターBlob（Canvas経由）。JPEGは背景白で塗る（透明非対応）。
async function rasterize(svg: string, width: number, height: number, type: string, quality: number, background?: string, scale = 2): Promise<Blob> {
  const img = new Image();
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("SVGの読み込みに失敗しました"));
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvasを取得できませんでした");
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("画像化に失敗しました（画像のCORS制限、または未対応の形式の可能性）"))),
      type,
      quality,
    );
  });
}

// 指定形式で書き出して Blob を返す。
export async function exportStudio(elements: StudioElement[], format: ExportFormat): Promise<Blob> {
  const { svg, width, height } = await buildStudioSvg(elements);
  if (format === "svg") return new Blob([svg], { type: "image/svg+xml" });
  const type = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
  const background = format === "jpeg" ? "#ffffff" : undefined; // JPEGは透明を扱えない
  return rasterize(svg, width, height, type, 0.92, background);
}

// Blob をダウンロードさせる
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
