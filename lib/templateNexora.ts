// テンプレート：近未来バトルアクションRPG『NEXORA PROJECT』の公式サイト風LP。
// 支給された参考デザインに準拠して構成・配色・文言を組んでいる（架空タイトルのサンプル）。
//
// レイアウトの型：
//   ①ヘッダー＝黒帯。ロゴ左／ナビ中央（日本語＋英字の2段）／右にネオンの「今すぐ登録」
//   ②ヒーロー＝キービジュアル全面。左に大見出し（2行目だけネオン）・リード・2ボタン・スライドドット
//   ③以降は 02〜06 の連番セクション。淡いグレー地に「黒パネル＋コンテンツ」を左右に組む
//     ・02 キャラクター＝黒パネル／立ち絵＋プロフィールカード／下にサムネイル列
//     ・03 映像資料＝大サムネイル／黒パネル／下に4本のサムネイル（尺つき）
//     ・04 ニュース＝黒パネル／記事カード＋ページドット
//     ・05 世界観＝黒パネル／エリア3枚
//     ・06 ゲームの特徴＝全面ダーク。大ビジュアル＋アイコン4つ
//   ④フッター＝黒。TOPボタン／SNS／メルマガ登録／WISHLISTボタン／規約リンク
//   ※ セクションの境目に入る「フィルムの縁（黒帯＋白いコマ穴）」は filmStrip() で再現している。
//     参考デザインの斜めカットは Flexbox では表現できないため、角丸を小さくして質感を寄せている。
// 配色：ほぼ黒 × ネオンイエローグリーン1色。淡いグレー地とのコントラストでメリハリを出す。
// 画像はすべて差し替え前提のプレースホルダー（キービジュアル・立ち絵・映像サムネ・エリア・特徴）。

import type { PageTemplate, Page, SceneNode, ContainerNode, AtomNode, TextStyle } from "./types";

// --- カラー（黒 × ネオンイエローグリーン） ---
const NEON = "#d9f000";     // キーカラー（CTA・番号・強調）
const BLACK = "#0b0b0b";    // 基本の黒
const BLACK_2 = "#141414";  // パネル・カードの黒
const BLACK_3 = "#1e1e1e";  // 枠線・区切り（黒地の上）
const PAGE = "#f1f1f1";     // セクションの淡いグレー地
const PAGE_2 = "#ffffff";   // カードの白
const WHITE = "#ffffff";
const ON_DARK = "#a6a6a6";  // 黒地の上の補助テキスト
const ON_DARK_D = "#6e6e6e";// 黒地の上の注記
const INK = "#111111";      // 淡色地の見出し
const SUB = "#5f5f5f";      // 淡色地の本文
const LINE_L = "#dcdcdc";   // 淡色地の枠線

// --- フォント ---
const JP = "sans";     // 日本語（Noto Sans JP）。見出しは 800 で締める
const EN = "inter";    // 英字ラベル・番号（Inter）

const SH_CARD = "0 18px 40px -24px rgba(0,0,0,0.55)";
const SH_NEON = "0 10px 26px -12px rgba(217,240,0,0.55)";

let k = 0;
const uid = (p: string) => `t-nxr-${p}${++k}`;

// --- 基本パーツ ---
const txt = (text: string, style: TextStyle, item: Partial<AtomNode> = {}): AtomNode => ({
  id: uid("t"), type: "atom", atomType: "text", name: text.slice(0, 10) || "テキスト", text, style, ...item,
});
// 日本語見出し（太いゴシック）
const jtxt = (text: string, fontSize: number, color = WHITE, extra: Partial<TextStyle> = {}): AtomNode =>
  txt(text, { fontSize, fontWeight: 800, color, fontFamily: JP, align: "left", lineHeight: 1.5, ...extra });
// 英字ラベル（字間を広く）
const en = (text: string, color = NEON, fontSize = 10, extra: Partial<TextStyle> = {}): AtomNode =>
  txt(text, { fontSize, fontWeight: 700, color, fontFamily: EN, letterSpacing: 2.4, align: "left", ...extra });
// 本文
const body = (text: string, color = ON_DARK, fontSize = 12.5, extra: Partial<TextStyle> = {}): AtomNode =>
  txt(text, { fontSize, fontWeight: 400, color, lineHeight: 1.95, align: "left", ...extra });

