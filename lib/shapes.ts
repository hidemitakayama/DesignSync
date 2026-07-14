// ビルダー/スタジオ共通の「基本図形」プリセット。
// 図形は SVG（viewBox 0 0 100 100）として挿入する。色は #0ea5e9 を初期値にし、
// 既存の色替え(recolorSvg)・不透明度・マスク・パス変形の対象にできる。
// pts は「パスに変換して編集」する際の初期頂点（0..100 のローカル座標）。closed=塗り/開=線。

const C = "#0ea5e9";

export interface ShapeDef {
  key: string;
  label: string;
  svg: string;
  pts?: [number, number][]; // パス変形用の初期頂点（0..100）。未指定＝パス変換不可（円など曲線）
  closed?: boolean;
}

const wrap = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${inner}</svg>`;
// 円周を n 分割した近似頂点
const circlePts = (n = 16): [number, number][] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [Math.round((50 + 49 * Math.cos(a)) * 100) / 100, Math.round((50 + 49 * Math.sin(a)) * 100) / 100] as [number, number];
  });

export const SHAPES: ShapeDef[] = [
  { key: "rect", label: "長方形", svg: wrap(`<rect x="2" y="2" width="96" height="96" fill="${C}"/>`), pts: [[2, 2], [98, 2], [98, 98], [2, 98]], closed: true },
  { key: "rounded", label: "角丸", svg: wrap(`<rect x="2" y="2" width="96" height="96" rx="16" ry="16" fill="${C}"/>`) },
  { key: "circle", label: "円", svg: wrap(`<circle cx="50" cy="50" r="48" fill="${C}"/>`), pts: circlePts(16), closed: true },
  { key: "triangle", label: "三角形", svg: wrap(`<polygon points="50,4 96,96 4,96" fill="${C}"/>`), pts: [[50, 4], [96, 96], [4, 96]], closed: true },
  { key: "diamond", label: "ひし形", svg: wrap(`<polygon points="50,3 97,50 50,97 3,50" fill="${C}"/>`), pts: [[50, 3], [97, 50], [50, 97], [3, 50]], closed: true },
  { key: "pentagon", label: "五角形", svg: wrap(`<polygon points="50,3 97,38 79,95 21,95 3,38" fill="${C}"/>`), pts: [[50, 3], [97, 38], [79, 95], [21, 95], [3, 38]], closed: true },
  { key: "hexagon", label: "六角形", svg: wrap(`<polygon points="50,2 93,26 93,74 50,98 7,74 7,26" fill="${C}"/>`), pts: [[50, 2], [93, 26], [93, 74], [50, 98], [7, 74], [7, 26]], closed: true },
  { key: "star", label: "星", svg: wrap(`<polygon points="50,3 61,38 98,38 68,60 79,96 50,74 21,96 32,60 2,38 39,38" fill="${C}"/>`), pts: [[50, 3], [61, 38], [98, 38], [68, 60], [79, 96], [50, 74], [21, 96], [32, 60], [2, 38], [39, 38]], closed: true },
  { key: "arrow", label: "矢印", svg: wrap(`<polygon points="2,38 60,38 60,20 98,50 60,80 60,62 2,62" fill="${C}"/>`), pts: [[2, 38], [60, 38], [60, 20], [98, 50], [60, 80], [60, 62], [2, 62]], closed: true },
  { key: "line", label: "直線", svg: wrap(`<line x1="4" y1="96" x2="96" y2="4" stroke="${C}" stroke-width="6" stroke-linecap="round"/>`), pts: [[4, 96], [96, 4]], closed: false },
  { key: "plus", label: "十字", svg: wrap(`<polygon points="38,4 62,4 62,38 96,38 96,62 62,62 62,96 38,96 38,62 4,62 4,38 38,38" fill="${C}"/>`), pts: [[38, 4], [62, 4], [62, 38], [96, 38], [96, 62], [62, 62], [62, 96], [38, 96], [38, 62], [4, 62], [4, 38], [38, 38]], closed: true },
  { key: "heart", label: "ハート", svg: wrap(`<path d="M50,90 C10,62 2,36 18,20 C30,8 46,12 50,28 C54,12 70,8 82,20 C98,36 90,62 50,90 Z" fill="${C}"/>`) },
];

// 頂点列(0..100) → パスデータ d（ローカル w×h に合わせてスケール）。角のみ（直線）でつなぐ。
export function pathDataFromPoints(pts: [number, number][] | { x: number; y: number }[], w: number, h: number, closed: boolean): string {
  const p = pts.map((pt) => (Array.isArray(pt) ? { x: pt[0], y: pt[1] } : pt));
  if (!p.length) return "";
  const sx = w / 100, sy = h / 100;
  const d = p.map((pt, i) => `${i === 0 ? "M" : "L"}${(pt.x * sx).toFixed(2)} ${(pt.y * sy).toFixed(2)}`).join(" ");
  return closed ? d + " Z" : d;
}
