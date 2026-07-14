"use client";
import { useMemo, type ReactNode } from "react";
import { LayoutGrid, Plus, Trash2, ArrowRight, FilePlus2, Save, Pencil, Users, FolderInput } from "lucide-react";
import { useBuilder, AUTO_BACKUP_PREFIX } from "@/lib/store";
import { pageToHtml } from "@/lib/exportHtml";
import type { PageTemplate, TemplateKind } from "@/lib/types";

const kindOf = (t: PageTemplate): TemplateKind => t.kind ?? "template";

// 最終更新日時を「YYYY/MM/DD HH:mm」で表示（ロケール差によるハイドレーション不一致を避け固定書式）。
const fmtUpdated = (ts?: number): string | null => {
  if (!ts) return null;
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// テンプレートライブラリ：保存済みページを「テンプレート／クライアント」に分けて一覧・適用・管理する。
// 保存/削除/種別変更/リネームは管理者のみ。適用（複製して編集）は誰でも可。
// クライアントモード（非管理者）では、テンプレートのみ表示し、他社の案件は隠す。
export default function TemplatesLibrary() {
  const templates = useBuilder((s) => s.templates);
  const admin = useBuilder((s) => s.mode === "admin");
  const saveTemplate = useBuilder((s) => s.saveTemplate);
  const updateTemplate = useBuilder((s) => s.updateTemplate);
  const applyTemplate = useBuilder((s) => s.applyTemplate);
  const removeTemplate = useBuilder((s) => s.removeTemplate);
  const renameTemplate = useBuilder((s) => s.renameTemplate);
  const setTemplateKind = useBuilder((s) => s.setTemplateKind);
  const sourceTemplateId = useBuilder((s) => s.sourceTemplateId);
  const source = templates.find((t) => t.id === sourceTemplateId) ?? null;

  // 種別ごとに仕分け（自動保存は別枠）
  const isAuto = (t: PageTemplate) => t.name.startsWith(AUTO_BACKUP_PREFIX);
  const { tpls, clients, autos } = useMemo(() => {
    const tpls: PageTemplate[] = [], clients: PageTemplate[] = [], autos: PageTemplate[] = [];
    for (const t of templates) {
      if (isAuto(t)) autos.push(t);
      else if (kindOf(t) === "client") clients.push(t);
      else tpls.push(t);
    }
    return { tpls, clients, autos };
  }, [templates]);

  const onSaveNew = (kind: TemplateKind) => {
    const label = kind === "client" ? "クライアント（案件）" : "テンプレート";
    const name = window.prompt(`新しい${label}の名前を入力してください`, useBuilder.getState().page.name || label);
    if (name === null) return;
    saveTemplate(name.trim(), kind);
  };
  const onOverwrite = () => {
    if (!source) return;
    if (window.confirm(`「${source.name}」を、いまのページ内容で上書きします。よろしいですか？`)) updateTemplate(source.id);
  };
  const onApply = (t: PageTemplate) => {
    if (window.confirm(`「${t.name}」を読み込みます。\n現在のページは自動保存してから置き換えます（この一覧の「（自動保存）…」からいつでも復元できます）。\nよろしいですか？`)) applyTemplate(t.id);
  };
  const onRename = (t: PageTemplate) => {
    const name = window.prompt("新しい名前を入力してください", t.name);
    if (name === null) return;
    if (name.trim()) renameTemplate(t.id, name);
  };
  const onToggleKind = (t: PageTemplate) => {
    setTemplateKind(t.id, kindOf(t) === "client" ? "template" : "client");
  };

  const cardProps = (t: PageTemplate) => ({
    template: t, admin, isSource: t.id === sourceTemplateId,
    onApply: () => onApply(t), onOverwrite, onRemove: () => removeTemplate(t.id),
    onRename: () => onRename(t), onToggleKind: () => onToggleKind(t),
  });

  const empty = tpls.length === 0 && clients.length === 0 && autos.length === 0;

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-900"><LayoutGrid size={20} className="text-sky-500" /> テンプレート</h1>
            <p className="mt-1 text-sm text-slate-500">
              {admin ? "テンプレートとクライアント案件を分けて管理できます。カードから複製して編集を始められます。" : "テンプレートを選んで、複製して編集を始められます。"}
            </p>
            {admin && source && (
              <p className="mt-1 text-xs font-semibold text-sky-600">編集中の元：「{source.name}」</p>
            )}
          </div>
          {admin && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={onOverwrite}
                disabled={!source}
                title={source ? `「${source.name}」を上書き` : "複製元がありません（先にカードを複製して編集してください）"}
                className="flex items-center gap-1.5 rounded-md border border-sky-500 bg-white px-4 py-2 text-sm font-semibold text-sky-600 shadow-sm hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
              >
                <Save size={16} /> 上書き保存
              </button>
              <button onClick={() => onSaveNew("client")} className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-400">
                <Users size={16} /> クライアント登録
              </button>
              <button onClick={() => onSaveNew("template")} className="flex items-center gap-1.5 rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600">
                <FilePlus2 size={16} /> テンプレート登録
              </button>
            </div>
          )}
        </div>

        {empty ? (
          <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center">
            <LayoutGrid size={28} className="text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-600">テンプレートがありません</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
              {admin ? "ビルダーでページを作り、「テンプレート登録」で保存できます。" : "管理者がテンプレートを用意すると、ここから選べます。"}
            </p>
            {admin && (
              <button onClick={() => onSaveNew("template")} className="mt-4 flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-900">
                <Plus size={14} /> 保存する
              </button>
            )}
          </div>
        ) : (
          <>
            <Section title="テンプレート" icon={<LayoutGrid size={15} className="text-sky-500" />} count={tpls.length} emptyHint={admin ? "「テンプレート登録」でひな型を追加できます。" : "テンプレートがありません。"}>
              {tpls.map((t) => <TemplateCard key={t.id} {...cardProps(t)} />)}
            </Section>

            {/* クライアント案件は管理者のみ（クライアントには他社の案件を見せない） */}
            {admin && (
              <Section title="クライアント" icon={<Users size={15} className="text-slate-500" />} count={clients.length} emptyHint="「クライアント登録」で案件を追加できます。">
                {clients.map((t) => <TemplateCard key={t.id} {...cardProps(t)} />)}
              </Section>
            )}

            {/* 自動保存は管理者のみ */}
            {admin && autos.length > 0 && (
              <Section title="自動保存" icon={<Save size={15} className="text-amber-500" />} count={autos.length}>
                {autos.map((t) => <TemplateCard key={t.id} {...cardProps(t)} />)}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, count, emptyHint, children }: { title: string; icon: ReactNode; count: number; emptyHint?: string; children: ReactNode }) {
  return (
    <section className="mt-8 first:mt-6">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-700">
        {icon} {title}
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-500">{count}</span>
      </h2>
      {count === 0 ? (
        emptyHint ? <p className="mt-2 text-xs text-slate-400">{emptyHint}</p> : null
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      )}
    </section>
  );
}

function TemplateCard({ template, admin, isSource, onApply, onOverwrite, onRemove, onRename, onToggleKind }: { template: PageTemplate; admin: boolean; isSource: boolean; onApply: () => void; onOverwrite: () => void; onRemove: () => void; onRename: () => void; onToggleKind: () => void }) {
  const html = useMemo(() => pageToHtml(template.page), [template.page]);
  const sections = template.page.children.length;
  const isAuto = template.name.startsWith(AUTO_BACKUP_PREFIX);
  const isClient = kindOf(template) === "client";

  return (
    <div className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${isSource ? "border-sky-400 ring-2 ring-sky-200" : isAuto ? "border-amber-300" : "border-slate-200 hover:border-sky-300"}`}>
      {/* サムネイル（実HTMLを縮小表示） */}
      <button onClick={onApply} className="relative block h-48 w-full overflow-hidden border-b border-slate-100 bg-slate-100" title="クリックして読み込む">
        {isSource && <span className="absolute left-2 top-2 z-10 rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">編集中の元</span>}
        {isAuto && <span className="absolute left-2 top-2 z-10 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">自動保存</span>}
        {!isAuto && isClient && <span className="absolute right-2 top-2 z-10 rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-white shadow">クライアント</span>}
        <iframe
          srcDoc={html}
          title={template.name}
          tabIndex={-1}
          scrolling="no"
          className="pointer-events-none"
          // 幅はページ実寸(1120)に合わせて全幅表示（左右の余白＝レターボックスをなくす）
          style={{ position: "absolute", top: 0, left: 0, width: 1120, height: 1560, border: 0, transform: "scale(0.36)", transformOrigin: "top left" }}
        />
        <span className="absolute inset-0 grid place-items-center bg-sky-500/0 opacity-0 transition group-hover:bg-sky-500/10 group-hover:opacity-100">
          <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-sky-700 shadow">読み込む <ArrowRight size={13} /></span>
        </span>
      </button>

      <div className="flex items-center justify-between gap-2 p-3">
        <button onClick={admin ? onRename : undefined} className={`min-w-0 text-left ${admin ? "group/name" : ""}`} title={admin ? "クリックで名前を変更" : undefined}>
          <p className="flex items-center gap-1 truncate text-sm font-semibold text-slate-800">
            <span className="truncate">{template.name}</span>
            {admin && <Pencil size={11} className="shrink-0 text-slate-300 transition group-hover/name:text-sky-500" />}
          </p>
          <p className="text-[11px] text-slate-400">{sections} セクション</p>
          {fmtUpdated(template.updatedAt) && (
            <p className="text-[11px] text-slate-400">最終更新: {fmtUpdated(template.updatedAt)}</p>
          )}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {admin && !isAuto && (
            <button onClick={onToggleKind} className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title={isClient ? "テンプレートに移動" : "クライアントに移動"}><FolderInput size={14} /></button>
          )}
          {admin && isSource && (
            <button onClick={onOverwrite} className="flex items-center gap-1 rounded-md border border-sky-500 bg-white px-2 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50" title="このカードを今のページで上書き"><Save size={13} /> 上書き</button>
          )}
          <button onClick={onApply} className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">複製して編集</button>
          {admin && (
            <button onClick={onRemove} className="rounded-md p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500" title="削除"><Trash2 size={14} /></button>
          )}
        </div>
      </div>
    </div>
  );
}
