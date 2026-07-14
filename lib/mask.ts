// 画像を図形/SVGでマスク（切り抜き）するための共有ロジック。
// ビルダー(Renderer / exportHtml) と スタジオ(StudioElementView / studioExport) の両方で使う。
// 表示は CSS mask-image（アルファマスク）で、SVG書き出しは <mask>（輝度マスク）で再現する。

export interface MaskSpec {
  shape?: string; // プリセット図形のキー（MASK_SHAPES）。svg が優先。
  svg?: string; // 任意SVG（生コード）。指定時はこれをマスクに使う。
}

// プリセット図形。inner は viewBox 0 0 100 100 上の図形（塗りは後から指定）。
export const MASK_SHAPES: { key: string; label: string; inner: string }[] = [
  { key: "circle", label: "円/楕円", inner: "<ellipse cx='50' cy='50' rx='50' ry='50'/>" },
  { key: "rounded", label: "角丸", inner: "<rect x='0' y='0' width='100' height='100' rx='16' ry='16'/>" },
  { key: "squircle", label: "スクワークル", inner: "<path d='M0,50 C0,12 12,0 50,0 C88,0 100,12 100,50 C100,88 88,100 50,100 C12,100 0,88 0,50 Z'/>" },
  { key: "star", label: "星", inner: "<polygon points='50,2 61,38 98,38 68,60 79,96 50,74 21,96 32,60 2,38 39,38'/>" },
  { key: "hexagon", label: "六角形", inner: "<polygon points='50,0 93,25 93,75 50,100 7,75 7,25'/>" },
  { key: "diamond", label: "ひし形", inner: "<polygon points='50,0 100,50 50,100 0,50'/>" },
  { key: "triangle", label: "三角形", inner: "<polygon points='50,0 100,100 0,100'/>" },
  { key: "heart", label: "ハート", inner: "<path d='M50,90 C10,62 2,36 18,20 C30,8 46,12 50,28 C54,12 70,8 82,20 C98,36 90,62 50,90 Z'/>" },
  { key: "blob", label: "ブロブ", inner: "<path d='M50,3 C71,3 86,16 91,36 C96,56 92,79 71,90 C54,99 29,97 14,82 C1,68 4,44 13,27 C22,11 33,3 50,3 Z'/>" },
];

export const hasMask = (m?: MaskSpec | null): boolean => !!(m && ((m.svg && m.svg.trim()) || m.shape));
const innerOf = (key?: string) => MASK_SHAPES.find((s) => s.key === key)?.inner;

// マスク画像の url(...) 値。プリセット図形 or 任意SVG を data URI 化する。
// encodeURIComponent は " # < > , を確実にエスケープするので url("...") 内で安全。
// encodeURIComponent は " # < > , は %化するが ' は残す。HTML書き出しの css() が
// url("...") の二重引用符を単一引用符へ置換するため、内側の ' が衝突する。→ ' も %27 に。
const enc = (s: string) => encodeURIComponent(s).replace(/'/g, "%27");
export function maskImageValue(m?: MaskSpec | null): string | undefined {
  if (!m) return undefined;
  if (m.svg && m.svg.trim()) return `url("data:image/svg+xml,${enc(m.svg.trim())}")`;
  const inner = innerOf(m.shape);
  if (!inner) return undefined;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none' fill='#000'>${inner}</svg>`;
  return `url("data:image/svg+xml,${enc(svg)}")`;
}

// React 用のスタイル（表示）。-webkit- と標準の両方を返す。
export function maskCss(m?: MaskSpec | null): React.CSSProperties {
  const v = maskImageValue(m);
  if (!v) return {};
  return {
    WebkitMaskImage: v, maskImage: v,
    WebkitMaskSize: "100% 100%", maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
    WebkitMaskPosition: "center", maskPosition: "center",
  } as React.CSSProperties;
}

// HTML書き出し用の [prop,value] ペア（exportHtml の css() に渡す）。
export function maskCssPairs(m?: MaskSpec | null): Array<[string, string | undefined]> {
  const v = maskImageValue(m);
  if (!v) return [];
  return [
    ["-webkit-mask-image", v], ["mask-image", v],
    ["-webkit-mask-size", "100% 100%"], ["mask-size", "100% 100%"],
    ["-webkit-mask-repeat", "no-repeat"], ["mask-repeat", "no-repeat"],
    ["-webkit-mask-position", "center"], ["mask-position", "center"],
  ];
}

// SVG書き出し用：<mask> の中身（白塗り＝輝度マスクで可視）を、指定ボックス(x,y,w,h)へ配置して返す。
// null のときはマスクなし。プリセットは 0..100 を box にスケール、任意SVGは自身のviewBoxで正規化。
export function svgMaskMarkup(m: MaskSpec | null | undefined, id: string, x: number, y: number, w: number, h: number): string | null {
  if (!hasMask(m)) return null;
  let body: string;
  if (m!.svg && m!.svg.trim()) {
    // 任意SVG：塗りを白へ強制（fill/stroke属性を除去し、グループで白指定）。box に合わせて引き伸ばす。
    const cleaned = m!.svg.trim()
      .replace(/\sfill="[^"]*"/gi, "")
      .replace(/\sstroke="[^"]*"/gi, "")
      .replace(/^<svg\b/i, `<svg preserveAspectRatio="none" width="${w}" height="${h}"`);
    body = `<g transform="translate(${x} ${y})" fill="#fff">${cleaned}</g>`;
  } else {
    const inner = innerOf(m!.shape)!;
    body = `<g transform="translate(${x} ${y}) scale(${w / 100} ${h / 100})" fill="#fff">${inner}</g>`;
  }
  return `<mask id="${id}" maskUnits="userSpaceOnUse">${body}</mask>`;
}
