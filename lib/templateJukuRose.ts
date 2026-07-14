// 追加テンプレート（サンプル2）。参考サイトを模した「少人数・読解専科の進学塾LP」。
// くすみローズ × ネイビーの配色で、ヒーロー/お知らせ/お悩み/独自メソッド(濃色)/特徴/合格実績/
// ビフォーアフター/講師紹介/コース料金/ブログ/FAQ/入塾の流れ/教室案内/ギャラリー/CTA/フッターを構成。
// 名称・連絡先・実績はすべて架空。画像は差し替え用のプレースホルダー。

import type { PageTemplate, SceneNode, ContainerNode, AtomNode, TextStyle } from "./types";

// --- カラーシステム（ローズ＋ネイビー＋温かいニュートラル） ---
const ROSE = "#cf6f8a";      // アクセント（ボタン等）
const ROSE_D = "#b0546f";    // 濃いローズ（文字）
const ROSE_L = "#f6e2e8";    // 淡いローズ（バッジ/カード縁）
const ROSE_LL = "#fbf1f4";   // ごく淡いローズ（お悩みカード背景）
const NAVY = "#232d4d";      // 濃色セクション/フッター
const INK = "#2b2f3a";       // 見出し・本文
const SUB = "#6b7280";       // 補助テキスト
const ON_NAVY = "#c7cde0";   // 濃色背景上のサブ
const LINE = "#ece6e0";      // 枠線（温かい）
const BG = "#faf6f1";        // セクション背景（クリーム）
const BG2 = "#f3ede4";       // カード内ノート/薄背景
const WHITE = "#ffffff";

const SH_SM = "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.10)";
const SH_MD = "0 4px 6px -1px rgba(16,24,40,0.08), 0 2px 4px -2px rgba(16,24,40,0.06)";
const SH_LG = "0 10px 15px -3px rgba(16,24,40,0.08), 0 4px 6px -4px rgba(16,24,40,0.05)";

let k = 0;
const uid = (p: string) => `t-aoi-${p}${++k}`;

