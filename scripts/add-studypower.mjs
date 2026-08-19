// 個別指導塾スタディパワーのクライアント案件を designsync-project.json に取り込む。
//   node scripts/add-studypower.mjs
// TSビルダー(lib/templateStudyPower.ts)から PageTemplate を生成し、kind:"client" として追加する。
// 既に同じIDがあれば内容を差し替える（＝再実行で最新版に更新）。実行後は npm run seed で
// public/designsync-seed.json を作り直すこと。
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildStudyPowerTemplate, STUDYPOWER_TEMPLATE_ID } from "../lib/templateStudyPower.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "designsync-project.json");

const data = JSON.parse(await readFile(SRC, "utf8"));
data.builder ??= {};
data.builder.templates ??= [];

const tpl = { ...buildStudyPowerTemplate(), kind: "client", updatedAt: Date.now() };
const list = data.builder.templates.filter((t) => t?.id !== STUDYPOWER_TEMPLATE_ID);
const replaced = list.length !== data.builder.templates.length;
data.builder.templates = [tpl, ...list];

await writeFile(SRC, JSON.stringify(data), "utf8");
console.log(`${replaced ? "↺ 更新" : "＋ 追加"}：「${tpl.name}」(${tpl.id}) kind=client`);
console.log(`  テンプレート総数：${data.builder.templates.length}`);
