// =============================================================================
// design-sync のコアデータモデル（ツリー構造）
//   Page → Section[] → (Group/Component)[] → Atom
// プレビューはこのツリーだけから描画され、データ＝見た目を100%一致させる。
// コンテナ(Section/Group)は Flexbox の制約（縦横・揃え・余白）を保持し、
// Atom(text/image/svg) が最小単位の中身を持つ。
// =============================================================================

export type Mode = "admin" | "client";

// --- コンテナ（Section / Group）が持つ Flexbox レイアウト規則 ---
export type FlexDirection = "row" | "column";
export type JustifyContent =
  | "flex-start"
  | "center"
  | "flex-end"
  | "space-between"
  | "space-around";
export type AlignItems = "flex-start" | "center" | "flex-end" | "stretch";
// 親コンテナ内での“自分だけ”の揃え（align-self）。制約を保ったまま位置を寄せられる。
export type AlignSelf = "auto" | "flex-start" | "center" | "flex-end" | "stretch";

// 背景パターン（ノート風の方眼/罫線/ドット）。線の色・間隔を自由に指定できる。
// 実際の描画は background（単色ベース）の上にこのパターンを重ねて合成する（lib/patterns.ts）。
export type BgPatternKind = "grid" | "ruled" | "dot";
export interface BgPattern {
  kind: BgPatternKind;
  color: string; // 線/ドットの色
  size?: number; // マス目/間隔(px)。未指定は種類ごとの既定値
}

// 背景画像（ヒーローの全画面写真など）。background（単色ベース）の上に敷く。
export interface BgImage {
  src: string; // 画像URL / データURL
  fit?: "cover" | "contain"; // 既定 cover（全面を覆う）
  overlay?: number; // 上に重ねる黒の不透明度 0〜1（文字を読みやすくする。未指定=なし）
  scale?: number; // 拡大縮小（1=等倍・既定。1.2で20%拡大／0.8で縮小）
  flipH?: boolean; // 水平反転（左右）
  flipV?: boolean; // 垂直反転（上下）
}

export interface LayoutRules {
  direction: FlexDirection;
  justify: JustifyContent;
  align: AlignItems;
  gap: number; // 子要素の間隔(px)
  background?: string; // 背景色（任意・単色ベース）
  bgPattern?: BgPattern; // 背景パターン（任意）。background の上に重ねる
  bgImage?: BgImage; // 背景画像（任意）。background の上に敷く（全画面写真など）
  fullHeight?: boolean; // 画面の高さいっぱい（min-height:100vh）。ヒーロー等の全画面表示用
  radius?: number; // 角丸(px)（カード/ボタン表現用・任意）
  grow?: boolean; // flex:1 で伸ばすか（横並びカードの均等割り等）
  wrap?: boolean; // flex-wrap: wrap（はみ出たら自動で折り返す）
  columns?: number; // 1行あたりの枚数。指定すると子を等幅にし、N枚ごとに折り返す（row方向・wrap前提）
  width?: number; // 幅(px)。指定するとその幅に固定（未指定=自動＝親に合わせて伸縮）
  minHeight?: number; // 最小の高さ(px)。セクション等の大きさ調整に使う（中身が増えれば伸びる）
  // 最上位セクションの中身の寄せ方（フルブリード時）："center"=中央(既定) / "left"=常に画面左に寄せる。
  // 背景は常に全幅。left のときは中身(最大幅)を左端ガターに固定する。
  contentAlign?: "center" | "left";
  // 枠線・影（カード表現用）
  borderWidth?: number;
  borderColor?: string;
  boxShadow?: string; // CSS box-shadow（プリセットから選択）
}

// flexアイテムとしての共通プロパティ（コンテナ・Atom双方が持つ）
export interface ItemProps {
  boxShadow?: string; // 影（CSS box-shadow）。Atom（画像/SVG）の影オン/オフに使う。未指定=なし
  opacity?: number; // 不透明度 0〜1（未指定/1＝不透明）。コンテナ・Atom双方で使える
  alignSelf?: AlignSelf; // 親の中での自分の揃え
  basis?: number; // flex-basis(px)。折り返しの基準幅。未指定=auto
  breakAfter?: boolean; // この要素の後で強制的に折り返す（親がwrapのとき有効）
  // 余白（px）。各辺= 個別指定 ?? 一括値。一括値は後方互換のため残す。
  padding?: number; // 内側余白の一括値
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  margin?: number; // 外側余白の一括値。自由配置(absolute)には効かない
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  sp?: SpOverride; // SP（スマホ）表示だけの上書き。未指定はPC値を継承。
  hiddenPc?: boolean; // PC（デスクトップ）で非表示＝SPのみ表示（例：ハンバーガー）。
}

