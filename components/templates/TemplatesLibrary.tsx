"use client";
import { useMemo } from "react";
import { LayoutGrid, Plus, Trash2, ArrowRight, FilePlus2 } from "lucide-react";
import { useBuilder } from "@/lib/store";
import { pageToHtml } from "@/lib/exportHtml";
import type { PageTemplate } from "@/lib/types";

// テンプレートライブラリ：保存済みページを一覧・適用・管理する。
// 保存/削除は管理者のみ。適用（複製して編集）は誰でも可。
export default function TemplatesLibrary() {
  const templates = useBuilder((s) => s.templates);
  const admin = useBuilder((s) => s.mode === "admin");
  const saveTemplate = useBuilder((s) => s.saveTemplate);
  const applyTemplate = useBuilder((s) => s.applyTemplate);
  const removeTemplate = useBuilder((s) => s.removeTemplate);

  const onSave = () => {
    const name = window.prompt("テンプレート名を入力してください", useBuilder.getState().page.name || "テンプレート");
    if (name === null) return;
    saveTemplate(name.trim());
  };
  const onApply = (t: PageTemplate) => {
    if (window.confirm(`「${t.name}」を読み込みます。現在のページは置き換わります。（元に戻す で戻せます）`)) applyTemplate(t.id);
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-900"><LayoutGrid size={20} className="text-sky-500" /> テンプレート</h1>
            <p className="mt-1 text-sm text-slate-500">保存したページを一覧から選んで、複製して編集を始められます。</p>
          </div>
          {admin && (
            <button onClick={onSave} className="flex shrink-0 items-center gap-1.5 rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600">
              <FilePlus2 size={16} /> 現在のページを保存
            </button>
          )}
        </div>

        {templates.length === 0 ? (
          <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center">
            <LayoutGrid size={28} className="text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-600">テンプレートがありません</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
              {admin ? "ビルダーでページを作り、「現在のページを保存」でテンプレート化できます。" : "管理者がテンプレートを用意すると、ここから選べます。"}
            </p>
            {admin && (
              <button onClick={onSave} className="mt-4 flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-900">
                <Plus size={14} /> 保存する
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <TemplateCard key={t.id} template={t} admin={admin} onApply={() => onApply(t)} onRemove={() => removeTemplate(t.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ template, admin, onApply, onRemove }: { template: PageTemplate; admin: boolean; onApply: () => void; onRemove: () => void }) {
  const html = useMemo(() => pageToHtml(template.page), [template.page]);
  const sections = template.page.children.length;

  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-sky-300 hover:shadow-md">
      {/* サムネイル（実HTMLを縮小表示） */}
      <button onClick={onApply} className="relative block h-48 w-full overflow-hidden border-b border-slate-100 bg-slate-100" title="クリックして読み込む">
        <iframe
          srcDoc={html}
          title={template.name}
          tabIndex={-1}
          scrolling="no"
          className="pointer-events-none"
          style={{ position: "absolute", top: 0, left: 0, width: 1280, height: 1067, border: 0, transform: "scale(0.3)", transformOrigin: "top left" }}
        />
        <span className="absolute inset-0 grid place-items-center bg-sky-500/0 opacity-0 transition group-hover:bg-sky-500/10 group-hover:opacity-100">
          <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-sky-700 shadow">読み込む <ArrowRight size={13} /></span>
        </span>
      </button>

      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{template.name}</p>
          <p className="text-[11px] text-slate-400">{sections} セクション</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onApply} className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">複製して編集</button>
          {admin && (
            <button onClick={onRemove} className="rounded-md p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500" title="削除"><Trash2 size={14} /></button>
          )}
        </div>
      </div>
    </div>
  );
}
