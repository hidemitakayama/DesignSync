// テンプレート：アップ進学ゼミ（和歌山市六十谷）のトップページLP。
// ヒアリング内容に基づく：軸「夢を叶える力をつける塾」／テイスト=ポップ・親しみやすい／カラー=オレンジ。
// 構成：FV → 目指すもの(2020創業の想い) → 特徴(3点) → 授業内容/料金 → 生徒・保護者の声 →
//        入塾までの流れ → FAQ → 教室情報・アクセス → お問い合わせ(問い合わせ導線を強化) → フッター。
// 参考デザイン vamos-edu.jp（少人数・面倒見）。連絡先は実在。写真は差し替え用プレースホルダー。

import type { PageTemplate, SceneNode, ContainerNode, AtomNode, TextStyle } from "./types";

// --- カラー（ロゴに合わせた温かいオレンジ基調＝ポップ・親しみやすい） ---
const ORANGE = "#f97316";   // メイン（CTA）
const ORANGE_D = "#d9540a"; // 濃いオレンジ（文字）
const ORANGE_L = "#ffefe0"; // 淡いオレンジ（アイコン地・チップ）
const INK = "#33261b";      // 見出し（温かいダーク）
const SUB = "#7b6d60";      // 補助（温かいグレー）
const LINE = "#f0e7db";     // 枠線（温かい）
const CREAM = "#fff8f0";    // 淡色背景
const CREAM2 = "#fff2e4";   // やや濃い淡色
const HERO_GRAD = "linear-gradient(180deg,#ffe6cc,#fff8f0)";
const BAND_GRAD = "linear-gradient(135deg,#fb923c,#f97316)"; // オレンジ帯
const ON_ORANGE = "#fff3e8";
const WHITE = "#ffffff";

const SH_SM = "0 1px 2px rgba(120,72,24,0.06), 0 1px 3px rgba(120,72,24,0.10)";
const SH_MD = "0 6px 14px -4px rgba(120,72,24,0.14), 0 2px 6px -2px rgba(120,72,24,0.08)";
const SH_LG = "0 16px 34px -10px rgba(120,72,24,0.20), 0 4px 10px -4px rgba(120,72,24,0.10)";

let k = 0;
const uid = (p: string) => `t-ups-${p}${++k}`;

