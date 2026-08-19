// =============================================================================
// PC版のページを元に、SP（スマホ）版のページを自動生成する。
//
// SP版は「同じデータのメディアクエリ違い」ではなく独立したページ（store の altPage）なので、
// ここでは sp 上書きを使わず、PCの実値そのものを 390px 幅向けに書き換える。
// 変換はあくまで“下書き”を作るためのもの。仕上げは手で調整する前提で、
//   ・数値は必ず単調（PCで大きいものがSPで小さくならない）
//   ・情報を消さない（縦積みにするだけ。要素は消さない）
// を守り、驚きの少ない結果になるようにしている。
//
// 呼び出し元：lib/store.ts の setEditing("sp")（初回作成時）と rebuildSpFromPc()。
// =============================================================================

import {
  isAtom,
  isContainer,
  type AlignItems,
  type AtomNode,
  type ContainerNode,
  type ItemProps,
  type JustifyContent,
  type Page,
  type SceneNode,
} from "./types";

export const SP_PREVIEW_W = 390; // SPプレビューの幅（Canvas の 390 と揃える）
const GUTTER = 20; // 画面端に残す左右余白
const CONTENT_W = SP_PREVIEW_W - GUTTER * 2; // 中身に使える幅 = 350
const PC_REF_W = 1280; // PCの想定表示幅。自由配置(absolute)の座標換算に使う
const RATIO = SP_PREVIEW_W / PC_REF_W; // ≒0.305（画面比。はみ出し量や自由配置はこの比で縮める）

const r = (n: number) => Math.round(n);

// --- 数値の縮小ルール ---------------------------------------------------------

// 文字サイズ。15px以下は据え置き、それより大きい分だけを 42% に圧縮して 44px で打ち止め。
// 単調増加なので「PCで大きい見出しがSPで小さくなる」逆転が起きない。
//   96→44 / 64→36 / 48→29 / 32→22 / 24→19 / 20→17 / 16→15
export const spFontSize = (fs: number): number =>
  fs <= 15 ? fs : Math.max(15, Math.min(44, r(15 + (fs - 15) * 0.42)));

const spGap = (g: number) => (g <= 8 ? g : Math.max(8, r(g * 0.55)));
const spPadY = (p: number) => (p <= 24 ? p : Math.max(24, r(p * 0.55))); // 上下余白は約半分（最低24）
const spPadX = (p: number) => Math.min(p, GUTTER); // 左右余白は画面端ガターまで
const spMarginY = (m: number) => (Math.abs(m) <= 8 ? m : r(m * 0.5));
const spMarginX = (m: number) => (Math.abs(m) <= 8 ? m : r(m * RATIO)); // 負のはみ出しは画面比で
const spMinHeight = (h: number) => (h <= 320 ? h : Math.max(320, r(h * 0.6)));

// 各辺の余白＝個別指定 ?? 一括値。SP用に作り直して「一括値なし＋個別指定」に正規化する。
function spPadding(n: ItemProps): Partial<ItemProps> {
  const u = n.padding;
  const T = n.paddingTop ?? u, R = n.paddingRight ?? u, B = n.paddingBottom ?? u, L = n.paddingLeft ?? u;
  if (T == null && R == null && B == null && L == null) return {};
  return {
    padding: undefined,
    paddingTop: T == null ? undefined : spPadY(T),
    paddingRight: R == null ? undefined : spPadX(R),
    paddingBottom: B == null ? undefined : spPadY(B),
    paddingLeft: L == null ? undefined : spPadX(L),
  };
}

function spMargins(n: ItemProps): Partial<ItemProps> {
  const u = n.margin;
  const T = n.marginTop ?? u, R = n.marginRight ?? u, B = n.marginBottom ?? u, L = n.marginLeft ?? u;
  if (T == null && R == null && B == null && L == null) return {};
  return {
    margin: undefined,
    marginTop: T == null ? undefined : spMarginY(T),
    marginRight: R == null ? undefined : spMarginX(R),
    marginBottom: B == null ? undefined : spMarginY(B),
    marginLeft: L == null ? undefined : spMarginX(L),
  };
}

// --- 横並びを縦積みにするかの判定 ---------------------------------------------

