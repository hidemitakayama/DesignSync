// テンプレート：個別学習塾Manabill（山形県山形市）のトップページLP。
// デザイン方針：赤×青×緑のカラフル・カード型（参考: 教育系の明るいLP）。
// 白基調＋やわらかいカード（丸み＋淡い影）＋赤/青/緑で要素を色分けし、親しみやすさと分かりやすさを両立。
// 軸「個別指導を越える、個別伴走塾」。実績：生徒の83%以上が自己最高得点を更新。対象：小・中・高（山形市）。

import type { PageTemplate, SceneNode, ContainerNode, AtomNode, TextStyle, TextRun } from "./types";

// --- カラー（赤・青・緑のトリオ＋温かい差し色） ---
const RED = "#ef4056", RED_D = "#d62b41", RED_SOFT = "#fdecee";
const BLUE = "#2b7fff", BLUE_D = "#1f66db", BLUE_SOFT = "#e9f1ff";
const GREEN = "#1fb479", GREEN_D = "#159466", GREEN_SOFT = "#e3f6ee";
const ORANGE = "#ff9a3d", ORANGE_D = "#ef820f", ORANGE_SOFT = "#fff1e2";

const INK = "#2b2b33";       // 見出し・本文濃色
const SUB = "#6d7079";       // 補助テキスト
const LINE = "#ecebed";      // ヘアライン・枠線
const BG = "#f6f8fb";        // 淡色セクション背景（わずかに寒色）
const WHITE = "#ffffff";
const FOOT = "#2c2f38";      // フッター（ダーク）
const ON_DARK = "#b9bcc4";   // 濃色上の補助
const SHADOW = "0 12px 30px rgba(40,40,60,0.08)";
const SHADOW_SM = "0 6px 18px rgba(40,40,60,0.06)";

type Tone = { main: string; deep: string; soft: string };
const RED_T: Tone = { main: RED, deep: RED_D, soft: RED_SOFT };
const BLUE_T: Tone = { main: BLUE, deep: BLUE_D, soft: BLUE_SOFT };
const GREEN_T: Tone = { main: GREEN, deep: GREEN_D, soft: GREEN_SOFT };
const ORANGE_T: Tone = { main: ORANGE, deep: ORANGE_D, soft: ORANGE_SOFT };

let k = 0;
const uid = (p: string) => `t-mnb4-${p}${++k}`;

