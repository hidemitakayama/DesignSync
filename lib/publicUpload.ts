// 画像を public/<サイト>/<セクション>/ へ自動分類アップロードするクライアント側ヘルパ。
// サイト名は編集中のテンプレート/ページ名から、セクション名は要素の属する最上位セクション名から推定する。
import { useBuilder } from "./store";
import { type SceneNode, isContainer } from "./types";

// 文字列 → 英数スラッグ（日本語は落ちる）。空なら fallback。
export function slugify(s: string, fallback: string): string {
  const t = (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
  return t || fallback;
}

// よくある日本語セクション見出し → 英スラッグ（フォルダ名を読みやすく）。
const SECTION_MAP: [RegExp, string][] = [
  [/ヒーロー|ファーストビュー|first ?view|hero|トップ|top/i, "fv"],
  [/課題|お悩み|悩み|challenge/i, "challenge"],
  [/現状|データ|reality/i, "reality"],
  [/コンセプト|concept|方針/i, "concept"],
  [/特徴|強み|feature|why|選ばれる/i, "features"],
  [/活用|use ?case|使い方|solution|事例/i, "usecases"],
  [/料金|価格|プラン|fee|pricing/i, "pricing"],
  [/流れ|ステップ|flow|step|導入の/i, "flow"],
  [/声|口コミ|voice|testimonial|レビュー|お客様/i, "voice"],
  [/コラム|記事|column|blog|news/i, "column"],
  [/faq|よくある|質問/i, "faq"],
  [/会社|company|概要|access|アクセス/i, "company"],
  [/問い合わせ|contact|相談|cta|フォーム/i, "contact"],
  [/ヘッダー|header|ナビ/i, "header"],
  [/フッター|footer/i, "footer"],
];
export function sectionSlug(name: string, index: number): string {
  for (const [re, slug] of SECTION_MAP) if (re.test(name || "")) return slug;
  return slugify(name, `section-${index + 1}`);
}

// 編集中の「サイト」スラッグ。テンプレート名→ページ名→テンプレIDの順に英数を拾う。
export function currentSiteSlug(): string {
  const s = useBuilder.getState();
  const tpl = s.templates.find((t) => t.id === s.sourceTemplateId);
  for (const n of [tpl?.name, s.page?.name, s.sourceTemplateId]) {
    const sl = slugify(n ?? "", "");
    if (sl) return sl;
  }
  return "site";
}

const containsId = (n: SceneNode, id: string): boolean =>
  n.id === id || (isContainer(n) && n.children.some((c) => containsId(c, id)));

// 指定ノードが属する最上位セクション（名前と並び順）。
export function ancestorSection(nodeId: string | null): { name: string; index: number } | null {
  if (!nodeId) return null;
  const page = useBuilder.getState().page;
  for (let i = 0; i < page.children.length; i++) {
    if (containsId(page.children[i], nodeId)) return { name: page.children[i].name, index: i };
  }
  return null;
}

// 画像を public へアップロードし、公開URL(/site/section/name)を返す。
export async function uploadToPublic(file: File, nodeId: string | null): Promise<string> {
  const site = currentSiteSlug();
  const sec = ancestorSection(nodeId);
  const section = sec ? sectionSlug(sec.name, sec.index) : "misc";
  const fd = new FormData();
  fd.append("file", file);
  fd.append("site", site);
  fd.append("section", section);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || "アップロードに失敗しました");
  return data.url as string;
}
