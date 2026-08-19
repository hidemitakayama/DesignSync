// テンプレート（クライアント案件）：個別指導塾スタディパワー（福島市八木田）のトップページLP。
// ヒアリング内容に基づく：
//   軸「机の上の学びを、社会に出てからの力に。」／テイスト=親しみやすい／カラー=オレンジ。
//   コンセプト：学歴と社会での結果は別。自分で考え、自分で答えにたどり着く力を勉強を通して育てる。
//   ★重要：合格実績・点数向上を“目的”にしない。数値実績のアピールは載せない（=課題の反映）。
// 構成：クライアント指定のページ構成【TOP】1〜11 のとおり（下記 buildPage 参照）。
//   ・5「英語という入り口」は「初稿でなしでOK」の指示に従い今回は省略（下部にコメントで保持）。
//   ・§4「※言葉は要調整」§5「※調整中」は社内メモのためページには描画しない。
//   ・最終CTA（無料体験）はコンバージョン用に11の後へ追加。
// デザイン方針：参考サイト https://www.shigakukan08.com/（志学館）に寄せる。
//   ＝白ベース＋オレンジ差し色／落ち着いた・やさしいトーン／控えめな角丸と影／余白広め／
//     見出しにクリップ風アイコン＋英字ラベル／カード／ゴシック体（見出しは Zen Kaku Gothic New）。
// オレンジは study-power.com のロゴ実測色 #F06000。画像・ロゴ・電話番号はすべてプレースホルダー。

import type { PageTemplate, SceneNode, ContainerNode, AtomNode, TextStyle } from "./types";

// --- カラー（白ベース＋現行サイトのブランドオレンジ＝差し色） ---
// オレンジは study-power.com のロゴ実測色に合わせる：#F06000 = rgb(240,96,0)。
const ORANGE = "#f06000";   // メイン（差し色・CTA）＝現行ロゴのブランドオレンジ
const ORANGE_D = "#c24e00"; // 濃いオレンジ（文字・強調）
const ORANGE_L = "#ffe4d2"; // 淡いオレンジ（アイコン地・チップ）
const ORANGE_XL = "#fff5ec"; // ごく淡いオレンジ（ヒーロー地）
const INK = "#2f2a24";      // 見出し（温かいダーク）
const SUB = "#7a7168";      // 補助（温かいグレー）
const LINE = "#ece5db";     // 枠線（温かい）
const CREAM = "#fbf7f1";    // 淡色セクション背景
const WHITE = "#ffffff";
const FOOT = "#33291f";     // フッター（温かいダーク）

// 見出し用フォント（やさしいゴシック）。本文は既定（Noto Sans JP）。
const HEAD = "kaku"; // Zen Kaku Gothic New（weightは400/700）

// 影は控えめに（落ち着いたトーン）
const SH_SM = "0 1px 2px rgba(70,45,20,0.05), 0 1px 3px rgba(70,45,20,0.06)";
const SH_MD = "0 6px 18px -8px rgba(90,60,25,0.16), 0 2px 6px -3px rgba(90,60,25,0.08)";

let k = 0;
const uid = (p: string) => `t-spw-${p}${++k}`;

const txt = (text: string, style: TextStyle): AtomNode => ({ id: uid("t"), type: "atom", atomType: "text", name: text.slice(0, 10) || "テキスト", text, style });
// 見出し（Zen Kaku Gothic New・太字）
const htxt = (text: string, fontSize: number, color = INK, extra: Partial<TextStyle> = {}): AtomNode =>
  txt(text, { fontSize, fontWeight: 700, color, fontFamily: HEAD, align: "left", ...extra });