const padX = (n: ItemProps) => (n.paddingLeft ?? n.padding ?? 0) + (n.paddingRight ?? n.padding ?? 0);

// その要素が横方向にどれくらい必要かの見積り（px）。SP変換後の値で測る。
// テキストは折り返せるので上限を内容幅に丸める（＝テキスト1つだけで縦積みを強制しない）。
// 1文字あたりの幅の見積り（em）。日本語などの全角は約1em、英数字・記号・半角カナは約0.5em。
// ※ 以前は文字種を問わず一律 0.62em で見積もっていたため、日本語のボタンやナビを
//    「横一列で入る」と誤判定し、SPで画面幅からはみ出すことがあった。
const isFullWidth = (ch: string): boolean => !/[\u0000-\u00ff\uff61-\uff9f]/.test(ch);
const estTextWidth = (body: string, fs: number): number => {
  let em = 0;
  for (const ch of body) em += isFullWidth(ch) ? 1 : 0.5;
  return r(em * fs);
};

function estWidth(n: SceneNode): number {
  const own = (v: number) => (n.basis != null ? Math.max(n.basis, v) : v);
  if (isAtom(n)) {
    if (n.atomType === "text") {
      const body = n.runs?.length ? n.runs.map((x) => x.text).join("") : n.text ?? "";
      const fs = n.style?.fontSize ?? 16;
      return own(Math.min(CONTENT_W, estTextWidth(body.replace(/\s+/g, " ").trim(), fs) + padX(n)));
    }
    return own((n.width ?? 0) + padX(n));
  }
  if (n.width != null) return own(n.width); // box-sizing:border-box なので指定幅がそのまま外寸
  const kids = n.children.filter((c) => !(isAtom(c) && c.free)); // 自由配置はフローの幅に効かない
  if (!kids.length) return own(padX(n));
  if (n.direction === "row" && !n.columns) {
    return own(kids.reduce((a, c) => a + estWidth(c), 0) + n.gap * (kids.length - 1) + padX(n));
  }
  return own(Math.max(...kids.map(estWidth)) + padX(n));
}

// 横並び(row)のとき、SPの内容幅に収まらないなら縦積みにする。多段組(columns)は必ず1列にする。
function shouldStack(n: ContainerNode, kids: SceneNode[]): boolean {
  if (n.direction !== "row") return false;
  if (n.columns && n.columns > 1) return true;
  if (kids.length < 2) return false;
  const need = kids.reduce((a, c) => a + estWidth(c), 0) + n.gap * (kids.length - 1) + padX(n);
  return need > CONTENT_W;
}

// 縦積みに変えると主軸と交差軸が入れ替わるので、揃えも入れ替えて意図を引き継ぐ。
//   旧 justify（横の揃え）→ 新 align（横の揃え）
//   旧 align（縦の揃え）  → 新 justify（縦の揃え）
// 例：中央寄せの横並び → 中央寄せの縦積み／両端揃え → 全幅(stretch)。
const JUSTIFY_TO_ALIGN: Record<JustifyContent, AlignItems> = {
  "flex-start": "flex-start",
  center: "center",
  "flex-end": "flex-end",
  "space-between": "stretch",
  "space-around": "stretch",
};
const ALIGN_TO_JUSTIFY: Record<AlignItems, JustifyContent> = {
  "flex-start": "flex-start",
  center: "center",
  "flex-end": "flex-end",
  stretch: "flex-start",
};

// 縦積み後の横の揃え。多段組(columns)や伸縮指定のある並びは「等幅の列」だったので全幅(stretch)にする。
// それ以外（ボタン2つを中央に並べた等）は元の横の揃えをそのまま引き継ぐ。
const stackAlign = (n: ContainerNode, kids: SceneNode[]): AlignItems =>
  n.columns || kids.some((k) => k.grow || k.basis != null) ? "stretch" : JUSTIFY_TO_ALIGN[n.justify] ?? "stretch";

// 縦積みにした親の子から、横並び前提の指定を外す。
// basis は縦積みでは「高さ」になってしまい、grow も縦に伸びるだけなので落とす。
const asStackedItem = <T extends SceneNode>(n: T): T => ({
  ...n,
  basis: undefined,
  grow: undefined,
  breakAfter: undefined,
});

