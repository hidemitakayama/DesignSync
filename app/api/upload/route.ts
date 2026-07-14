// 画像アップロード保存API（ローカル開発用）。
// 受け取った画像を public/<site>/<section>/<name> に保存し、公開URL(/site/section/name)を返す。
// これにより「サイトごと・セクションごと」にフォルダ分類して画像を溜められる。
// 注意：本番(Vercel等)のFSは読み取り専用のため、この保存はローカル開発時のみ有効。
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// フォルダ/ファイル名を安全な文字だけに（パス・トラバーサル防止）。
const safe = (s: string, fallback: string) => {
  const t = (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return t || fallback;
};

export async function POST(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "本番環境では public への保存はできません（ローカル開発時のみ有効）。" }, { status: 400 });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "フォームの解析に失敗しました" }, { status: 400 });
  }
  const file = form.get("file");
  if (!file || typeof (file as Blob).arrayBuffer !== "function") {
    return Response.json({ error: "ファイルがありません" }, { status: 400 });
  }
  const blob = file as File;
  const site = safe(String(form.get("site") ?? ""), "site");
  const section = safe(String(form.get("section") ?? ""), "misc");
  const origName = typeof blob.name === "string" ? blob.name : "img";
  const ext = (origName.match(/\.([a-zA-Z0-9]+)$/)?.[1] || (blob.type.split("/")[1] || "png")).toLowerCase();
  const base = safe(origName.replace(/\.[^.]+$/, ""), "img").slice(0, 30) || "img";
  const name = `${base}-${Date.now().toString(36)}.${ext}`;

  try {
    const dir = path.join(process.cwd(), "public", site, section);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), Buffer.from(await blob.arrayBuffer()));
  } catch (e) {
    return Response.json({ error: "保存に失敗しました: " + (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
  return Response.json({ url: `/${site}/${section}/${name}`, site, section, name });
}