// SP（スマホ表示）だけの上書き値。未指定の項目はPC値を継承。
// ＝レスポンシブ：1つのデータで PC/SP 両対応（書き出しはメディアクエリ）。
export interface SpOverride {
  hidden?: boolean; // SPで非表示
  // テキスト
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  align?: "left" | "center" | "right";
  // コンテナ（reverse で並び順も反転できる：写真→文字に揃える等）
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  justify?: JustifyContent;
  alignItems?: AlignItems;
  gap?: number;
  // 余白（両方）：一括 or 左右/上下だけ
  padding?: number;
  paddingX?: number;
  paddingY?: number;
  // アイテム
  width?: number;
  basis?: number | "auto"; // flex-basis（縦積み時は高さ）。"auto"で内容に合わせる
  minHeight?: number; // 最小の高さ（写真バナー等）
  alignSelf?: AlignSelf; // 親内での自分の寄せ（ボタンを全幅にする等）
}

export type ContainerType = "section" | "group";

export interface ContainerNode extends LayoutRules, ItemProps {
  id: string;
  type: ContainerType;
  name: string;
  children: SceneNode[];
}

// --- Atom（最小単位） ---
export type AtomType = "text" | "image" | "svg";

export interface TextStyle {
  color?: string;
  fontSize?: number; // px
  fontWeight?: number; // 400/600/700/800 等
  align?: "left" | "center" | "right";
  fontFamily?: string; // フォントid（lib/fonts.ts の FontId）。未指定=標準
  lineHeight?: number; // 行間（倍率。例 1.6）。未指定=ブラウザ既定
  letterSpacing?: number; // 文字間隔(px。負も可)。未指定=0
  preserveBreaks?: boolean; // 改行を反映するか。未指定/true=反映(pre-wrap)、false=改行を無視して詰める(normal)
  // 枠線（テキストを囲む）
  borderWidth?: number; // px（0/未指定=なし）
  borderColor?: string;
  borderRadius?: number; // px（角丸）
}

// 文章内の色付き区間（一部分だけ色を変える）。runs があれば text より優先して描画。
export interface TextRun {
  text: string;
  color?: string; // 未指定＝基本色(style.color)を継承
}

export interface AtomNode extends ItemProps {
  id: string;
  type: "atom";
  atomType: AtomType;
  name: string;
  // 中身（atomType により使うフィールドが変わる）
  text?: string; // text（プレーン。runs 未指定時の内容）
  runs?: TextRun[]; // text の色付き区間（一部分だけ色変更）。あれば優先
  src?: string; // image のURL
  alt?: string; // image の代替テキスト
  maskShape?: string; // image を図形で切り抜くプリセットキー（lib/mask.ts の MASK_SHAPES）
  maskSvg?: string; // image を任意SVGで切り抜く（生コード。maskShape より優先）
  svg?: string; // svg の生コード（Figma等からのエクスポート）
  width?: number; // image/svg の幅(px)
  height?: number; // image/svg の高さ(px)
  points?: PathNode[]; // パス変形（頂点編集）用。svg atom を編集可能パスにしたときの点列（ローカル座標 0..width/height）
  closed?: boolean; // パスが閉じているか（塗り）／開いているか（線）
  style?: TextStyle; // text の装飾
  grow?: boolean; // 親Flex内で伸ばすか
  // 自由配置（absolute）。true のとき Flex フローから外れ、親コンテナ基準で x,y に置く。
  free?: boolean;
  x?: number; // free時の横位置(px)
  y?: number; // free時の縦位置(px)
  front?: boolean; // free時に本文より前面に出す（既定は背面＝背景）
}

export type SceneNode = ContainerNode | AtomNode;

export interface Page {
  id: string;
  name: string;
  children: ContainerNode[]; // トップレベルは Section
}

// 保存済みページの種別：再利用する「テンプレート」か、実案件の「クライアント」か。
// クライアントモード（非管理者）ではテンプレートのみ見え、他社の案件は隠れる。
export type TemplateKind = "template" | "client";