const icon = (paths: string, color = NEON, size = 20, fill = "none"): AtomNode => ({
  id: uid("s"), type: "atom", atomType: "svg", name: "アイコン", width: size, height: size,
  svg: `<svg viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`,
});

function box(p: Partial<ContainerNode> & { children: SceneNode[] }): ContainerNode {
  return {
    id: uid("c"), type: "group", name: p.name ?? "グループ",
    direction: p.direction ?? "column", justify: p.justify ?? "flex-start", align: p.align ?? "stretch",
    gap: p.gap ?? 12, ...p,
  };
}

const P = {
  logo: '<path d="M4 20V4l16 16V4"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  arrowL: '<path d="m15 18-6-6 6-6"/>',
  arrowR: '<path d="m9 18 6-6-6-6"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  sword: '<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/>',
  grow: '<path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15"/><path d="M15 6v15"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  steam: '<circle cx="12" cy="12" r="10"/><circle cx="15" cy="9" r="2.6"/><path d="m2.5 15.5 6 2.4"/>',
  x: '<path d="M4 4l16 16"/><path d="M20 4 4 20"/>',
  youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><polygon points="10 9 15 12 10 15"/>',
  discord: '<path d="M8 12h.01"/><path d="M16 12h.01"/><path d="M7.5 7.5A14 14 0 0 1 12 7a14 14 0 0 1 4.5.5l1.5 3a12 12 0 0 1 .5 6l-2.5 2-1-2a10 10 0 0 1-6 0l-1 2-2.5-2a12 12 0 0 1 .5-6z"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17 7h.01"/>',
  tiktok: '<path d="M14 4v10.5a3.5 3.5 0 1 1-3-3.46"/><path d="M14 4c.5 2.5 2 4 4.5 4.2"/>',
};

// 差し替え前提の画像枠（ダーク基調）
const art = (minHeight: number, caption: string, extra: Partial<ContainerNode> = {}): ContainerNode =>
  box({
    name: `画像枠：${caption || "画像"}`,
    background: "linear-gradient(145deg,#26262b 0%,#17171b 55%,#2b2530 100%)",
    radius: 6, minHeight, align: "center", justify: "center", gap: 8, children: [
      icon(P.image, "#5a5a62", 22),
      ...(caption ? [txt(caption, { fontSize: 9.5, fontWeight: 700, color: "#77777f", fontFamily: EN, letterSpacing: 1.2, align: "center" })] : []),
    ],
    ...extra,
  });

// フィルムの縁（黒帯＋白いコマ穴）。参考デザインのセクション境界の質感。
const filmStrip = (holes = 26): ContainerNode =>
  box({
    name: "フィルムの縁", background: BLACK, direction: "row", justify: "space-between", align: "center",
    paddingTop: 7, paddingBottom: 7, paddingLeft: 10, paddingRight: 10, gap: 6, alignSelf: "stretch", wrap: false,
    children: Array.from({ length: holes }, () =>
      box({ name: "コマ穴", background: WHITE, radius: 2, minHeight: 9, grow: true, children: [] })),
  });

// 連番つき見出し（大きなネオンの番号＋日本語＋英字）
const numHead = (no: string, jp: string, label: string): ContainerNode =>
  box({ name: `見出し：${jp}`, direction: "row", align: "center", gap: 16, children: [
    txt(no, { fontSize: 52, fontWeight: 800, color: NEON, fontFamily: EN, letterSpacing: -1, align: "left" }),
    box({ gap: 3, children: [jtxt(jp, 21, WHITE, { letterSpacing: 1 }), en(label)] }),
  ] });

// ネオンのボタン（塗り）
const btnNeon = (label: string, sub?: string, size: "lg" | "md" = "md"): ContainerNode =>
  box({
    name: `ボタン：${label}`, background: NEON, radius: 4, direction: "row", align: "center", justify: "space-between",
    gap: 14, alignSelf: "flex-start", boxShadow: SH_NEON,
    paddingTop: size === "lg" ? 15 : 11, paddingBottom: size === "lg" ? 15 : 11,
    paddingLeft: size === "lg" ? 26 : 20, paddingRight: size === "lg" ? 20 : 16,
    children: [
      box({ gap: 1, children: [
        txt(label, { fontSize: size === "lg" ? 15 : 13, fontWeight: 800, color: INK, fontFamily: JP, letterSpacing: 0.6, align: "left" }),
        ...(sub ? [txt(sub, { fontSize: 8, fontWeight: 700, color: "#4c5400", fontFamily: EN, letterSpacing: 1.6, align: "left" })] : []),
      ] }),
      icon(P.arrow, INK, size === "lg" ? 17 : 15),
    ],
  });

