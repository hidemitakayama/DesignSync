// 既定テンプレート（サンプル）。特定の塾と分からないよう匿名化した「学習塾LP」。
// プロのWebデザイン水準を狙い、抑制した配色（グリーン＋アンバー）・余白リズム・
// 枠線と控えめな影を持つカード・アイコンチップ・内包型CTAで構成する。名称/連絡先はダミー。

import type { Page, PageTemplate, TemplateKind, SceneNode, ContainerNode, AtomNode, TextStyle } from "./types";
import { buildRoseTemplate, ROSE_TEMPLATE_ID } from "./templateJukuRose";
import { buildTealTemplate, TEAL_TEMPLATE_ID } from "./templateCorpTeal";
import { buildUpShingakuTemplate, UPS_TEMPLATE_ID } from "./templateUpShingaku";
import { buildManabillTemplate, MANABILL_TEMPLATE_ID } from "./templateManabill";

// --- カラーシステム（抑制した2色＋ニュートラル） ---
const PRIMARY = "#15806a";   // ブランドグリーン
const PRIMARY_D = "#0f6151"; // 濃いグリーン（グラデ・強調）
const PRIMARY_L = "#e7f4f0"; // 薄いグリーン（アイコン背景）
const ACCENT = "#f59e0b";    // アンバー（CTA・アクセント。1色に限定）
const ACCENT_D = "#b26a04";  // 濃いアンバー（文字用）
const INK = "#17211d";       // 見出し・本文の濃色
const SUB = "#5f6f6a";       // 補助テキスト
const LINE = "#e4ebe9";      // 枠線
const BG = "#f6faf9";        // セクション背景（淡）
const WHITE = "#ffffff";
const ON_DARK = "#e7f4f0";   // 濃色背景上のサブテキスト
const GRAD = `linear-gradient(135deg, ${PRIMARY_D}, ${PRIMARY})`;

// --- 影プリセット（PropertiesPanel と一致＝あとから編集可能） ---
const SH_SM = "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.10)";
const SH_MD = "0 4px 6px -1px rgba(16,24,40,0.08), 0 2px 4px -2px rgba(16,24,40,0.06)";
const SH_LG = "0 10px 15px -3px rgba(16,24,40,0.08), 0 4px 6px -4px rgba(16,24,40,0.05)";

let k = 0;
const uid = (p: string) => `t-mnb-${p}${++k}`;

