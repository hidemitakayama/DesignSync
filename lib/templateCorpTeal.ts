// 追加テンプレート（サンプル3）。参考サイトを模した「エンジニア企業のコーポレートLP」。
// ディープティール基調で、ヒーロー(大型タイポ)/事業内容(濃色)/お知らせ/制度・インタビュー(淡色)/
// リクルート(濃色)/フッターを構成。会社名・住所・実績はすべて架空。イラストはプレースホルダー。

import type { PageTemplate, SceneNode, ContainerNode, AtomNode, TextStyle } from "./types";

// --- カラーシステム（ディープティール＋温かいニュートラル） ---
const TEAL = "#1c6b70";       // ブランドティール（濃色セクション）
const TEAL_GRAD = "linear-gradient(135deg,#155257,#1f7a78)";
const INK = "#20303a";        // 見出し・本文
const SUB = "#5f6f6a";        // 補助テキスト
const ON_TEAL = "#bcd8d6";    // 濃色背景上のサブ
const MINT = "#eef4f2";       // 淡色セクション背景
const CREAM = "linear-gradient(120deg,#f4f1ea,#eef2ee)"; // ヒーロー背景
const LINE = "#e6ebe8";       // 枠線
const WHITE = "#ffffff";
const GHOST_W = "rgba(255,255,255,0.10)"; // 濃色上のゴースト数字
const GHOST_T = "rgba(28,107,112,0.12)";  // 白上のゴースト数字

const SH_SM = "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.10)";
const SH_MD = "0 4px 6px -1px rgba(16,24,40,0.08), 0 2px 4px -2px rgba(16,24,40,0.06)";

let k = 0;
const uid = (p: string) => `t-sf-${p}${++k}`;

