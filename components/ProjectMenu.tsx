"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Save, HardDriveDownload, CircleCheck, Circle, Plus, Trash2, Upload, Download, RotateCcw, FolderOpen } from "lucide-react";
import { serializeProject, applyProject } from "@/lib/project";
import { saveBlob } from "@/lib/download";
import { htmlToPage } from "@/lib/importHtml";
import { useBuilder } from "@/lib/store";
import { useStudio } from "@/lib/studioStore";
import { fsSupported, pickSaveFile, pickOpenFile, writeHandle, ensurePermission, isSameFile, idbSet, idbGet, type FileHandle } from "@/lib/fsHandle";
import { Menu, MenuItem, MenuDivider, MenuLabel } from "@/components/builder/Menu";
import ExportModal from "@/components/ExportModal";
import ImportSiteModal from "@/components/ImportSiteModal";
import { Globe } from "lucide-react";

const DEBOUNCE_MS = 3000; // 手が止まって3秒後に保存
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

interface Target { handle: FileHandle; active: boolean }

// 「ファイル」メニュー：プロジェクト(.json)の保存/読み込み・自動保存（複数先）・HTML入出力・初期化。
// ※ 自動保存エンジン(購読)は常にマウントされている必要があるため、このコンポーネントは常時描画する。
export default function ProjectMenu({ open, onToggle, onClose, admin }: { open: boolean; onToggle: () => void; onClose: () => void; admin: boolean }) {
  const supported = useSyncExternalStore(() => () => {}, () => fsSupported(), () => false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const targetsRef = useRef<Target[]>([]);
  const lastSaved = useRef<string>(""); // 最後にファイルへ保存/読込した内容（＝ファイル上の状態）
  const engagedRef = useRef(false); // ファイル保存/読込を使い始めたか（未使用者には離脱警告を出さない）
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jsonInput = useRef<HTMLInputElement>(null);
  const htmlInput = useRef<HTMLInputElement>(null);
  const [pendingAdd, setPendingAdd] = useState<{ handle: FileHandle; existing: string } | null>(null);

  useEffect(() => { targetsRef.current = targets; }, [targets]);

  // 作業を中止（タブ/ウィンドウを閉じる・リロード）するとき、ファイルに未保存の変更があれば警告。
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (engagedRef.current && serializeProject() !== lastSaved.current) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);
  const persistHandles = (list: Target[]) => { idbSet("autosaveHandles", list.map((t) => t.handle)).catch(() => {}); };

  // 変更を監視し、変更時のみ・デバウンスで、有効な全保存先へ同時に書き出す。
  useEffect(() => {
    const schedule = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const active = targetsRef.current.filter((t) => t.active);
        if (active.length === 0) return;
        const cur = serializeProject();
        if (cur === lastSaved.current) return; // 無編集ならスキップ
        let anyOk = false;
        await Promise.all(active.map(async (t) => { try { await writeHandle(t.handle, cur); anyOk = true; } catch { /* 権限切れ等。次の変更で再試行 */ } }));
        if (anyOk) lastSaved.current = cur;
      }, DEBOUNCE_MS);
    };
    const u1 = useBuilder.subscribe(schedule);
    const u2 = useStudio.subscribe(schedule);
    return () => { u1(); u2(); if (timer.current) clearTimeout(timer.current); };
  }, []);

  // リロード後、前回の保存先を一覧に復元（active=false。書き込みは「再開」まで行わない＝上書き事故防止）。
  useEffect(() => {
    if (!fsSupported()) return;
    (async () => {
      const hs = await idbGet<FileHandle[]>("autosaveHandles");
      if (!Array.isArray(hs) || !hs.length) return;
      // 重複排除（同じファイルの二重登録を除く）
      const uniq: FileHandle[] = [];
      for (const h of hs) { let dup = false; for (const u of uniq) { if (await isSameFile(u, h)) { dup = true; break; } } if (!dup) uniq.push(h); }
      setTargets(uniq.map((h) => ({ handle: h, active: false })));
      if (uniq.length !== hs.length) idbSet("autosaveHandles", uniq).catch(() => {});
    })();
  }, []);

  const writeOne = async (h: FileHandle) => { const cur = serializeProject(); await writeHandle(h, cur); lastSaved.current = cur; };
  // 保存先を登録（重複排除：同じファイルなら二重登録せず、有効化するだけ）。
  const registerTarget = async (h: FileHandle) => {
    engagedRef.current = true;
    const list = targetsRef.current;
    for (let i = 0; i < list.length; i++) {
      if (await isSameFile(list[i].handle, h)) { setTargets((prev) => prev.map((x, idx) => (idx === i ? { ...x, active: true } : x))); return; }
    }
    setTargets((prev) => { const next = [...prev, { handle: h, active: true }]; persistHandles(next); return next; });
  };

  // ワンクリック：既存の .json を開いて復元し、そのまま自動保存先に登録する（手順の2＋3を1回で）。
  const openAndAutoSave = async () => {
    try {
      const h = await pickOpenFile();
      if (!(await ensurePermission(h, true))) { window.alert("ファイルへの書き込み許可が得られませんでした。"); return; }
      const text = await (await h.getFile()).text();
      try { applyProject(text); } catch (e) { window.alert("そのファイルは読み込めませんでした：" + errMsg(e)); return; }
      lastSaved.current = text; // 読み込んだ内容＝ファイルと一致（すぐには書き込まない）
      await registerTarget(h);
      onClose();
    } catch (e) { if (!isAbort(e)) window.alert("開けませんでした：" + errMsg(e)); }
  };

  const addTarget = async () => {
    try {
      const h = await pickSaveFile("designsync-project.json");
      // 上書き事故防止：選んだファイルに既存データがあり、今の内容と違えば確認する
      let existing = "";
      try { existing = await (await h.getFile()).text(); } catch {}
      if (existing.trim() && existing !== serializeProject()) { setPendingAdd({ handle: h, existing }); return; }
      await writeOne(h);
      await registerTarget(h);
    } catch (e) { if (!isAbort(e)) window.alert("保存先を追加できませんでした：" + errMsg(e)); }
  };

  // 既存データありファイルを追加するときの選択：読み込む / 上書き / キャンセル
  const resolveAdd = async (action: "load" | "overwrite") => {
    const p = pendingAdd;
    if (!p) return;
    setPendingAdd(null);
    try {
      if (action === "load") {
        try { applyProject(p.existing); } catch (e) { window.alert("そのファイルは読み込めませんでした：" + errMsg(e)); return; }
        lastSaved.current = p.existing;
      } else {
        await writeOne(p.handle);
      }
      await registerTarget(p.handle);
    } catch (e) { window.alert("処理に失敗しました：" + errMsg(e)); }
  };
  const resume = async (i: number) => {
    const t = targetsRef.current[i];
    if (!t) return;
    try {
      if (!(await ensurePermission(t.handle, true))) { window.alert("ファイルへの書き込み許可が得られませんでした。"); return; }
      await writeOne(t.handle);
      setTargets((prev) => prev.map((x, idx) => (idx === i ? { ...x, active: true } : x)));
    } catch (e) { if (!isAbort(e)) window.alert("再開できませんでした：" + errMsg(e)); }
  };
  const stop = (i: number) => setTargets((prev) => prev.map((x, idx) => (idx === i ? { ...x, active: false } : x)));
  const removeTarget = (i: number) => setTargets((prev) => { const next = prev.filter((_, idx) => idx !== i); persistHandles(next); return next; });

  const saveNow = async () => {
    try {
      const cur = serializeProject();
      await saveBlob(new Blob([cur], { type: "application/json" }), "designsync-project.json", { "application/json": [".json"] });
      lastSaved.current = cur; engagedRef.current = true; // 保存したのでファイルと一致
      onClose();
    } catch (e) { window.alert("保存に失敗しました：" + errMsg(e)); }
  };
  const loadText = (text: string) => {
    if (!window.confirm("読み込むと現在の内容を置き換えます。よろしいですか？（元に戻す で戻せます）")) return false;
    try { applyProject(text); lastSaved.current = serializeProject(); engagedRef.current = true; return true; }
    catch (e) { window.alert("読み込みに失敗しました：" + errMsg(e)); return false; }
  };
  const onPickJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    if (loadText(await f.text())) onClose();
  };
  const loadFromTarget = async (i: number) => {
    const t = targetsRef.current[i]; if (!t) return;
    try {
      if (!(await ensurePermission(t.handle, true))) { window.alert("ファイルの読み取り許可が得られませんでした。"); return; }
      if (loadText(await (await t.handle.getFile()).text())) onClose();
    } catch (e) { if (!isAbort(e)) window.alert("読み込みに失敗しました：" + errMsg(e)); }
  };

  // HTML の読み込み/書き出し
  const onPickHtml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    if (!window.confirm("読み込んだHTMLで現在のページを置き換えます。よろしいですか？（元に戻す で戻せます）")) return;
    try {
      const page = htmlToPage(await f.text(), f.name.replace(/\.html?$/i, "") || "読み込んだページ");
      useBuilder.setState({ page, selectedId: null, view: "builder" });
      onClose();
    } catch (err) { window.alert("読み込みに失敗しました：" + errMsg(err)); }
  };

  const activeCount = targets.filter((t) => t.active).length;

  // クライアントには「ファイル」メニューを出さない（内容編集のみ）。自動保存エンジン(上のuseEffect)は動き続ける。
  if (!admin) return null;

  return (
    <>
      <input ref={jsonInput} type="file" accept=".json,application/json" onChange={onPickJson} className="hidden" />
      <input ref={htmlInput} type="file" accept=".html,text/html" onChange={onPickHtml} className="hidden" />
      <Menu label="ファイル" open={open} onToggle={onToggle} width="w-72" icon={activeCount > 0 ? <CircleCheck size={13} className="text-emerald-500" /> : undefined}>
        {admin && (
          <>
            <MenuItem icon={<Save size={14} />} onClick={saveNow}>プロジェクトを保存（.json）</MenuItem>
            <MenuItem icon={<HardDriveDownload size={14} />} onClick={() => jsonInput.current?.click()}>プロジェクトを読み込み（.json）</MenuItem>

            <MenuDivider />
            <MenuLabel>自動保存の保存先</MenuLabel>
            {!supported ? (
              <p className="px-2 py-1 text-[11px] leading-relaxed text-slate-400">このブラウザはファイル自動保存に非対応です。上の「保存」で手動バックアップしてください（Chrome/Edge推奨）。</p>
            ) : (
              <>
                <MenuItem icon={<FolderOpen size={14} className="text-sky-500" />} onClick={openAndAutoSave}>既存の .json を開いて自動保存（推奨）</MenuItem>
                <p className="px-2 pb-1 text-[10px] leading-relaxed text-slate-400">↑ 復元と自動保存のひも付けを1回で。以降その .json に保存され続けます。</p>
                {targets.length === 0 && <p className="px-2 py-1 text-[11px] leading-relaxed text-slate-400">保存先はまだありません。ローカルと Googleドライブ同期フォルダなど、複数登録できます。</p>}
                {targets.map((t, i) => (
                  <div key={i} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs">
                    {t.active ? <CircleCheck size={13} className="shrink-0 text-emerald-500" /> : <Circle size={13} className="shrink-0 text-slate-300" />}
                    <span className="flex-1 truncate text-slate-700" title={t.handle.name}>{t.handle.name}</span>
                    <button onClick={() => loadFromTarget(i)} className="rounded px-1 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-100" title="このファイルから読み込む">読込</button>
                    {t.active ? (
                      <button onClick={() => stop(i)} className="rounded px-1 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-100">停止</button>
                    ) : (
                      <button onClick={() => resume(i)} className="rounded px-1 py-0.5 text-[10px] font-semibold text-sky-600 hover:bg-sky-50">再開</button>
                    )}
                    <button onClick={() => removeTarget(i)} className="rounded p-0.5 text-slate-400 hover:text-red-500" title="一覧から削除"><Trash2 size={12} /></button>
                  </div>
                ))}
                <MenuItem icon={<Plus size={14} />} onClick={addTarget}>保存先を追加…（ファイルを選ぶ）</MenuItem>
                <p className="px-2 pt-0.5 text-[10px] leading-relaxed text-slate-400">変更後 数秒で緑の保存先すべてへ自動保存。Googleドライブはデスクトップ版の同期フォルダ内の .json を選べば自動でクラウドへ。</p>
              </>
            )}

            <MenuDivider />
            <MenuItem icon={<Globe size={14} />} onClick={() => { setImportOpen(true); onClose(); }}>サイトを読み込み（見た目ごと）</MenuItem>
            <MenuItem icon={<Upload size={14} />} onClick={() => htmlInput.current?.click()}>HTMLを読み込み（構造のみ・簡易）</MenuItem>
            <MenuItem icon={<Download size={14} />} onClick={() => { setExportOpen(true); onClose(); }}>HTMLを書き出し</MenuItem>

            <MenuDivider />
            <MenuItem icon={<RotateCcw size={14} />} danger onClick={() => { if (window.confirm("初期状態に戻します。よろしいですか？（保存内容も上書きされます）")) useBuilder.getState().resetAll(); onClose(); }}>
              初期状態に戻す
            </MenuItem>
          </>
        )}
      </Menu>

      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}
      {importOpen && <ImportSiteModal onClose={() => setImportOpen(false)} />}

      {/* 上書き事故防止：既にデータのあるファイルを保存先に選んだとき */}
      {pendingAdd && (
        <div onPointerDown={() => setPendingAdd(null)} className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4">
          <div onPointerDown={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <p className="text-sm font-bold text-slate-900">選んだファイルには既にデータがあります</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">「{pendingAdd.handle.name}」の内容と、いまの作業内容が違います。どうしますか？</p>
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={() => resolveAdd("load")} className="rounded-md bg-sky-500 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-600">このファイルを読み込む（復元して続きから・推奨）</button>
              <button onClick={() => resolveAdd("overwrite")} className="rounded-md border border-red-300 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">いまの内容で上書きする</button>
              <button onClick={() => setPendingAdd(null)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:border-slate-400">キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