const txt = (text: string, style: TextStyle): AtomNode => ({ id: uid("t"), type: "atom", atomType: "text", name: text.slice(0, 10) || "テキスト", text, style });
const icon = (paths: string, color = ORANGE, size = 26): AtomNode => ({
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
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  quote: '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
};

// 画像スロット（差し替え用）
const photo = (minHeight: number, extra: Partial<ContainerNode> = {}): ContainerNode =>
  box({ background: "linear-gradient(135deg,#ffe0c2,#ffd0e0)", radius: 20, minHeight, align: "center", justify: "center", direction: "row", boxShadow: SH_SM, children: [icon('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>', "#e09a7a", 30)], ...extra });

const card = (children: SceneNode[], extra: Partial<ContainerNode> = {}): ContainerNode =>
  box({ background: WHITE, radius: 20, padding: 26, gap: 12, grow: true, borderWidth: 1, borderColor: LINE, boxShadow: SH_MD, children, ...extra });

// ポップさを出す丸ピルボタン
const button = (label: string, bg: string, color: string, shadow?: string): ContainerNode =>
  box({ background: bg, radius: 999, direction: "row", align: "center", justify: "center", alignSelf: "center", paddingTop: 15, paddingBottom: 15, paddingLeft: 32, paddingRight: 32, boxShadow: shadow, children: [txt(label, { fontSize: 16, fontWeight: 800, color, align: "center" })] });

const ghost = (label: string, color = ORANGE_D, border = "#f6c9a3"): ContainerNode =>
  box({ background: WHITE, radius: 999, borderWidth: 2, borderColor: border, direction: "row", align: "center", justify: "center", alignSelf: "center", paddingTop: 13, paddingBottom: 13, paddingLeft: 28, paddingRight: 28, boxShadow: SH_SM, children: [txt(label, { fontSize: 15, fontWeight: 800, color, align: "center" })] });

const numBadge = (n: string, bg = ORANGE): ContainerNode =>
  box({ background: bg, radius: 999, direction: "row", align: "center", justify: "center", alignSelf: "flex-start", paddingTop: 9, paddingBottom: 9, paddingLeft: 15, paddingRight: 15, children: [txt(n, { fontSize: 18, fontWeight: 800, color: WHITE, align: "center" })] });

// 左揃えの編集的な見出し（英字ラベルは使わず、短いアクセントバー＋見出し）。
const head = (_eyebrow: string, title: string, lead?: string, onDark = false): ContainerNode =>
  box({ gap: 12, alignSelf: "flex-start", children: [
    box({ background: onDark ? "rgba(255,255,255,0.85)" : ORANGE, minHeight: 4, width: 44, radius: 999, children: [] }),
    txt(title, { fontSize: 30, fontWeight: 800, color: onDark ? WHITE : INK, align: "left" }),
    ...(lead ? [txt(lead, { fontSize: 15, fontWeight: 400, color: onDark ? ON_ORANGE : SUB, align: "left" })] : []),
  ] });

// 小さめの1行ピル。値→ラベルの順（例：2020年 開校 / ¥0 体験）。大小を入れ替え（値=小・ラベル=大）。
const chip = (label: string, value: string): ContainerNode =>
  box({ background: WHITE, radius: 999, direction: "row", align: "center", gap: 5, alignSelf: "flex-start", boxShadow: SH_SM, borderWidth: 1, borderColor: LINE, paddingTop: 7, paddingBottom: 7, paddingLeft: 14, paddingRight: 14, children: [
    txt(value, { fontSize: 12, fontWeight: 700, color: ORANGE_D, align: "left" }),
    txt(label, { fontSize: 15, fontWeight: 800, color: INK, align: "left" }),
  ] });

const miniChip = (t: string): ContainerNode =>
  box({ background: CREAM2, radius: 999, direction: "row", alignSelf: "flex-start", paddingTop: 4, paddingBottom: 4, paddingLeft: 12, paddingRight: 12, children: [txt(t, { fontSize: 12, fontWeight: 700, color: ORANGE_D, align: "left" })] });

const LOGO = '<path d="M12 20V10"/><path d="m7 13 5-5 5 5"/><circle cx="12" cy="12" r="10"/>';

function buildPage() {
  // 1) ヘッダー
  const navLink = (l: string): AtomNode => txt(l, { fontSize: 14, fontWeight: 700, color: SUB, align: "left" });
  const header = box({
    name: "ヘッダー", direction: "row", justify: "space-between", align: "center", background: WHITE, boxShadow: SH_SM,
    paddingTop: 16, paddingBottom: 16, paddingLeft: 44, paddingRight: 44, gap: 16,
    children: [
      box({ name: "ロゴ", direction: "row", align: "center", gap: 8, children: [
        icon(LOGO, ORANGE, 24), txt("アップ進学ゼミ", { fontSize: 18, fontWeight: 800, color: INK, align: "left" }),
      ] }),
      box({ name: "ナビ", direction: "row", align: "center", gap: 20, wrap: true, children: [
        navLink("特徴"), navLink("目指すもの"), navLink("授業・料金"), navLink("入塾の流れ"), navLink("アクセス"),
        button("無料体験", ORANGE, WHITE),
      ] }),
    ],
  });

  // 2) FV（Top）
  const hero = box({
    name: "Top（FV）", background: HERO_GRAD, paddingTop: 76, paddingBottom: 76, paddingLeft: 48, paddingRight: 48,
    direction: "row", gap: 40, align: "center", wrap: true, minHeight: 500,
    children: [
      box({ name: "見出し群", gap: 18, grow: true, basis: 440, children: [
        box({ background: WHITE, radius: 999, alignSelf: "flex-start", direction: "row", boxShadow: SH_SM, paddingTop: 6, paddingBottom: 6, paddingLeft: 14, paddingRight: 14, children: [txt("和歌山市六十谷｜小中学生の学習塾", { fontSize: 13, fontWeight: 700, color: ORANGE_D, align: "left" })] }),
        txt("夢を叶える力を\nつける塾。", { fontSize: 50, fontWeight: 800, color: INK, align: "left" }),
        txt("楽しさ × 厳しさ。少人数集団授業・先取り学習・プロ講師で、\nお子さまの「やればできる」を育てます。", { fontSize: 17, fontWeight: 400, color: SUB, align: "left" }),
        box({ direction: "row", gap: 12, wrap: true, children: [button("無料体験を申し込む", ORANGE, WHITE, SH_LG), ghost("お問い合わせ")] }),
        box({ name: "実績", direction: "row", gap: 12, wrap: true, alignSelf: "stretch", marginTop: 6, children: [
          chip("開校", "2020年"), chip("授業", "少人数集団"), chip("体験", "¥0"),
        ] }),
      ] }),
      photo(380, { grow: true, basis: 380 }),
    ],
  });

  // 3) アップ進学ゼミの目指すもの
  const mission = box({
    name: "目指すもの", background: CREAM, paddingTop: 82, paddingBottom: 82, paddingLeft: 48, paddingRight: 48,
    direction: "row", gap: 40, align: "center", wrap: true,
    children: [
      box({ grow: true, basis: 400, gap: 14, children: [
        box({ background: ORANGE, minHeight: 4, width: 44, radius: 999, alignSelf: "flex-start", children: [] }),
        txt("アップ進学ゼミが\n本当に大切にしていること。", { fontSize: 32, fontWeight: 800, color: INK, align: "left" }),
        txt("コロナ禍が始まった2020年に開校しました。先行きの見えない時代を、子どもたちが強く前向きに乗り越えられるように——その想いで指導を続けています。", { fontSize: 15, fontWeight: 400, color: SUB, align: "left" }),
        box({ background: WHITE, radius: 16, borderWidth: 1, borderColor: LINE, boxShadow: SH_SM, paddingTop: 18, paddingBottom: 18, paddingLeft: 20, paddingRight: 20, gap: 8, children: [
          icon(P.quote, ORANGE, 22),
          txt("私自身が子どものころに通っていた塾は、とても楽しい場所でした。勉強は得意ではなかったけれど、先生が楽しそうに働いていた。思春期の難しい年ごろの子どもたちが、穏やかに過ごせる“居場所”でありたいと考えています。", { fontSize: 14, fontWeight: 500, color: INK, align: "left" }),
        ] }),
      ] }),
      photo(320, { grow: true, basis: 340, background: "linear-gradient(135deg,#ffd9b3,#ffe6c2)" }),
    ],
  });

  // 4) アップ進学ゼミの特徴（3点）
  // 画像×テキストを左右交互に並べる編集的レイアウト（カードの反復にしない）
  const featureRow = (i: number, no: string, title: string, body: string, tags: string[]): ContainerNode => {
    const textCol = box({ grow: true, basis: 400, gap: 14, children: [
      box({ direction: "row", align: "center", gap: 14, children: [
        txt(no, { fontSize: 44, fontWeight: 800, color: "#ffd9bb", align: "left" }),
        box({ background: ORANGE_L, radius: 999, direction: "row", alignSelf: "center", paddingTop: 5, paddingBottom: 5, paddingLeft: 14, paddingRight: 14, children: [txt("特徴", { fontSize: 12, fontWeight: 800, color: ORANGE_D, align: "left" })] }),
      ] }),
      txt(title, { fontSize: 24, fontWeight: 800, color: INK, align: "left" }),
      txt(body, { fontSize: 15, fontWeight: 400, color: SUB, align: "left" }),
      box({ direction: "row", gap: 6, wrap: true, children: tags.map(miniChip) }),
    ] });
    const img = photo(240, { grow: true, basis: 340 });
    return box({ name: `特徴${no}`, direction: "row", gap: 40, align: "center", wrap: true, alignSelf: "stretch", children: i % 2 === 0 ? [img, textCol] : [textCol, img] });
  };
  const features = box({
    name: "特徴", background: WHITE, paddingTop: 88, paddingBottom: 88, paddingLeft: 56, paddingRight: 56, gap: 48, align: "flex-start",
    children: [
      head("", "「楽しさ」と「やり切らせる管理」で、\n着実に伸ばす。"),
      featureRow(0, "01", "勉強を面白いと思える授業", "正しい勉強の習慣が身につけば、高校・大学でも困りません。人を傷つけること以外は、基本的に明るく楽しく。「面白い」から続けられます。", ["楽しい授業", "勉強の習慣"]),
      featureRow(1, "02", "やり切らせる、学習管理", "学校より約1か月先取り。授業の翌日・翌々日に宿題（オンライン課題も）。授業前の小テストは80点以上で合格。最低5回は同じ単元に触れ、定着させます。", ["1か月先取り", "小テスト80点", "5回反復"]),
      featureRow(2, "03", "子どもを引き込む、厳選講師陣", "独自の採用基準で、コミュニケーション力が高く話の面白い先生を厳選。子どもがのめり込む授業で、めげない・諦めない強い心を育てます。", ["厳選採用", "折れない心"]),
    ],
  });

  // 5) 授業内容・料金
  const courseCard = (badge: string, title: string, body: string): ContainerNode =>
    card([
      box({ background: CREAM2, radius: 999, alignSelf: "flex-start", direction: "row", paddingTop: 4, paddingBottom: 4, paddingLeft: 12, paddingRight: 12, children: [txt(badge, { fontSize: 12, fontWeight: 800, color: ORANGE_D, align: "left" })] }),
      txt(title, { fontSize: 18, fontWeight: 800, color: INK, align: "left" }),
      txt(body, { fontSize: 14, fontWeight: 400, color: SUB, align: "left" }),
    ], { gap: 10 });
  const courses = box({
    name: "授業・料金", background: CREAM, paddingTop: 82, paddingBottom: 82, paddingLeft: 48, paddingRight: 48, gap: 14, align: "center",
    children: [
      head("COURSE & PRICE", "授業内容・料金", "定期テスト対策・入試対策を軸に、学年に合わせてご案内します。"),
      box({ name: "コースカード", direction: "row", columns: 4, gap: 20, wrap: true, align: "stretch", alignSelf: "stretch", marginTop: 20, children: [
        courseCard("小学生", "小学生コース", "学ぶ楽しさと考える力を育て、中学の学習にもつながる土台をつくります。"),
        courseCard("中学生", "中学生コース", "定期テスト対策を重視。5教科対応で内申点アップと基礎学力の定着へ。"),
        courseCard("中3・受験", "高校入試対策", "土曜講習で入試対策。過去問演習で志望校合格へ得点力を鍛えます。"),
        courseCard("体験", "テスト対策 体験", "定期テスト前からスタート。まずは無料体験でお試しください。"),
      ] }),
      box({ background: WHITE, radius: 16, borderWidth: 1, borderColor: LINE, boxShadow: SH_SM, alignSelf: "stretch", marginTop: 6, direction: "row", justify: "space-between", align: "center", wrap: true, gap: 12, paddingTop: 18, paddingBottom: 18, paddingLeft: 22, paddingRight: 22, children: [
        txt("料金は学年・受講回数によって異なります。詳しくは面談時にご案内します。", { fontSize: 14, fontWeight: 600, color: INK, align: "left" }),
        button("料金を問い合わせる", ORANGE, WHITE),
      ] }),
    ],
  });

  // 6) 生徒・保護者の声
  const voiceCard = (role: string, name: string, quote: string): ContainerNode =>
    card([
      icon(P.quote, ORANGE, 22),
      txt(quote, { fontSize: 14, fontWeight: 500, color: INK, align: "left" }),
      box({ direction: "row", align: "center", gap: 10, marginTop: 2, children: [
        box({ background: ORANGE_L, radius: 999, basis: 40, minHeight: 40, alignSelf: "flex-start", direction: "row", align: "center", justify: "center", children: [icon(P.smile, ORANGE, 20)] }),
        box({ gap: 2, grow: true, children: [txt(name, { fontSize: 14, fontWeight: 800, color: INK, align: "left" }), txt(role, { fontSize: 12, fontWeight: 600, color: SUB, align: "left" })] }),
      ] }),
    ], { gap: 10 });
  const voices = box({
    name: "生徒・保護者の声", background: WHITE, paddingTop: 82, paddingBottom: 82, paddingLeft: 48, paddingRight: 48, gap: 14, align: "center",
    children: [
      head("VOICES", "生徒・保護者の声", "※ 掲載内容はサンプルです（実際の体験記に差し替えます）。"),
      box({ name: "声カード", direction: "row", columns: 3, gap: 20, wrap: true, align: "stretch", alignSelf: "stretch", marginTop: 20, children: [
        voiceCard("中2 保護者", "H さん", "授業が楽しいようで、家でも自分から勉強するようになりました。テストの点数も上がって驚いています。"),
        voiceCard("中3 生徒", "K さん", "先生の話が面白くて、苦手だった数学が好きになりました。先取りのおかげで学校の授業も分かります。"),
        voiceCard("小6 保護者", "M さん", "少人数で目が届き、質問しやすいそうです。勉強の習慣がついたのが一番うれしいです。"),
      ] }),
    ],
  });

  // 7) 入塾までの流れ
  const step = (no: string, title: string, desc: string): ContainerNode =>
    card([
      box({ direction: "row", align: "center", gap: 12, children: [numBadge(no), txt(title, { fontSize: 17, fontWeight: 800, color: INK, align: "left" })] }),
      txt(desc, { fontSize: 14, fontWeight: 400, color: SUB, align: "left" }),
    ], { padding: 22 });
  const flow = box({
    name: "入塾の流れ", background: CREAM, paddingTop: 82, paddingBottom: 82, paddingLeft: 48, paddingRight: 48, gap: 14, align: "center",
    children: [
      head("FLOW", "入塾までの流れ"),
      box({ name: "ステップ", direction: "row", columns: 4, gap: 20, wrap: true, align: "stretch", alignSelf: "stretch", marginTop: 20, children: [
        step("1", "お問い合わせ", "電話・メール・フォームでお気軽にご連絡ください。"),
        step("2", "面談・学習相談", "現状とご希望を伺い、最適なプランをご提案します。"),
        step("3", "無料体験授業", "実際の授業を体験。“面白い・わかる”を実感できます。"),
        step("4", "入塾・スタート", "目標に向けて、少人数集団で学習を始めます。"),
      ] }),
    ],
  });

  // 8) よくある質問（FAQ）
  const faqRow = (q: string): ContainerNode =>
    box({ direction: "row", align: "center", justify: "space-between", gap: 12, background: WHITE, radius: 14, borderWidth: 1, borderColor: LINE, boxShadow: SH_SM, paddingTop: 18, paddingBottom: 18, paddingLeft: 20, paddingRight: 20, children: [
      box({ direction: "row", align: "center", gap: 12, grow: true, children: [
        box({ background: ORANGE_L, radius: 10, direction: "row", alignSelf: "center", paddingTop: 4, paddingBottom: 4, paddingLeft: 10, paddingRight: 10, children: [txt("Q", { fontSize: 14, fontWeight: 800, color: ORANGE_D, align: "center" })] }),
        txt(q, { fontSize: 14, fontWeight: 700, color: INK, align: "left" }),
      ] }),
      icon(P.chevron, SUB, 20),
    ] });
  const faq = box({
    name: "FAQ", background: WHITE, paddingTop: 82, paddingBottom: 82, paddingLeft: 48, paddingRight: 48, gap: 14, align: "center",
    children: [
      head("FAQ", "よくあるご質問"),
      box({ name: "質問", gap: 12, alignSelf: "stretch", marginTop: 20, children: [
        faqRow("どちらの小学校・中学校から来られている生徒が多いですか？"),
        faqRow("今通っている塾で成績が伸びないのですが、大丈夫でしょうか？"),
        faqRow("体験授業は無料ですか？何度でも受けられますか？"),
        faqRow("部活や習い事と両立できますか？"),
        faqRow("入塾のタイミングはいつでも大丈夫ですか？"),
      ] }),
    ],
  });

  // 9) 教室情報・アクセス
  const access = box({
    name: "教室情報・アクセス", background: CREAM, paddingTop: 82, paddingBottom: 82, paddingLeft: 48, paddingRight: 48, gap: 14, align: "center",
    children: [
      head("ACCESS", "教室情報・アクセス"),
      box({ direction: "row", gap: 28, align: "stretch", wrap: true, alignSelf: "stretch", marginTop: 20, children: [
        photo(280, { grow: true, basis: 360, background: "linear-gradient(135deg,#e9efe4,#ffe9d6)" }),
        card([
          box({ direction: "row", align: "center", gap: 8, children: [icon(P.pin, ORANGE, 20), txt("アップ進学ゼミ", { fontSize: 18, fontWeight: 800, color: INK, align: "left" })] }),
          txt("和歌山県和歌山市六十谷9-5", { fontSize: 14, fontWeight: 400, color: SUB, align: "left" }),
          box({ direction: "row", align: "center", gap: 8, children: [icon(P.phone, ORANGE, 18), txt("073-499-8007", { fontSize: 18, fontWeight: 800, color: INK, align: "left" })] }),
          txt("受付：月〜土 13:00〜17:00", { fontSize: 13, fontWeight: 700, color: ORANGE_D, align: "left" }),
          txt("メール：info@upshingaku.com", { fontSize: 13, fontWeight: 400, color: SUB, align: "left" }),
        ], { grow: true, basis: 320 }),
      ] }),
    ],
  });

  // 10) お問い合わせ（問い合わせ導線を強化：課題=問い合わせが少ない）
  const cta = box({
    name: "お問い合わせ", background: WHITE, paddingTop: 84, paddingBottom: 84, paddingLeft: 48, paddingRight: 48, align: "center",
    children: [
      box({ name: "CTAカード", background: BAND_GRAD, radius: 28, alignSelf: "stretch", boxShadow: SH_LG, paddingTop: 60, paddingBottom: 60, paddingLeft: 40, paddingRight: 40, gap: 16, align: "center", children: [
        txt("まずは、無料体験へ。", { fontSize: 34, fontWeight: 800, color: WHITE, align: "center" }),
        txt("しつこい勧誘はありません。授業の“面白さ”を、そのままお確かめください。", { fontSize: 16, fontWeight: 400, color: ON_ORANGE, align: "center" }),
        box({ direction: "row", align: "center", gap: 8, children: [icon(P.phone, WHITE, 22), txt("073-499-8007", { fontSize: 30, fontWeight: 800, color: WHITE, align: "center" })] }),
        txt("受付：月〜土 13:00〜17:00 ／ info@upshingaku.com", { fontSize: 13, fontWeight: 600, color: ON_ORANGE, align: "center" }),
        box({ direction: "row", gap: 12, wrap: true, justify: "center", marginTop: 4, children: [button("無料体験を申し込む", WHITE, ORANGE_D, SH_LG), ghost("資料を請求する", WHITE, "rgba(255,255,255,0.7)")] }),
      ] }),
    ],
  });

  // 11) フッター
  const fCol = (title: string, items: string[]): ContainerNode =>
    box({ gap: 8, children: [
      txt(title, { fontSize: 12, fontWeight: 800, color: "#ffcca8", align: "left" }),
      ...items.map((it) => txt(it, { fontSize: 13, fontWeight: 400, color: "#c9bdb0", align: "left" })),
    ] });
  const footer = box({
    name: "フッター", background: "#2a2016", paddingTop: 48, paddingBottom: 32, paddingLeft: 48, paddingRight: 48, gap: 28,
    children: [
      box({ direction: "row", justify: "space-between", wrap: true, gap: 28, alignSelf: "stretch", children: [
        box({ gap: 8, basis: 260, children: [
          box({ direction: "row", align: "center", gap: 8, children: [icon(LOGO, "#ffb27a", 22), txt("アップ進学ゼミ", { fontSize: 16, fontWeight: 800, color: WHITE, align: "left" })] }),
          txt("夢を叶える力をつける塾", { fontSize: 13, fontWeight: 400, color: "#c9bdb0", align: "left" }),
          txt("和歌山県和歌山市六十谷9-5", { fontSize: 12, fontWeight: 400, color: "#c9bdb0", align: "left" }),
        ] }),
        fCol("メニュー", ["特徴", "目指すもの", "授業・料金", "入塾の流れ", "FAQ"]),
        fCol("アクセス", ["和歌山市六十谷", "受付 月〜土 13:00〜17:00"]),
        fCol("お問い合わせ", ["073-499-8007", "info@upshingaku.com"]),
      ] }),
      txt("© アップ進学ゼミ", { fontSize: 12, fontWeight: 500, color: "#8a7d6d", align: "center" }),
    ],
  });

  const raw = [header, hero, mission, features, courses, voices, flow, faq, access, cta, footer];
  const sections = raw.map((s) => ({ ...s, type: "section" as const }));
  return { id: uid("page"), name: "アップ進学ゼミ トップページ", children: sections };
}

export const UPS_TEMPLATE_ID = "t-upshingaku-lp";

export function buildUpShingakuTemplate(): PageTemplate {
  k = 0;
  return { id: UPS_TEMPLATE_ID, name: "アップ進学ゼミ トップページ（ポップ・オレンジ）", page: buildPage() };
}