// 枠線のボタン（黒地／淡色地の両方で使えるよう色を渡す）
const btnLine = (label: string, sub?: string, color = WHITE, border = "#4a4a4a", bg?: string): ContainerNode =>
  box({
    name: `ボタン：${label}`, background: bg, radius: 4, borderWidth: 1, borderColor: border,
    direction: "row", align: "center", justify: "space-between", gap: 14, alignSelf: "flex-start",
    paddingTop: 11, paddingBottom: 11, paddingLeft: 20, paddingRight: 16,
    children: [
      box({ gap: 1, children: [
        txt(label, { fontSize: 13, fontWeight: 700, color, fontFamily: JP, letterSpacing: 0.6, align: "left" }),
        ...(sub ? [txt(sub, { fontSize: 8, fontWeight: 700, color: color === WHITE ? ON_DARK_D : "#9a9a9a", fontFamily: EN, letterSpacing: 1.6, align: "left" })] : []),
      ] }),
      icon(P.arrow, color, 15),
    ],
  });

// 黒パネル（02〜05 の左側に置く見出しブロック）
const panel = (children: SceneNode[], extra: Partial<ContainerNode> = {}): ContainerNode =>
  box({ background: BLACK_2, radius: 6, padding: 34, gap: 20, boxShadow: SH_CARD, children, ...extra });

