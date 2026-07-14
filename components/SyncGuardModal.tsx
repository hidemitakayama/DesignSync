"use client";
import { useRef } from "react";
import { AlertTriangle, RefreshCw, FolderInput } from "lucide-react";
import { useUi } from "@/lib/uiStore";
import { applyProject } from "@/lib/project";

// 未接続（同期前）に編集しようとしたときに中央へ出す復旧ダイアログ。
// ・既存の内容のまま同期を再開・自動保存（推奨）
// ・プロジェクトを読み込み（保存ファイル/バックアップから復元）→ 読み込み後そのまま同期再開
export default function SyncGuardModal() {
  const open = useUi((s) => s.syncGuardOpen);
  const close = useUi((s) => s.closeSyncGuard);
  const syncReconnect = useUi((s) => s.syncReconnect);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const resumeCurrent = async () => {
    if (syncReconnect) await syncReconnect(); // ビルダー優先で保存＋同期再開
    close();
  };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      applyProject(await f.text()); // 読み込んだ内容でビルダーを置き換え
    } catch (err) {
      window.alert("読み込みに失敗しました：" + (err instanceof Error ? err.message : String(err)));
      return;
    }
    if (syncReconnect) await syncReconnect(); // 読み込んだ内容を保存して同期再開
    close();
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/45 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600"><AlertTriangle size={18} /></span>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">同期が未接続です（同期前）</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              このまま編集すると、内容がファイルへ保存・同期されず失われる恐れがあります。<br />
              編集を始める前に、どちらかを選んでください。
            </p>
          </div>
        </div>

        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
        <div className="mt-5 flex flex-col gap-2">
          <button onClick={resumeCurrent} className="flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-600">
            <RefreshCw size={16} /> 既存の内容のまま同期を再開・自動保存（推奨）
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-900">
            <FolderInput size={16} /> プロジェクトを読み込み（保存ファイルから復元）
          </button>
          <button onClick={close} className="mt-1 text-xs font-semibold text-slate-400 hover:text-slate-600">このまま編集を続ける（非推奨）</button>
        </div>
      </div>
    </div>
  );
}
