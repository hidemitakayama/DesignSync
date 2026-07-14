// 「Cursorにそっくりそのまま再現させる」ためのコピペ用プロンプトを生成する。
// JSX(Tailwind)コード＋忠実再現の厳守事項＋使用フォント指定を1つのテキストにまとめる。

import { type Page, type SceneNode, isContainer } from "./types";
import type { FontId } from "./fonts";
import { pageToJsx } from "./exportTailwind";

// FontId → Google Fonts の family名 / weights / next/font のimport名
const FONT_META: Record<FontId, { family: string; weights: string; nextName: string }> = {
  sans: { family: "Noto Sans JP", weights: "400 / 700 / 800", nextName: "Noto_Sans_JP" },
  serif: { family: "Noto Serif JP", weights: "400 / 700", nextName: "Noto_Serif_JP" },
  rounded: { family: "M PLUS Rounded 1c", weights: "400 / 700 / 800", nextName: "M_PLUS_Rounded_1c" },
  kaku: { family: "Zen Kaku Gothic New", weights: "400 / 700", nextName: "Zen_Kaku_Gothic_New" },
  mincho: { family: "Shippori Mincho", weights: "400 / 700 / 800", nextName: "Shippori_Mincho" },
  inter: { family: "Inter ＋ 日本語は Noto Sans JP", weights: "400 / 500 / 600 / 700 / 800", nextName: "Inter" },
  notosans: { family: "Noto Sans ＋ 日本語は Noto Sans JP", weights: "400 / 700 / 800", nextName: "Noto_Sans" },
  notoserif: { family: "Noto Serif ＋ 日本語は Noto Serif JP", weights: "400 / 700", nextName: "Noto_Serif" },
};

// 渡された全ページで実際に使われているフォントを集める（未指定は既定の sans 扱い）
function usedFonts(pages: Page[]): FontId[] {
  const set = new Set<FontId>();
  const walk = (n: SceneNode) => {
    if (n.type === "atom" && n.atomType === "text") {
      const fid = (n.style?.fontFamily as FontId | undefined) ?? "sans";
      if (FONT_META[fid]) set.add(fid);
    }
    if (isContainer(n)) n.children.forEach(walk);
  };
  pages.forEach((p) => p.children.forEach(walk));
  if (set.size === 0) set.add("sans");
  return [...set];
}

