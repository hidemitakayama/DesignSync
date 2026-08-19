// 個別指導塾スタディメイト（東京都豊島区・椎名町）のクライアント案件を designsync-project.json に取り込む。
//   node --import ./scripts/register-ts.mjs scripts/add-studymate.mjs
// TSビルダー(lib/templateStudyMate.ts)から PageTemplate を生成し、kind:"client" として追加する。
// SP版は lib/pcToSp.ts の自動変換で下書きを作り、テンプレートに同梱する（仕上げはビルダーで調整）。
// 既に同じIDがあれば内容を差し替える（＝再実行で最新版に更新）。実行後は npm run seed で
// public/designsync-seed.json を作り直すこと。
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildStudyMateTemplate, STUDYMATE_TEMPLATE_ID } from "../lib/templateStudyMate.ts";
import { adaptPageToSp } from "../lib/pcToSp.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "designsync-project.json");

const data = JSON.parse(await readFile(SRC, "utf8"));
data.builder ??= {};
data.builder.templates ??= [];

const base = buildStudyMateTemplate();
const tpl = { ...base, spPage: adaptPageToSp(base.page), kind: "client", updatedAt: Date.now() };
const list = data.builder.templates.filter((t) => t?.id !== STUDYMATE_TEMPLATE_ID);
const replaced = list.length !== data.builder.templates.length;
data.builder.templates = [tpl, ...list];

await writeFile(SRC, JSON.stringify(data), "utf8");
console.log(`${replaced ? "↺ 更新" : "＋ 追加"}：「${tpl.name}」(${tpl.id}) kind=client`);
console.log(`  セクション数：PC ${tpl.page.children.length} / SP ${tpl.spPage.children.length}`);
console.log(`  テンプレート総数：${data.builder.templates.length}`);
