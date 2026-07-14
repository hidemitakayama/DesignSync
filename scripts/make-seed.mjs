// デプロイ用の既定プロジェクトを作り直す： npm run seed
//
// designsync-project.json（＝アプリから保存したプロジェクト）を読み、
// 自動保存テンプレートを除いたものを public/designsync-seed.json として書き出す。
// このファイルは、保存を持たないブラウザ（＝デプロイ先を初めて開いたクライアント）が
// 起動時に読み込む既定データ（components/Persist.tsx）。テンプレートを更新したら実行すること。
import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "designsync-project.json");
const OUT = path.join(ROOT, "public", "designsync-seed.json");
const AUTO_BACKUP_PREFIX = "（自動保存）"; // lib/store.ts と同じ

const exists = async (p) => access(p).then(() => true, () => false);

// ページツリー等から画像の参照先(src)を全部拾う。
function collectSrcs(node, out = new Set()) {
  if (Array.isArray(node)) { node.forEach((n) => collectSrcs(n, out)); return out; }
  if (!node || typeof node !== "object") return out;
  if (typeof node.src === "string" && node.src.startsWith("/")) out.add(node.src);
  Object.values(node).forEach((v) => collectSrcs(v, out));
  return out;
}

const raw = await readFile(SRC, "utf8").catch(() => {
  console.error(`× ${path.relative(ROOT, SRC)} が見つかりません。アプリの「ファイル → プロジェクトを保存」で書き出してください。`);
  process.exit(1);
});

const data = JSON.parse(raw);
const all = data.builder?.templates ?? [];
const templates = all.filter((t) => !String(t?.name ?? "").startsWith(AUTO_BACKUP_PREFIX));
data.builder.templates = templates;

// 参照している画像が public/ に無いと、デプロイ先で404になる（＝画像が出ない）ので先に知らせる。
const missing = [];
for (const src of collectSrcs(data)) {
  if (!(await exists(path.join(ROOT, "public", src)))) missing.push(src);
}

await writeFile(OUT, JSON.stringify(data), "utf8");

const kinds = templates.reduce((m, t) => ({ ...m, [t.kind ?? "template"]: (m[t.kind ?? "template"] ?? 0) + 1 }), {});
const size = (Buffer.byteLength(JSON.stringify(data)) / 1024 / 1024).toFixed(1);
console.log(`✓ ${path.relative(ROOT, OUT)} を更新しました（${size}MB）`);
console.log(`  テンプレート ${kinds.template ?? 0}件 / クライアント ${kinds.client ?? 0}件（自動保存 ${all.length - templates.length}件は除外）`);
if (missing.length) {
  console.warn(`⚠ public/ に実体が無い画像が ${missing.length}件あります。デプロイ先で404になります：`);
  missing.forEach((m) => console.warn(`   ${m}`));
  process.exitCode = 1;
}