const txt = (text: string, style: TextStyle): AtomNode => ({ id: uid("t"), type: "atom", atomType: "text", name: text.slice(0, 10) || "テキスト", text, style });
const icon = (paths: string, color = ROSE, size = 24): AtomNode => ({
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

// アイコンパス
const P_CHECK = '<path d="M20 6 9 17l-5-5"/>';
const P_HELP = '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>';
const P_IMG = '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>';
const P_USER = '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>';
const P_CHEV = '<path d="m6 9 6 6 6-6"/>';
const P_PIN = '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>';

// 画像スロット（差し替え前提のプレースホルダー）
const photo = (minHeight: number, extra: Partial<ContainerNode> = {}): ContainerNode =>
  box({ background: "linear-gradient(135deg,#e7e2ef,#f2e3e8)", radius: 16, minHeight, align: "center", justify: "center", direction: "row", boxShadow: SH_SM, children: [icon(P_IMG, "#b6a7bd", 30)], ...extra });

// 白カード（枠線＋控えめな影）
const card = (children: SceneNode[], extra: Partial<ContainerNode> = {}): ContainerNode =>
  box({ background: WHITE, radius: 16, padding: 24, gap: 12, grow: true, borderWidth: 1, borderColor: LINE, boxShadow: SH_MD, children, ...extra });

// 塗りボタン
const button = (label: string, bg: string, color: string, shadow?: string): ContainerNode =>
  box({ background: bg, radius: 12, direction: "row", align: "center", justify: "center", alignSelf: "center", paddingTop: 15, paddingBottom: 15, paddingLeft: 28, paddingRight: 28, boxShadow: shadow, children: [
    txt(label, { fontSize: 15, fontWeight: 700, color, align: "center" }),
  ] });

// 線ボタン（サブ）
const ghost = (label: string): ContainerNode =>
  box({ background: WHITE, radius: 12, borderWidth: 1, borderColor: ROSE, direction: "row", align: "center", justify: "center", alignSelf: "center", paddingTop: 14, paddingBottom: 14, paddingLeft: 26, paddingRight: 26, boxShadow: SH_SM, children: [
    txt(label, { fontSize: 15, fontWeight: 700, color: ROSE_D, align: "center" }),
  ] });

// 丸番号バッジ
const numBadge = (n: string, bg = ROSE): ContainerNode =>
  box({ background: bg, radius: 999, direction: "row", align: "center", justify: "center", alignSelf: "flex-start", paddingTop: 9, paddingBottom: 9, paddingLeft: 14, paddingRight: 14, children: [
    txt(n, { fontSize: 15, fontWeight: 800, color: WHITE, align: "center" }),
  ] });

// セクション見出し（アイブロウ＋タイトル＋リード）
const head = (eyebrow: string, title: string, lead?: string, onDark = false): AtomNode[] => [
  txt(eyebrow, { fontSize: 13, fontWeight: 800, color: ROSE_D, align: "center" }),
  txt(title, { fontSize: 32, fontWeight: 800, color: onDark ? WHITE : INK, align: "center" }),
  ...(lead ? [txt(lead, { fontSize: 16, fontWeight: 400, color: onDark ? ON_NAVY : SUB, align: "center" })] : []),
];

function buildPage() {
  // 1) ヘッダー
  const navLink = (l: string): AtomNode => txt(l, { fontSize: 14, fontWeight: 600, color: SUB, align: "left" });
  const header = box({
    name: "ヘッダー", direction: "row", justify: "space-between", align: "center", background: WHITE, boxShadow: SH_SM,
    paddingTop: 16, paddingBottom: 16, paddingLeft: 48, paddingRight: 48, gap: 16,
    children: [
      box({ name: "ロゴ", direction: "row", align: "center", gap: 8, children: [
        icon('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>', ROSE, 24),
        txt("アオイ国語専科ゼミ", { fontSize: 18, fontWeight: 800, color: INK, align: "left" }),
      ] }),
      box({ name: "ナビ", direction: "row", align: "center", gap: 20, wrap: true, children: [
        navLink("特徴"), navLink("コース・料金"), navLink("合格実績"), navLink("よくある質問"), navLink("教室案内"),
        button("無料体験", ROSE, WHITE),
      ] }),
    ],
  });

  // 2) ヒーロー
  const hero = box({
    name: "ヒーロー", background: "linear-gradient(180deg,#f9edf0,#faf6f1)", paddingTop: 72, paddingBottom: 72, paddingLeft: 48, paddingRight: 48,
    direction: "row", gap: 40, align: "center", wrap: true, minHeight: 480,
    children: [
      box({ name: "見出し群", gap: 18, grow: true, basis: 420, children: [
        box({ background: ROSE_L, radius: 999, alignSelf: "flex-start", direction: "row", paddingTop: 6, paddingBottom: 6, paddingLeft: 14, paddingRight: 14, children: [txt("少人数 × 読解専科", { fontSize: 13, fontWeight: 700, color: ROSE_D, align: "left" })] }),
        txt("伸び悩む受験生の、\n最後の砦。", { fontSize: 44, fontWeight: 800, color: INK, align: "left" }),
        txt("少人数指導 × 読解力で、国語を“武器”に変える。\nひとりの「わからない」に、とことん向き合う進学ゼミです。", { fontSize: 17, fontWeight: 400, color: SUB, align: "left" }),
        box({ direction: "row", gap: 12, wrap: true, children: [button("無料体験を申し込む", ROSE, WHITE, SH_LG), ghost("資料を請求する")] }),
      ] }),
      photo(360, { grow: true, basis: 380, background: "linear-gradient(135deg,#e3e6f0,#f2e2e7)" }),
    ],
  });

  // 3) お知らせ
  const newsRow = (date: string, tag: string, title: string): ContainerNode =>
    box({ direction: "row", align: "center", gap: 16, wrap: true, background: WHITE, radius: 12, borderWidth: 1, borderColor: LINE, boxShadow: SH_SM, paddingTop: 16, paddingBottom: 16, paddingLeft: 20, paddingRight: 20, children: [
      txt(date, { fontSize: 13, fontWeight: 700, color: SUB, align: "left" }),
      box({ background: ROSE_L, radius: 999, direction: "row", alignSelf: "center", paddingTop: 4, paddingBottom: 4, paddingLeft: 12, paddingRight: 12, children: [txt(tag, { fontSize: 12, fontWeight: 700, color: ROSE_D, align: "center" })] }),
      txt(title, { fontSize: 14, fontWeight: 600, color: INK, align: "left" }),
    ] });
  const news = box({
    name: "お知らせ", background: BG, paddingTop: 64, paddingBottom: 64, paddingLeft: 48, paddingRight: 48, gap: 12, align: "center",
    children: [
      txt("2026年度 冬期講習のご案内", { fontSize: 28, fontWeight: 800, color: INK, align: "center" }),
      box({ name: "一覧", gap: 12, alignSelf: "stretch", marginTop: 16, children: [
        newsRow("2026.01.10", "講習", "冬期講習の追加受付を開始しました（残りわずか）。"),
        newsRow("2025.12.02", "重要", "年末年始の休講日についてのお知らせ。"),
        newsRow("2025.11.18", "イベント", "保護者向け「入試説明会」を開催します。"),
        newsRow("2025.11.01", "お知らせ", "新しい教室（青葉台校）を開設しました。"),
      ] }),
    ],
  });

  // 4) お悩み
  const painCard = (t: string): ContainerNode =>
    box({ background: ROSE_LL, radius: 14, borderWidth: 1, borderColor: ROSE_L, direction: "row", align: "center", gap: 12, grow: true, paddingTop: 20, paddingBottom: 20, paddingLeft: 22, paddingRight: 22, children: [
      icon(P_HELP, ROSE_D, 22), txt(t, { fontSize: 14, fontWeight: 600, color: INK, align: "left" }),
    ] });
  const worries = box({
    name: "お悩み", background: WHITE, paddingTop: 76, paddingBottom: 76, paddingLeft: 48, paddingRight: 48, gap: 12, align: "center",
    children: [
      txt("こんなお悩み、ありませんか？", { fontSize: 30, fontWeight: 800, color: INK, align: "center" }),
      box({ name: "悩みカード", direction: "row", columns: 2, gap: 16, wrap: true, align: "stretch", alignSelf: "stretch", marginTop: 20, children: [
        painCard("国語の点数が、なかなか安定しない。"),
        painCard("文章題になると、途端に手が止まる。"),
        painCard("大人数の塾では、質問しづらい。"),
        painCard("勉強のやり方そのものが分からない。"),
      ] }),
      txt("その原因の多くは、「読む力」にあります。", { fontSize: 15, fontWeight: 700, color: ROSE_D, align: "center", }),
    ],
  });

  // 5) メソッド（濃色）
  const methodCard = (no: string, title: string, body: string): ContainerNode =>
    box({ background: "rgba(255,255,255,0.05)", radius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", grow: true, gap: 10, paddingTop: 28, paddingBottom: 28, paddingLeft: 26, paddingRight: 26, children: [
      txt(no, { fontSize: 34, fontWeight: 800, color: ROSE, align: "left" }),
      txt(title, { fontSize: 18, fontWeight: 700, color: WHITE, align: "left" }),
      txt(body, { fontSize: 14, fontWeight: 400, color: ON_NAVY, align: "left" }),
    ] });
  const method = box({
    name: "メソッド", background: NAVY, paddingTop: 80, paddingBottom: 80, paddingLeft: 48, paddingRight: 48, gap: 14, align: "center",
    children: [
      ...head("METHOD", "ヨミトキ・メソッドとは", "すべての教科の土台は「読む力」。文章の構造を読み解く独自メソッドで、点数を伸ばします。", true),
      box({ name: "手順", direction: "row", columns: 3, gap: 20, wrap: true, align: "stretch", alignSelf: "stretch", marginTop: 20, children: [
        methodCard("01", "構造を捉える", "文章を「筆者の主張」「根拠」「具体例」に分解し、地図のように読み解きます。"),
        methodCard("02", "問いを翻訳する", "設問が何を要求しているかを言い換え、答えの範囲を正確に特定します。"),
        methodCard("03", "型を身につける", "解法の型を反復し、初見の文章でも再現できる読解力に定着させます。"),
      ] }),
      photo(240, { alignSelf: "stretch", marginTop: 8, background: "linear-gradient(135deg,#313c62,#3c3550)" }),
    ],
  });

  // 6) 特徴
  const featCard = (title: string, body: string, note: string): ContainerNode =>
    card([
      txt(title, { fontSize: 18, fontWeight: 700, color: INK, align: "left" }),
      txt(body, { fontSize: 14, fontWeight: 400, color: SUB, align: "left" }),
      box({ background: BG2, radius: 10, paddingTop: 12, paddingBottom: 12, paddingLeft: 14, paddingRight: 14, children: [txt(note, { fontSize: 12, fontWeight: 700, color: ROSE_D, align: "left" })] }),
    ]);
  const features = box({
    name: "特徴", background: BG, paddingTop: 80, paddingBottom: 80, paddingLeft: 48, paddingRight: 48, gap: 14, align: "center",
    children: [
      ...head("FEATURES", "読解専科ゼミの特徴", "少人数だからできる、一人ひとりに最適化した指導。"),
      box({ name: "特徴カード", direction: "row", columns: 3, gap: 20, wrap: true, align: "stretch", alignSelf: "stretch", marginTop: 20, children: [
        featCard("最大6名の少人数指導", "講師の目が全員に届く人数に限定。質問しやすい距離感で理解を積み上げます。", "1クラス最大6名"),
        featCard("読解を軸にした全教科対応", "国語で培った読む力を、英語・理社の記述にも応用。教科横断で得点を底上げ。", "5教科サポート"),
        featCard("毎週の理解度チェック", "小テストと面談で定着を可視化。つまずきを翌週に持ち越しません。", "週次フィードバック"),
      ] }),
    ],
  });

  // 7) 合格実績
  const schoolChip = (n: string): ContainerNode =>
    box({ background: WHITE, radius: 999, borderWidth: 1, borderColor: LINE, boxShadow: SH_SM, direction: "row", align: "center", paddingTop: 10, paddingBottom: 10, paddingLeft: 18, paddingRight: 18, children: [txt(n, { fontSize: 14, fontWeight: 700, color: INK, align: "center" })] });
  const results = box({
    name: "合格実績", background: WHITE, paddingTop: 72, paddingBottom: 72, paddingLeft: 48, paddingRight: 48, gap: 12, align: "center",
    children: [
      ...head("RESULTS", "合格実績", "※ 掲載はすべて架空のサンプルです。"),
      box({ name: "学校名", direction: "row", gap: 10, wrap: true, justify: "center", alignSelf: "stretch", marginTop: 16, children: [
        schoolChip("県立青葉高校"), schoolChip("第一学院高校"), schoolChip("みらい大学附属高校"), schoolChip("中央総合高校"),
        schoolChip("青嶺高校"), schoolChip("わかば国際高校"), schoolChip("東雲大学"), schoolChip("明幸大学"),
      ] }),
    ],
  });

  // 8) ビフォーアフター
  const statRow = (label: string, value: string): ContainerNode =>
    box({ direction: "row", justify: "space-between", align: "center", background: WHITE, radius: 12, borderWidth: 1, borderColor: LINE, boxShadow: SH_SM, paddingTop: 16, paddingBottom: 16, paddingLeft: 20, paddingRight: 20, gap: 12, children: [
      txt(label, { fontSize: 14, fontWeight: 700, color: INK, align: "left" }),
      txt(value, { fontSize: 15, fontWeight: 800, color: ROSE_D, align: "right" }),
    ] });
  const change = box({
    name: "変化", background: BG, paddingTop: 80, paddingBottom: 80, paddingLeft: 48, paddingRight: 48, direction: "row", gap: 40, align: "center", wrap: true,
    children: [
      box({ grow: true, basis: 380, gap: 14, children: [
        txt("BEFORE / AFTER", { fontSize: 13, fontWeight: 800, color: ROSE_D, align: "left" }),
        txt("読解力は、\nここまで変わります。", { fontSize: 32, fontWeight: 800, color: INK, align: "left" }),
        txt("「なんとなく」で読んでいた文章を、根拠を持って読めるように。数字は架空のサンプルです。", { fontSize: 15, fontWeight: 400, color: SUB, align: "left" }),
        box({ gap: 10, children: [
          statRow("入塾3ヶ月", "国語 62 → 84 点"),
          statRow("模試の偏差値", "51 → 61"),
          statRow("記述の得点率", "40% → 78%"),
        ] }),
      ] }),
      photo(320, { grow: true, basis: 360 }),
    ],
  });

  // 9) 私たちの想い（講師紹介）
  const avatar = (): ContainerNode =>
    box({ background: "linear-gradient(135deg,#dfe3ef,#f0e2e7)", radius: 999, basis: 76, minHeight: 76, alignSelf: "flex-start", direction: "row", align: "center", justify: "center", children: [icon(P_USER, "#98a0bb", 30)] });
  const profile = (name: string, role: string, bio: string): ContainerNode =>
    box({ direction: "row", gap: 20, align: "flex-start", alignSelf: "stretch", background: WHITE, radius: 16, borderWidth: 1, borderColor: LINE, boxShadow: SH_MD, paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, children: [
      avatar(),
      box({ gap: 6, grow: true, children: [
        txt(name, { fontSize: 18, fontWeight: 800, color: INK, align: "left" }),
        txt(role, { fontSize: 13, fontWeight: 700, color: ROSE_D, align: "left" }),
        txt(bio, { fontSize: 14, fontWeight: 400, color: SUB, align: "left" }),
      ] }),
    ] });
  const message = box({
    name: "私たちの想い", background: WHITE, paddingTop: 80, paddingBottom: 80, paddingLeft: 48, paddingRight: 48, gap: 14, align: "center",
    children: [
      ...head("OUR THOUGHTS", "私たちの想い"),
      box({ gap: 16, alignSelf: "stretch", marginTop: 20, children: [
        profile("室長 / 佐倉 みなと", "国語・小論文担当", "「読める」ようになると、世界の解像度が上がります。目先の点数だけでなく、一生ものの読む力を一緒に育てたいと考えています。"),
        profile("主任講師 / 大和田 かおる", "英語・数学担当", "わからないをそのままにしない。少人数だからこそできる、一人ひとりのペースに寄り添った指導を大切にしています。"),
      ] }),
    ],
  });

  // 10) コース・料金
  const courseCard = (title: string, price: string, feats: string[], cta: string): ContainerNode =>
    card([
      txt(title, { fontSize: 18, fontWeight: 800, color: INK, align: "left" }),
      txt(price, { fontSize: 15, fontWeight: 700, color: ROSE_D, align: "left" }),
      ...feats.map((f) => box({ direction: "row", gap: 8, align: "center", children: [icon(P_CHECK, ROSE, 18), txt(f, { fontSize: 14, fontWeight: 400, color: SUB, align: "left" })] })),
      button(cta, ROSE, WHITE),
    ], { gap: 12 });
  const courses = box({
    name: "コース・料金", background: BG, paddingTop: 80, paddingBottom: 80, paddingLeft: 48, paddingRight: 48, gap: 14, align: "center",
    children: [
      ...head("COURSES", "コース・料金案内", "学年・目的に合わせて選べます。料金はすべて架空の目安です。"),
      box({ name: "コースカード", direction: "row", columns: 2, gap: 20, wrap: true, align: "stretch", alignSelf: "stretch", marginTop: 20, children: [
        courseCard("読解ベーシック（小学生）", "月額 15,000円〜（税込・目安）", ["週1回・国語読解", "最大6名の少人数", "毎週の理解度チェック"], "このコースを相談する"),
        courseCard("受験レギュラー（中学生）", "月額 24,000円〜（税込・目安）", ["週2回・5教科対応", "定期テスト対策込み", "月1回の個別面談"], "このコースを相談する"),
        courseCard("高校入試 直前特訓", "1講座 18,000円〜（税込・目安）", ["過去問演習中心", "記述添削サポート", "志望校別カリキュラム"], "このコースを相談する"),
        courseCard("無料 体験クラス", "0円（何度でも）", ["実際の授業に参加", "学習相談つき", "勧誘は一切なし"], "体験を申し込む"),
      ] }),
    ],
  });

  // 11) ブログ
  const blogCard = (date: string, title: string, excerpt: string): ContainerNode =>
    card([
      photo(150, { radius: 12 }),
      txt(date, { fontSize: 12, fontWeight: 700, color: ROSE_D, align: "left" }),
      txt(title, { fontSize: 16, fontWeight: 700, color: INK, align: "left" }),
      txt(excerpt, { fontSize: 13, fontWeight: 400, color: SUB, align: "left" }),
    ], { padding: 16, gap: 10 });
  const blog = box({
    name: "ブログ", background: WHITE, paddingTop: 80, paddingBottom: 80, paddingLeft: 48, paddingRight: 48, gap: 14, align: "center",
    children: [
      ...head("BLOG", "お知らせ・ブログ"),
      box({ name: "記事", direction: "row", columns: 3, gap: 20, wrap: true, align: "stretch", alignSelf: "stretch", marginTop: 20, children: [
        blogCard("2026.01.20", "冬休みの読解トレーニング3選", "家庭でできる、読む力を鍛える簡単な習慣を紹介します。"),
        blogCard("2025.12.15", "記述問題で点を落とさないコツ", "採点者に伝わる答案の書き方を、例文つきで解説します。"),
        blogCard("2025.11.28", "面談で保護者からよく出る質問", "学習の悩みに、講師がお答えした内容をまとめました。"),
      ] }),
    ],
  });

  // 12) FAQ
  const faqRow = (q: string): ContainerNode =>
    box({ direction: "row", align: "center", justify: "space-between", gap: 12, background: WHITE, radius: 12, borderWidth: 1, borderColor: LINE, boxShadow: SH_SM, paddingTop: 18, paddingBottom: 18, paddingLeft: 20, paddingRight: 20, children: [
      box({ direction: "row", align: "center", gap: 12, grow: true, children: [
        box({ background: ROSE_L, radius: 8, direction: "row", alignSelf: "center", paddingTop: 4, paddingBottom: 4, paddingLeft: 10, paddingRight: 10, children: [txt("Q", { fontSize: 14, fontWeight: 800, color: ROSE_D, align: "center" })] }),
        txt(q, { fontSize: 14, fontWeight: 600, color: INK, align: "left" }),
      ] }),
      icon(P_CHEV, SUB, 20),
    ] });
  const faq = box({
    name: "よくある質問", background: BG, paddingTop: 80, paddingBottom: 80, paddingLeft: 48, paddingRight: 48, gap: 14, align: "center",
    children: [
      ...head("FAQ", "よくあるご質問"),
      box({ name: "質問", gap: 12, alignSelf: "stretch", marginTop: 20, children: [
        faqRow("授業についていけるか不安です。大丈夫でしょうか？"),
        faqRow("部活と両立できますか？"),
        faqRow("体験授業は本当に無料ですか？"),
        faqRow("入塾のタイミングはいつでも良いですか？"),
        faqRow("兄弟割引などはありますか？"),
      ] }),
    ],
  });

  // 13) 入塾の流れ（縦タイムライン）
  const tstep = (no: string, title: string, desc: string): ContainerNode =>
    box({ direction: "row", gap: 16, align: "flex-start", alignSelf: "stretch", children: [
      numBadge(no),
      box({ grow: true, gap: 4, background: WHITE, radius: 12, borderWidth: 1, borderColor: LINE, boxShadow: SH_SM, paddingTop: 16, paddingBottom: 16, paddingLeft: 18, paddingRight: 18, children: [
        txt(title, { fontSize: 16, fontWeight: 700, color: INK, align: "left" }),
        txt(desc, { fontSize: 13, fontWeight: 400, color: SUB, align: "left" }),
      ] }),
    ] });
  const flow = box({
    name: "入塾の流れ", background: WHITE, paddingTop: 80, paddingBottom: 80, paddingLeft: 48, paddingRight: 48, gap: 14, align: "center",
    children: [
      ...head("FLOW", "入塾までの流れ"),
      box({ name: "ステップ", gap: 14, alignSelf: "stretch", marginTop: 20, children: [
        tstep("1", "お問い合わせ", "電話・メール・フォームからお気軽にご連絡ください。"),
        tstep("2", "学習相談・面談", "現状の成績とご希望を伺い、最適なプランをご提案します。"),
        tstep("3", "無料体験授業", "実際のクラスに参加。雰囲気と“わかる”を体験できます。"),
        tstep("4", "入塾・スタート", "目標に向けて、少人数クラスで学習を始めます。"),
      ] }),
    ],
  });

  // 14) 教室案内
  const roomCard = (name: string, addr: string, hours: string): ContainerNode =>
    card([
      photo(160, { radius: 12, background: "linear-gradient(135deg,#e6ebe4,#eee4e7)" }),
      box({ direction: "row", align: "center", gap: 8, children: [icon(P_PIN, ROSE_D, 20), txt(name, { fontSize: 17, fontWeight: 800, color: INK, align: "left" })] }),
      txt(addr, { fontSize: 13, fontWeight: 400, color: SUB, align: "left" }),
      txt(hours, { fontSize: 13, fontWeight: 700, color: ROSE_D, align: "left" }),
    ], { padding: 16, gap: 8 });
  const rooms = box({
    name: "教室案内", background: BG, paddingTop: 80, paddingBottom: 80, paddingLeft: 48, paddingRight: 48, gap: 14, align: "center",
    children: [
      ...head("ACCESS", "教室情報", "所在地・連絡先はすべて架空のサンプルです。"),
      box({ name: "教室", direction: "row", columns: 2, gap: 20, wrap: true, align: "stretch", alignSelf: "stretch", marginTop: 20, children: [
        roomCard("青葉台校（本校）", "〇〇県〇〇市青葉台0-0-0 みらいビル2F", "受付：月〜土 14:00〜21:00"),
        roomCard("さくら通り校", "〇〇県〇〇市さくら通り0-0-0 学びプラザ3F", "受付：月〜土 14:00〜21:00"),
      ] }),
    ],
  });

  // 15) ギャラリー
  const gallery = box({
    name: "ギャラリー", background: WHITE, paddingTop: 40, paddingBottom: 56, paddingLeft: 48, paddingRight: 48, gap: 12, align: "center",
    children: [
      box({ direction: "row", gap: 12, wrap: true, alignSelf: "stretch", children: [
        photo(110, { grow: true, basis: 130 }), photo(110, { grow: true, basis: 130 }), photo(110, { grow: true, basis: 130 }),
        photo(110, { grow: true, basis: 130 }), photo(110, { grow: true, basis: 130 }), photo(110, { grow: true, basis: 130 }),
      ] }),
    ],
  });

  // 16) CTA（内包カード）
  const cta = box({
    name: "お問い合わせ", background: BG, paddingTop: 80, paddingBottom: 80, paddingLeft: 48, paddingRight: 48, align: "center",
    children: [
      box({ name: "CTAカード", background: NAVY, radius: 24, alignSelf: "stretch", boxShadow: SH_LG, paddingTop: 64, paddingBottom: 64, paddingLeft: 40, paddingRight: 40, gap: 16, align: "center", children: [
        txt("まずは、無料の体験をご覧ください。", { fontSize: 32, fontWeight: 800, color: WHITE, align: "center" }),
        txt("しつこい勧誘は一切ありません。授業の雰囲気を、そのままお確かめいただけます。", { fontSize: 16, fontWeight: 400, color: ON_NAVY, align: "center" }),
        box({ direction: "row", gap: 12, wrap: true, justify: "center", children: [button("無料体験を申し込む", ROSE, WHITE, SH_LG), ghost("資料を請求する")] }),
        txt("お電話：000-0000-0000 ／ メール：info@example.com", { fontSize: 13, fontWeight: 600, color: ON_NAVY, align: "center" }),
      ] }),
    ],
  });

  // 17) フッター
  const fCol = (title: string, items: string[]): ContainerNode =>
    box({ gap: 8, children: [
      txt(title, { fontSize: 12, fontWeight: 800, color: ROSE, align: "left" }),
      ...items.map((it) => txt(it, { fontSize: 13, fontWeight: 400, color: "#9aa2b8", align: "left" })),
    ] });
  const footer = box({
    name: "フッター", background: NAVY, paddingTop: 48, paddingBottom: 32, paddingLeft: 48, paddingRight: 48, gap: 28,
    children: [
      box({ direction: "row", justify: "space-between", wrap: true, gap: 28, alignSelf: "stretch", children: [
        box({ gap: 8, children: [
          box({ direction: "row", align: "center", gap: 8, children: [icon('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>', "#e6a9ba", 22), txt("アオイ国語専科ゼミ", { fontSize: 16, fontWeight: 800, color: WHITE, align: "left" })] }),
          txt("少人数指導 × 読解力で、国語を武器に。", { fontSize: 13, fontWeight: 400, color: "#9aa2b8", align: "left" }),
        ] }),
        fCol("メニュー", ["特徴", "コース・料金", "合格実績", "よくある質問"]),
        fCol("教室案内", ["青葉台校（本校）", "さくら通り校", "アクセス"]),
        fCol("お問い合わせ", ["000-0000-0000", "info@example.com", "受付：月〜土 14:00〜21:00"]),
      ] }),
      txt("© アオイ国語専科ゼミ", { fontSize: 12, fontWeight: 500, color: "#7a8290", align: "center" }),
    ],
  });

  const raw = [header, hero, news, worries, method, features, results, change, message, courses, blog, faq, flow, rooms, gallery, cta, footer];
  const sections = raw.map((s) => ({ ...s, type: "section" as const }));
  return { id: uid("page"), name: "少人数進学塾 ランディングLP", children: sections };
}

export const ROSE_TEMPLATE_ID = "t-aoi-kokugo-lp";

export function buildRoseTemplate(): PageTemplate {
  k = 0;
  return { id: ROSE_TEMPLATE_ID, name: "少人数進学塾LP／ローズ×ネイビー（サンプル）", page: buildPage() };
}
