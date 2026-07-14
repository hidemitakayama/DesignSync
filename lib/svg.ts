// 生SVGを「枠に追従して拡縮できる」形に正規化する。
// 登録されたSVGは viewBox が無かったり、固定の width/height を「属性」や「style」で
// 持っていることがあり、そのままだと枠を変えても中身が拡縮しない。以下を行う:
//  - viewBox が無く width/height（属性 or style）が数値なら viewBox="0 0 W H" を合成
//  - width/height の「属性」も「style内の指定」も除去（styleのwidth/heightはCSS優先で
//    属性の 100% を上書きしてしまうため、これが固定サイズの主因になりやすい）
//  - width/height="100%"、preserveAspectRatio="none" を付与し、枠いっぱいに追従させる
export function svgScalable(raw: string): string {
  if (!raw) return raw;
  const m = /<svg\b([^>]*)>/i.exec(raw);
  if (!m) return raw;
  let attrs = m[1];

  const getAttr = (name: string) => {
    const r = new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(attrs);
    return r ? r[1] : undefined;
  };

  const style = getAttr("style") ?? "";
  const styleGet = (prop: string) => {
    const r = new RegExp(`\\b${prop}\\s*:\\s*([^;]+)`, "i").exec(style);
    return r ? r[1].trim() : undefined;
  };

  // 幅・高さは「属性」または「style」から取得（"256px" のような単位付きも parseFloat で拾える）
  const w = getAttr("width") ?? styleGet("width");
  const h = getAttr("height") ?? styleGet("height");
  const vb = getAttr("viewBox");

  if (!vb && w && h) {
    const wn = parseFloat(w);
    const hn = parseFloat(h);
    if (isFinite(wn) && isFinite(hn)) attrs += ` viewBox="0 0 ${wn} ${hn}"`;
  }

  // 属性の width/height/preserveAspectRatio を除去
  attrs = attrs.replace(/\s(width|height|preserveAspectRatio)\s*=\s*["'][^"']*["']/gi, "");

  // style 内の width/height 指定も除去（CSS優先で 100% を上書きしてしまうため）
  const cleanStyle = (val: string) => val.replace(/\s*(width|height)\s*:\s*[^;]*;?/gi, "").trim();
  attrs = attrs
    .replace(/(\bstyle\s*=\s*")([^"]*)(")/i, (_s, a, val, c) => a + cleanStyle(val) + c)
    .replace(/(\bstyle\s*=\s*')([^']*)(')/i, (_s, a, val, c) => a + cleanStyle(val) + c);

  // 枠いっぱいに追従（none で箱の比率どおりに拡縮＝リサイズが確実に効く）
  attrs += ' width="100%" height="100%" preserveAspectRatio="none"';

  return raw.slice(0, m.index) + `<svg${attrs}>` + raw.slice(m.index + m[0].length);
}

// SVG内の stroke / fill の色（none 以外）を指定色へ一括置換する。単色アイコンの色替え用。
// currentColor もこの色に置き換わる（＝確実に見た目の色が変わる）。
export function recolorSvg(svg: string, color: string): string {
  if (!svg) return svg;
  const replaceAttr = (src: string, attr: string) =>
    src.replace(new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, "gi"), (_m, v: string) => (v.trim().toLowerCase() === "none" ? `${attr}="none"` : `${attr}="${color}"`));
  return replaceAttr(replaceAttr(svg, "stroke"), "fill");
}

// パスSVG（fill/stroke="currentColor"）に CSS linear-gradient を適用して返す。
// グラデ無し（undefined/非対応）ならそのまま返す。表示・書き出しの両方で使う。
// gradientVec は studioExport と同じ規約（objectBoundingBox・y下向き）。
export function applyPathGradient(svg: string, gradient: string | undefined, id: string): string {
  if (!gradient) return svg;
  const angle = Number(/(-?[\d.]+)deg/.exec(gradient)?.[1] ?? "135");
  const colors = gradient.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)/g);
  if (!colors || colors.length < 1) return svg;
  const c1 = colors[0];
  const c2 = colors[1] ?? colors[0];
  const a = ((isFinite(angle) ? angle : 135) * Math.PI) / 180;
  const x = Math.sin(a);
  const y = -Math.cos(a);
  const r = (n: number) => Math.round(n * 1e4) / 1e4;
  const gid = `sg-${id}`;
  const defs = `<defs><linearGradient id="${gid}" x1="${r(0.5 - x / 2)}" y1="${r(0.5 - y / 2)}" x2="${r(0.5 + x / 2)}" y2="${r(0.5 + y / 2)}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`;
  const url = `url(#${gid})`;
  return svg
    .replace(/(<svg\b[^>]*>)/i, `$1${defs}`)
    .replace(/fill="currentColor"/g, `fill="${url}"`)
    .replace(/stroke="currentColor"/g, `stroke="${url}"`);
}
