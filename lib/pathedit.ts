// ビルダーのパス変形（頂点編集）用ヘルパ。
// 図形/SVGの点列は viewBox 0..100 空間で保持し、画面上のハンドルは要素の実表示矩形に対して
// 相対配置する（＝ズーム/スクロールに影響されない）。svg atom の svg は点列から再生成する。
import type { PathNode } from "./types";

// 現在のSVGから塗り/線の色を推定（無ければ既定）。
export function colorOfSvg(svg: string): string {
  return svg.match(/(?:fill|stroke)\s*=\s*"(?!none)([^"]+)"/i)?.[1] ?? "#0ea5e9";
}

// 点列 → svg atom 用の完結SVG（viewBox 0 0 100 100、枠いっぱいに引き伸ばす）。
// closed=true は塗り、false は線（stroke）。
export function pointsToShapeSvg(points: PathNode[], closed: boolean, color: string): string {
  if (!points.length) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>`;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ") + (closed ? " Z" : "");
  const paint = closed
    ? `fill="${color}"`
    : `fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${d}" ${paint}/></svg>`;
}

const mkPt = (x: number, y: number, i: number): PathNode => ({ id: `p${i}`, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, isCorner: true });

// SVG（0..100 想定の viewBox）→ 頂点列。polygon/polyline/line/rect/circle を解釈。
// 解釈できない（path の曲線・ellipse・角丸等）は null（＝パス変換不可）。
export function svgToPoints(svg: string): { points: PathNode[]; closed: boolean } | null {
  // viewBox を見て 0..100 へ正規化（既定 100）。
  const vb = svg.match(/viewBox\s*=\s*"([\d.\s-]+)"/i)?.[1]?.trim().split(/\s+/).map(Number);
  const vw = vb && vb[2] ? vb[2] : 100, vh = vb && vb[3] ? vb[3] : 100;
  const nx = (x: number) => (x / vw) * 100, ny = (y: number) => (y / vh) * 100;

  const poly = svg.match(/<(polygon|polyline)[^>]*\spoints\s*=\s*"([^"]+)"/i);
  if (poly) {
    const nums = poly[2].trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
    const pts: PathNode[] = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push(mkPt(nx(nums[i]), ny(nums[i + 1]), i / 2));
    if (pts.length >= 2) return { points: pts, closed: poly[1].toLowerCase() === "polygon" };
  }
  const line = svg.match(/<line[^>]*\sx1\s*=\s*"([\d.-]+)"[^>]*\sy1\s*=\s*"([\d.-]+)"[^>]*\sx2\s*=\s*"([\d.-]+)"[^>]*\sy2\s*=\s*"([\d.-]+)"/i);
  if (line) return { points: [mkPt(nx(+line[1]), ny(+line[2]), 0), mkPt(nx(+line[3]), ny(+line[4]), 1)], closed: false };
  const rect = svg.match(/<rect[^>]*\sx\s*=\s*"([\d.-]+)"[^>]*\sy\s*=\s*"([\d.-]+)"[^>]*\swidth\s*=\s*"([\d.-]+)"[^>]*\sheight\s*=\s*"([\d.-]+)"/i);
  if (rect) {
    const x = +rect[1], y = +rect[2], w = +rect[3], h = +rect[4];
    return { points: [mkPt(nx(x), ny(y), 0), mkPt(nx(x + w), ny(y), 1), mkPt(nx(x + w), ny(y + h), 2), mkPt(nx(x), ny(y + h), 3)], closed: true };
  }
  const circle = svg.match(/<circle[^>]*\scx\s*=\s*"([\d.-]+)"[^>]*\scy\s*=\s*"([\d.-]+)"[^>]*\sr\s*=\s*"([\d.-]+)"/i);
  if (circle) {
    const cx = +circle[1], cy = +circle[2], r = +circle[3];
    const pts = Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      return mkPt(nx(cx + r * Math.cos(a)), ny(cy + r * Math.sin(a)), i);
    });
    return { points: pts, closed: true };
  }
  return null;
}