function buildPage(): Page {
  // ===== ヘッダー =====
  const navItem = (jp: string, label: string, active = false): ContainerNode =>
    box({ name: `ナビ：${jp}`, gap: 3, align: "center", children: [
      txt(jp, { fontSize: 12, fontWeight: 700, color: active ? NEON : WHITE, fontFamily: JP, align: "center" }),
      txt(label, { fontSize: 7.5, fontWeight: 700, color: active ? NEON : ON_DARK_D, fontFamily: EN, letterSpacing: 1.4, align: "center" }),
      ...(active ? [box({ background: NEON, minHeight: 2, radius: 2, alignSelf: "stretch", children: [] })] : []),
    ] });
  const header = box({
    name: "ヘッダー", background: BLACK, direction: "row", justify: "space-between", align: "center", gap: 20,
    paddingTop: 12, paddingBottom: 12, paddingLeft: 26, paddingRight: 26,
    children: [
      box({ name: "ロゴ", direction: "row", align: "center", gap: 9, children: [
        box({ background: NEON, radius: 4, direction: "row", align: "center", justify: "center",
          paddingTop: 5, paddingBottom: 5, paddingLeft: 5, paddingRight: 5, children: [icon(P.logo, INK, 16)] }),
        box({ gap: 0, children: [
          txt("NEXORA", { fontSize: 17, fontWeight: 800, color: WHITE, fontFamily: EN, letterSpacing: 1.6, align: "left" }),
          txt("PROJECT", { fontSize: 8, fontWeight: 700, color: ON_DARK, fontFamily: EN, letterSpacing: 3.4, align: "left" }),
        ] }),
      ] }),
      box({ name: "ナビ", direction: "row", align: "center", gap: 26, wrap: true, children: [
        navItem("ホーム", "HOME", true), navItem("キャラクター", "CHARACTERS"), navItem("映像資料", "VIDEO"),
        navItem("世界観", "WORLD"), navItem("ニュース", "NEWS"), navItem("ゲームの特徴", "FEATURES"),
      ] }),
      { ...btnNeon("今すぐ登録", "REGISTER NOW"), alignSelf: "center" } as ContainerNode,
    ],
  });

  // ===== ヒーロー =====
  const dot = (on = false): ContainerNode =>
    box({ name: "スライド位置", background: on ? NEON : "#4a4a4a", radius: 2, width: on ? 26 : 14, minHeight: 3, children: [] });
  const hero = box({
    name: "ヒーロー", background: "linear-gradient(105deg, #0b0b0b 0%, #131318 38%, #2a2333 66%, #1b2430 100%)",
    paddingTop: 64, paddingBottom: 40, paddingLeft: 26, paddingRight: 26, minHeight: 560, align: "stretch", gap: 22,
    children: [
      box({ name: "ヒーロー本体", direction: "row", align: "center", gap: 30, wrap: true, alignSelf: "stretch", children: [
        box({ name: "左：コピー", gap: 20, grow: true, basis: 330, children: [
          box({ gap: 2, children: [
            jtxt("未来は、", 38, WHITE, { letterSpacing: 1.5, lineHeight: 1.35 }),
            jtxt("選ぶ者の手に。", 38, NEON, { letterSpacing: 1.5, lineHeight: 1.35 }),
            jtxt("戦え、希望のために。", 38, WHITE, { letterSpacing: 1.5, lineHeight: 1.35 }),
          ] }),
          body("近未来バトルアクションRPG\n「NEXORA PROJECT」始動。", ON_DARK, 13, { lineHeight: 1.9 }),
          box({ name: "ヒーローCTA", direction: "row", gap: 12, wrap: true, marginTop: 6, children: [
            btnNeon("今すぐ登録", "REGISTER NOW", "lg"),
            btnLine("PVを見る", "WATCH TRAILER", WHITE, "#4a4a4a"),
          ] }),
        ] }),
        art(420, "KEY VISUAL（主人公と仲間たち）", { grow: true, basis: 420, radius: 8 }),
      ] }),
      box({ name: "スライドドット", direction: "row", gap: 8, align: "center", children: [dot(true), dot(), dot(), dot()] }),
    ],
  });

  // ===== 02 キャラクター紹介 =====
  // 参考デザインに合わせた構成：
  //   ・左＝黒パネル。右端を clip-path で斜めに切り落とし、明るい地との「斜め分割」を作る
  //   ・中央＝立ち絵。負のマージンで黒パネルに食い込ませ、境界をまたがせる（透過PNG前提）
  //   ・右＝明るい地の上にプロフィール（名前／英字／属性ピル／説明／ボタン）
  //   ・下＝サムネイル5枚。選択中だけネオンの枠。左右に丸い矢印
  //   ・左下＝フィルムの縁の断片（斜めに切って重ねる）
  const SLANT = "polygon(0 0, 100% 0, 62% 100%, 0 100%)"; // 右端が斜め（下ほど短い）＝立ち絵が乗る余地を作る
  const thumb = (label: string, on = false): ContainerNode =>
    art(78, "", {
      name: `サムネ：${label}`, grow: true, basis: 104, radius: 5,
      borderWidth: on ? 2 : 0, borderColor: on ? NEON : undefined,
      boxShadow: on ? SH_NEON : SH_CARD,
    });
  const navArrow = (dir: "L" | "R"): ContainerNode =>
    box({
      name: `矢印${dir}`, background: BLACK, radius: 999, alignSelf: "center",
      direction: "row", align: "center", justify: "center", padding: 9,
      children: [icon(dir === "L" ? P.arrowL : P.arrowR, WHITE, 15)],
    });
  const characters = box({
    name: "02 キャラクター紹介", background: PAGE_2, overflow: "hidden", // 立ち絵のはみ出しを端で断ち切る
    paddingTop: 0, paddingBottom: 26, paddingLeft: 0, paddingRight: 0, gap: 0, minHeight: 480,
    children: [
      box({ name: "上段", direction: "row", align: "stretch", gap: 0, alignSelf: "stretch", children: [
        // 左：黒パネル（右端を斜めに）
        box({
          name: "見出しパネル（斜めカット）", background: BLACK, clipPath: SLANT,
          grow: true, basis: 340, gap: 18, justify: "center",
          paddingTop: 40, paddingBottom: 40, paddingLeft: 34, paddingRight: 120,
          children: [
            box({ name: "連番見出し", direction: "row", align: "center", gap: 14, children: [
              txt("02", { fontSize: 62, fontWeight: 800, color: NEON, fontFamily: EN, letterSpacing: -2, align: "left" }),
              box({ gap: 4, children: [
                jtxt("キャラクター紹介", 22, WHITE, { letterSpacing: 1 }),
                en("CHARACTERS", NEON, 12),
              ] }),
            ] }),
            jtxt("個性豊かな仲間たちと、\n未知の戦場へ。", 15, WHITE, { lineHeight: 2 }),
            { ...btnLine("すべてのキャラクターを見る", undefined, WHITE, "#4a4a4a"), radius: 6 } as ContainerNode,
          ],
        }),
        // 中央：立ち絵。バストアップを主役にするため、四方へ大きくはみ出させる。
        //   高さ720に対し上-130／下-150 のはみ出し＝実効の占有は約440。差分がセクション外へ出て、
        //   overflow:hidden により「頭頂が上端で断ち切られ、体は下のサムネイル列の背後へ抜ける」
        //   という参考デザインの構図になる。左は-260で黒パネルの斜め境界に深く食い込ませる。
        //   ※ DOM順で後に来るサムネイル列が手前に描画されるため、体はその背後に回る。
        art(720, "CHARACTER ART（透過PNG・バストアップ）", {
          name: "立ち絵", grow: true, basis: 520, radius: 0, background: "transparent",
          alignSelf: "stretch", marginLeft: -330, marginRight: -40, marginTop: -130, marginBottom: -150,
          zIndex: 1, // 黒パネル(既定)より手前・サムネイル列(2)より背面
        }),
        // 右：プロフィール
        box({
          name: "プロフィール", grow: true, basis: 250, gap: 12, justify: "center",
          paddingTop: 40, paddingBottom: 40, paddingLeft: 8, paddingRight: 34,
          children: [
            jtxt("レイナ・クロノス", 26, INK, { letterSpacing: 0.5 }),
            txt("REINA CHRONOS", { fontSize: 12, fontWeight: 500, color: "#8a8a8a", fontFamily: EN, letterSpacing: 2.4, align: "left" }),
            // 属性ピル（枠線のみ）
            box({
              name: "属性", background: PAGE_2, radius: 999, borderWidth: 1, borderColor: "#c9c9c9", alignSelf: "flex-start",
              direction: "row", align: "center", justify: "center", paddingTop: 5, paddingBottom: 5, paddingLeft: 14, paddingRight: 14,
              children: [txt("アサルト / ASSAULT", { fontSize: 11, fontWeight: 600, color: "#4a4a4a", fontFamily: JP, letterSpacing: 0.6, align: "center" })],
            }),
            body("剣閃機構の力を持つエリート。\n冷静沈着だが、仲間を思う熱い心の持ち主。", SUB, 12, { lineHeight: 2 }),
            { ...btnLine("プロフィールを見る", undefined, INK, "#c9c9c9", PAGE_2), radius: 6, marginTop: 4 } as ContainerNode,
          ],
        }),
      ] }),
      // 下段：サムネイル列（左にフィルムの縁の断片）
      box({ name: "下段", direction: "row", align: "center", gap: 0, alignSelf: "stretch", children: [
        { ...filmStrip(5), clipPath: "polygon(0 0, 100% 0, 62% 100%, 0 100%)", width: 150, alignSelf: "stretch", gap: 4, zIndex: 2 } as ContainerNode,
        box({ name: "サムネイル列", direction: "row", align: "center", gap: 12, grow: true, zIndex: 2, paddingLeft: 14, paddingRight: 20, children: [
          navArrow("L"),
          thumb("主人公"), thumb("レイナ", true), thumb("キャラ3"), thumb("キャラ4"), thumb("キャラ5"),
          navArrow("R"),
        ] }),
      ] }),
    ],
  });

  // ===== 03 映像資料 =====
  const videoThumb = (title: string, time: string): ContainerNode =>
    box({ name: `映像：${title}`, gap: 0, grow: true, basis: 150, background: BLACK_2, radius: 5, boxShadow: SH_CARD, children: [
      art(84, "", { radius: 5, children: [
        box({ background: NEON, radius: 999, alignSelf: "center", direction: "row", align: "center", justify: "center",
          paddingTop: 7, paddingBottom: 7, paddingLeft: 8, paddingRight: 6, children: [icon(P.play, INK, 11, INK)] }),
      ] }),
      box({ direction: "row", justify: "space-between", align: "center", gap: 8, paddingTop: 9, paddingBottom: 9, paddingLeft: 11, paddingRight: 11, children: [
        txt(title, { fontSize: 10.5, fontWeight: 700, color: WHITE, fontFamily: JP, align: "left" }, { grow: true }),
        txt(time, { fontSize: 9, fontWeight: 700, color: ON_DARK_D, fontFamily: EN, align: "right" }),
      ] }),
    ] });
  const video = box({
    name: "03 映像資料", background: PAGE_2, paddingTop: 56, paddingBottom: 56, paddingLeft: 26, paddingRight: 26, gap: 18,
    children: [
      box({ direction: "row", gap: 22, wrap: true, align: "stretch", alignSelf: "stretch", children: [
        art(280, "MAIN MOVIE", { grow: true, basis: 460, radius: 6, boxShadow: SH_CARD, children: [
          box({ background: NEON, radius: 999, alignSelf: "center", direction: "row", align: "center", justify: "center",
            paddingTop: 15, paddingBottom: 15, paddingLeft: 17, paddingRight: 14, boxShadow: SH_NEON, children: [icon(P.play, INK, 20, INK)] }),
        ] }),
        panel([
          numHead("03", "映像資料", "VIDEO"),
          jtxt("最新映像やトレーラーを\nチェックしよう。", 15, WHITE, { lineHeight: 1.9 }),
          { ...btnLine("すべての映像を見る", undefined, WHITE, "#4a4a4a"), marginTop: 4 } as ContainerNode,
        ], { grow: true, basis: 300, justify: "center" }),
      ] }),
      box({ name: "映像サムネ", direction: "row", columns: 4, gap: 14, wrap: true, align: "stretch", alignSelf: "stretch", children: [
        videoThumb("ストーリートレーラー", "02:38"), videoThumb("ゲームプレイ紹介", "03:05"),
        videoThumb("キャラクターPV：レイナ", "01:44"), videoThumb("コンセプトムービー", "02:42"),
      ] }),
    ],
  });

  // ===== 04 ニュース情報 =====
  const pageDot = (on = false): ContainerNode =>
    box({ name: "ページ位置", background: on ? NEON : "#cccccc", radius: 999, width: 7, minHeight: 7, alignSelf: "center", children: [] });
  const news = box({
    name: "04 ニュース情報", background: PAGE, paddingTop: 56, paddingBottom: 56, paddingLeft: 26, paddingRight: 26, gap: 16,
    children: [
      box({ direction: "row", gap: 22, wrap: true, align: "stretch", alignSelf: "stretch", children: [
        panel([
          numHead("04", "ニュース情報", "NEWS & INFO"),
          jtxt("最新情報や\nお知らせをお届け。", 15, WHITE, { lineHeight: 1.9 }),
          { ...btnLine("すべてのニュースを見る", undefined, WHITE, "#4a4a4a"), marginTop: 4 } as ContainerNode,
        ], { grow: true, basis: 300 }),
        box({ name: "記事カード", direction: "row", gap: 22, wrap: true, align: "center", grow: true, basis: 460,
          background: PAGE_2, radius: 6, boxShadow: SH_CARD, padding: 26, children: [
            box({ gap: 10, grow: true, basis: 260, children: [
              box({ background: NEON, radius: 3, alignSelf: "flex-start", paddingTop: 4, paddingBottom: 4, paddingLeft: 10, paddingRight: 10,
                direction: "row", align: "center", justify: "center", children: [
                  txt("重要なお知らせ", { fontSize: 10, fontWeight: 800, color: INK, fontFamily: JP, align: "center" })] }),
              txt("2025.05.24", { fontSize: 10.5, fontWeight: 700, color: "#9a9a9a", fontFamily: EN, letterSpacing: 1.2, align: "left" }),
              jtxt("クローズドβテスト参加者募集開始！", 17, INK, { lineHeight: 1.6 }),
              body("クローズドβテストの参加者募集を開始しました。\n抽選で合計10,000名様をご招待します。", SUB, 11.5),
              { ...btnLine("詳しく見る", undefined, INK, LINE_L, PAGE_2), marginTop: 4 } as ContainerNode,
            ] }),
            art(150, "NEWS IMAGE", { grow: true, basis: 170, radius: 5 }),
          ] }),
      ] }),
      box({ name: "ページドット", direction: "row", gap: 8, justify: "flex-end", alignSelf: "stretch", children: [
        pageDot(true), pageDot(), pageDot(), pageDot(),
      ] }),
    ],
  });

  // ===== 05 世界観 =====
  const areaCard = (title: string, desc: string): ContainerNode =>
    box({ name: `エリア：${title}`, gap: 0, grow: true, basis: 150, children: [
      art(120, "", { radius: 5, alignSelf: "stretch" }),
      box({ gap: 6, paddingTop: 12, paddingBottom: 4, children: [
        jtxt(title, 12.5, INK, { lineHeight: 1.6 }),
        body(desc, SUB, 10.5, { lineHeight: 1.85 }),
      ] }),
    ] });
  const world = box({
    name: "05 世界観", background: PAGE_2, paddingTop: 56, paddingBottom: 56, paddingLeft: 26, paddingRight: 26, gap: 20,
    children: [
      box({ direction: "row", gap: 22, wrap: true, align: "stretch", alignSelf: "stretch", children: [
        panel([
          numHead("05", "世界観", "WORLD"),
          jtxt("舞台となる世界や\nストーリーの背景を紹介。", 15, WHITE, { lineHeight: 1.9 }),
          { ...btnLine("もっと見る", undefined, WHITE, "#4a4a4a"), marginTop: 4 } as ContainerNode,
        ], { grow: true, basis: 280 }),
        box({ name: "エリア3枚", direction: "row", columns: 3, gap: 16, wrap: true, align: "stretch", grow: true, basis: 480, children: [
          areaCard("メトロポリス「アークシティ」", "巨大企業が支配する光の都。\n繁栄と格差が交錯する場所。"),
          areaCard("荒廃地帯「グレイヴランド」", "かつての繁栄が失われた地。\n未知の脅威が潜む危険区域。"),
          areaCard("空中要塞「イージス」", "人類の最後の砦。\n新たな時代の鍵を握る。"),
        ] }),
      ] }),
    ],
  });

  // ===== 06 ゲームの特徴 =====
  const featureItem = (ic: string, title: string, desc: string): ContainerNode =>
    box({ name: `特徴：${title}`, gap: 9, align: "center", grow: true, basis: 150, children: [
      box({ background: "rgba(217,240,0,0.10)", radius: 6, borderWidth: 1, borderColor: "rgba(217,240,0,0.35)",
        alignSelf: "center", direction: "row", align: "center", justify: "center", padding: 11, children: [icon(ic, NEON, 20)] }),
      jtxt(title, 12.5, NEON, { align: "center" }),
      body(desc, ON_DARK, 10.5, { align: "center", lineHeight: 1.85 }),
    ] });
  const features = box({
    name: "06 ゲームの特徴", background: BLACK, paddingTop: 56, paddingBottom: 56, paddingLeft: 26, paddingRight: 26, gap: 26,
    children: [
      box({ direction: "row", gap: 22, wrap: true, align: "center", alignSelf: "stretch", children: [
        box({ name: "見出し", gap: 20, grow: true, basis: 280, children: [
          numHead("06", "ゲームの特徴", "FEATURES"),
          jtxt("爽快バトルと自由探索が\n融合した新体験。", 15, WHITE, { lineHeight: 1.9 }),
          { ...btnLine("詳しく見る", undefined, WHITE, "#4a4a4a"), marginTop: 4 } as ContainerNode,
        ] }),
        art(260, "GAMEPLAY SCREEN", { grow: true, basis: 480, radius: 6 }),
      ] }),
      box({ name: "特徴4つ", direction: "row", columns: 4, gap: 20, wrap: true, align: "flex-start", alignSelf: "stretch", children: [
        featureItem(P.sword, "爽快アクションバトル", "スピーディーで戦略性の高い\n戦闘を体験。"),
        featureItem(P.grow, "キャラ育成＆カスタマイズ", "多彩なスキルや装備で\n自分だけのスタイルを構築。"),
        featureItem(P.map, "広大なフィールド探索", "シームレスに広がる世界を\n自由に探索。"),
        featureItem(P.users, "マルチプレイ対応", "仲間と協力して強敵に\n立ち向かえ。"),
      ] }),
    ],
  });

  // ===== フッター =====
  const fLink = (t: string): AtomNode => txt(t, { fontSize: 10.5, fontWeight: 500, color: ON_DARK, fontFamily: JP, align: "left" });
  const footer = box({
    name: "フッター", background: BLACK, paddingTop: 34, paddingBottom: 22, paddingLeft: 26, paddingRight: 26, gap: 26,
    children: [
      box({ direction: "row", justify: "space-between", align: "center", gap: 26, wrap: true, alignSelf: "stretch", children: [
        // TOPへ戻る
        box({ name: "TOPへ戻る", background: NEON, radius: 5, gap: 1, align: "center", justify: "center",
          paddingTop: 12, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, alignSelf: "center", children: [
            icon(P.up, INK, 15),
            txt("TOP", { fontSize: 10, fontWeight: 800, color: INK, fontFamily: EN, letterSpacing: 1.4, align: "center" }),
          ] }),
        // SNS
        box({ name: "SNS", gap: 10, grow: true, basis: 170, children: [
          en("FOLLOW US", NEON, 9),
          box({ direction: "row", align: "center", gap: 14, children: [
            icon(P.x, WHITE, 15), icon(P.youtube, WHITE, 16), icon(P.discord, WHITE, 16), icon(P.instagram, WHITE, 15), icon(P.tiktok, WHITE, 15),
          ] }),
        ] }),
        // メルマガ登録
        box({ name: "メルマガ登録", gap: 8, grow: true, basis: 260, children: [
          jtxt("メールマガジン登録", 12.5, WHITE),
          txt("最新情報をいち早くお届けします。", { fontSize: 9.5, fontWeight: 400, color: ON_DARK_D, fontFamily: JP, align: "left" }),
          box({ direction: "row", align: "stretch", gap: 0, alignSelf: "stretch", children: [
            box({ name: "入力欄", background: "#242424", radius: 4, grow: true, justify: "center",
              paddingTop: 10, paddingBottom: 10, paddingLeft: 12, paddingRight: 12, children: [
                txt("メールアドレスを入力", { fontSize: 10.5, fontWeight: 400, color: "#7a7a7a", fontFamily: JP, align: "left" })] }),
            box({ name: "登録ボタン", background: NEON, radius: 4, direction: "row", align: "center", justify: "center",
              paddingTop: 10, paddingBottom: 10, paddingLeft: 16, paddingRight: 16, marginLeft: 8, children: [
                txt("登録する", { fontSize: 11, fontWeight: 800, color: INK, fontFamily: JP, align: "center" })] }),
          ] }),
        ] }),
        // WISHLIST
        box({ name: "WISHLIST", background: BLACK_2, radius: 5, borderWidth: 1, borderColor: BLACK_3, direction: "row", align: "center",
          gap: 12, alignSelf: "center", paddingTop: 14, paddingBottom: 14, paddingLeft: 18, paddingRight: 20, children: [
            icon(P.steam, WHITE, 24),
            box({ gap: 2, children: [
              txt("WISHLIST NOW!", { fontSize: 13, fontWeight: 800, color: NEON, fontFamily: EN, letterSpacing: 1, align: "left" }),
              txt("STEAMでウィッシュリストに追加", { fontSize: 9, fontWeight: 500, color: ON_DARK, fontFamily: JP, align: "left" }),
            ] }),
          ] }),
      ] }),
      box({ background: BLACK_3, minHeight: 1, alignSelf: "stretch", children: [] }),
      box({ name: "規約リンク", direction: "row", justify: "center", gap: 26, wrap: true, alignSelf: "stretch", children: [
        fLink("利用規約"), fLink("プライバシーポリシー"), fLink("特定商取引法に基づく表記"), fLink("お問い合わせ"), fLink("会社概要"), fLink("採用情報"),
      ] }),
      txt("© 2025 NEXORA PROJECT. All Rights Reserved.", { fontSize: 9.5, fontWeight: 400, color: ON_DARK_D, fontFamily: EN, align: "center" }),
    ],
  });

  const raw = [header, hero, filmStrip(), characters, video, news, world, filmStrip(), features, footer];
  const sections = raw.map((s) => ({ ...s, type: "section" as const }));
  return { id: uid("page"), name: "NEXORA PROJECT 公式サイト風LP", children: sections };
}

export const NEXORA_TEMPLATE_ID = "t-nexora-lp";

export function buildNexoraTemplate(): PageTemplate {
  k = 0;
  return { id: NEXORA_TEMPLATE_ID, name: "NEXORA ゲーム紹介LP（ダーク×ネオン）", page: buildPage() };
}