// 保存済みページテンプレート（スナップショット）。テンプレート画面で管理。
export interface PageTemplate {
  id: string;
  name: string;
  kind?: TemplateKind; // 未指定は "template" 扱い（後方互換）
  page: Page; // PC版。適用時に複製して作業ページへ読み込む
  spPage?: Page | null; // SP版（あれば）。適用時に一緒に復元する
  updatedAt?: number; // 最終更新日時（epoch ms）。保存・上書き・名称/種別変更・自動保存で更新
}

// 型ガード
export const isContainer = (n: SceneNode): n is ContainerNode => n.type !== "atom";
export const isAtom = (n: SceneNode): n is AtomNode => n.type === "atom";

// --- 余白の解決（上下左右） ---
// 各辺 = 個別指定 ?? 一括値。すべて未指定なら undefined（＝CSSに出さない）。
function spacingCss(u?: number, t?: number, r?: number, b?: number, l?: number): string | undefined {
  const T = t ?? u, R = r ?? u, B = b ?? u, L = l ?? u;
  if (T == null && R == null && B == null && L == null) return undefined;
  return `${T ?? 0}px ${R ?? 0}px ${B ?? 0}px ${L ?? 0}px`;
}
export const paddingCss = (n: ItemProps): string | undefined =>
  spacingCss(n.padding, n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft);
export const marginCss = (n: ItemProps): string | undefined =>
  spacingCss(n.margin, n.marginTop, n.marginRight, n.marginBottom, n.marginLeft);

// =============================================================================
// ① 管理者用アセットライブラリ：Figma等からのSVG生コード／画像URLを素材として登録
// =============================================================================
export interface AssetItem {
  id: string;
  name: string;
  kind: "svg" | "image";
  svg?: string; // kind==="svg" のとき：SVGの生コード
  src?: string; // kind==="image" のとき：画像URL
  tags: string[]; // 検索・分類用
}

// アプリ内の画面（管理者/クライアントで出し分け）
export type View = "builder" | "assets" | "studio" | "templates";

// =============================================================================
// ② 管理者用スタジオ（Component Studio）
//   Figmaライクな自由配置キャンバス。基本図形・テキスト・SVGを絶対座標で重ね、
//   カスタムコンポーネントを作る。ビルダーのツリー(SceneNode)とは別の平坦モデル。
//   ※ すべて標準DOM(HTML/CSS)で描画（Canvas APIは使わない）。
// =============================================================================
export type StudioElementType = "rectangle" | "circle" | "text" | "image" | "svg";

export interface StudioStyle {
  backgroundColor: string; // 単色の塗り
  backgroundGradient?: string; // 指定時は塗りをこれで上書き（例: linear-gradient(...)）
  color?: string; // テキストの文字色 / SVG の currentColor
  opacity: number; // 0〜1
  borderRadius: number; // px（円は 50% を強制）
  boxShadow?: string; // CSS box-shadow（プリセットから選択）
  zIndex: number; // 重なり順（配列順と常に同期させる）
  // --- 仕様の必須項目に加えた、テキストを実用にするための任意項目 ---
  fontSize?: number; // px（text）
  fontWeight?: number; // 400/600/700 等（text）
  textAlign?: "left" | "center" | "right"; // text の揃え
}

// 曲線ツール（パス変形）のアンカー点。ベジェハンドルは持たせず、
// isCorner で「角（角ばった点）」か「曲線（滑らかな点）」かを切り替える。
export type PathNode = {
  id: string;
  x: number; // キャンバス絶対座標
  y: number;
  isCorner: boolean; // true=角（角ばる）, false=曲線（滑らか）
};

export interface StudioElement {
  id: string;
  type: StudioElementType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: StudioStyle;
  content: string; // text=本文 / image=URL / svg=生コード（図形は未使用）
  maskShape?: string; // image を図形で切り抜くプリセットキー（lib/mask.ts の MASK_SHAPES）
  maskSvg?: string; // image を任意SVGで切り抜く（生コード。maskShape より優先）
  // --- 曲線ツール（パス変形）用（type==="svg" のうち編集可能なパスのみ） ---
  // 輪郭を表す点列。存在すれば曲線ツールの編集対象になる。
  points?: PathNode[];
  closed?: boolean; // 閉じたパス（塗り）か、開いたパス（線）か
  // 同じ groupId を持つ要素は1つのグループ（まとめて選択・移動・書き出し）。
  groupId?: string;
}
