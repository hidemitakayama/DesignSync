// テンプレート（クライアント案件）：個別指導塾スタディメイト（東京都豊島区・椎名町）のトップページLP。
// ヒアリング内容に基づく：
//   軸「勉強も、自信も。「頑張る心」が育つ塾。」／テイスト=ポップ・親しみやすい／
//   カラー=ロゴ（黄・緑・白）実測色。現行サイト(studymate-school.netlify.app)より明るい印象にする。
//   コンセプト：最大1対2の個別指導で、学力だけでなく自信と「頑張る心」を育てる。
//   ターゲット：小学生〜高校生（と保護者）。
//   課題：①自分で更新できる運用（お知らせ／ブログ／講習の受付告知）②明るく親しみやすい教室の雰囲気。
//
// デザイン方針：ビルダーで作成済みの「個別指導塾Polaris トップページ」の“素材”
//   （丸ピルのボタン／2px枠の白カード／方眼の背景／緑帯）は引き継ぐが、
//   ★「AI感を消す」という先方の要望に合わせて、Polarisにあった以下の型は意図的に崩している：
//     ・全セクション「中央見出し＋500px下線バー＋字間6px」の均一な見出し
//       → 中央見出し／左寄せ＋縦バー／小さい平見出し の3種を、内容の重さで使い分ける。
//     ・角丸カードの均等グリッドの反復（＝スクロールしても景色が変わらない）
//       → 大小の非対称、罫線リスト、料金表など、セクションごとに骨格を変える。
//     ・実績風の巨大数字バンド（中身のない数字の装飾）
//       → 事実だけを並べた薄い情報バーにする。
//     ・意味のないグラデーションのプレースホルダー
//       → 破線枠のワイヤー表現にして「ここに写真が入る」ことを正直に見せる。
//     ・英字ラベル（POINT / STEP）や「選ばれる“4つの”理由」といった数入りの定型見出し。
//     ・全部が2文・同じ長さ・語尾「〜ます。」で揃った説明文
//       → 一文だけの箇所、体言止め、長短を混ぜて読みのリズムを作る。
//   セクションの上下余白も 56〜96px で振り、均一な縦リズムにしない。
//
// ★写真は全てプレースホルダー。先方支給の教室写真（FVは「女性2人が机に向かっている」指定）に差し替える。
// ★ページ構成はクライアント指定の【トップページ】1〜9のとおり（buildPage 内のセクション名が構成番号と対応）。
// ★4「5つの関わり」の②〜⑤だけ原稿が未受領（②は「先生がすぐそばにいる、」で途切れ）。仮文には
//   画面上にも「原稿仮」チップを出しているので、原稿を受領したらチップごと差し替える。

import type { PageTemplate, SceneNode, ContainerNode, AtomNode, TextStyle } from "./types";

// --- カラー（ロゴの実測色をそのまま基準にする） ---
// ロゴ画像から抽出：黄 #f1c81e / 濃緑 #109141 / 黄緑 #89b82a。
const GREEN = "#109141";    // メイン（ロゴの濃い緑）
const GREEN_B = "#1aa851";  // 明るい緑（帯・ボタン。現行サイトより明るく）
const GREEN_D = "#0b6e31";  // 濃い緑（文字の強調）
const LIME = "#89b82a";     // 黄緑（ロゴ）
const YELLOW = "#f1c81e";   // 黄（ロゴ）＝アクセント
const YELLOW_D = "#8a6a00"; // 黄の上に乗せる文字色
const YELLOW_L = "#fff3c9"; // 淡い黄（チップ地）
const GREEN_L = "#dff3e4";  // 淡い緑（チップ地）
const GREEN_XL = "#f1faf2"; // ごく淡い緑（セクション地）
const CREAM = "#fffcef";    // ごく淡い黄（セクション地）
const INK = "#2b3128";      // 見出し・本文（緑みのダーク）
const SUB = "#67715f";      // 補助文字
const LINE = "#e2ebde";     // 枠線
const WHITE = "#ffffff";
const FOOT = "#233020";     // フッター（深い緑のダーク）

// 見出し用フォント（丸ゴシック）＝ロゴの丸い白文字に合わせた親しみやすさ。本文は既定（Noto Sans JP）。
const HEAD = "rounded"; // M PLUS Rounded 1c（400/700/800）

// 影（控えめに。全部同じ影を配ると量産感が出るので、使う場所を絞る）
const SH_SM = "0 1px 2px rgba(20,60,30,0.05), 0 1px 3px rgba(20,60,30,0.07)";
const SH_MD = "0 8px 20px -8px rgba(20,80,40,0.20), 0 2px 6px -3px rgba(20,80,40,0.10)";

let k = 0;
const uid = (p: string) => `t-smt-${p}${++k}`;

const txt = (text: string, style: TextStyle): AtomNode => ({ id: uid("t"), type: "atom", atomType: "text", name: text.slice(0, 10) || "テキスト", text, style });
// 見出し（丸ゴシック・太字）
const htxt = (text: string, fontSize: number, color = INK, extra: Partial<TextStyle> = {}): AtomNode =>
  txt(text, { fontSize, fontWeight: 800, color, fontFamily: HEAD, align: "left", ...extra });
// 本文段落
const para = (t: string, extra: Partial<TextStyle> = {}): AtomNode =>
  txt(t, { fontSize: 15, fontWeight: 400, color: INK, lineHeight: 1.95, align: "left", ...extra });

