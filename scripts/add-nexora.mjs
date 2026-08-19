// ゲーム紹介LP『NEXORA PROJECT』を designsync-project.json に取り込む。
//   node scripts/add-nexora.mjs
// TSビルダー(lib/templateNexora.ts)から PageTemplate を生成し、kind:"template" として追加する。
// 既に同じIDがあれば内容を差し替える（＝再実行で最新版に更新）。実行後は npm run seed で
// public/designsync-seed.json を作り直すこと。
// ※ 前身の「Idioma」テンプレ(t-idioma-lp)は本テンプレへ改称したため、残っていれば併せて取り除く。
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildNexoraTemplate, NEXORA_TEMPLATE_ID } from "../lib/templateNexora.ts";

const OLD_IDS = ["t-idioma-lp"]; // 改称前のID
const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "designsync-project.json");

const data = JSON.parse(await readFile(SRC, "utf8"));
data.builder ??= {};
data.builder.templates ??= [];

const tpl = { ...buildNexoraTemplate(), kind: "template", updatedAt: Date.now() };
const before = data.builder.templates.length;
const list = data.builder.templates.filter((t) => t?.id !== NEXORA_TEMPLATE_ID && !OLD_IDS.includes(t?.id));
const removed = before - list.length;
data.builder.templates = [tpl, ...list];

await writeFile(SRC, JSON.stringify(data), "utf8");
console.log(`${removed ? "↺ 差し替え" : "＋ 追加"}：「${tpl.name}」(${tpl.id}) kind=template`);
console.log(`  テンプレート総数：${data.builder.templates.length}`);