// --- 変換本体 -----------------------------------------------------------------

// ノード自身のプロパティを、入れ子（style / runs / points / bgPattern / bgImage / sp）まで作り直す。
// children は呼び出し側で作り直すのでここでは触らない。
// ★浅いコピーのままだと、元のページとSP版がこれらのオブジェクトを共有し、
//   片方を直すともう片方まで変わってしまう。
const ownDeep = <T extends SceneNode>(n: T): T => {
  const { children, ...rest } = n as T & { children?: SceneNode[] };
  const copy = (typeof structuredClone === "function" ? structuredClone(rest) : JSON.parse(JSON.stringify(rest))) as T;
  return children ? ({ ...copy, children } as T) : copy;
};

// 1ノードをSP用に作り直す。null を返したら「SP版には持ち込まない」。
// ※ 返り値は必ず新しいオブジェクト（style 等の入れ子も作り直す）。
//    clonePage() の複製は浅いコピーなので、その場で書き換えるとPC版まで壊れる。
function convertNode(n: SceneNode): SceneNode | null {
  if (n.sp?.hidden) return null; // PC側で「SPでは非表示」にしていたものは最初から入れない

  if (isAtom(n)) {
    const out: AtomNode = { ...ownDeep(n), ...spPadding(n), ...spMargins(n) };
    delete out.sp; // 独立ページなのでレスポンシブ上書きは不要
    delete out.hiddenPc; // 「SPのみ表示」だった要素はSP版では普通に表示する
    if (n.style?.fontSize != null) {
      const fs = spFontSize(n.style.fontSize);
      const k = fs / n.style.fontSize;
      const ls = n.style.letterSpacing;
      out.style = { ...n.style, fontSize: fs, letterSpacing: ls != null && Math.abs(ls) >= 1 ? r(ls * k) : ls };
    }
    if (n.free) {
      // 自由配置：位置もサイズも画面比で縮める（PC内での相対位置・相対サイズを保つ）
      if (n.x != null) out.x = r(n.x * RATIO);
      if (n.y != null) out.y = r(n.y * RATIO);
      if (n.width != null) out.width = Math.max(8, r(n.width * RATIO));
      if (n.height != null) out.height = Math.max(8, r(n.height * RATIO));
    } else if (n.atomType !== "text" && n.width != null && n.width > CONTENT_W) {
      // 画像・SVGが内容幅より広い：縦横比を保って収める
      const k = CONTENT_W / n.width;
      out.width = CONTENT_W;
      if (n.height != null) out.height = Math.max(1, r(n.height * k));
    }
    if (n.basis != null && n.basis > CONTENT_W) out.basis = undefined;
    return out;
  }

  // コンテナ：先に子を変換し、その結果の見積り幅で自分の向きを決める（＝内側から順に確定）
  const kids = n.children.map(convertNode).filter((c): c is SceneNode => c !== null);
  const out: ContainerNode = {
    ...ownDeep(n),
    children: kids,
    gap: spGap(n.gap),
    ...spPadding(n),
    ...spMargins(n),
  };
  delete out.sp;
  delete out.hiddenPc;
  if (n.minHeight != null) out.minHeight = spMinHeight(n.minHeight);
  if (n.width != null && n.width > CONTENT_W) out.width = undefined; // 入らない固定幅は外して伸縮させる
  if (n.basis != null && n.basis > CONTENT_W) out.basis = undefined;

  if (shouldStack(out, kids)) {
    out.direction = "column";
    out.align = stackAlign(out, kids); // ← basis/grow を落とす前に決める
    out.justify = ALIGN_TO_JUSTIFY[n.align] ?? "flex-start";
    out.wrap = undefined;
    out.columns = undefined;
    out.children = kids.map(asStackedItem);
  }
  return out;
}

// PC版ページ → SP版ページ。呼び出し側で複製（clonePage）済みのページを渡すこと。
export function adaptPageToSp(page: Page): Page {
  return {
    ...page,
    children: page.children
      .map(convertNode)
      .filter((c): c is ContainerNode => c !== null && isContainer(c)),
  };
}