const icon = (paths: string, color = GREEN, size = 24): AtomNode => ({
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

// ノードに余白だけを足す（余白は style ではなくノード側のプロパティ）
const mb = <T extends AtomNode | ContainerNode>(n: T, v: number): T => ({ ...n, marginBottom: v });
// 親のFlex内で伸ばす（grow は style ではなくノード側のプロパティ）
const grow = <T extends AtomNode | ContainerNode>(n: T): T => ({ ...n, grow: true });

const P = {
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  bulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  circleCheck: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  train: '<rect x="4" y="3" width="16" height="13" rx="2"/><path d="M4 11h16"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><path d="M8 15h.01"/><path d="M16 15h.01"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  arrowR: '<path d="m9 18 6-6-6-6"/>',
  camera: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
};

// --- 共通パーツ -------------------------------------------------------------

// セクションの外枠。上下の余白は呼び出し側で振る（＝均一な縦リズムにしない）。
const sec = (name: string, children: SceneNode[], extra: Partial<ContainerNode> = {}): ContainerNode =>
  box({ name, paddingTop: 80, paddingBottom: 80, paddingLeft: 52, paddingRight: 52, gap: 36, background: WHITE, children, ...extra });

// 方眼の背景（ノート風）。使いすぎると単調になるので2箇所だけに絞る。
const GRID = { kind: "grid" as const, color: "#e3ece2", size: 26 };

// 見出し その1：中央＋下線バー。ページの“山場”だけに使う（想い／コース・料金）。
const headCenter = (title: string, lead?: string): ContainerNode =>
  box({ name: "見出し", align: "center", gap: 12, alignSelf: "stretch", children: [
    mb(htxt(title, 38, GREEN, { align: "center", lineHeight: 1.35, letterSpacing: 3 }), 6),
    box({ background: YELLOW, radius: 999, width: 64, minHeight: 5, alignSelf: "center", marginBottom: lead ? 8 : 0, children: [] }),
    ...(lead ? [txt(lead, { fontSize: 15, fontWeight: 400, color: SUB, lineHeight: 1.95, align: "center" })] : []),
  ] });

// 見出し その2：左寄せ＋縦のアクセントバー。読み物系のセクションに使う。
const headLeft = (title: string, lead?: string): ContainerNode =>
  box({ name: "見出し", direction: "row", gap: 16, align: "stretch", alignSelf: "flex-start", children: [
    box({ background: GREEN_B, radius: 999, width: 6, children: [] }),
    box({ gap: 8, justify: "center", children: [
      htxt(title, 30, INK, { lineHeight: 1.4 }),
      ...(lead ? [txt(lead, { fontSize: 14, fontWeight: 500, color: SUB, lineHeight: 1.8, align: "left" })] : []),
    ] }),
  ] });

// 見出し その3：小さい平見出し。一覧・補足系（お知らせ／質問）に使う。
const headPlain = (title: string, right?: SceneNode): ContainerNode =>
  box({ name: "見出し", direction: "row", justify: "space-between", align: "flex-end", gap: 16, alignSelf: "stretch",
    paddingBottom: 14, borderWidth: 0, children: [
      htxt(title, 24, INK, { lineHeight: 1.4 }),
      ...(right ? [right] : []),
    ] });

// 丸ピルのボタン（塗り）
const button = (label: string, bg = GREEN_B, color = WHITE, shadow = SH_MD): ContainerNode =>
  box({ direction: "row", align: "center", justify: "center", gap: 8, radius: 999, background: bg, boxShadow: shadow,
    alignSelf: "flex-start", paddingTop: 15, paddingBottom: 15, paddingLeft: 28, paddingRight: 26, children: [
      txt(label, { fontSize: 15, fontWeight: 800, color, fontFamily: HEAD, align: "center" }), icon(P.arrow, color, 17),
    ] });

// 丸ピルのボタン（線）
const ghost = (label: string, color = GREEN_D, border = GREEN_B, bg = WHITE): ContainerNode =>
  box({ direction: "row", align: "center", justify: "center", gap: 8, radius: 999, background: bg, borderWidth: 1.5, borderColor: border,
    alignSelf: "flex-start", paddingTop: 15, paddingBottom: 15, paddingLeft: 26, paddingRight: 24, children: [
      txt(label, { fontSize: 15, fontWeight: 800, color, fontFamily: HEAD, align: "center" }), icon(P.arrowR, color, 16),
    ] });

// 小さなチップ（アイコン＋一言）
const chip = (label: string, ic = P.circleCheck, bg = GREEN_L, color = GREEN_D): ContainerNode =>
  box({ direction: "row", align: "center", gap: 7, radius: 999, background: bg, alignSelf: "flex-start",
    paddingTop: 8, paddingBottom: 8, paddingLeft: 14, paddingRight: 16, children: [
      icon(ic, color, 15), txt(label, { fontSize: 12, fontWeight: 700, color, align: "left" }),
    ] });

// 横の細い区切り線（カードを使わずに項目を切るための線）
const rule = (color = LINE, h = 1): ContainerNode => box({ background: color, minHeight: h, alignSelf: "stretch", children: [] });

// 写真スロット：グラデーションで“それっぽく”見せず、破線枠のワイヤーとして正直に出す。
const slot = (minHeight: number, label: string, extra: Partial<ContainerNode> = {}): ContainerNode =>
  box({ name: "写真スロット", background: "#f4f7f2", radius: 4, borderWidth: 1.5, borderColor: "#c9d6c4",
    minHeight, align: "center", justify: "center", gap: 8, children: [
      icon(P.camera, "#9bab94", 26),
      txt(label, { fontSize: 12, fontWeight: 700, color: "#7d8c77", align: "center", lineHeight: 1.7 }),
    ], ...extra });

// 注記（薄いグレーの小さい文字）
const note = (t: string, align: "left" | "center" = "left"): AtomNode =>
  txt(t, { fontSize: 12, fontWeight: 500, color: SUB, lineHeight: 1.8, align });

function buildPage() {
  // ===== ヘッダー（構成外。電話番号を出す＝塾サイトでは飾りより導線） =====
  const navLink = (l: string): AtomNode => txt(l, { fontSize: 13, fontWeight: 700, color: INK, align: "left" });
  const header = box({
    name: "ヘッダー", direction: "row", justify: "space-between", align: "center", gap: 8,
    paddingTop: 14, paddingBottom: 14, paddingLeft: 18, paddingRight: 18, background: WHITE, borderWidth: 1, borderColor: LINE,
    children: [
      { id: uid("i"), type: "atom", atomType: "image", name: "ロゴ", src: "/studymate/logo.png",
        alt: "個別指導 スタディメイト", fit: "contain", width: 170, height: 45 } as AtomNode,
      // SPではナビを畳んでメニューボタンに置き換える（横並びのままだと1画面に収まらない）。
      box({ direction: "row", align: "center", wrap: true, gap: 18, sp: { hidden: true }, children: [
        navLink("最近のスタディメイト"), navLink("大切にしていること"), navLink("5つの関わり"),
        navLink("こんな変化に"), navLink("代表メッセージ"), navLink("コース・料金"), navLink("教室・アクセス"),
        box({ gap: 1, marginLeft: 4, children: [
          txt("月〜土 14:00〜21:00", { fontSize: 10, fontWeight: 700, color: SUB, align: "right" }),
          txt("03-5983-7777", { fontSize: 18, fontWeight: 800, color: GREEN_D, fontFamily: HEAD, align: "right" }),
        ] }),
        box({ direction: "row", align: "center", justify: "center", gap: 8, radius: 999, background: GREEN_B, alignSelf: "center",
          paddingTop: 12, paddingBottom: 12, paddingLeft: 20, paddingRight: 20, children: [
            icon(P.smile, WHITE, 16), txt("無料体験授業", { fontSize: 13, fontWeight: 800, color: WHITE, fontFamily: HEAD, align: "center" }),
          ] }),
      ] }),
      box({ name: "メニュー（SP）", hiddenPc: true, direction: "row", align: "center", gap: 8, radius: 12,
        background: GREEN_L, alignSelf: "center", paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, children: [
          icon(P.menu, GREEN_D, 20),
          txt("メニュー", { fontSize: 12, fontWeight: 800, color: GREEN_D, fontFamily: HEAD, align: "center" }),
        ] }),
    ],
  });

  // ===== 1. FV ================================================================
  const hero = box({
    name: "1. FV", direction: "row", justify: "center", align: "center", wrap: true, gap: 44,
    paddingTop: 64, paddingBottom: 64, paddingLeft: 52, paddingRight: 52, minHeight: 520,
    background: CREAM, bgPattern: { kind: "dot", color: "#f0e4b4", size: 22 },
    children: [
      box({ gap: 20, grow: true, basis: 520, children: [
        chip("東京都豊島区・椎名町｜小学生〜高校生の個別指導塾", P.pin, YELLOW_L, YELLOW_D),
        { id: uid("t"), type: "atom", atomType: "text", name: "メインコピー", text: "勉強も、自信も。",
          style: { fontSize: 46, fontWeight: 800, color: INK, fontFamily: HEAD, align: "left", lineHeight: 1.3, letterSpacing: 2 },
          runs: [{ text: "勉強も、" }, { text: "自信", color: GREEN }, { text: "も。" }] } as AtomNode,
        { id: uid("t"), type: "atom", atomType: "text", name: "メインコピー2", text: "「頑張る心」が育つ塾。",
          style: { fontSize: 46, fontWeight: 800, color: INK, fontFamily: HEAD, align: "left", lineHeight: 1.3, letterSpacing: 2 },
          runs: [{ text: "「" }, { text: "頑張る心", color: GREEN }, { text: "」が育つ塾。" }], marginTop: -8 } as AtomNode,
        txt("「できた！」の積み重ねが、次の「やってみよう！」に。\n安心して頑張れるように、一人ひとりに合った目標と学び方を一緒に考え、伴走します。",
          { fontSize: 16, fontWeight: 400, color: INK, lineHeight: 1.95, align: "left" }),
        box({ direction: "row", wrap: true, align: "center", gap: 14, marginTop: 6, children: [
          button("無料体験授業"),
          ghost("お問い合わせ"),
        ] }),
        box({ direction: "row", wrap: true, gap: 8, marginTop: 2, children: [
          chip("最大1対2の個別指導"), chip("小学1年生〜高校3年生"), chip("1対1・Zoom指導も可"),
        ] }),
      ] }),
      slot(400, "FVメイン写真\n［先方支給／女性2人が机に向かっている写真］", { grow: true, basis: 440, radius: 8 }),
    ],
  });

  // ===== 2. 最近のスタディメイト ==============================================
  // 「どんな塾なのか」を空気感から伝える枠。ブログ的に更新できる想定なので、
  // 写真＋日付＋一言のかたちにして、教室の方が差し替えられることを明記する。
  const recentShot = (label: string, date: string, caption: string, h: number, extra: Partial<ContainerNode> = {}): ContainerNode =>
    box({ gap: 10, children: [
      slot(h, label),
      box({ direction: "row", align: "center", gap: 10, children: [
        txt(date, { fontSize: 12, fontWeight: 700, color: SUB, align: "left" }),
        txt(caption, { fontSize: 13, fontWeight: 500, color: INK, align: "left", lineHeight: 1.7 }),
      ] }),
    ], ...extra });
  const recent = box({
    name: "2. 最近のスタディメイト", gap: 30, paddingTop: 76, paddingBottom: 76, paddingLeft: 52, paddingRight: 52,
    background: WHITE,
    children: [
      headPlain("最近のスタディメイト", ghost("一覧を見る")),
      txt("真剣に勉強したり、先生に相談したり、ときには笑ったり。\n今日も教室には、生徒たちの「頑張ってみよう」が集まっています。",
        { fontSize: 18, fontWeight: 500, color: INK, lineHeight: 2, align: "left" }),
      box({ direction: "row", wrap: true, gap: 20, alignSelf: "stretch", marginTop: 6, children: [
        recentShot("授業の様子\n［先方支給］", "2026.00.00", "1対2の授業。手が止まったらすぐ声をかけます。", 320, { grow: true, basis: 520 }),
        box({ gap: 20, grow: true, basis: 320, children: [
          recentShot("自習室の様子\n［先方支給］", "2026.00.00", "授業がない日も自習に来られます。", 130),
          recentShot("先生と生徒の会話\n［先方支給］", "2026.00.00", "勉強以外の相談も、よくあります。", 130),
        ] }),
      ] }),
      box({ direction: "row", align: "center", gap: 10, marginTop: 8, alignSelf: "flex-start", children: [
        icon(P.edit, GREEN_D, 17),
        txt("この枠は、教室の方が管理画面から写真と一言を追加・差し替えできるようにします（講習の受付告知もここに出せます）。",
          { fontSize: 13, fontWeight: 700, color: GREEN_D, lineHeight: 1.8, align: "left" }),
      ] }),
    ],
  });

  // ===== 3. スタディメイトが大切にしていること ================================
  // 文字だけの静かなセクション。前後が写真・カードなので、ここは余白で読ませる。
  const values = box({
    name: "3. 大切にしていること", gap: 34, paddingTop: 96, paddingBottom: 96, paddingLeft: 52, paddingRight: 52,
    background: GREEN_XL, align: "center",
    children: [
      txt("スタディメイトが大切にしていること", { fontSize: 13, fontWeight: 800, color: GREEN_D, fontFamily: HEAD, align: "center", letterSpacing: 2 }),
      htxt("勉強で、自信をなくしてほしくない。", 36, INK, { align: "center", lineHeight: 1.45 }),
      box({ direction: "row", align: "center", justify: "center", gap: 12, alignSelf: "center", marginTop: -14, children: [
        box({ background: YELLOW, radius: 999, width: 40, minHeight: 4, alignSelf: "center", children: [] }),
        txt("小さな「できた」の積み重ねで「頑張る心」を育む", { fontSize: 17, fontWeight: 700, color: GREEN_D, fontFamily: HEAD, align: "center" }),
        box({ background: YELLOW, radius: 999, width: 40, minHeight: 4, alignSelf: "center", children: [] }),
      ] }),
      // 不安の2行は引用として大きめに置き、本文とリズムを変える
      box({ gap: 6, align: "center", marginTop: 14, children: [
        txt("「勉強してもわからないかも」", { fontSize: 22, fontWeight: 500, color: "#98a292", fontFamily: HEAD, align: "center", lineHeight: 1.7 }),
        txt("「自分には無理かも」", { fontSize: 22, fontWeight: 500, color: "#98a292", fontFamily: HEAD, align: "center", lineHeight: 1.7 }),
      ] }),
      box({ gap: 22, align: "center", width: 720, alignSelf: "center", marginTop: 6, children: [
        txt("そんな不安があると、勉強に前向きになるのは難しいものです。",
          { fontSize: 16, fontWeight: 400, color: INK, lineHeight: 2.05, align: "center" }),
        txt("でも、自分に合った目標が見つかると、「ちょっと頑張ってみよう」と思える。\nそして、小さな「わかった」「できた」が積み重なると、それは少しずつ自信に変わっていきます。\nその自信が、次の「やってみよう」につながっていく。",
          { fontSize: 16, fontWeight: 400, color: INK, lineHeight: 2.05, align: "center" }),
        txt("スタディメイトは、勉強を通して、そんな前向きな一歩を育てたいと考えています。",
          { fontSize: 17, fontWeight: 700, color: GREEN_D, lineHeight: 2, align: "center" }),
      ] }),
    ],
  });

  // ===== 4. 「できた！」を育てる5つの関わり ===================================
  // ①は支給原稿のまま。②は「先生がすぐそばにいる、」までで原稿が途切れており、
  // ③〜⑤は未受領のため、コンセプトから起こした仮文（画面上にも［仮］と明記）。
  const careLead = (no: string, title: string, body: string, tentative: boolean): ContainerNode =>
    box({ direction: "row", wrap: true, gap: 36, align: "center", alignSelf: "stretch", background: WHITE, radius: 20,
      paddingTop: 32, paddingBottom: 32, paddingLeft: 32, paddingRight: 32, boxShadow: SH_SM, children: [
        slot(240, "①の場面がわかる写真\n［先方支給］", { grow: true, basis: 360 }),
        box({ gap: 14, grow: true, basis: 440, children: [
          box({ direction: "row", align: "center", gap: 12, children: [
            txt(no, { fontSize: 30, fontWeight: 800, color: YELLOW, fontFamily: HEAD, align: "left" }),
            ...(tentative ? [chip("原稿仮", P.edit, "#f1f1ee", "#8b8b83")] : []),
          ] }),
          htxt(title, 26, GREEN_D, { lineHeight: 1.5 }),
          para(body, { fontSize: 16 }),
        ] }),
      ] });
  const careItem = (no: string, title: string, body: string, tentative: boolean, last = false): ContainerNode =>
    box({ gap: 0, grow: true, basis: 440, children: [
      box({ direction: "row", gap: 16, align: "flex-start", paddingTop: 22, paddingBottom: 22, children: [
        txt(no, { fontSize: 24, fontWeight: 800, color: YELLOW, fontFamily: HEAD, align: "left" }),
        box({ gap: 8, grow: true, children: [
          box({ direction: "row", align: "center", wrap: true, gap: 10, children: [
            htxt(title, 18, INK, { lineHeight: 1.55 }),
            ...(tentative ? [chip("原稿仮", P.edit, "#f1f1ee", "#8b8b83")] : []),
          ] }),
          txt(body, { fontSize: 14, fontWeight: 400, color: SUB, lineHeight: 1.95, align: "left" }),
        ] }),
      ] }),
      ...(last ? [] : [rule()]),
    ] });
  const care = box({
    name: "4. 5つの関わり", gap: 32, paddingTop: 84, paddingBottom: 84, paddingLeft: 52, paddingRight: 52,
    background: WHITE, bgPattern: GRID,
    children: [
      headLeft("「できた！」を育てる5つの関わり"),
      careLead("①", "一人ひとりが頑張れる目標を一緒につくる",
        "その子の今に合わせて、「これなら頑張れそう」と思える目標を一緒に考えます。", false),
      box({ direction: "row", wrap: true, gap: 40, alignSelf: "stretch", marginTop: 4, children: [
        careItem("②", "先生がすぐそばにいる、最大1対2の授業",
          "手が止まったら、すぐ横から声をかけられる距離です。「わからない」と言い出せないまま時間が過ぎることがありません。", true),
        careItem("③", "小さな「できた」を、その日のうちに確かめる",
          "帰る前に、今日できるようになったことを一緒に言葉にします。それが少しずつ自信に変わっていきます。", true),
        careItem("④", "勉強以外のことも、相談できる関係をつくる",
          "先生との距離が近いので、困ったことをそのまま話せます。安心して頑張れる場所であることを大切にしています。", true, true),
        careItem("⑤", "保護者の方と一緒に、成長を見守る",
          "うまくいった日も、悩んでいるときも共有します。ご家庭と一緒にお子様の成長を見守ります。", true, true),
      ] }),
      note("※ ②は原稿が「先生がすぐそばにいる、」で途切れていたため以降を仮置き、③〜⑤は未受領のため仮文です。原稿をいただき次第そのまま差し替えます。"),
    ],
  });

  // ===== 5. 「できた！」の積み重ねが、こんな変化に。 =========================
  // 体験談3本。均等な3列カードにすると量産感が出るので、
  // 「左＝見出し／右＝本文」を罫線で区切った記事のインデックス的な組みにする。
  const changeStory = (accent: string, when: string, title: string, body: SceneNode[], last = false): ContainerNode =>
    box({ gap: 0, alignSelf: "stretch", children: [
      box({ direction: "row", wrap: true, gap: 40, align: "flex-start", paddingTop: 34, paddingBottom: 34, children: [
        box({ gap: 12, grow: true, basis: 360, children: [
          box({ direction: "row", align: "center", gap: 9, alignSelf: "flex-start", background: WHITE, radius: 999,
            paddingTop: 7, paddingBottom: 7, paddingLeft: 14, paddingRight: 16, children: [
              box({ background: accent, radius: 999, width: 8, minHeight: 8, alignSelf: "center", children: [] }),
              txt(when, { fontSize: 12, fontWeight: 700, color: SUB, align: "left" }),
            ] }),
          htxt(title, 24, GREEN_D, { lineHeight: 1.55 }),
        ] }),
        box({ gap: 14, grow: true, basis: 560, paddingTop: 4, children: body }),
      ] }),
      ...(last ? [] : [rule("#dfe9db")]),
    ] });
  const changes = box({
    name: "5. こんな変化に", gap: 30, paddingTop: 88, paddingBottom: 88, paddingLeft: 52, paddingRight: 52,
    background: GREEN_XL,
    children: [
      headLeft("「できた！」の積み重ねが、こんな変化に。"),
      box({ gap: 10, width: 880, marginBottom: 10, children: [
        para("スタディメイトでは、一人ひとりのペースに合わせて学びながら、小さな「できた！」を積み重ねていきます。", { fontSize: 16 }),
        para("苦手だったことが得意になったり、自分から新しいことに挑戦したり。そんな変化が、少しずつ生まれています。", { fontSize: 16 }),
      ] }),
      changeStory(YELLOW, "小学2年生で入塾", "苦手だった算数が、得意科目に", [
        para("小学2年生のとき、時計の勉強が苦手でスタディメイトへ。"),
        // 先生の言葉はそのまま拾って強調する（この塾らしさが一番出ているところ）
        { id: uid("t"), type: "atom", atomType: "text", name: "本文（強調あり）",
          text: "先生の「大丈夫、大丈夫！！」という励ましをきっかけに通い始め、今では得意科目は算数になりました。",
          style: { fontSize: 15, fontWeight: 400, color: INK, lineHeight: 1.95, align: "left" },
          runs: [
            { text: "先生の" },
            { text: "「大丈夫、大丈夫！！」", color: GREEN },
            { text: "という励ましをきっかけに通い始め、今では得意科目は算数になりました。" },
          ] } as AtomNode,
      ]),
      changeStory(GREEN, "中学2年生で転塾", "「英語が嫌」から、自分で英検に挑戦", [
        para("中学2年生のとき、英語が嫌で前の塾から転塾。"),
        para("スタディメイトには「行きたくない」と言うことがなくなり、半年ほど経った頃には、自分から「英検を受けてみる」と言うように。先生たちの応援が、「やってみよう！」という気持ちにつながりました。高校生になった今も通い続けています。"),
      ]),
      changeStory(LIME, "中学受験で入塾", "楽しみながら学び、第1志望に合格", [
        para("中学受験を個別で対応してもらえることから入塾。"),
        para("自分に合ったペースで楽しみながら勉強を続け、第1志望に合格しました。"),
      ], true),
    ],
  });

  // ===== 6. 代表メッセージ ====================================================
  const message = box({
    name: "6. 代表メッセージ", gap: 36, paddingTop: 92, paddingBottom: 92, paddingLeft: 52, paddingRight: 52,
    background: WHITE,
    children: [
      headLeft("代表メッセージ"),
      box({ direction: "row", wrap: true, gap: 44, align: "flex-start", alignSelf: "stretch", children: [
        box({ gap: 18, grow: true, basis: 560, children: [
          htxt("「できた！」を、自分を信じる力に。", 30, GREEN_D, { lineHeight: 1.5 }),
          para("子どもたちを見ていると、勉強がうまくいかないことで、「自分はできない」と自信までなくしてしまうことがあります。\nでも、頑張れる目標も、力を伸ばすために必要な学び方も、一人ひとり違います。"),
          para("だからスタディメイトでは、ただ勉強を教えるだけではなく、「今、この子には何が必要だろう」と考えながら、その子に合った目標や学び方を一緒に見つけていきます。"),
          para("「わかった！」「できた！」という小さな経験が積み重なると、少しずつ自信が生まれます。\nそして、「もう少し頑張ってみよう」「次はこれをやってみよう」と、自分から一歩を踏み出せるようになります。"),
          para("テストの点数や合格はもちろん大切です。けれど、その先にも続いていく「自分ならやってみられる」と思える心も、勉強を通して育てていきたい。それが、私がスタディメイトで大切にしていることです。"),
          box({ direction: "row", gap: 16, align: "stretch", marginTop: 8, children: [
            box({ background: YELLOW, radius: 999, width: 5, sp: { hidden: true }, children: [] }),
            box({ gap: 8, children: [
              para("生徒一人ひとりを、「自分の子どもだったら、どうするだろう」という気持ちで見つめること。", { fontWeight: 700 }),
              para("そして保護者の方とも一緒に、うまくいった日も、悩んでいるときも、その子の成長をじっくり見守ること。"),
              para("子どもたちが安心して頑張り、「ここなら大丈夫」と思える場所であり続けたいと思っています。"),
            ] }),
          ] }),
          box({ direction: "row", align: "center", gap: 10, marginTop: 8, children: [
            txt("スタディメイト 代表", { fontSize: 13, fontWeight: 700, color: SUB, align: "left" }),
            txt("［お名前］", { fontSize: 16, fontWeight: 800, color: INK, fontFamily: HEAD, align: "left" }),
          ] }),
        ] }),
        box({ gap: 12, grow: true, basis: 340, children: [
          slot(480, "代表の写真\n［先方支給］"),
        ] }),
      ] }),
    ],
  });

  // ===== 7. コース・料金 ======================================================
  const priceChip = (label: string, price: string): ContainerNode =>
    box({ direction: "row", align: "center", gap: 8, background: GREEN_XL, radius: 8,
      paddingTop: 9, paddingBottom: 9, paddingLeft: 14, paddingRight: 14, children: [
        txt(label, { fontSize: 13, fontWeight: 700, color: SUB, align: "left" }),
        txt(price, { fontSize: 16, fontWeight: 800, color: GREEN_D, fontFamily: HEAD, align: "left" }),
      ] });
  const courseRow = (accent: string, name: string, target: string, time: string, rows: [string, string][], add: string, memo?: string, last = false): ContainerNode =>
    box({ gap: 0, alignSelf: "stretch", children: [
      box({ direction: "row", wrap: true, gap: 24, align: "flex-start", paddingTop: 24, paddingBottom: 24, children: [
        box({ gap: 8, grow: true, basis: 300, children: [
          box({ direction: "row", align: "center", gap: 10, children: [
            box({ background: accent, radius: 6, width: 5, minHeight: 20, alignSelf: "center", children: [] }),
            htxt(name, 20, INK, { lineHeight: 1.4 }),
          ] }),
          box({ direction: "row", wrap: true, gap: 8, marginLeft: 15, children: [
            chip(target, P.book, YELLOW_L, YELLOW_D),
            chip(time, P.clock, GREEN_L, GREEN_D),
          ] }),
        ] }),
        box({ gap: 10, grow: true, basis: 520, children: [
          box({ direction: "row", wrap: true, gap: 10, children: [
            ...rows.map(([l, p]) => priceChip(l, p)),
            box({ direction: "row", align: "center", gap: 8, background: YELLOW_L, radius: 8,
              paddingTop: 9, paddingBottom: 9, paddingLeft: 14, paddingRight: 14, children: [
                txt("追加授業 1回", { fontSize: 13, fontWeight: 700, color: YELLOW_D, align: "left" }),
                txt(add, { fontSize: 16, fontWeight: 800, color: YELLOW_D, fontFamily: HEAD, align: "left" }),
              ] }),
          ] }),
          ...(memo ? [note(memo)] : []),
        ] }),
      ] }),
      ...(last ? [] : [rule()]),
    ] });
  const courses = box({
    name: "7. コース・料金", gap: 26, paddingTop: 88, paddingBottom: 96, paddingLeft: 52, paddingRight: 52, background: CREAM,
    children: [
      headCenter("コース・料金"),
      txt("料金はすべて税込です。料金案内は1対2ですが、1対1やZoom指導も可能です。詳しくはお問い合わせください。",
        { fontSize: 14, fontWeight: 500, color: INK, lineHeight: 1.85, align: "center" }),
      box({ background: WHITE, radius: 18, borderWidth: 1, borderColor: LINE, boxShadow: SH_SM,
        paddingTop: 8, paddingBottom: 8, paddingLeft: 34, paddingRight: 34, alignSelf: "stretch", gap: 0, marginTop: 8, children: [
          box({ background: LIME, radius: 999, alignSelf: "flex-start", paddingTop: 8, paddingBottom: 8, paddingLeft: 18, paddingRight: 18, marginTop: 24, marginBottom: 4, children: [
            txt("小学生", { fontSize: 13, fontWeight: 800, color: WHITE, fontFamily: HEAD, align: "center" }),
          ] }),
          courseRow(LIME, "楽しく学ぶコース", "小学1〜2年生", "1回 45分",
            [["月8回", "16,000円"], ["月16回", "30,000円"]], "4,000円"),
          courseRow(GREEN, "中学受験コース", "小学3〜6年生", "1回 90分",
            [["月12回", "44,000円"], ["月16回", "58,000円"]], "4,000円"),
          courseRow(GREEN_B, "学習サポートコース", "小学3〜6年生", "1回 90分",
            [["月4回", "16,000円"], ["月8回", "30,000円"], ["月12回", "44,000円"]], "4,000円",
            "※ 1科目月4回が基本単位となります"),
          box({ background: GREEN, radius: 999, alignSelf: "flex-start", paddingTop: 8, paddingBottom: 8, paddingLeft: 18, paddingRight: 18, marginTop: 32, marginBottom: 4, children: [
            txt("中学生・高校生", { fontSize: 13, fontWeight: 800, color: WHITE, fontFamily: HEAD, align: "center" }),
          ] }),
          courseRow(GREEN_B, "学習サポートコース", "中学1〜高校2年生", "1回 90分",
            [["月4回", "17,000円"], ["月8回", "32,000円"], ["月12回", "47,000円"]], "4,250円",
            "※ 1科目月4回が基本単位となります"),
          courseRow(GREEN_B, "学習サポートコース", "高校3年生", "1回 90分",
            [["月4回", "18,000円"], ["月8回", "34,000円"], ["月12回", "50,000円"]], "4,500円",
            "※ 1科目月4回が基本単位となります", true),
          box({ paddingTop: 4, paddingBottom: 26, children: [
            txt("どの回数が合うかは、通える曜日と目標をお聞きしてからご提案します。", { fontSize: 14, fontWeight: 500, color: SUB, align: "left", lineHeight: 1.8 }),
          ] }),
        ] }),
    ],
  });

  // ===== 8. 教室・アクセス ====================================================
  const infoRow = (ic: string, label: string, value: string, big = false): ContainerNode =>
    box({ direction: "row", gap: 14, align: "flex-start", paddingTop: 13, paddingBottom: 13, children: [
      box({ alignSelf: "flex-start", paddingTop: 2, children: [icon(ic, GREEN_B, 18)] }),
      box({ gap: 3, grow: true, children: [
        txt(label, { fontSize: 12, fontWeight: 700, color: SUB, align: "left" }),
        txt(value, big
          ? { fontSize: 22, fontWeight: 800, color: INK, fontFamily: HEAD, align: "left", lineHeight: 1.5 }
          : { fontSize: 15, fontWeight: 500, color: INK, align: "left", lineHeight: 1.8 }),
      ] }),
    ] });
  const access = box({
    name: "8. 教室・アクセス", gap: 36, paddingTop: 84, paddingBottom: 84, paddingLeft: 52, paddingRight: 52, background: WHITE,
    children: [
      headLeft("教室・アクセス"),
      box({ direction: "row", wrap: true, gap: 40, align: "flex-start", alignSelf: "stretch", children: [
        box({ gap: 2, grow: true, basis: 420, children: [
          mb(htxt("スタディメイト 椎名町", 26, INK), 10),
          infoRow(P.pin, "住所", "〒171-0052\n東京都豊島区南長崎1-9-6 アスカルカーサ1F"),
          rule(),
          infoRow(P.train, "アクセス", "西武池袋線 椎名町駅より徒歩5分"),
          rule(),
          infoRow(P.phone, "電話番号", "03-5983-7777", true),
          rule(),
          infoRow(P.printer, "FAX", "03-5983-7778"),
          rule(),
          infoRow(P.mail, "アドレス", "studymate1@siren.ocn.ne.jp"),
          rule(),
          infoRow(P.clock, "受付時間", "月曜〜土曜 14:00〜21:00"),
        ] }),
        box({ gap: 10, grow: true, basis: 460, children: [
          box({ name: "Googleマップ埋め込み", background: "#eef2ec", radius: 4, minHeight: 440, align: "center", justify: "center", gap: 8,
            borderWidth: 1.5, borderColor: "#c9d6c4", children: [
              icon(P.pin, "#9bab94", 26),
              txt("Googleマップ埋め込み枠", { fontSize: 13, fontWeight: 800, color: "#7d8c77", align: "center" }),
              txt("https://maps.app.goo.gl/4vEiSTaDKh8AjED97", { fontSize: 11, fontWeight: 500, color: "#9bab94", align: "center" }),
            ] }),
          note("※ 実装時は上記URLの地図をiframeで埋め込みます。"),
        ] }),
      ] }),
    ],
  });

  // ===== 9. CTA ===============================================================
  const cta = box({
    name: "9. CTA", background: GREEN_B, paddingTop: 76, paddingBottom: 76, paddingLeft: 52, paddingRight: 52, align: "center", gap: 16,
    children: [
      htxt("まずは、小さな「できた！」から。", 34, WHITE, { align: "center", lineHeight: 1.45 }),
      txt("スタディメイトで、「ここなら頑張れそう」を体験してみませんか？",
        { fontSize: 16, fontWeight: 400, color: "#eaf8ee", lineHeight: 1.9, align: "center" }),
      box({ direction: "row", wrap: true, gap: 14, justify: "center", alignSelf: "center", marginTop: 8, children: [
        button("無料体験授業", WHITE, GREEN_D),
        ghost("お問い合わせ", WHITE, "rgba(255,255,255,0.75)", "rgba(255,255,255,0.12)"),
      ] }),
      box({ direction: "row", wrap: true, gap: 12, align: "center", justify: "center", alignSelf: "center", marginTop: 8, children: [
        icon(P.phone, WHITE, 19),
        txt("03-5983-7777", { fontSize: 24, fontWeight: 800, color: WHITE, fontFamily: HEAD, align: "center" }),
        txt("月曜〜土曜 14:00〜21:00", { fontSize: 13, fontWeight: 700, color: "#eaf8ee", align: "center" }),
      ] }),
    ],
  });

  // ===== 9. お問い合わせフォーム（構成9の続き） ===============================
  const field = (no: string, label: string, hint?: string): ContainerNode =>
    box({ gap: 8, grow: true, basis: 320, children: [
      box({ direction: "row", align: "center", gap: 8, children: [
        txt(no, { fontSize: 12, fontWeight: 800, color: GREEN, fontFamily: HEAD, align: "left" }),
        txt(label, { fontSize: 14, fontWeight: 700, color: INK, align: "left" }),
      ] }),
      box({ background: "#f6f9f4", radius: 8, borderWidth: 1.5, borderColor: LINE, minHeight: 46, justify: "center",
        paddingLeft: 14, paddingRight: 14, children: [
          txt(hint ?? "", { fontSize: 13, fontWeight: 400, color: "#9aa694", align: "left" }),
        ] }),
    ] });
  const radio = (label: string): ContainerNode =>
    box({ direction: "row", align: "center", gap: 8, background: WHITE, radius: 999, borderWidth: 1.5, borderColor: LINE,
      alignSelf: "flex-start", paddingTop: 10, paddingBottom: 10, paddingLeft: 16, paddingRight: 18, children: [
        box({ background: WHITE, radius: 999, borderWidth: 2, borderColor: GREEN_B, width: 16, minHeight: 16, children: [] }),
        txt(label, { fontSize: 13, fontWeight: 700, color: INK, align: "left" }),
      ] });
  const form = box({
    name: "9. お問い合わせフォーム", gap: 30, paddingTop: 80, paddingBottom: 88, paddingLeft: 52, paddingRight: 52, background: CREAM,
    children: [
      headCenter("お問い合わせ", "お電話（03-5983-7777／月〜土 14:00〜21:00）でも承ります。"),
      box({ background: WHITE, radius: 18, borderWidth: 1, borderColor: LINE, boxShadow: SH_MD,
        paddingTop: 40, paddingBottom: 40, paddingLeft: 40, paddingRight: 40, gap: 26, alignSelf: "stretch", children: [
          box({ gap: 10, children: [
            box({ direction: "row", align: "center", gap: 8, children: [
              txt("①", { fontSize: 12, fontWeight: 800, color: GREEN, fontFamily: HEAD, align: "left" }),
              txt("お問い合わせ内容", { fontSize: 14, fontWeight: 700, color: INK, align: "left" }),
            ] }),
            box({ direction: "row", wrap: true, gap: 10, children: [
              radio("授業内容"), radio("教室見学"), radio("無料体験授業"), radio("その他"),
            ] }),
          ] }),
          box({ direction: "row", wrap: true, gap: 22, alignSelf: "stretch", children: [
            field("②", "保護者のお名前", "例）山田 花子"),
            field("③", "お子様のお名前", "例）山田 太郎"),
          ] }),
          box({ direction: "row", wrap: true, gap: 22, alignSelf: "stretch", children: [
            field("④", "お子様の学校・学年", "例）〇〇小学校 小学◯年生"),
            field("⑤", "電話番号", "例）03-5983-7777"),
          ] }),
          box({ direction: "row", wrap: true, gap: 22, alignSelf: "stretch", children: [
            field("⑥", "メールアドレス", "例）example@example.com"),
            field("⑦", "郵便番号", "例）171-0052"),
          ] }),
          // 列（column）の中で basis を指定すると「高さ」になってしまうので、横並びで包んでから伸ばす。
          box({ direction: "row", alignSelf: "stretch", children: [field("⑧", "ご住所", "例）東京都豊島区南長崎1-9-6")] }),
          box({ gap: 10, marginTop: 6, children: [
            button("この内容で送信する"),
            note("ご入力いただいた個人情報は、お問い合わせへの対応以外には使用いたしません。"),
          ] }),
        ] }),
    ],
  });

  // ===== フッター（構成外） ===================================================
  const fCol = (title: string, items: string[]): ContainerNode =>
    box({ gap: 8, children: [
      txt(title, { fontSize: 12, fontWeight: 800, color: YELLOW, fontFamily: HEAD, align: "left" }),
      ...items.map((it) => txt(it, { fontSize: 13, fontWeight: 400, color: "#c4d3bd", lineHeight: 1.8, align: "left" })),
    ] });
  const footer = box({
    name: "フッター", background: FOOT, paddingTop: 52, paddingBottom: 32, paddingLeft: 52, paddingRight: 52, gap: 30,
    children: [
      box({ direction: "row", justify: "space-between", wrap: true, gap: 30, alignSelf: "stretch", children: [
        box({ gap: 12, basis: 320, children: [
          { id: uid("i"), type: "atom", atomType: "image", name: "ロゴ（フッター）", src: "/studymate/logo.png",
            alt: "個別指導 スタディメイト", fit: "contain", width: 180, height: 48, alignSelf: "flex-start" } as AtomNode,
          txt("勉強も、自信も。「頑張る心」が育つ塾。", { fontSize: 13, fontWeight: 700, color: "#e6f0e2", align: "left" }),
          txt("〒171-0052 東京都豊島区南長崎1-9-6 アスカルカーサ1F\n西武池袋線 椎名町駅より徒歩5分",
            { fontSize: 12, fontWeight: 400, color: "#c4d3bd", lineHeight: 1.8, align: "left" }),
        ] }),
        fCol("塾について", ["最近のスタディメイト", "大切にしていること", "「できた！」を育てる5つの関わり", "こんな変化に", "代表メッセージ"]),
        fCol("ご案内", ["コース・料金", "教室・アクセス"]),
        fCol("お問い合わせ", ["無料体験授業", "教室見学", "TEL 03-5983-7777", "FAX 03-5983-7778", "studymate1@siren.ocn.ne.jp", "月曜〜土曜 14:00〜21:00"]),
      ] }),
      txt("© 個別指導塾スタディメイト", { fontSize: 12, fontWeight: 500, color: "#8a9a83", align: "center" }),
    ],
  });

  const raw = [header, hero, recent, values, care, changes, message, courses, access, cta, form, footer];
  const sections = raw.map((s) => ({ ...s, type: "section" as const }));
  return { id: uid("page"), name: "個別指導塾スタディメイト トップページ", children: sections };
}

export const STUDYMATE_TEMPLATE_ID = "t-studymate-lp";

export function buildStudyMateTemplate(): PageTemplate {
  k = 0;
  return { id: STUDYMATE_TEMPLATE_ID, name: "個別指導塾スタディメイト トップページ（ポップ・黄×緑）", page: buildPage() };
}