const txt = (text: string, style: TextStyle, item: Partial<AtomNode> = {}): AtomNode => ({ id: uid("t"), type: "atom", atomType: "text", name: text.slice(0, 10) || "テキスト", text, style, ...item });
const txtRuns = (runs: TextRun[], style: TextStyle, item: Partial<AtomNode> = {}): AtomNode => ({ id: uid("t"), type: "atom", atomType: "text", name: runs.map((r) => r.text).join("").slice(0, 10), text: runs.map((r) => r.text).join(""), runs, style, ...item });
const icon = (paths: string, color = RED, size = 20): AtomNode => ({
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
  check: '<path d="M20 6 9 17l-5-5"/>',
  quote: '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
};
const LOGO = P.book;

// 塗り／枠線ボタン（ピル形）
const btn = (label: string, o: { bg?: string; color: string; border?: string; ic?: string }): ContainerNode =>
  box({ background: o.bg, borderWidth: o.border ? 1.5 : undefined, borderColor: o.border, radius: 999, direction: "row", align: "center", justify: "center", gap: 8, alignSelf: "flex-start",
    paddingTop: 15, paddingBottom: 15, paddingLeft: 28, paddingRight: 28,
    children: [...(o.ic ? [icon(o.ic, o.color, 17)] : []), txt(label, { fontSize: 15, fontWeight: 800, color: o.color, align: "center" })] });

// 中央寄せセクション見出し（トーンで色分け）
const centerHead = (eyebrow: string, title: string, t: Tone, lead?: string): ContainerNode =>
  box({ align: "center", alignSelf: "stretch", gap: 14, children: [
    txt(eyebrow, { fontSize: 12, fontWeight: 800, color: t.main, align: "center", letterSpacing: 2 }),
    txt(title, { fontSize: 30, fontWeight: 800, color: INK, align: "center", lineHeight: 1.35 }),
    box({ background: t.main, width: 44, minHeight: 3, radius: 999, alignSelf: "center", children: [] }),
    ...(lead ? [txt(lead, { fontSize: 15, fontWeight: 400, color: SUB, align: "center", lineHeight: 1.9 }, { marginTop: 2 })] : []),
  ] });

// 白カード（丸み＋淡い影）。上部にトーンのアクセントバー（任意）
const card = (children: SceneNode[], extra: Partial<ContainerNode> = {}): ContainerNode =>
  box({ background: WHITE, radius: 16, borderWidth: 1, borderColor: LINE, boxShadow: SHADOW_SM, paddingTop: 30, paddingBottom: 30, paddingLeft: 26, paddingRight: 26, gap: 14, children, ...extra });

// 写真プレースホルダ
const photo = (minHeight: number, extra: Partial<ContainerNode> = {}): ContainerNode =>
  box({ background: "#e8ebf1", radius: 14, minHeight, align: "center", justify: "center", direction: "row", children: [icon('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>', "#aab2c2", 30)], ...extra });

function buildPage() {
  const SIDE = 52;

  // 1) ヘッダー
  const navLink = (l: string): AtomNode => txt(l, { fontSize: 13, fontWeight: 700, color: INK, align: "left" });
  const header = box({
    name: "ヘッダー", direction: "row", justify: "space-between", align: "center", background: WHITE,
    borderWidth: 1, borderColor: LINE, paddingTop: 16, paddingBottom: 16, paddingLeft: SIDE, paddingRight: SIDE, gap: 16,
    children: [
      box({ name: "ロゴ", direction: "row", align: "center", gap: 9, children: [
        box({ background: BLUE, radius: 10, width: 36, minHeight: 36, align: "center", justify: "center", direction: "row", children: [icon(LOGO, WHITE, 20)] }),
        box({ gap: 0, children: [
          txt("個別学習塾 Manabill", { fontSize: 16, fontWeight: 800, color: INK, align: "left" }),
          txt("個別指導を越える、個別伴走塾", { fontSize: 10, fontWeight: 600, color: SUB, align: "left" }),
        ] }),
      ] }),
      box({ name: "ナビ", direction: "row", align: "center", gap: 20, wrap: true, children: [
        navLink("選ばれる理由"), navLink("コース・料金"), navLink("生徒の声"), navLink("入塾の流れ"), navLink("よくある質問"), navLink("アクセス"),
        btn("無料体験はこちら", { bg: RED, color: WHITE, ic: P.mail }),
      ] }),
    ],
  });

  // 2) FV（ヒーロー）
  const hero = box({
    name: "Top（FV）", background: "#f7faff", paddingTop: 72, paddingBottom: 72, paddingLeft: SIDE, paddingRight: SIDE,
    direction: "row", gap: 44, align: "center", wrap: true, minHeight: 500,
    children: [
      box({ grow: true, basis: 440, gap: 22, children: [
        box({ direction: "row", align: "center", gap: 8, alignSelf: "flex-start", background: BLUE_SOFT, radius: 999, paddingTop: 8, paddingBottom: 8, paddingLeft: 16, paddingRight: 16, children: [
          icon(P.pin, BLUE, 15), txt("山形県山形市｜小・中・高の個別学習塾", { fontSize: 12, fontWeight: 700, color: BLUE_D, align: "left" }),
        ] }),
        txtRuns([{ text: "個別指導を越える、\n" }, { text: "個別伴走", color: RED }, { text: "塾。" }], { fontSize: 50, fontWeight: 800, color: INK, align: "left", lineHeight: 1.25, letterSpacing: 0.5 }),
        txt("学習目標・計画・教材・スケジュールは、一人ひとりにオーダーメイド。\n「やり切る」まで伴走するから、計画倒れになりません。", { fontSize: 16, fontWeight: 400, color: SUB, align: "left", lineHeight: 1.95 }),
        box({ direction: "row", gap: 14, wrap: true, align: "center", marginTop: 4, children: [
          btn("無料体験に申し込む", { bg: RED, color: WHITE, ic: P.mail }),
          btn("資料を請求する", { color: INK, border: LINE }),
        ] }),
      ] }),
      photo(440, { grow: true, basis: 400, boxShadow: SHADOW }),
    ],
  });

  // 3) 選ばれる理由（4つのPOINTカード・色分け）
  const pointBadge = (no: string, t: Tone): ContainerNode =>
    box({ background: t.main, radius: 13, align: "center", justify: "center", alignSelf: "center", gap: 0, paddingTop: 9, paddingBottom: 9, paddingLeft: 18, paddingRight: 18, children: [
      txt("POINT", { fontSize: 9, fontWeight: 800, color: WHITE, align: "center", letterSpacing: 2 }),
      txt(no, { fontSize: 20, fontWeight: 800, color: WHITE, align: "center" }),
    ] });
  const pointCard = (no: string, t: Tone, ic: string, title: string, body: string): ContainerNode =>
    card([
      pointBadge(no, t),
      txt(title, { fontSize: 18, fontWeight: 800, color: INK, align: "center", lineHeight: 1.5 }, { marginTop: 4 }),
      txt(body, { fontSize: 14, fontWeight: 400, color: SUB, align: "center", lineHeight: 1.9 }),
      box({ background: t.soft, radius: 999, width: 46, minHeight: 46, align: "center", justify: "center", direction: "row", alignSelf: "center", marginTop: 4, children: [icon(ic, t.main, 22)] }),
    ], { align: "center", paddingTop: 34, paddingBottom: 34, borderColor: t.soft, borderWidth: 1 });
  const reasons = box({
    name: "選ばれる理由", background: WHITE, paddingTop: 84, paddingBottom: 84, paddingLeft: SIDE, paddingRight: SIDE, gap: 44,
    children: [
      centerHead("WHY MANABILL", "選ばれる、4つの理由", RED_T, "「教える」だけでなく、「やり切る」まで伴走する。\nManabillが大切にしている4つのこと。"),
      box({ direction: "row", columns: 2, gap: 22, wrap: true, align: "stretch", alignSelf: "stretch", children: [
        pointCard("01", RED_T, P.target, "一人ひとりの\nオーダーメイド学習", "目標・計画・教材・スケジュールを個別に設計。今のお子さまに必要な学習だけに絞り、無駄なく効率的に伸ばします。"),
        pointCard("02", BLUE_T, P.users, "「やり切る」まで、\n個別に伴走", "計画を立てて終わりにしない。取り組みとモチベーションの管理まで伴走するから、計画倒れが起きません。"),
        pointCard("03", GREEN_T, P.heart, "「楽しい」から、続く\n仕掛け", "「どうすれば理解できるか」を一緒に考える指導。楽しいから続き、学習習慣が身につき、成績が上がります。"),
        pointCard("04", ORANGE_T, P.book, "続けやすい、\n学習環境", "自習室・全教科対応など、続けやすい環境を用意。授業後の自習サポートまで活用でき、家でも迷いません。"),
      ] }),
    ],
  });

  // 4) 実績バンド（83%）色分け
  const statCell = (num: string, label: string, t: Tone): ContainerNode =>
    box({ grow: true, basis: 200, align: "center", gap: 4, children: [
      txt(num, { fontSize: 46, fontWeight: 800, color: t.main, align: "center" }),
      txt(label, { fontSize: 13, fontWeight: 700, color: INK, align: "center", lineHeight: 1.7 }),
    ] });
  const vsep = (): ContainerNode => box({ background: "#dfe3ea", width: 1, minHeight: 60, children: [] });
  const stats = box({
    name: "実績", background: BG, paddingTop: 48, paddingBottom: 48, paddingLeft: SIDE, paddingRight: SIDE,
    direction: "row", gap: 24, align: "center", justify: "center", wrap: true,
    children: [
      statCell("83%+", "の生徒が\n自己最高得点を更新", RED_T),
      vsep(),
      statCell("全教科", "対応の\n自立学習コースも", BLUE_T),
      vsep(),
      statCell("小・中・高", "山形市で\n個別伴走をお届け", GREEN_T),
    ],
  });

  // 5) コース・料金（学年で色分け）
  const priceRow = (plan: string, price: string): ContainerNode =>
    box({ direction: "row", align: "center", justify: "space-between", gap: 10, alignSelf: "stretch", paddingTop: 10, paddingBottom: 10, children: [
      txt(plan, { fontSize: 13, fontWeight: 600, color: SUB, align: "left" }, { grow: true, basis: 120 }),
      txt(price, { fontSize: 15, fontWeight: 800, color: INK, align: "right" }),
    ] });
  const rule = (): ContainerNode => box({ background: LINE, minHeight: 1, alignSelf: "stretch", children: [] });
  const courseCard = (grade: string, t: Tone, title: string, target: string, body: string, prices: [string, string][], note: string): ContainerNode =>
    card([
      box({ background: t.main, minHeight: 5, radius: 999, alignSelf: "stretch", children: [] }),
      photo(140, { alignSelf: "stretch", marginTop: 2, marginBottom: 2 }),
      box({ direction: "row", align: "center", gap: 8, alignSelf: "flex-start", background: t.main, radius: 999, paddingTop: 5, paddingBottom: 5, paddingLeft: 12, paddingRight: 12, children: [txt(grade, { fontSize: 11, fontWeight: 800, color: WHITE, align: "left" })] }),
      txt(title, { fontSize: 20, fontWeight: 800, color: INK, align: "left" }),
      txt(target, { fontSize: 12, fontWeight: 700, color: t.deep, align: "left" }),
      txt(body, { fontSize: 13, fontWeight: 400, color: SUB, align: "left", lineHeight: 1.85 }),
      box({ gap: 0, alignSelf: "stretch", marginTop: 4, children: [
        rule(),
        ...prices.flatMap(([p, pr], i) => (i === 0 ? [priceRow(p, pr)] : [rule(), priceRow(p, pr)])),
        rule(),
      ] }),
      txt(note, { fontSize: 11, fontWeight: 400, color: SUB, align: "left", lineHeight: 1.7 }),
    ], { align: "stretch", paddingTop: 20, paddingBottom: 26, paddingLeft: 22, paddingRight: 22 });
  const courses = box({
    name: "コース・料金", background: BG, paddingTop: 84, paddingBottom: 84, paddingLeft: SIDE, paddingRight: SIDE, gap: 44,
    children: [
      centerHead("COURSE & PRICE", "コース・料金", BLUE_T, "小学生・中学生・高校生、それぞれの目的に合わせて。\n※価格はすべて税込です。"),
      box({ direction: "row", columns: 3, gap: 22, wrap: true, align: "stretch", alignSelf: "stretch", children: [
        courseCard("小学生", GREEN_T, "小学生コース", "対象：小学1年生〜6年生", "勉強の習慣づけから中学準備まで。算数・国語を中心に「わかる楽しさ」を実感。学校の宿題サポートも充実、アットホームな環境です。", [
          ["週2回×60分", "11,800円"], ["週3回×60分", "14,800円"], ["週5回×60分", "18,800円"],
        ], "※宿題指導＆採点付き。上記のほか教材費・システム管理費2,200円。"),
        courseCard("中学生", BLUE_T, "中学生コース", "対象：中学1年生〜3年生", "定期テスト・苦手克服・受験対策など、目標に合わせたオーダーメイドカリキュラム。5教科対応。テスト前は無料のテスト対策学習会も開催。", [
          ["週2回×90分（中1のみ）", "17,600円"], ["週2回×120分", "23,100円"], ["週3回×90分", "25,800円"], ["週5回×90分", "30,800円"],
        ], "※上記のほか教材費・システム管理費2,200円。"),
        courseCard("高校生", RED_T, "高校生コース（自立学習）", "全教科対応・低価格の自立学習", "自習室＋動画で、自分のペースで学べる自立学習プラン。全教科対応で、高校生活と両立しながら学習を進められます。", [
          ["自習室フリータイムプラン", "12,000円〜"],
        ], "※限定5名。教材費3,300〜6,600円（教材なしも選択可）。"),
      ] }),
    ],
  });

  // 6) 生徒・保護者の声
  const voiceCard = (role: string, quote: string, t: Tone): ContainerNode =>
    card([
      icon(P.quote, t.main, 26),
      txt(quote, { fontSize: 13.5, fontWeight: 400, color: INK, align: "left", lineHeight: 1.95 }),
      box({ direction: "row", align: "center", gap: 8, marginTop: 2, children: [box({ background: t.main, width: 18, minHeight: 2, radius: 999, children: [] }), txt(role, { fontSize: 12, fontWeight: 800, color: t.deep, align: "left" })] }),
    ], { align: "stretch" });
  const voices = box({
    name: "生徒・保護者の声", background: WHITE, paddingTop: 84, paddingBottom: 84, paddingLeft: SIDE, paddingRight: SIDE, gap: 40,
    children: [
      centerHead("VOICE", "生徒・保護者の声", GREEN_T, "Manabillで、変わった。実際の声をご紹介します。"),
      // 合格ハイライト
      box({ background: INK, radius: 18, paddingTop: 40, paddingBottom: 40, paddingLeft: 40, paddingRight: 40, gap: 16, alignSelf: "stretch", boxShadow: SHADOW, children: [
        box({ direction: "row", align: "center", gap: 10, alignSelf: "flex-start", background: RED, radius: 999, paddingTop: 6, paddingBottom: 6, paddingLeft: 14, paddingRight: 14, children: [icon(P.spark, WHITE, 14), txt("合格の声", { fontSize: 11, fontWeight: 800, color: WHITE, align: "left" })] }),
        txt("先生が弱点を正確に分析し、必要な学習だけを絞り込んでくれた。日々やるべきことが明確になり、自習サポートも活用して、第一志望の山形東高校に合格できました。", { fontSize: 21, fontWeight: 800, color: WHITE, align: "left", lineHeight: 1.7 }),
        txt("中学3年生 ／ 山形東高校 合格", { fontSize: 14, fontWeight: 700, color: ON_DARK, align: "left" }),
      ] }),
      box({ direction: "row", columns: 3, gap: 22, wrap: true, align: "stretch", alignSelf: "stretch", children: [
        voiceCard("中2・男子（Kくん）", "最初は仕方なく通い始めましたが、「どうすれば理解できるか」を一緒に考えてくれる指導で意識が変化。今は自ら進んで通塾し、期末で過去最高得点を更新できました。", BLUE_T),
        voiceCard("小5・女子の母親", "学力だけでなく、娘の性格や気分の変化まで見て、最適なタイミングで声をかけてくださる。今では『先生がいるから塾へ行きたい』と話すようになりました。", GREEN_T),
        voiceCard("中3・女子の父親", "「学力だけじゃない指導」があります。子どもが『何のために勉強するのか』を自ら考えるように。進路や家庭学習の相談にも親身で、心から信頼しています。", ORANGE_T),
      ] }),
    ],
  });

  // 7) 塾に込めた思い
  const feeling = box({
    name: "塾に込めた思い", background: BG, paddingTop: 84, paddingBottom: 84, paddingLeft: SIDE, paddingRight: SIDE, gap: 40,
    children: [
      centerHead("OUR MISSION", "塾に込めた思い", BLUE_T),
      box({ direction: "row", gap: 40, align: "flex-start", wrap: true, alignSelf: "stretch", children: [
        box({ grow: true, basis: 280, gap: 16, children: [
          photo(360, { alignSelf: "stretch", boxShadow: SHADOW_SM }),
          box({ direction: "row", align: "center", gap: 8, children: [box({ background: BLUE, width: 20, minHeight: 2, radius: 999, children: [] }), txt("Manabill 塾長", { fontSize: 13, fontWeight: 800, color: INK, align: "left" })] }),
        ] }),
        box({ grow: true, basis: 420, gap: 18, children: [
          txt("子どもたちは、一人ひとり違います。", { fontSize: 22, fontWeight: 800, color: INK, align: "left", lineHeight: 1.6 }),
          txt("やる気になるきっかけも、つまずく理由も、目標も、得意・不得意も違います。だから私は、一人ひとりに合わせて教えるだけでなく、一人ひとりに寄り添いながら伴走することを大切にしています。", { fontSize: 15, fontWeight: 400, color: SUB, align: "left", lineHeight: 2 }),
          txt("これまで大手家庭教師協会のスーパー家庭教師として、また個別指導塾の塾長として、幅広い学年・学力層と向き合ってきました。京都・総本山智積院での修行を通して、人に寄り添うことの大切さも学びました。そうした経験から強く感じるのは、一人ひとりに合った学びが、子どもたちの成長につながるということです。", { fontSize: 15, fontWeight: 400, color: SUB, align: "left", lineHeight: 2 }),
          txt("だからManabillでは、教材や学習計画だけでなく、目標設定・声かけ・学習環境まで、その子に合わせて考えます。勉強が苦手な子も、もっと上を目指したい子も、一人ひとりに合った学びで、自分らしく成長してほしい。そんな想いを込めて、Manabillを開校しました。", { fontSize: 15, fontWeight: 400, color: SUB, align: "left", lineHeight: 2 }),
        ] }),
      ] }),
    ],
  });

  // 8) CTAバンド（無料体験受付中・写真＋ボタン）
  const ctaBanner = box({
    name: "無料体験バンド", background: RED, paddingTop: 44, paddingBottom: 44, paddingLeft: SIDE, paddingRight: SIDE,
    direction: "row", gap: 30, align: "center", justify: "space-between", wrap: true,
    children: [
      box({ direction: "row", align: "center", gap: 22, grow: true, basis: 420, children: [
        box({ background: "rgba(255,255,255,0.18)", radius: 999, width: 78, minHeight: 78, align: "center", justify: "center", direction: "row", children: [icon(P.mail, WHITE, 34)] }),
        box({ gap: 6, grow: true, children: [
          txt("無料体験授業、受付中！", { fontSize: 26, fontWeight: 800, color: WHITE, align: "left" }),
          txt("まずはお子さまに合う学び方を、体験で確かめてください。保護者さまのご相談だけでも歓迎です。", { fontSize: 14, fontWeight: 400, color: "#ffe1e4", align: "left", lineHeight: 1.8 }),
        ] }),
      ] }),
      box({ direction: "row", gap: 14, wrap: true, align: "center", children: [
        btn("無料体験に申し込む", { bg: WHITE, color: RED_D, ic: P.mail }),
        btn("LINEで相談する", { color: WHITE, border: "rgba(255,255,255,0.7)", ic: P.msg }),
      ] }),
    ],
  });

  // 9) 入塾までの流れ（STEP色分け）
  const stepBadge = (no: string, t: Tone): ContainerNode =>
    box({ background: t.main, radius: 999, width: 62, minHeight: 62, align: "center", justify: "center", alignSelf: "center", gap: 0, children: [
      txt("STEP", { fontSize: 8, fontWeight: 800, color: WHITE, align: "center", letterSpacing: 1 }),
      txt(no, { fontSize: 18, fontWeight: 800, color: WHITE, align: "center" }),
    ] });
  const stepCard = (no: string, t: Tone, title: string, body: string): ContainerNode =>
    card([
      stepBadge(no, t),
      txt(title, { fontSize: 15, fontWeight: 800, color: INK, align: "center", lineHeight: 1.5 }, { marginTop: 4 }),
      txt(body, { fontSize: 13, fontWeight: 400, color: SUB, align: "center", lineHeight: 1.85 }),
    ], { align: "center", paddingTop: 28, paddingBottom: 28, paddingLeft: 18, paddingRight: 18 });
  const flow = box({
    name: "入塾の流れ", background: WHITE, paddingTop: 84, paddingBottom: 84, paddingLeft: SIDE, paddingRight: SIDE, gap: 44,
    children: [
      centerHead("FLOW", "入塾までの流れ", ORANGE_T, "お問い合わせから入塾まで、4ステップ。"),
      box({ direction: "row", columns: 4, gap: 20, wrap: true, align: "stretch", alignSelf: "stretch", children: [
        stepCard("01", RED_T, "お問い合わせ・ご相談", "フォームからお気軽にご連絡ください。ご希望や不安をお聞かせください。"),
        stepCard("02", BLUE_T, "体験授業・学力診断", "学力診断で現状を把握し、お子さまに合った学び方を一緒に体験します。"),
        stepCard("03", GREEN_T, "カウンセリング", "体験結果をもとに、目標や学習プランをご提案します。"),
        stepCard("04", ORANGE_T, "ご入塾・スタート", "オーダーメイドの計画で、個別伴走がスタートします。"),
      ] }),
    ],
  });

  // 10) よくある質問
  const qBadge = (): ContainerNode => box({ background: BLUE, radius: 999, width: 26, minHeight: 26, align: "center", justify: "center", direction: "row", children: [txt("Q", { fontSize: 13, fontWeight: 800, color: WHITE, align: "center" })] });
  const faqRow = (q: string, first = false): ContainerNode =>
    box({ direction: "row", align: "center", justify: "space-between", gap: 16, alignSelf: "stretch", paddingTop: 20, paddingBottom: 20, paddingLeft: 22, paddingRight: 22, borderColor: LINE, borderWidth: first ? 0 : 1, children: [
      box({ direction: "row", align: "center", gap: 14, grow: true, children: [qBadge(), txt(q, { fontSize: 15, fontWeight: 700, color: INK, align: "left" })] }),
      icon(P.chev, SUB, 18),
    ] });
  const faqs = ["勉強が苦手でも大丈夫？", "勉強習慣が身についていなくても大丈夫？", "人見知りでも大丈夫？", "他塾からの転塾はできますか？", "自習だけの利用はできますか？", "部活と両立できますか？", "途中入塾できますか？", "トップ校への合格も目指せますか？"];
  const faq = box({
    name: "よくある質問", background: BG, paddingTop: 84, paddingBottom: 84, paddingLeft: SIDE, paddingRight: SIDE, gap: 40,
    children: [
      centerHead("FAQ", "よくあるご質問", GREEN_T, "はじめての方から、よくいただく質問です。"),
      box({ background: WHITE, radius: 16, borderWidth: 1, borderColor: LINE, boxShadow: SHADOW_SM, gap: 0, alignSelf: "stretch", children: faqs.map((q, i) => faqRow(q, i === 0)) }),
    ],
  });

  // 11) アクセス
  const infoRow = (label: string, value: string, first = false): ContainerNode =>
    box({ direction: "row", gap: 18, align: "flex-start", alignSelf: "stretch", paddingTop: 16, paddingBottom: 16, borderColor: LINE, borderWidth: first ? 0 : 1, children: [
      txt(label, { fontSize: 12, fontWeight: 800, color: RED_D, align: "left" }, { basis: 92 }),
      txt(value, { fontSize: 14, fontWeight: 500, color: INK, align: "left", lineHeight: 1.8 }, { grow: true }),
    ] });
  const access = box({
    name: "アクセス", background: WHITE, paddingTop: 84, paddingBottom: 84, paddingLeft: SIDE, paddingRight: SIDE, gap: 40,
    children: [
      centerHead("ACCESS", "アクセス", RED_T, "山形市を中心に、市内外の幅広い地域から通塾いただいています。"),
      box({ direction: "row", gap: 36, align: "stretch", wrap: true, alignSelf: "stretch", children: [
        photo(320, { grow: true, basis: 400, boxShadow: SHADOW_SM }),
        box({ grow: true, basis: 320, gap: 0, children: [
          box({ direction: "row", align: "center", gap: 8, paddingBottom: 10, children: [icon(P.pin, RED, 18), txt("個別学習塾 Manabill", { fontSize: 18, fontWeight: 800, color: INK, align: "left" })] }),
          infoRow("所在地", "山形県山形市", true),
          infoRow("対象エリア", "南沼原小・山形第二小・山形第十小・山形第三中・山形第十中 ほか、市内外から通塾いただいています。"),
          infoRow("対象", "小学1年生〜高校生（個別伴走・自立学習）"),
          infoRow("お問い合わせ", "詳しい住所・お問い合わせは、フォームよりお気軽にどうぞ。"),
        ] }),
      ] }),
    ],
  });

  // 12) 最終CTA
  const finalCta = box({
    name: "お問い合わせ", background: INK, paddingTop: 80, paddingBottom: 80, paddingLeft: SIDE, paddingRight: SIDE, gap: 20, align: "center",
    children: [
      txt("まずは、お子さまに合った\n学び方を見つけませんか？", { fontSize: 34, fontWeight: 800, color: WHITE, align: "center", lineHeight: 1.45 }),
      txt("勉強が続かない理由も、やる気になるきっかけも、一人ひとり違います。まずは現在の学習状況やお悩みを伺い、お子さまに合った学び方をご提案します。", { fontSize: 15, fontWeight: 400, color: ON_DARK, align: "center", lineHeight: 1.9 }),
      box({ direction: "row", gap: 14, wrap: true, align: "center", justify: "center", alignSelf: "center", marginTop: 8, children: [
        btn("無料体験に申し込む", { bg: RED, color: WHITE, ic: P.mail }),
        btn("LINEで相談する", { color: WHITE, border: "rgba(255,255,255,0.4)", ic: P.msg }),
      ] }),
    ],
  });

  // 13) フッター
  const fCol = (title: string, items: string[]): ContainerNode =>
    box({ gap: 10, basis: 160, children: [
      txt(title, { fontSize: 12, fontWeight: 800, color: WHITE, align: "left" }),
      ...items.map((it) => txt(it, { fontSize: 13, fontWeight: 400, color: ON_DARK, align: "left" })),
    ] });
  const footer = box({
    name: "フッター", background: FOOT, paddingTop: 48, paddingBottom: 32, paddingLeft: SIDE, paddingRight: SIDE, gap: 28,
    children: [
      box({ direction: "row", justify: "space-between", wrap: true, gap: 28, alignSelf: "stretch", children: [
        box({ gap: 10, basis: 260, children: [
          box({ direction: "row", align: "center", gap: 9, children: [box({ background: BLUE, radius: 9, width: 32, minHeight: 32, align: "center", justify: "center", direction: "row", children: [icon(LOGO, WHITE, 18)] }), txt("個別学習塾 Manabill", { fontSize: 16, fontWeight: 800, color: WHITE, align: "left" })] }),
          txt("個別指導を越える、個別伴走塾。", { fontSize: 13, fontWeight: 400, color: ON_DARK, align: "left" }),
          txt("山形県山形市", { fontSize: 12, fontWeight: 400, color: ON_DARK, align: "left" }),
        ] }),
        fCol("Manabillについて", ["選ばれる理由", "コース・料金", "生徒・保護者の声", "塾に込めた思い"]),
        fCol("ご入塾", ["入塾までの流れ", "よくある質問", "無料体験に申し込む"]),
        fCol("お問い合わせ", ["山形市の個別学習塾", "フォームよりご連絡ください"]),
      ] }),
      box({ background: "rgba(255,255,255,0.12)", minHeight: 1, alignSelf: "stretch", children: [] }),
      txt("© 個別学習塾 Manabill", { fontSize: 12, fontWeight: 500, color: "#8a8d95", align: "left" }),
    ],
  });

  const raw = [header, hero, reasons, stats, courses, voices, feeling, ctaBanner, flow, faq, access, finalCta, footer];
  const sections = raw.map((s) => ({ ...s, type: "section" as const }));
  return { id: uid("page"), name: "個別学習塾Manabill トップページ", children: sections };
}

export const MANABILL_TEMPLATE_ID = "t-manabill-lp";

export function buildManabillTemplate(): PageTemplate {
  k = 0;
  return { id: MANABILL_TEMPLATE_ID, name: "個別学習塾Manabill トップページ（赤・青・緑カラフル）", page: buildPage() };
}