const txt = (text: string, style: TextStyle): AtomNode => ({ id: uid("t"), type: "atom", atomType: "text", name: text.slice(0, 10) || "テキスト", text, style });
const icon = (paths: string, color = PRIMARY, size = 28): AtomNode => ({
  id: uid("s"), type: "atom", atomType: "svg", name: "アイコン", width: size, height: size,
  svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`,
});

// コンテナ生成（不足分は既定で補完）
function box(p: Partial<ContainerNode> & { children: SceneNode[] }): ContainerNode {
  return {
    id: uid("c"), type: "group", name: p.name ?? "グループ",
    direction: p.direction ?? "column", justify: p.justify ?? "flex-start", align: p.align ?? "stretch",
    gap: p.gap ?? 12, ...p,
  };
}

// アイコンを淡色の角丸チップに収める（プロらしい要素）
const iconChip = (paths: string, bg = PRIMARY_L, color = PRIMARY): ContainerNode =>
  box({ background: bg, radius: 12, padding: 12, direction: "row", align: "center", justify: "center", alignSelf: "flex-start", children: [icon(paths, color, 26)] });

// 小さなピル型ラベル
const badge = (label: string, bg: string, color: string): ContainerNode =>
  box({ background: bg, radius: 999, direction: "row", align: "center", justify: "center", alignSelf: "center", paddingTop: 7, paddingBottom: 7, paddingLeft: 16, paddingRight: 16, children: [
    txt(label, { fontSize: 13, fontWeight: 700, color, align: "center" }),
  ] });

// ボタン（角丸12・左右広め・任意で影）
const button = (label: string, bg: string, color: string, shadow?: string): ContainerNode =>
  box({ background: bg, radius: 12, direction: "row", align: "center", justify: "center", alignSelf: "center", paddingTop: 15, paddingBottom: 15, paddingLeft: 30, paddingRight: 30, boxShadow: shadow, children: [
    txt(label, { fontSize: 16, fontWeight: 700, color, align: "center" }),
  ] });

// 白カード（枠線＋控えめな影）
const card = (children: SceneNode[], extra: Partial<ContainerNode> = {}): ContainerNode =>
  box({ background: WHITE, radius: 16, padding: 26, gap: 12, grow: true, borderWidth: 1, borderColor: LINE, boxShadow: SH_MD, children, ...extra });

// 統計チップ（数値を大きく）
const chip = (label: string, value: string): ContainerNode =>
  box({ background: WHITE, radius: 14, padding: 18, gap: 4, align: "center", grow: true, boxShadow: SH_SM, children: [
    txt(value, { fontSize: 26, fontWeight: 800, color: INK, align: "center" }),
    txt(label, { fontSize: 12, fontWeight: 600, color: SUB, align: "center" }),
  ] });

// 特徴/コースカード（アイコンチップ＋見出し＋本文）
const featureCard = (paths: string, title: string, body: string): ContainerNode =>
  card([
    iconChip(paths),
    txt(title, { fontSize: 18, fontWeight: 700, color: INK, align: "left" }),
    txt(body, { fontSize: 14, fontWeight: 400, color: SUB, align: "left" }),
  ]);

// 料金行（白＋枠線）
const priceRow = (name: string, detail: string): ContainerNode =>
  box({ direction: "row", justify: "space-between", align: "center", background: WHITE, radius: 12, borderWidth: 1, borderColor: LINE, boxShadow: SH_SM, paddingTop: 18, paddingBottom: 18, paddingLeft: 22, paddingRight: 22, gap: 12, children: [
    txt(name, { fontSize: 15, fontWeight: 700, color: INK, align: "left" }),
    txt(detail, { fontSize: 14, fontWeight: 700, color: ACCENT_D, align: "right" }),
  ] });

// ステップ番号のバッジ（丸）
const numBadge = (n: string): ContainerNode =>
  box({ background: PRIMARY, radius: 999, direction: "row", align: "center", justify: "center", alignSelf: "flex-start", paddingTop: 8, paddingBottom: 8, paddingLeft: 13, paddingRight: 13, children: [
    txt(n, { fontSize: 15, fontWeight: 800, color: WHITE, align: "center" }),
  ] });

// 入塾ステップ
const step = (no: string, title: string, desc: string): ContainerNode =>
  card([
    box({ direction: "row", align: "center", gap: 12, children: [numBadge(no), txt(title, { fontSize: 17, fontWeight: 700, color: INK, align: "left" })] }),
    txt(desc, { fontSize: 14, fontWeight: 400, color: SUB, align: "left" }),
  ], { padding: 22 });

const LEAF = '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>';

function buildPage(): Page {
  // --- ヘッダー（ロゴ＋ナビ＋CTA。白＋薄い影で本文と分離） ---
  const navLink = (label: string): AtomNode => txt(label, { fontSize: 14, fontWeight: 600, color: SUB, align: "left" });
  const header = box({
    name: "ヘッダー", direction: "row", justify: "space-between", align: "center",
    paddingTop: 16, paddingBottom: 16, paddingLeft: 48, paddingRight: 48, background: WHITE, gap: 16, boxShadow: SH_SM,
    children: [
      box({ name: "ロゴ", direction: "row", align: "center", gap: 8, children: [
        icon(LEAF, PRIMARY, 24),
        txt("まなびの森スクール", { fontSize: 18, fontWeight: 800, color: INK, align: "left" }),
      ] }),
      box({ name: "ナビ", direction: "row", align: "center", gap: 22, wrap: true, children: [
        navLink("特徴"), navLink("コース・料金"), navLink("入塾の流れ"), navLink("アクセス"),
        button("無料体験", ACCENT, WHITE),
      ] }),
    ],
  });

  // --- ヒーロー ---
  const hero = box({
    name: "ヒーロー", background: GRAD, paddingTop: 96, paddingBottom: 96, paddingLeft: 48, paddingRight: 48, gap: 22, align: "center", minHeight: 540,
    children: [
      badge("無料体験 受付中", "rgba(255,255,255,0.16)", WHITE),
      txt("夢を叶える力を、\nここで育てる。", { fontSize: 46, fontWeight: 800, color: WHITE, align: "center" }),
      txt("一人ひとりの「できた！」を、未来につながる自信に。\n小1〜中3対象・地域に根ざした学習塾です。", { fontSize: 17, fontWeight: 400, color: ON_DARK, align: "center" }),
      box({ name: "実績", direction: "row", gap: 14, justify: "center", wrap: true, alignSelf: "stretch", marginTop: 8, children: [
        chip("平均点アップ", "＋58点"),
        chip("対応学年", "小1〜中3"),
        chip("体験授業", "¥0"),
      ] }),
      button("無料体験を申し込む", ACCENT, WHITE, SH_LG),
      txt("※体験授業は何度でも無料です", { fontSize: 12, fontWeight: 500, color: ON_DARK, align: "center" }),
    ],
  });

  // --- 特徴 ---
  const features = box({
    name: "特徴", background: BG, paddingTop: 80, paddingBottom: 80, paddingLeft: 48, paddingRight: 48, gap: 12, align: "center",
    children: [
      txt("FEATURES", { fontSize: 13, fontWeight: 800, color: PRIMARY, align: "center" }),
      txt("選ばれる4つの理由", { fontSize: 32, fontWeight: 800, color: INK, align: "center" }),
      txt("「わかる楽しさ」から、成績も、学ぶ姿勢も変えていきます。", { fontSize: 16, fontWeight: 400, color: SUB, align: "center" }),
      box({ name: "特徴カード", direction: "row", columns: 4, gap: 20, wrap: true, align: "stretch", alignSelf: "stretch", marginTop: 20, children: [
        featureCard('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>', "みるみる分かる授業", "つまずきの原因までさかのぼって、「わかった！」を増やします。"),
        featureCard('<path d="M12 3v18"/><path d="M5 8h14"/><path d="M5 16h14"/>', "一人ひとりに合わせた指導", "目標と学力に合わせて設計。得意は伸ばし、苦手は基礎から。"),
        featureCard('<path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>', "テスト・入試に強い", "テスト対策から入試対策まで、結果につながる仕組みで得点アップ。"),
        featureCard('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>', "家庭学習の習慣づくり", "授業がわかると家庭学習も前向きに。学ぶ姿勢そのものが変わります。"),
      ] }),
    ],
  });

  // --- メッセージ（濃色バンド） ---
  const message = box({
    name: "メッセージ", background: GRAD, paddingTop: 72, paddingBottom: 72, paddingLeft: 48, paddingRight: 48, gap: 14, align: "center",
    children: [
      txt("成績を上げることは、ゴールではなくスタート。", { fontSize: 26, fontWeight: 800, color: WHITE, align: "center" }),
      txt("勉強を通して「やればできる」という自信を育てます。その自信が、これからの人生で夢を叶えるための力になると信じています。", { fontSize: 16, fontWeight: 400, color: ON_DARK, align: "center" }),
    ],
  });

  // --- コース ---
  const courses = box({
    name: "コース", background: WHITE, paddingTop: 80, paddingBottom: 80, paddingLeft: 48, paddingRight: 48, gap: 12, align: "center",
    children: [
      txt("COURSES", { fontSize: 13, fontWeight: 800, color: PRIMARY, align: "center" }),
      txt("学年・目標で選べる4コース", { fontSize: 32, fontWeight: 800, color: INK, align: "center" }),
      txt("お子様の「今」に合わせて、最適な学びを。", { fontSize: 16, fontWeight: 400, color: SUB, align: "center" }),
      box({ name: "コースカード", direction: "row", columns: 4, gap: 20, wrap: true, align: "stretch", alignSelf: "stretch", marginTop: 20, children: [
        featureCard('<circle cx="12" cy="12" r="9"/>', "小学生コース", "成功体験を積み重ね、学ぶ楽しさと考える力を育てます。"),
        featureCard('<rect x="4" y="4" width="16" height="16" rx="2"/>', "中学生コース", "定期テストで結果を出すことを重視。内申点アップを目指します。"),
        featureCard('<path d="M12 2l7 4v6c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>', "高校入試対策", "志望校合格から逆算した実戦カリキュラムで得点力を鍛えます。"),
        featureCard('<path d="M20 6 9 17l-5-5"/>', "テスト対策体験", "定期テスト2〜3週間前からスタート。まずは体験から。"),
      ] }),
    ],
  });

  // --- 料金 ---
  const pricing = box({
    name: "料金", background: BG, paddingTop: 80, paddingBottom: 80, paddingLeft: 48, paddingRight: 48, gap: 12, align: "center",
    children: [
      txt("PRICING", { fontSize: 13, fontWeight: 800, color: PRIMARY, align: "center" }),
      txt("料金のご案内", { fontSize: 32, fontWeight: 800, color: INK, align: "center" }),
      txt("学年・受講回数に合わせて、分かりやすくご案内します。", { fontSize: 16, fontWeight: 400, color: SUB, align: "center" }),
      box({ name: "料金表", gap: 12, alignSelf: "stretch", marginTop: 20, children: [
        priceRow("小学生（小1〜小6）", "週1回〜 ／ お問い合わせください"),
        priceRow("中学1・2年生", "5教科対応 ／ お問い合わせください"),
        priceRow("中学3年生（受験）", "入試対策講習 ／ お問い合わせください"),
        priceRow("テスト対策体験", "¥0（体験） ／ お気軽にどうぞ"),
      ] }),
      txt("※ 表示は目安です。詳しくは面談時にご案内します。", { fontSize: 13, fontWeight: 400, color: SUB, align: "center" }),
    ],
  });

  // --- 入塾の流れ ---
  const flow = box({
    name: "入塾の流れ", background: WHITE, paddingTop: 80, paddingBottom: 80, paddingLeft: 48, paddingRight: 48, gap: 12, align: "center",
    children: [
      txt("FLOW", { fontSize: 13, fontWeight: 800, color: PRIMARY, align: "center" }),
      txt("入塾までの4ステップ", { fontSize: 32, fontWeight: 800, color: INK, align: "center" }),
      box({ name: "ステップ", direction: "row", columns: 4, gap: 20, wrap: true, align: "stretch", alignSelf: "stretch", marginTop: 20, children: [
        step("1", "お問い合わせ", "電話・メールでお気軽にご連絡ください。"),
        step("2", "面談・学習相談", "現状とご希望をうかがい、最適なプランをご提案。"),
        step("3", "無料体験授業", "実際の授業を体験。“わかる”を実感できます。"),
        step("4", "入塾・スタート", "目標に向けて学習をスタートします。"),
      ] }),
    ],
  });

  // --- CTA（内包型カード） ---
  const cta = box({
    name: "お問い合わせ", background: BG, paddingTop: 80, paddingBottom: 80, paddingLeft: 48, paddingRight: 48, align: "center",
    children: [
      box({ name: "CTAカード", background: GRAD, radius: 24, alignSelf: "stretch", paddingTop: 64, paddingBottom: 64, paddingLeft: 40, paddingRight: 40, gap: 16, align: "center", boxShadow: SH_LG, children: [
        txt("まずは無料体験から。", { fontSize: 34, fontWeight: 800, color: WHITE, align: "center" }),
        txt("お気軽にお問い合わせください。体験は何度でも無料です。", { fontSize: 16, fontWeight: 400, color: ON_DARK, align: "center" }),
        button("無料体験を申し込む", ACCENT, WHITE, SH_LG),
        txt("お電話：000-0000-0000 ／ メール：info@example.com", { fontSize: 13, fontWeight: 600, color: ON_DARK, align: "center" }),
      ] }),
    ],
  });

  // --- フッター ---
  const fCol = (title: string, items: string[]): ContainerNode =>
    box({ gap: 8, children: [
      txt(title, { fontSize: 12, fontWeight: 800, color: ACCENT, align: "left" }),
      ...items.map((it) => txt(it, { fontSize: 13, fontWeight: 400, color: "#9fb0aa", align: "left" })),
    ] });
  const footer = box({
    name: "フッター", background: INK, paddingTop: 48, paddingBottom: 32, paddingLeft: 48, paddingRight: 48, gap: 28,
    children: [
      box({ direction: "row", justify: "space-between", wrap: true, gap: 28, alignSelf: "stretch", children: [
        box({ gap: 8, children: [
          box({ direction: "row", align: "center", gap: 8, children: [icon(LEAF, "#7fd8c2", 22), txt("まなびの森スクール", { fontSize: 16, fontWeight: 800, color: WHITE, align: "left" })] }),
          txt("「わかる楽しさ」から、成績も学ぶ姿勢も。", { fontSize: 13, fontWeight: 400, color: "#9fb0aa", align: "left" }),
        ] }),
        fCol("メニュー", ["特徴", "コース・料金", "入塾の流れ", "よくある質問"]),
        fCol("お問い合わせ", ["000-0000-0000", "info@example.com", "受付：月〜土 13:00〜17:00"]),
      ] }),
      txt("© まなびの森スクール", { fontSize: 12, fontWeight: 500, color: "#7d8a85", align: "center" }),
    ],
  });

  const sections = [header, hero, features, message, courses, pricing, flow, cta, footer].map((s) => ({ ...s, type: "section" as const }));
  return { id: uid("page"), name: "学習塾 ランディングLP", children: sections };
}

export const SEED_TEMPLATE_ID = "t-manabi-juku-lp";
// 既定テンプレートのIDすべて（migrateで最新版に差し替える対象）
export const SEED_TEMPLATE_IDS = [SEED_TEMPLATE_ID, ROSE_TEMPLATE_ID, TEAL_TEMPLATE_ID, UPS_TEMPLATE_ID, MANABILL_TEMPLATE_ID];

// 既定シードごとの意図した種別。
// テンプレート＝まなびの森スクール／アオイ国語専科ゼミ／StackForce。
// クライアント案件のサンプル＝アップ進学ゼミ／個別学習塾Manabill。
export const SEED_TEMPLATE_KIND: Record<string, TemplateKind> = {
  [SEED_TEMPLATE_ID]: "template",   // まなびの森スクール
  [ROSE_TEMPLATE_ID]: "template",   // アオイ国語専科ゼミ
  [TEAL_TEMPLATE_ID]: "template",   // StackForce
  [UPS_TEMPLATE_ID]: "client",      // アップ進学ゼミ（クライアント案件）
  [MANABILL_TEMPLATE_ID]: "client", // 個別学習塾Manabill（クライアント案件）
};
// ユーザーが命名したテンプレート名（既定シードをリネームしたもの）。名前でも判定する。
const DEFAULT_TEMPLATE_NAMES = new Set<string>(["エール進学ゼミ", "まなびの森スクール", "アオイ国語専科ゼミ", "StackForce", "StackForge"]);

// 保存済みページを「テンプレート/クライアント」に振り分ける（既存データの初期分類・シード用）。
// 既定シードは意図した種別、それ以外は名前が既知のテンプレート名ならテンプレート、他はクライアント。
export function classifyKind(t: { id: string; name?: string }): TemplateKind {
  if (t.id in SEED_TEMPLATE_KIND) return SEED_TEMPLATE_KIND[t.id];
  return DEFAULT_TEMPLATE_NAMES.has((t.name ?? "").trim()) ? "template" : "client";
}

export function seedTemplates(): PageTemplate[] {
  k = 0;
  const list: PageTemplate[] = [
    buildManabillTemplate(),
    buildUpShingakuTemplate(),
    { id: SEED_TEMPLATE_ID, name: "学習塾 ランディングLP（サンプル）", page: buildPage() },
    buildRoseTemplate(),
    buildTealTemplate(),
  ];
  // 既定の種別を付与（Manabill だけクライアント例、その他はテンプレート）。
  return list.map((t) => ({ ...t, kind: classifyKind(t) }));
}