const txt = (text: string, style: TextStyle): AtomNode => ({ id: uid("t"), type: "atom", atomType: "text", name: text.slice(0, 10) || "テキスト", text, style });
const icon = (paths: string, color = TEAL, size = 24): AtomNode => ({
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

const P_MONITOR = '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>';
const P_LOGO = '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>';

// 白カード（枠線＋影）
const card = (children: SceneNode[], extra: Partial<ContainerNode> = {}): ContainerNode =>
  box({ background: WHITE, radius: 12, padding: 24, gap: 12, grow: true, borderWidth: 1, borderColor: LINE, boxShadow: SH_MD, children, ...extra });

// イラスト/画像スロット（差し替え用）
const illus = (minHeight: number, extra: Partial<ContainerNode> = {}): ContainerNode =>
  box({ background: "linear-gradient(135deg,#dce8e4,#cfe0dc)", radius: 12, minHeight, align: "center", justify: "center", direction: "row", children: [icon(P_MONITOR, "#6f938e", 30)], ...extra });

// 1pxの区切り線
const hr = (color = LINE): ContainerNode => box({ background: color, minHeight: 1, alignSelf: "stretch", children: [] });

// リンク風ボタン
const linkBtn = (label: string, color: string, borderColor: string, bg: string, alignSelf: ContainerNode["alignSelf"] = "flex-start"): ContainerNode =>
  box({ background: bg, borderWidth: 1, borderColor, radius: 8, direction: "row", align: "center", justify: "center", alignSelf, paddingTop: 13, paddingBottom: 13, paddingLeft: 24, paddingRight: 24, children: [
    txt(label, { fontSize: 14, fontWeight: 700, color, align: "center" }),
  ] });

// セクション見出し（英字アイブロウ＋大型タイトル＋リード）
const head = (eyebrow: string, title: string, lead: string, onDark: boolean): SceneNode[] => [
  txt(eyebrow, { fontSize: 13, fontWeight: 800, color: onDark ? ON_TEAL : TEAL, align: "left" }),
  txt(title, { fontSize: 40, fontWeight: 800, color: onDark ? WHITE : INK, align: "left" }),
  txt(lead, { fontSize: 14, fontWeight: 400, color: onDark ? ON_TEAL : SUB, align: "left" }),
];

function buildPage() {
  // 1) ヘッダー
  const navLink = (l: string): AtomNode => txt(l, { fontSize: 13, fontWeight: 600, color: SUB, align: "left" });
  const header = box({
    name: "ヘッダー", direction: "row", justify: "space-between", align: "center", background: WHITE, boxShadow: SH_SM,
    paddingTop: 16, paddingBottom: 16, paddingLeft: 40, paddingRight: 40, gap: 16,
    children: [
      box({ name: "ロゴ", direction: "row", align: "center", gap: 8, children: [
        icon(P_LOGO, TEAL, 22), txt("STACKFORGE", { fontSize: 18, fontWeight: 800, color: INK, align: "left" }),
      ] }),
      box({ name: "ナビ", direction: "row", align: "center", gap: 20, wrap: true, children: [
        navLink("会社情報"), navLink("事業内容"), navLink("ニュース"), navLink("制度・インタビュー"), navLink("リクルート"), navLink("お問い合わせ"),
      ] }),
    ],
  });

  // 2) ヒーロー（大型タイポ＋装飾波）
  const wave: AtomNode = {
    id: uid("s"), type: "atom", atomType: "svg", name: "装飾波", free: true, x: 560, y: 70, width: 420, height: 360, front: false,
    svg: `<svg viewBox="0 0 420 380" fill="none" stroke="#c4d3cc" stroke-width="1.1" opacity="0.7"><path d="M10 70 C 130 10, 300 140, 410 70"/><path d="M10 120 C 130 60, 300 190, 410 120"/><path d="M10 170 C 130 110, 300 240, 410 170"/><path d="M10 220 C 130 160, 300 290, 410 220"/><path d="M10 270 C 130 210, 300 340, 410 270"/><path d="M10 320 C 130 260, 300 390, 410 320"/></svg>`,
  };
  const hero = box({
    name: "ヒーロー", background: CREAM, paddingTop: 100, paddingBottom: 100, paddingLeft: 56, paddingRight: 56, gap: 20, align: "flex-start", minHeight: 520,
    children: [
      wave,
      box({ gap: 2, alignSelf: "flex-start", children: [
        txt("BUILD", { fontSize: 64, fontWeight: 800, color: INK, align: "left" }),
        txt("×", { fontSize: 40, fontWeight: 300, color: TEAL, align: "left" }),
        txt("BEYOND", { fontSize: 64, fontWeight: 800, color: INK, align: "left" }),
      ] }),
      txt("誇りを持って、キャリアを語れる。エンジニア集団。", { fontSize: 15, fontWeight: 600, color: SUB, align: "left" }),
      linkBtn("会社情報 →", TEAL, "#cbd6cf", WHITE),
    ],
  });

  // 3) 事業内容（濃色）
  const serviceCol = (no: string, title: string, en: string, body: string): ContainerNode =>
    box({ gap: 8, grow: true, children: [
      txt(no, { fontSize: 46, fontWeight: 800, color: GHOST_W, align: "left" }),
      txt(title, { fontSize: 20, fontWeight: 800, color: WHITE, align: "left" }),
      txt(en, { fontSize: 12, fontWeight: 700, color: ON_TEAL, align: "left" }),
      txt(body, { fontSize: 13, fontWeight: 400, color: ON_TEAL, align: "left" }),
    ] });
  const services = box({
    name: "事業内容", background: TEAL, paddingTop: 84, paddingBottom: 84, paddingLeft: 56, paddingRight: 56, gap: 14, align: "flex-start",
    children: [
      ...head("SERVICES", "事業内容", "SES事業を軸に、受託開発・自社サービスまでグループで複数の事業を運営。多様なキャリアパスの機会を提供します。", true),
      box({ name: "事業カード", direction: "row", columns: 3, gap: 36, wrap: true, align: "flex-start", alignSelf: "stretch", marginTop: 24, children: [
        serviceCol("01", "SES事業", "Engineer Dispatch", "コンサル領域から開発・インフラ・バッケージソフトまで幅広く対応。AIやLLM領域の案件も拡大中。"),
        serviceCol("02", "受託開発", "Software Development", "Web開発領域を中心に、大手銀行などの大規模開発から、SaaS・toC アプリ・社内AI導入まで幅広く受託。"),
        serviceCol("03", "自社サービス", "Our Own Product", "HR・マーケティング領域を中心に、グループ横断で複数のプロダクトを開発。新規プロダクトの立ち上げも進行中。"),
      ] }),
      linkBtn("事業内容を詳しく見る →", WHITE, "rgba(255,255,255,0.45)", "transparent", "center"),
    ],
  });

  // 4) お知らせ（白）
  const news = box({
    name: "お知らせ", background: WHITE, paddingTop: 80, paddingBottom: 80, paddingLeft: 56, paddingRight: 56, gap: 16, align: "flex-start",
    children: [
      txt("NEWS", { fontSize: 13, fontWeight: 800, color: TEAL, align: "left" }),
      txt("お知らせ", { fontSize: 40, fontWeight: 800, color: INK, align: "left" }),
      hr(),
      txt("現在お知らせはありません。", { fontSize: 14, fontWeight: 400, color: SUB, align: "center", }),
    ],
  });

  // 5) 制度・インタビュー（淡色）
  const thumb = (label: string, title: string): ContainerNode =>
    box({ background: TEAL_GRAD, radius: 12, minHeight: 150, basis: 260, gap: 10, justify: "space-between", boxShadow: SH_MD, paddingTop: 20, paddingBottom: 20, paddingLeft: 20, paddingRight: 20, children: [
      box({ background: "rgba(255,255,255,0.16)", radius: 6, alignSelf: "flex-start", direction: "row", paddingTop: 3, paddingBottom: 3, paddingLeft: 8, paddingRight: 8, children: [txt(label, { fontSize: 11, fontWeight: 800, color: WHITE, align: "left" })] }),
      txt(title, { fontSize: 18, fontWeight: 800, color: WHITE, align: "left" }),
    ] });
  const articleRow = (thumbLabel: string, thumbTitle: string, cat: string, date: string, title: string, excerpt: string): ContainerNode =>
    box({ direction: "row", gap: 28, align: "center", wrap: true, alignSelf: "stretch", children: [
      thumb(thumbLabel, thumbTitle),
      box({ gap: 8, grow: true, basis: 320, children: [
        box({ direction: "row", align: "center", gap: 12, children: [txt(cat, { fontSize: 12, fontWeight: 800, color: TEAL, align: "left" }), txt(date, { fontSize: 12, fontWeight: 600, color: SUB, align: "left" })] }),
        txt(title, { fontSize: 18, fontWeight: 700, color: INK, align: "left" }),
        txt(excerpt, { fontSize: 14, fontWeight: 400, color: SUB, align: "left" }),
      ] }),
    ] });
  const culture = box({
    name: "制度・インタビュー", background: MINT, paddingTop: 84, paddingBottom: 84, paddingLeft: 56, paddingRight: 56, gap: 14, align: "flex-start",
    children: [
      ...head("CULTURE", "制度・インタビュー", "スタックフォージの制度・働き方・キャリア支援の取り組みを、記事形式でご紹介します。", false),
      box({ gap: 28, alignSelf: "stretch", marginTop: 24, children: [
        articleRow("BENEFITS", "高還元を実現できる理由", "BENEFITS", "2026/3/24", "最大還元率87%、大幅な待遇改善。高還元を実現できる理由", "エンジニアへの還元を最大化する、独自の評価と報酬設計について解説します。"),
        articleRow("INTERVIEW", "「キャリア逆算型」アサイン術", "INTERVIEW", "2026/2/27", "「案件を選べる」の、その先へ。案件参画までの流れと事例のご紹介", "希望やキャリアから逆算して案件を選ぶ仕組みを、実例とともに紹介します。"),
      ] }),
      linkBtn("すべて見る →", TEAL, "#cbd6cf", WHITE, "center"),
    ],
  });

  // 6) リクルート（濃色）
  const recruitCard = (no: string, rolePath: string, name: string): ContainerNode =>
    card([
      box({ direction: "row", justify: "space-between", align: "flex-start", gap: 8, children: [
        txt(rolePath, { fontSize: 16, fontWeight: 800, color: INK, align: "left" }),
        txt(no, { fontSize: 40, fontWeight: 800, color: GHOST_T, align: "right" }),
      ] }),
      illus(140, { radius: 10 }),
      txt(name, { fontSize: 15, fontWeight: 700, color: INK, align: "center" }),
    ], { padding: 20, gap: 14 });
  const recruit = box({
    name: "リクルート", background: TEAL, paddingTop: 84, paddingBottom: 84, paddingLeft: 56, paddingRight: 56, gap: 14, align: "flex-start",
    children: [
      txt("RECRUIT", { fontSize: 13, fontWeight: 800, color: ON_TEAL, align: "left" }),
      txt("高還元・案件選択制\n“だけじゃない”SES", { fontSize: 40, fontWeight: 800, color: WHITE, align: "left" }),
      txt("高還元と案件選択制が土台にあり、さらにキャリアUPを促進する「仕組み」「戦略」「営業」がある。それがスタックフォージのSESです。", { fontSize: 14, fontWeight: 400, color: ON_TEAL, align: "left" }),
      box({ name: "職種カード", direction: "row", columns: 3, gap: 20, wrap: true, align: "stretch", alignSelf: "stretch", marginTop: 24, children: [
        recruitCard("01", "Java PG ▶ SAPコンサル", "S.T 29歳"),
        recruitCard("02", "キッティング ▶ NW設計構築", "Y.Y 26歳"),
        recruitCard("03", "PHP ▶ Go/TypeScript", "M.S 35歳"),
      ] }),
      linkBtn("リクルートページへ →", WHITE, "rgba(255,255,255,0.45)", "transparent", "stretch"),
    ],
  });

  // 7) フッター
  const fCol = (title: string, items: string[]): ContainerNode =>
    box({ gap: 10, children: [
      txt(title, { fontSize: 12, fontWeight: 800, color: WHITE, align: "left" }),
      ...items.map((it) => txt(it, { fontSize: 13, fontWeight: 400, color: ON_TEAL, align: "left" })),
    ] });
  const footer = box({
    name: "フッター", background: "#12484d", paddingTop: 56, paddingBottom: 32, paddingLeft: 56, paddingRight: 56, gap: 32,
    children: [
      box({ direction: "row", justify: "space-between", wrap: true, gap: 32, alignSelf: "stretch", children: [
        box({ gap: 10, basis: 240, children: [
          box({ direction: "row", align: "center", gap: 8, children: [icon(P_LOGO, "#7fc0bd", 22), txt("STACKFORGE", { fontSize: 16, fontWeight: 800, color: WHITE, align: "left" })] }),
          txt("株式会社スタックフォージ／STACKFORGE Inc.", { fontSize: 12, fontWeight: 400, color: ON_TEAL, align: "left" }),
          txt("東京都〇〇区〇〇1-2-3 〇〇ビル5F", { fontSize: 12, fontWeight: 400, color: ON_TEAL, align: "left" }),
        ] }),
        fCol("会社情報", ["Mission / Vision", "代表メッセージ", "会社概要", "ボードメンバー"]),
        fCol("事業内容", ["SES事業", "受託開発", "自社サービス", "メンバー紹介"]),
        fCol("ENGINEER", ["制度・インタビュー", "リクルート", "ニュース"]),
        fCol("サポート", ["お問い合わせ"]),
      ] }),
      hr("rgba(255,255,255,0.14)"),
      txt("© 2026 STACKFORGE Inc.", { fontSize: 12, fontWeight: 500, color: ON_TEAL, align: "left" }),
    ],
  });

  const raw = [header, hero, services, news, culture, recruit, footer];
  const sections = raw.map((s) => ({ ...s, type: "section" as const }));
  return { id: uid("page"), name: "エンジニア企業 コーポレートLP", children: sections };
}

export const TEAL_TEMPLATE_ID = "t-stackforge-corp";

export function buildTealTemplate(): PageTemplate {
  k = 0;
  return { id: TEAL_TEMPLATE_ID, name: "エンジニア企業 コーポレートLP／ティール（サンプル）", page: buildPage() };
}