// Cursorへ貼るための「完全プロンプト」。
// デザインの忠実再現（コード同梱）に加え、そのまま本番公開できるよう
// 環境構築・パッケージ・ビルド/デプロイ・レスポンシブ(PC/SP)・メタデータ等の
// 「公開に必要な要素」を同梱する。sp を渡すとSP版のコードとレスポンシブ指示も付く。
export function buildCursorPrompt(page: Page, sp?: Page | null): string {
  const opts = { snap: true, tokens: false, sections: true, nextImage: false } as const;
  const jsx = pageToJsx(page, opts);
  const spJsx = sp ? pageToJsx(sp, opts) : null;
  const fonts = usedFonts(sp ? [page, sp] : [page])
    .map((id) => `- ${FONT_META[id].family}（${FONT_META[id].weights}） … next/font/google の \`${FONT_META[id].nextName}\``)
    .join("\n");
  const name = page.name || "ページ";

  const responsive = spJsx
    ? "下記の **PC版・SP版の2レイアウト** を両方実装し、`md`(768px) を境に切り替える（例：PC版を `hidden md:block`、SP版を `md:hidden`）。この切替以外に勝手なブレークポイントは足さない。両版とも数値どおりに再現する。"
    : "PC版のみ実装する（キャンバス幅 1120px 基準・中身は中央寄せ、背景はフルブリードで全幅）。勝手にブレークポイントは足さない。";

  return `# 依頼：以下のデザインを「そっくりそのまま」再現し、そのまま公開できるサイトにしてください（${name}）

あなたは熟練のフロントエンド実装者です。下記のデザインを **一切変更せず** に再現し、**そのまま本番公開できる Next.js サイト** として構築してください。コピペ後、追加指示なしで **ビルド・デプロイできる状態** をゴールとします。

## プロジェクト・環境（本番公開に必要）
- **Next.js（App Router）＋ Tailwind CSS** で構築する。プロジェクトが無ければ \`npx create-next-app@latest\`（TypeScript / App Router / Tailwind を有効）で新規作成する。
- **Next.js は必ず「最新の安定版」を使う**。\`package.json\` の \`next\` は \`npm install next@latest\` で最新に上げ、**脆弱性のあるバージョン（15.4.6 など。CVE-2025-66478）を残さない**（作成直後に古い版が入っていたら即 \`npm i next@latest\` で更新）。\`eslint-config-next\` 等 next 連動パッケージもバージョンを揃える。
- **必要なパッケージはすべて自動でインストール**する（\`next/font/google\` 等。不足があれば都度追加）。
- **セキュリティ確認**：インストール後に \`npm audit\` を実行し、脆弱性が出たら \`npm audit fix\`（必要なら \`npm i <pkg>@latest\`）で解消する。**deprecated / security 警告が出ない状態**にしてからデプロイする。
- \`npm run dev\` で表示を確認し、**\`npm run build\` が必ず成功する**状態にする（＝Vercel 等にそのままデプロイできる）。
- ルートは \`app/page.tsx\`、\`app/layout.tsx\` で \`<html lang="ja">\` を設定。UI・コメントを含め**すべて日本語**で記述する。

## 本番公開に必要な要素
- **メタデータ / SEO**：\`app/layout.tsx\` の \`metadata\` に \`title\`・\`description\` を設定し、favicon を用意する。
- **レスポンシブ**：${responsive}
- **リンク・ナビ**：ヘッダーのナビ各項目は対応セクションへのページ内アンカー（\`#id\`）で移動できるようにする。CTAボタンは適切なリンク（申込・問い合わせ先。未定なら \`#\` プレースホルダ）にする。
- **色の一元管理（\`colors.ts\`）**：下記コードは**正確な色の一次ソース**として16進を直書きしています（これは矛盾ではなく**初期値の供給源**）。手順：①コード内の全16進を**同じ値のまま** \`colors.ts\` に定義（用途で命名。**完全に同一の値だけ**を1つにまとめ、**似ていても違う値は絶対に統合しない**）→ ②コードの直書き16進を \`colors.ts\` の参照へ**機械的に置換**する（**値は1つも変えない＝見た目は完全一致のまま**）→ ③**最終コードに直書き16進を残さない** → ④実装後、**元デザインと色を1つずつ照合**し変化が無いことを確認する。（＝「直書き禁止」は最終成果物に対するルールで、提供コードの直書きはその初期値。ここでの目的は再ブランディングを容易にすることであり、**見た目は完全一致のまま**にする）
- **構成**：1セクション = 1コンポーネント（\`app/\` 配下）、再利用部品は \`components/\` に置く。

## 厳守事項（ピクセル一致のため）
- レイアウト・余白・配置・並び順・文言を**変更しない**。「改善」「最適化」「省略」「言い換え」は禁止。
- **文字間隔(letter-spacing)・行間(line-height)・改行**をそのまま保持する（改行は \`whitespace-pre-wrap\`、コード中の改行位置 \\n を動かさない）。
- 色・フォントサイズ・太さ(font-weight)・角丸・影(box-shadow)・ボーダー・padding/margin を**数値どおり**に。任意値 \`[..]\`（\`tracking-[6.5px]\` 等の端数含む）を丸めない。
- 画像・SVG はコードに埋め込み済みのもの（data URI / インラインSVG）を**そのまま使用**。差し替え・再生成をしない。

## フォント（Google Fonts）
\`next/font/google\` で読み込み、\`font-family\` を一致させてください：
${fonts}

（例）\`app/layout.tsx\` で読み込み、対象要素の font-family に割り当てる。コード内の \`font-family:'Noto Sans JP', system-ui, sans-serif\` 等の指定と一致させること。

## コンポーネント：PC版（このまま配置）
\`\`\`tsx
${jsx}
\`\`\`
${spJsx ? `
## コンポーネント：SP版（このまま配置・md未満で表示）
\`\`\`tsx
${spJsx}
\`\`\`
` : ""}
## 仕上げ確認
実装後、元デザインとの差異が無いかを目視で確認する。特に **①改行位置 ②文字間隔 ③行間 ④フォント** を重点チェックし、ズレがあればコードの数値に合わせて修正する。加えて、**\`npm run build\` が通ること**${spJsx ? "、**PC/SP それぞれで表示崩れが無いこと**" : "、表示崩れが無いこと"}を確認する。
`;
}