const icon = (paths: string, color = ORANGE, size = 24): AtomNode => ({
  id: uid("s"), type: "atom", atomType: "svg", name: "アイコン", width: size, height: size,
  svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`,
});

function box(p: Partial<ContainerNode> & { children: SceneNode[] }): ContainerNode {
  return {
    id: uid("c"), type: "group", name: p.name ?? "グループ",
    direction: p.direction ?? "column", justify: p.justify ?? "flex-start", align: p.align ?? "stretch",
    gap: p.gap ?? 12, ...p,
  };
}

const P = {
  clip: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>', // ブックマーク（見出しのクリップ風）
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  seed: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
  bulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2Z"/>',
  compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>',
  sprout: '<path d="M7 20h10"/><path d="M12 20c0-6 0-8 2.5-10.5"/><path d="M12 14C12 9 9 6 4 6c0 5 3 8 8 8Z"/><path d="M12 12c0-3 2-5 5-5 0 3-2 5-5 5Z"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  brain: '<path d="M12 5a3 3 0 1 0-5.997.142 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.142 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  notebook: '<path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M16 2v20"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
  clipboardCheck: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  circleCheck: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  arrowR: '<path d="m9 18 6-6-6-6"/>',
  quote: '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
};

// 画像スロット（差し替え用プレースホルダー）。中身に「何の写真か」を明示。
const photo = (minHeight: number, label: string, extra: Partial<ContainerNode> = {}): ContainerNode =>
  box({ background: "linear-gradient(135deg,#ffe6cf,#ffd9df)", radius: 18, minHeight, align: "center", justify: "center", gap: 10, boxShadow: SH_SM, children: [
    icon('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>', "#dd9366", 30),
    txt(label, { fontSize: 12, fontWeight: 700, color: "#b0774f", align: "center" }),
  ], ...extra });

const card = (children: SceneNode[], extra: Partial<ContainerNode> = {}): ContainerNode =>
  box({ background: WHITE, radius: 16, padding: 24, gap: 12, grow: true, borderWidth: 1, borderColor: LINE, boxShadow: SH_SM, children, ...extra });

// アイコンチップ（淡オレンジの角丸四角）
const iconChip = (ic: string, size = 22, bg = ORANGE_L, color = ORANGE): ContainerNode =>
  box({ background: bg, radius: 14, direction: "row", align: "center", justify: "center", alignSelf: "flex-start", paddingTop: 11, paddingBottom: 11, paddingLeft: 11, paddingRight: 11, children: [icon(ic, color, size)] });

// 特徴/ポイントカード（アイコン＋見出し＋本文）
const featureCard = (ic: string, title: string, body: string): ContainerNode =>
  card([iconChip(ic, 22), htxt(title, 17, INK, { lineHeight: 1.5 }), txt(body, { fontSize: 14, fontWeight: 400, color: SUB, lineHeight: 1.85, align: "left" })]);

// ボタン（角丸の長方形＝志学館寄りの落ち着いた形。フルピルにしない）
const button = (label: string, bg: string, color: string, shadow?: string): ContainerNode =>
  box({ background: bg, radius: 12, direction: "row", align: "center", justify: "center", gap: 8, alignSelf: "flex-start", paddingTop: 15, paddingBottom: 15, paddingLeft: 28, paddingRight: 24, boxShadow: shadow, children: [
    txt(label, { fontSize: 15, fontWeight: 700, color, fontFamily: HEAD, align: "center" }), icon(P.arrow, color, 18),
  ] });

const ghost = (label: string, color = ORANGE_D, border = "#f2ceac"): ContainerNode =>
  box({ background: WHITE, radius: 12, borderWidth: 1.5, borderColor: border, direction: "row", align: "center", justify: "center", gap: 8, alignSelf: "flex-start", paddingTop: 14, paddingBottom: 14, paddingLeft: 24, paddingRight: 22, boxShadow: SH_SM, children: [txt(label, { fontSize: 15, fontWeight: 700, color, fontFamily: HEAD, align: "center" }), icon(P.arrowR, color, 16)] });

// 見出し（クリップ風アイコン＋英字ラベル＋日本語タイトル＋リード）。志学館のセクション見出しに寄せる。
const head = (eyebrow: string, title: string, lead?: string, center = false): ContainerNode =>
  box({ gap: 12, alignSelf: center ? "center" : "flex-start", align: center ? "center" : "flex-start", children: [
    box({ direction: "row", align: "center", gap: 8, alignSelf: center ? "center" : "flex-start", children: [
      icon(P.clip, ORANGE, 18),
      txt(eyebrow, { fontSize: 12, fontWeight: 700, color: ORANGE_D, letterSpacing: 1.5, fontFamily: HEAD, align: center ? "center" : "left" }),
    ] }),
    htxt(title, 29, INK, { align: center ? "center" : "left", lineHeight: 1.4 }),
    ...(lead ? [txt(lead, { fontSize: 15, fontWeight: 400, color: SUB, lineHeight: 1.95, align: center ? "center" : "left" })] : []),
  ] });

// 本文段落（読みやすい行間）
const para = (t: string, extra: Partial<TextStyle> = {}): AtomNode =>
  txt(t, { fontSize: 15, fontWeight: 400, color: SUB, lineHeight: 1.95, align: "left", ...extra });

// ヒーローの小さな1行チップ（アイコン＋方針）
const chip = (label: string): ContainerNode =>
  box({ background: WHITE, radius: 10, direction: "row", align: "center", gap: 6, alignSelf: "flex-start", boxShadow: SH_SM, borderWidth: 1, borderColor: LINE, paddingTop: 8, paddingBottom: 8, paddingLeft: 12, paddingRight: 14, children: [
    icon(P.circleCheck, ORANGE, 16),
    txt(label, { fontSize: 13, fontWeight: 700, color: INK, align: "left" }),
  ] });

// チェック付きの1行（箇条書き）
const checkRow = (t: string): ContainerNode =>
  box({ direction: "row", align: "flex-start", gap: 12, background: WHITE, radius: 12, borderWidth: 1, borderColor: LINE, boxShadow: SH_SM, paddingTop: 15, paddingBottom: 15, paddingLeft: 16, paddingRight: 18, children: [
    box({ background: ORANGE_L, radius: 999, direction: "row", align: "center", justify: "center", alignSelf: "flex-start", paddingTop: 5, paddingBottom: 5, paddingLeft: 5, paddingRight: 5, children: [icon(P.check, ORANGE_D, 15)] }),
    txt(t, { fontSize: 15, fontWeight: 500, color: INK, lineHeight: 1.7, align: "left" }),
  ] });

const LOGO = P.bulb; // ロゴは現行サイトのものに差し替え（暫定アイコン）

function buildPage() {
  // ===== ヘッダー（ロゴはプレースホルダー：現行サイトのロゴに差し替え） =====
  const navLink = (l: string): AtomNode => txt(l, { fontSize: 14, fontWeight: 500, color: INK, align: "left" });
  const header = box({
    name: "ヘッダー", direction: "row", justify: "space-between", align: "center", background: WHITE, boxShadow: SH_SM,
    paddingTop: 15, paddingBottom: 15, paddingLeft: 44, paddingRight: 44, gap: 16,
    children: [
      box({ name: "ロゴ", direction: "row", align: "center", gap: 10, children: [
        box({ background: ORANGE_L, radius: 12, direction: "row", align: "center", justify: "center", paddingTop: 8, paddingBottom: 8, paddingLeft: 8, paddingRight: 8, children: [icon(LOGO, ORANGE, 22)] }),
        box({ gap: 1, children: [
          htxt("個別指導塾スタディパワー", 17, INK),
          txt("福島市八木田／小中学生", { fontSize: 11, fontWeight: 700, color: ORANGE_D, align: "left" }),
        ] }),
      ] }),
      box({ name: "ナビ", direction: "row", align: "center", gap: 20, wrap: true, children: [
        navLink("塾の想い"), navLink("目指す姿"), navLink("学びの仕組み"), navLink("生徒の変化"), navLink("コース・料金"), navLink("アクセス"),
        button("無料体験のお申し込み", ORANGE, WHITE),
      ] }),
    ],
  });

  // ===== 1. ヒーロー =====
  const hero = box({
    name: "1. ヒーロー", background: `linear-gradient(180deg,${ORANGE_XL},${WHITE})`, paddingTop: 72, paddingBottom: 72, paddingLeft: 48, paddingRight: 48,
    direction: "row", gap: 44, align: "center", wrap: true, minHeight: 500,
    children: [
      box({ name: "見出し群", gap: 22, grow: true, basis: 460, children: [
        box({ background: WHITE, radius: 999, alignSelf: "flex-start", direction: "row", align: "center", gap: 6, boxShadow: SH_SM, borderWidth: 1, borderColor: LINE, paddingTop: 7, paddingBottom: 7, paddingLeft: 14, paddingRight: 16, children: [
          icon(P.pin, ORANGE, 15), txt("福島市八木田｜小中学生の個別指導塾", { fontSize: 13, fontWeight: 700, color: ORANGE_D, align: "left" }),
        ] }),
        htxt("机の上の学びを、\n社会に出てからの力に。", 44, INK, { lineHeight: 1.32 }),
        txt("教わるだけでは、身につかない力がある。\n自ら学ぶ仕組みで、小さな変化を積み重ね、大きな力にしていく。", { fontSize: 16, fontWeight: 400, color: SUB, lineHeight: 2.0, align: "left" }),
        box({ direction: "row", gap: 12, wrap: true, alignSelf: "flex-start", children: [button("無料体験授業のお申し込みはこちら", ORANGE, WHITE, SH_MD)] }),
        box({ name: "方針チップ", direction: "row", gap: 10, wrap: true, alignSelf: "stretch", marginTop: 4, children: [
          chip("自分で考える力"), chip("一人ひとりに向き合う"), chip("体験授業は無料"),
        ] }),
      ] }),
      photo(400, "教室・授業の様子（現行サイトの写真に差し替え）", { grow: true, basis: 400 }),
    ],
  });

  // ===== 2. なぜこの塾をつくったのか（想い・サラッと＋別ページ導線） =====
  const mission = box({
    name: "2. なぜこの塾をつくったのか", background: WHITE, paddingTop: 82, paddingBottom: 82, paddingLeft: 48, paddingRight: 48,
    direction: "row", gap: 44, align: "center", wrap: true,
    children: [
      box({ grow: true, basis: 440, gap: 16, children: [
        head("ABOUT", "なぜ、この塾を\nつくったのか。"),
        para("学歴があることと社会で結果を出せることは、必ずしも同じではない。そのことを、県庁職員として働く中で、何度も実感してきました。"),
        para("「先例のとおりに進める」ことはできても、「なぜそれをするのか」を自分の言葉で説明できない。そんな場面を、数えきれないほど見てきました。"),
        box({ background: CREAM, radius: 16, borderWidth: 1, borderColor: LINE, paddingTop: 20, paddingBottom: 20, paddingLeft: 22, paddingRight: 22, gap: 10, children: [
          icon(P.quote, ORANGE, 22),
          txt("だからこそ、子どもたちには、教わったことをそのままなぞるのではなく、自分で考え、自分で答えにたどり着く力を身につけてほしい。その想いから、スタディパワーを開きました。", { fontSize: 15, fontWeight: 500, color: INK, lineHeight: 1.9, align: "left" }),
        ] }),
        box({ alignSelf: "flex-start", children: [ghost("先生の想いをもっと見る", ORANGE_D)] }),
      ] }),
      photo(360, "塾長の写真 / 教室風景（差し替え）", { grow: true, basis: 360, background: "linear-gradient(135deg,#ffdcb8,#ffe8c6)" }),
    ],
  });

  // ===== 3. 当塾が目指す姿 =====
  const vision = box({
    name: "3. 当塾が目指す姿", background: CREAM, paddingTop: 82, paddingBottom: 82, paddingLeft: 48, paddingRight: 48, gap: 12, align: "center",
    children: [
      head("VISION", "当塾が目指す姿", undefined, true),
      box({ background: WHITE, radius: 20, borderWidth: 1, borderColor: LINE, boxShadow: SH_SM, alignSelf: "stretch", marginTop: 20, paddingTop: 36, paddingBottom: 36, paddingLeft: 40, paddingRight: 40, gap: 14, align: "center", children: [
        htxt("スタパは、単に「授業をする塾」ではありません。", 22, INK, { align: "center", lineHeight: 1.6 }),
        txt("生徒一人ひとりが、「今日やること」を確認し、自分で学習に向かい、少しずつ努力を積み上げていけるようにすることを大切にしている塾です。", { fontSize: 15, fontWeight: 400, color: SUB, lineHeight: 2.0, align: "center" }),
        txt("高校入試だけでなく、高校に進学してからも、社会に出てからも、自分で考え、自分で学び、自分を高めていける人になってほしいと考えています。", { fontSize: 15, fontWeight: 400, color: SUB, lineHeight: 2.0, align: "center" }),
      ] }),
      txt("だから私たちは、点数や結果だけでなく、次の力も、大切な成長として見ています。", { fontSize: 15, fontWeight: 700, color: INK, lineHeight: 1.9, align: "center" }),
      box({ name: "成長の視点", direction: "row", columns: 3, gap: 20, wrap: true, align: "stretch", alignSelf: "stretch", marginTop: 8, children: [
        featureCard(P.compass, "学習への姿勢", "机に向かう前の気持ちや、学びに向き合う構え方そのものを見ています。"),
        featureCard(P.zap, "自分で進める力", "指示を待つのではなく、自分で「今日やること」を決めて進める力。"),
        featureCard(P.seed, "努力を続ける力", "一度きりではなく、日々こつこつと積み重ねていける力。"),
      ] }),
    ],
  });

  // ===== 4. 身につく力について（※言葉は要調整＝社内メモ。ページには出さない） =====
  const skills = box({
    name: "4. 身につく力について", background: WHITE, paddingTop: 82, paddingBottom: 82, paddingLeft: 48, paddingRight: 48, gap: 12, align: "center",
    children: [
      head("SKILLS", "身につく力について", "「わかる」だけでは、テストの点数にはつながりません。自分でもう一度考え、「自分で解ける」ようになって、はじめて力になります。", true),
      box({ name: "育てたい力", direction: "row", columns: 3, gap: 20, wrap: true, align: "stretch", alignSelf: "stretch", marginTop: 24, children: [
        featureCard(P.message, "自分の言葉にできる力", "わからないことを、自分の言葉で説明できるようにする力。"),
        featureCard(P.scale, "見分ける力", "覚えるべきことと、考えるべきことを、自分で見分ける力。"),
        featureCard(P.search, "自分で確かめる力", "「わかったつもり」で終わらせず、自分で確かめる力。"),
      ] }),
      box({ background: CREAM, radius: 16, borderWidth: 1, borderColor: LINE, alignSelf: "stretch", marginTop: 8, paddingTop: 24, paddingBottom: 24, paddingLeft: 28, paddingRight: 28, children: [
        txt("これらは、テクニックのように一度覚えて終わるものではなく、日々の学習の積み重ねの中で、少しずつ育っていく力です。", { fontSize: 15, fontWeight: 500, color: INK, lineHeight: 1.9, align: "center" }),
      ] }),
    ],
  });

  // ===== 5. 英語という入り口（「初稿でなしでOK」の指示により今回は省略） =====
  // 追加する場合の暫定コピー：
  //   「スタパでは、英語を学びの入り口として大切にしています。」
  //   「大学名などの肩書きではなく、資格そのものが力になる時代。英語という一つの科目に向き合い、
  //     積み重ねていく経験は、学び方そのものを身につける、最初の一歩になります。」

  // ===== 6. 「自分で解ける」を支える仕組み =====
  const system = box({
    name: "6. 「自分で解ける」を支える仕組み", background: CREAM, paddingTop: 82, paddingBottom: 82, paddingLeft: 48, paddingRight: 48, gap: 12, align: "center",
    children: [
      head("SYSTEM", "「自分で解ける」を\n支える仕組み。", "一人ひとりの得意・苦手に合わせて、塾長が指導します。", true),
      box({ background: WHITE, radius: 16, borderWidth: 1, borderColor: LINE, boxShadow: SH_SM, alignSelf: "stretch", marginTop: 16, paddingTop: 24, paddingBottom: 24, paddingLeft: 28, paddingRight: 28, gap: 10, children: [
        txt("「わかる」は、先生からやり方を教えてもらって「理解しただけ」の状態。それを「自分で解ける」ようになるには、日々の「勉強の習慣」が欠かせません。", { fontSize: 15, fontWeight: 500, color: INK, lineHeight: 1.9, align: "left" }),
        txt("「わかる」を「自分で解ける」に変えるために、「自分で学び方を身につけるための仕組み」づくりまで手伝います。", { fontSize: 15, fontWeight: 700, color: ORANGE_D, lineHeight: 1.9, align: "left" }),
      ] }),
      box({ name: "仕組みカード", direction: "row", columns: 3, gap: 20, wrap: true, align: "stretch", alignSelf: "stretch", marginTop: 16, children: [
        featureCard(P.calendar, "年間学習計画と集中学習期間", "夏・冬・春の集中学習期間を含む、年間を通じた計画で継続した学習リズムをつくります。"),
        featureCard(P.clock, "ST（スタパタイム）", "自分の学習時間を、自分で管理する取り組み。"),
        featureCard(P.brain, "速読解力脳トレーニング", "情報処理能力を高めるトレーニング。"),
        featureCard(P.notebook, "スタパノート", "自分の学習内容を記録し、次にやることを考えるノート。"),
        featureCard(P.award, "英単語確認テスト", "昇級・昇段式のテストで、語彙の定着を段階的に確認。"),
        featureCard(P.clipboardCheck, "テスト・検定対策", "定期テスト対策（理科・社会3周プログラム）・新教研テスト・英検対策。"),
      ] }),
    ],
  });

  // ===== 7. 「自分で解ける」からやる気につながる =====
  const flowStep = (label: string, strong = false): ContainerNode =>
    box({ background: strong ? ORANGE : WHITE, radius: 999, borderWidth: 1, borderColor: strong ? ORANGE : LINE, boxShadow: SH_SM, direction: "row", align: "center", justify: "center", alignSelf: "center", paddingTop: 10, paddingBottom: 10, paddingLeft: 18, paddingRight: 18, children: [
      txt(label, { fontSize: 14, fontWeight: 700, color: strong ? WHITE : INK, fontFamily: HEAD, align: "center" }),
    ] });
  const flowArrow = (): AtomNode => icon(P.arrowR, "#e0c4a8", 18);
  const motivation = box({
    name: "7. 「自分で解ける」からやる気に", background: WHITE, paddingTop: 82, paddingBottom: 82, paddingLeft: 48, paddingRight: 48, gap: 12, align: "center",
    children: [
      head("MOTIVATION", "「自分で解ける」から、\nやる気につながる。", undefined, true),
      box({ name: "学びの流れ", direction: "row", gap: 12, wrap: true, align: "center", justify: "center", alignSelf: "center", marginTop: 20, children: [
        flowStep("わからない"), flowArrow(), flowStep("わかる"), flowArrow(), flowStep("自分で解ける", true), flowArrow(), flowStep("やる気・意欲", true),
      ] }),
      box({ direction: "row", gap: 20, wrap: true, align: "stretch", alignSelf: "stretch", marginTop: 24, children: [
        box({ grow: true, basis: 440, gap: 12, children: [
          box({ background: CREAM, radius: 16, borderWidth: 1, borderColor: LINE, paddingTop: 20, paddingBottom: 20, paddingLeft: 22, paddingRight: 22, gap: 10, children: [
            para("「わかる」だけでは、一人で解くことができないので、勉強へのやる気は生まれません。"),
            txt("「自分で解ける」という実感を積み重ねることで、はじめて次への意欲が生まれます。", { fontSize: 15, fontWeight: 700, color: INK, lineHeight: 1.9, align: "left" }),
            para("わからないところを見逃さず、「わかる」へ。「わかる」を、一人でも解ける「自分で解ける」へ。"),
          ] }),
        ] }),
        box({ grow: true, basis: 440, gap: 12, children: [
          box({ background: ORANGE_L, radius: 16, paddingTop: 20, paddingBottom: 20, paddingLeft: 22, paddingRight: 22, gap: 10, children: [
            para("この一歩一歩の変化は、生徒自身ではなかなか気づけないものです。だからこそスタパでは、その小さな変化を見逃さず、気づき、声をかけることを大切にしています。", { color: INK }),
            box({ direction: "row", align: "flex-start", gap: 10, children: [
              icon(P.quote, ORANGE, 22),
              htxt("「できるようになったね」と気づいてもらえること。それが、次への自信になり、次への意欲になっていきます。", 16, ORANGE_D, { lineHeight: 1.8 }),
            ] }),
          ] }),
        ] }),
      ] }),
    ],
  });

  // ===== 8. 生徒に見える変化 =====
  const change = box({
    name: "8. 生徒に見える変化", background: CREAM, paddingTop: 82, paddingBottom: 82, paddingLeft: 48, paddingRight: 48,
    direction: "row", gap: 44, align: "flex-start", wrap: true,
    children: [
      box({ grow: true, basis: 380, gap: 16, children: [
        head("GROWTH", "生徒に見える、\n小さな変化。", "すべての生徒が、急に変わるわけではありません。成績も、学習への姿勢も、日々の取り組み方も、すぐに大きく変わるものではありません。"),
        txt("しかし、教室で見ていると、小さな変化は確かにあります。", { fontSize: 15, fontWeight: 700, color: INK, lineHeight: 1.9, align: "left" }),
        box({ background: WHITE, radius: 16, borderWidth: 1, borderColor: LINE, boxShadow: SH_SM, paddingTop: 18, paddingBottom: 18, paddingLeft: 20, paddingRight: 20, children: [
          txt("こうした変化は、すぐに点数には出ないかもしれません。しかし、学習を積み上げ、自分を高めていくためには、とても大切な力です。", { fontSize: 14, fontWeight: 500, color: SUB, lineHeight: 1.9, align: "left" }),
        ] }),
      ] }),
      box({ grow: true, basis: 440, gap: 12, children: [
        checkRow("自分で教材を開くようになった"),
        checkRow("今日やることを確認してから始めるようになった"),
        checkRow("わからないところを、そのままにしないようになった"),
        checkRow("スタパノートに学習内容を書き、次に何をするか考えるようになった"),
        checkRow("テスト前だけでなく、普段から少しずつ進めようとするようになった"),
      ] }),
    ],
  });

  // ===== 9. コース紹介・料金（詳細は外部ページへ。数値実績はうたわない） =====
  const courses = box({
    name: "9. コース紹介・料金", background: WHITE, paddingTop: 82, paddingBottom: 82, paddingLeft: 48, paddingRight: 48, gap: 12, align: "center",
    children: [
      head("COURSE", "コース紹介・料金", "学年やご希望に合わせて、一人ひとりに合った学び方をご案内します。詳細は専用ページでご確認いただけます。", true),
      box({ name: "コースカード", direction: "row", columns: 2, gap: 20, wrap: true, align: "stretch", alignSelf: "stretch", marginTop: 24, children: [
        featureCard(P.book, "小学生コース", "学ぶ楽しさと、自分で考える力の土台づくり。学習の習慣を、少しずつ育てていきます。"),
        featureCard(P.compass, "中学生コース", "「わかる」から「自分で解ける」へ。自ら学ぶ仕組みで、日々の学習を自分の力に変えていきます。"),
      ] }),
      box({ background: CREAM, radius: 16, borderWidth: 1, borderColor: LINE, boxShadow: SH_SM, alignSelf: "stretch", marginTop: 8, direction: "row", justify: "space-between", align: "center", wrap: true, gap: 14, paddingTop: 22, paddingBottom: 22, paddingLeft: 26, paddingRight: 26, children: [
        box({ gap: 4, grow: true, basis: 320, children: [
          htxt("コース・料金の詳細ページ", 16, INK),
          txt("学年・受講回数ごとの詳しいご案内はこちら（study-power.com/course-cost）。", { fontSize: 13, fontWeight: 500, color: SUB, align: "left" }),
        ] }),
        button("コース・料金を見る", ORANGE, WHITE, SH_MD),
      ] }),
    ],
  });

  // ===== 10. 5年間、一緒に =====
  const together = box({
    name: "10. 5年間、一緒に", background: CREAM, paddingTop: 82, paddingBottom: 82, paddingLeft: 48, paddingRight: 48,
    direction: "row", gap: 44, align: "flex-start", wrap: true,
    children: [
      box({ grow: true, basis: 430, gap: 16, children: [
        head("TOGETHER", "5年間、一緒に。", "すぐに変化が起きるわけではありません。成績も、学習への姿勢も、日々の取り組み方も、すぐに大きく変わるものではありません。"),
        txt("けれど、確かに変化は起きます。そして、その先には、成果としての結果もついてきます。", { fontSize: 15, fontWeight: 700, color: INK, lineHeight: 1.9, align: "left" }),
        para("だからこそスタパでは、まず生徒本人と保護者さまに、進め方をきちんと納得していただいた上でスタートすることを大切にしています。"),
        para("原則として3回の無料体験授業と、入塾確認シートでの確認をお願いしています。これは、学力だけを確認するためのものではありません。スタパの進め方が、生徒本人・保護者さまに合っているか、また、責任を持ってお預かりできるかを確認するための期間です。"),
        box({ background: ORANGE_L, radius: 16, alignSelf: "stretch", paddingTop: 18, paddingBottom: 18, paddingLeft: 22, paddingRight: 22, gap: 6, children: [
          txt("その積み重ねの先に、それぞれが望む進路への道が開けていく。私たちは、そう考えています。", { fontSize: 15, fontWeight: 500, color: ORANGE_D, lineHeight: 1.8, align: "left" }),
          htxt("だからこそ、5年間、一緒にやっていきませんか。", 18, INK, { lineHeight: 1.6 }),
        ] }),
      ] }),
      box({ grow: true, basis: 380, gap: 12, children: [
        box({ background: WHITE, radius: 14, borderWidth: 1, borderColor: LINE, boxShadow: SH_SM, paddingTop: 16, paddingBottom: 16, paddingLeft: 20, paddingRight: 20, children: [
          htxt("この三つがそろってこそ、学習は積み上がっていく。", 15, ORANGE_D, { lineHeight: 1.6 }),
        ] }),
        checkRow("生徒本人が、少しずつでも学習に向かおうとすること"),
        checkRow("保護者さまにも、学習の様子を一緒に見守っていただくこと"),
        checkRow("教室としても、その生徒に必要な学習を責任を持って考えること"),
        box({ background: WHITE, radius: 14, borderWidth: 1, borderColor: LINE, boxShadow: SH_SM, paddingTop: 16, paddingBottom: 16, paddingLeft: 20, paddingRight: 20, children: [
          txt("教室の様子、ご家庭で見える学習面の変化、テストや英検の結果など、生徒の成長は、保護者さまと一緒に見守っていきたいと考えています。点数が上がったときだけでなく、「前より自分で進めるようになった」「学習に向かうまでが早くなった」という小さな変化も、スタパでは大切な成果として見ています。", { fontSize: 14, fontWeight: 500, color: SUB, lineHeight: 1.9, align: "left" }),
        ] }),
      ] }),
    ],
  });

  // ===== 11. 教室について／アクセス =====
  const access = box({
    name: "11. 教室について／アクセス", background: WHITE, paddingTop: 82, paddingBottom: 82, paddingLeft: 48, paddingRight: 48, gap: 12, align: "center",
    children: [
      head("ACCESS", "教室について／アクセス", undefined, true),
      box({ direction: "row", gap: 28, align: "stretch", wrap: true, alignSelf: "stretch", marginTop: 24, children: [
        photo(320, "教室の雰囲気・設備（現行サイトの写真に差し替え）", { grow: true, basis: 380, background: "linear-gradient(135deg,#e9efe4,#ffe9d6)" }),
        card([
          box({ direction: "row", align: "center", gap: 8, children: [icon(P.pin, ORANGE, 20), htxt("個別指導塾スタディパワー", 18, INK)] }),
          txt("〒960-8164\n福島県福島市八木田榎内13−12 メゾン・パーク102号", { fontSize: 14, fontWeight: 400, color: SUB, lineHeight: 1.8, align: "left" }),
          box({ direction: "row", align: "center", gap: 8, marginTop: 2, children: [icon(P.phone, ORANGE, 18), htxt("000-000-0000", 18, INK)] }),
          txt("※ 電話番号は現行サイトの情報に差し替え", { fontSize: 12, fontWeight: 500, color: SUB, align: "left" }),
          box({ direction: "row", align: "center", gap: 8, marginTop: 2, children: [icon(P.globe, ORANGE, 18), txt("study-power.com", { fontSize: 14, fontWeight: 700, color: ORANGE_D, align: "left" })] }),
          txt("［教室の雰囲気・設備等は、写真とあわせて掲載します］", { fontSize: 12, fontWeight: 500, color: SUB, align: "left" }),
        ], { grow: true, basis: 320 }),
      ] }),
    ],
  });

  // ===== 最終CTA（無料体験）＝オレンジ帯。コンバージョン用に追加 =====
  const cta = box({
    name: "お問い合わせ（無料体験）", background: CREAM, paddingTop: 82, paddingBottom: 82, paddingLeft: 48, paddingRight: 48, align: "center",
    children: [
      box({ name: "CTAカード", background: ORANGE, radius: 24, alignSelf: "stretch", boxShadow: SH_MD, paddingTop: 58, paddingBottom: 58, paddingLeft: 40, paddingRight: 40, gap: 16, align: "center", children: [
        htxt("まずは、無料体験授業から。", 32, WHITE, { align: "center", lineHeight: 1.4 }),
        txt("教わるだけでは身につかない力を、自ら学ぶ仕組みで。スタパの学び方を、そのままお確かめください。", { fontSize: 16, fontWeight: 400, color: "#fff4e9", lineHeight: 1.9, align: "center" }),
        box({ direction: "row", gap: 12, wrap: true, justify: "center", alignSelf: "center", marginTop: 4, children: [
          button("無料体験授業のお申し込みはこちら", WHITE, ORANGE_D, SH_MD),
          ghost("お問い合わせ", WHITE, "rgba(255,255,255,0.7)"),
        ] }),
        txt("原則3回の無料体験＋入塾確認シートで、合うかどうかを一緒に確かめます。", { fontSize: 13, fontWeight: 500, color: "#fff4e9", align: "center" }),
      ] }),
    ],
  });

  // ===== フッター =====
  const fCol = (title: string, items: string[]): ContainerNode =>
    box({ gap: 8, children: [
      txt(title, { fontSize: 12, fontWeight: 700, color: "#ffc79a", fontFamily: HEAD, align: "left" }),
      ...items.map((it) => txt(it, { fontSize: 13, fontWeight: 400, color: "#c9bcae", lineHeight: 1.7, align: "left" })),
    ] });
  const footer = box({
    name: "フッター", background: FOOT, paddingTop: 48, paddingBottom: 32, paddingLeft: 48, paddingRight: 48, gap: 28,
    children: [
      box({ direction: "row", justify: "space-between", wrap: true, gap: 28, alignSelf: "stretch", children: [
        box({ gap: 10, basis: 300, children: [
          box({ direction: "row", align: "center", gap: 8, children: [icon(LOGO, "#ffb27a", 22), htxt("個別指導塾スタディパワー", 16, WHITE)] }),
          txt("机の上の学びを、社会に出てからの力に。", { fontSize: 13, fontWeight: 400, color: "#c9bcae", align: "left" }),
          txt("〒960-8164 福島県福島市八木田榎内13−12 メゾン・パーク102号", { fontSize: 12, fontWeight: 400, color: "#c9bcae", lineHeight: 1.7, align: "left" }),
        ] }),
        fCol("メニュー", ["塾の想い", "目指す姿", "学びの仕組み", "生徒の変化", "コース・料金"]),
        fCol("アクセス", ["福島市八木田", "study-power.com"]),
        fCol("お問い合わせ", ["無料体験授業のお申し込み", "000-000-0000"]),
      ] }),
      txt("© 個別指導塾スタディパワー", { fontSize: 12, fontWeight: 500, color: "#8a7d6d", align: "center" }),
    ],
  });

  const raw = [header, hero, mission, vision, skills, system, motivation, change, courses, together, access, cta, footer];
  const sections = raw.map((s) => ({ ...s, type: "section" as const }));
  return { id: uid("page"), name: "個別指導塾スタディパワー トップページ", children: sections };
}

export const STUDYPOWER_TEMPLATE_ID = "t-studypower-lp";

export function buildStudyPowerTemplate(): PageTemplate {
  k = 0;
  return { id: STUDYPOWER_TEMPLATE_ID, name: "個別指導塾スタディパワー トップページ（親しみ・オレンジ）", page: buildPage() };
}
