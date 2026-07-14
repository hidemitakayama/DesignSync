"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { RefreshCw } from "lucide-react";
import { serializeProject, applyProject } from "@/lib/project";
import { mergeProject } from "@/lib/mergeProject";
import { useBuilder } from "@/lib/store";
import { useUi } from "@/lib/uiStore";
import { useStudio } from "@/lib/studioStore";
import { fsSupported, pickSaveFile, writeHandle, ensurePermission, idbGet, idbSet, idbDel, type FileHandle } from "@/lib/fsHandle";

// Cursor ↔ DesignSync のライブ同期。
// - 書き出し：ビルダー/スタジオの変更を JSON ファイルへ自動保存（Cursorがそのファイルを編集できる）。
// - 取り込み：フォーカス復帰＋1.5秒間隔でファイルを読み、Cursorの変更を現在のページへ反映。
//   ローカルに未同期の手作業編集があるときは上書きせず確認ダイアログを出す（自動・安全側）。
// ブラウザはファイル監視ができないため“保存の瞬間に即”ではなく、フォーカス/ポーリングで取り込む。
export default function LiveSync() {
  // SSR/クライアント初期描画を一致させる（ハイドレーション不一致回避）。サーバーでは false。
  const supported = useSyncExternalStore(() => () => {}, () => fsSupported(), () => false);
  const [handle, setHandle] = useState<FileHandle | null>(null);
  const [active, setActive] = useState(false);
  const [note, setNote] = useState("同期中");
  const [hasIncoming, setHasIncoming] = useState(false); // ファイル側にCursorの未反映変更があるか（＝反映待ち）
  const lastSynced = useRef<string>(""); // 最後に「同期済み」と分かっている内容（エコー防止＆競合判定）
  const busy = useRef(false); // applyProject 中の書き戻し・多重取り込みを抑止
  const setSyncState = useUi((s) => s.setSyncState);
  const setSyncReconnect = useUi((s) => s.setSyncReconnect);

  // 同期状態をグローバルへ反映（ビルダー側の未接続編集の警告に使う）
  useEffect(() => { setSyncState(!handle ? "off" : active ? "active" : "disconnected"); }, [handle, active, setSyncState]);

  // このコンポーネントは管理者モードでのみマウントされる。
  // クライアントへ切り替わって外れたときは、同期状態を "off" に戻して
  // 未接続バッジ・同期ガードのモーダルがクライアントに出ないようにする。
  useEffect(() => () => { useUi.getState().setSyncState("off"); }, []);

  // 「既存の内容のまま同期を再開・自動保存」関数を登録（未接続モーダルの推奨アクション）。
  // ビルダー優先でファイルへ保存し、以降を同期中にする（確認ダイアログなし）。
  useEffect(() => {
    if (!handle) { setSyncReconnect(null); return; }
    const fn = async () => {
      if (!(await ensurePermission(handle, true))) { window.alert("ファイルへの書き込み許可が得られませんでした。"); return; }
      try { const cur = serializeProject(); await writeHandle(handle, cur); lastSynced.current = cur; setActive(true); setNote("同期中"); }
      catch { setNote("再接続が必要"); }
    };
    setSyncReconnect(fn);
    return () => setSyncReconnect(null);
  }, [handle, setSyncReconnect]);

  const finalizeLink = (h: FileHandle) => { setHandle(h); setActive(true); setNote("同期中"); idbSet("liveSyncHandle", h).catch(() => {}); };

  // 起動時：保存済みハンドルを復元（権限は「再接続」クリックで再取得）
  useEffect(() => {
    (async () => {
      const h = await idbGet<FileHandle>("liveSyncHandle").catch(() => undefined);
      if (h) { setHandle(h); setActive(false); setNote("再接続が必要"); }
    })();
  }, []);

  // 自動処理（書き出し＋検知）。取り込み（Cursor→ビルダー）は自動では行わない。
  //  - ファイルにCursorの未反映変更があれば「反映待ち」にして、ビルダーの内容で上書きしない（Cursorの編集を守る）。
  //  - 未反映変更が無ければ、ビルダーの変更をファイルへ書き出す（＝Cursor側に常に最新を見せる）。
  // 実際の取り込みは「Cursorの変更を反映」ボタン（applyIncoming）で明示的にマージ適用する。
  const autoRef = useRef<() => Promise<void>>(async () => {});
  autoRef.current = async () => {
    if (!handle || busy.current) return;
    let text: string;
    try {
      if (!(await ensurePermission(handle, true))) { setActive(false); setNote("再接続が必要"); return; }
      text = await (await handle.getFile()).text();
    } catch { setActive(false); setNote("再接続が必要"); return; }
    const base = lastSynced.current;
    if (text !== base) { setHasIncoming(true); setNote("Cursorの変更あり"); return; } // 反映待ち（上書きしない）
    const mine = serializeProject();
    if (mine !== base) {
      try { await writeHandle(handle, mine); lastSynced.current = mine; setNote("同期中"); }
      catch { setActive(false); setNote("再接続が必要"); return; }
    }
    setHasIncoming(false);
  };

  // 「Cursorの変更を反映」ボタン：ファイルを読み、3-wayマージ（競合はビルダー優先）してビルダーへ適用。
  const applyIncomingRef = useRef<() => Promise<void>>(async () => {});
  applyIncomingRef.current = async () => {
    if (!handle) return;
    let text: string;
    try {
      if (!(await ensurePermission(handle, true))) { setActive(false); setNote("再接続が必要"); return; }
      text = await (await handle.getFile()).text();
    } catch { setActive(false); setNote("再接続が必要"); return; }
    try {
      busy.current = true;
      const prevEditing = useBuilder.getState().editing; // 反映前に見ていた版(PC/SP)を覚えておく
      const merged = mergeProject(lastSynced.current, serializeProject(), text);
      if (!merged) { setNote("マージできず（手動確認）"); return; }
      applyProject(JSON.stringify(merged));
      // applyProject は editing を "pc" に戻すので、SP版を見ていたなら SP版へ戻す（反映結果をその場で見えるように）
      if (prevEditing === "sp") useBuilder.getState().setEditing("sp");
      const canon = serializeProject();
      if (canon !== text) { try { await writeHandle(handle, canon); } catch {} } // 統合結果をファイルへも
      lastSynced.current = canon; setHasIncoming(false); setNote("Cursorの変更を反映");
    } catch { setActive(false); setNote("再接続が必要"); }
    finally { setTimeout(() => { busy.current = false; }, 60); }
  };

  // 変更購読 → デバウンスして書き出し（Cursorの未反映変更が無いときのみ）
  useEffect(() => {
    if (!active || !handle) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const onChange = () => { if (busy.current) return; if (t) clearTimeout(t); t = setTimeout(() => { void autoRef.current(); }, 500); };
    const u1 = useBuilder.subscribe(onChange);
    const u2 = useStudio.subscribe(onChange);
    return () => { u1(); u2(); if (t) clearTimeout(t); };
  }, [active, handle]);

  // フォーカス復帰＋1.5秒間隔で「Cursorの変更あり」を検知（自動では取り込まない）
  useEffect(() => {
    if (!active || !handle) return;
    const id = setInterval(() => { void autoRef.current(); }, 1500);
    const onFocus = () => { void autoRef.current(); };
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [active, handle]);

  const link = async () => {
    try {
      const h = await pickSaveFile("designsync-live.json");
      if (!(await ensurePermission(h, true))) { window.alert("ファイルへの書き込み許可が得られませんでした。"); return; }
      const cur = serializeProject();
      let existing = "";
      try { existing = await (await h.getFile()).text(); } catch { /* 新規ファイル */ }
      if (existing.trim() && existing !== cur) {
        const load = window.confirm("選んだファイルに既存の内容があります。\n［OK］ファイルの内容を取り込む（Cursorで作った/編集した内容）\n［キャンセル］現在のページでファイルを上書きする");
        if (load) {
          try { busy.current = true; applyProject(existing); lastSynced.current = existing; }
          catch { window.alert("そのファイルはDesignSync形式ではないため取り込めませんでした。現在の内容で上書きします。"); await writeHandle(h, cur); lastSynced.current = cur; }
          finally { setTimeout(() => { busy.current = false; }, 60); }
          finalizeLink(h); return;
        }
      }
      await writeHandle(h, cur); lastSynced.current = cur; finalizeLink(h);
    } catch { /* キャンセル */ }
  };

  const reconnect = async () => {
    if (!handle) return;
    if (!(await ensurePermission(handle, true))) { window.alert("許可が得られませんでした。"); return; }
    try {
      const cur = serializeProject();
      // ファイル側と現在のページが違うときだけ「どちらを正にするか」を確認する。
      // 既定（キャンセル）＝ビルダー優先でファイルへ保存（手作業の編集を絶対に消さない）。
      // ［OK］＝ファイルの内容を読み込む（Cursorやバックアップから復元したいとき）。
      let fileText = "";
      try { fileText = await (await handle.getFile()).text(); } catch { /* 新規/空 */ }
      if (fileText.trim() && fileText !== cur) {
        const loadFile = window.confirm(
          "同期ファイルの内容が、いま表示中のページと違います。\n\n［OK］ファイルの内容を読み込む（Cursor／バックアップ側を反映）\n［キャンセル］いま表示中のページでファイルを上書きする（手作業の編集を保持）"
        );
        if (loadFile) {
          try { busy.current = true; applyProject(fileText); lastSynced.current = fileText; setActive(true); setNote("ファイルから復元しました"); }
          catch { window.alert("そのファイルはDesignSync形式ではないため読み込めませんでした。現在の内容で上書きします。"); await writeHandle(handle, cur); lastSynced.current = cur; setActive(true); setNote("同期中"); }
          finally { setTimeout(() => { busy.current = false; }, 60); }
          return;
        }
      }
      // ビルダー優先でファイルへ保存
      await writeHandle(handle, cur);
      lastSynced.current = cur;
      setActive(true); setNote("同期中");
    } catch { setNote("再接続が必要"); }
  };

  const unlink = () => {
    if (!window.confirm("Cursorとのライブ同期を解除しますか？（データは消えません）")) return;
    setActive(false); setHandle(null); setNote("同期中"); lastSynced.current = "";
    idbDel("liveSyncHandle").catch(() => {});
  };

  if (!supported) return null;

  if (!handle) {
    return (
      <button onClick={link} title="現在のページをJSONファイルに連携し、Cursorでの変更を自動で反映します" className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-slate-900">
        <RefreshCw size={13} /> Cursor連携
      </button>
    );
  }
  if (!active) {
    return (
      <button onClick={reconnect} title="ライブ同期を再開（ファイルの読み書き許可を再取得）" className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:border-amber-500">
        <RefreshCw size={13} /> 再接続
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      {hasIncoming && (
        <button
          onClick={() => applyIncomingRef.current()}
          title="ファイル（Cursor）側の変更を、いまの編集にマージして取り込みます（競合はビルダー優先）"
          className="flex items-center gap-1.5 rounded-md border border-sky-300 bg-sky-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-sky-600"
        >
          <RefreshCw size={13} /> Cursorの変更を反映
        </button>
      )}
      <button onClick={unlink} title={`Cursorとライブ同期中（${note}）／クリックで解除`} className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:border-emerald-400">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${hasIncoming ? "bg-amber-500" : "bg-emerald-500"}`} /> {hasIncoming ? "反映待ち" : "同期中"}
      </button>
    </div>
  );
}
