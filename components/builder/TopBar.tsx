"use client";
import { useState, useEffect, useRef } from "react";
import { ShieldCheck, User, Layers, LayoutTemplate, LayoutGrid, Library, PenTool, Undo2, Redo2, Copy, ClipboardPaste, Keyboard } from "lucide-react";
import { useBuilder, builderHistory } from "@/lib/store";
import { useStudio, studioHistory } from "@/lib/studioStore";
import { serializeProject, applyProject } from "@/lib/project";
import { saveBlob } from "@/lib/download";
import ProjectMenu from "@/components/ProjectMenu";
import LiveSync from "@/components/LiveSync";
import HelpModal from "@/components/HelpModal";
import AdminGateModal from "@/components/AdminGateModal";
import { Menu, MenuItem, MenuDivider } from "./Menu";
import type { View } from "@/lib/types";

type MenuId = "file" | "edit";

// 上部メニューバー：カテゴリ名クリックで縦のドロップダウンを開く。
export default function TopBar() {
  const mode = useBuilder((s) => s.mode);
  const setMode = useBuilder((s) => s.setMode);
  const view = useBuilder((s) => s.view);
  const setView = useBuilder((s) => s.setView);
  const admin = mode === "admin";

  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false); // 管理者モードのパスワード入力
  const clientSnapshot = useRef<string | null>(null); // クライアントに切り替えた瞬間の内容（＝管理者の最後の状態）

  // クライアント中は保存・同期を一切しない（localStorage も同期ファイルも書かない）。
  // そのため「クライアント中の編集」は捨て、管理者に戻すときに管理者の状態へ復元する。
  const toClient = () => {
    clientSnapshot.current = serializeProject();
    setMode("client");
  };
  // 復元 → そのあとに解錠。順序が逆だと、解錠した瞬間の保存で
  // 「クライアントが編集した内容」が localStorage を上書きしてしまう。
  const toAdmin = async () => {
    const snap = clientSnapshot.current;
    clientSnapshot.current = null;
    try {
      if (snap) applyProject(snap);
      else {
        // リロードを挟んだ等でスナップショットが無い場合は、保存済み（＝管理者の最後の状態）から復元
        await Promise.resolve(useBuilder.persist.rehydrate());
        await Promise.resolve(useStudio.persist.rehydrate());
      }
    } catch {}
    builderHistory.clear();
    studioHistory.clear();
    setMode("admin"); // ここから保存・同期が有効になる（復元後の内容が保存される）
    setGateOpen(false);
  };
  const toggle = (id: MenuId) => setOpenMenu((cur) => (cur === id ? null : id));
  const close = () => setOpenMenu(null);
  const barRef = useRef<HTMLDivElement>(null);

  const saveProjectJson = async () => {
    try { await saveBlob(new Blob([serializeProject()], { type: "application/json" }), "designsync-project.json", { "application/json": [".json"] }); } catch {}
  };

  // メニュー外クリックで閉じる
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: PointerEvent) => { if (barRef.current && !barRef.current.contains(e.target as Node)) close(); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [openMenu]);

  // Undo/Redo は現在の画面に応じて対象ストアを切り替える（スタジオ or ビルダー）。
  const isStudio = view === "studio";
  const canUndo = useBuilder((s) => s.undoPast.length > 0);
  const canRedo = useBuilder((s) => s.undoFuture.length > 0);
  const canUndoStudio = useStudio((s) => s.undoPast.length > 0);
  const canRedoStudio = useStudio((s) => s.undoFuture.length > 0);
  const hist = isStudio ? studioHistory : builderHistory;
  const undoOk = isStudio ? canUndoStudio : canUndo;
  const redoOk = isStudio ? canRedoStudio : canRedo;

  const doCopy = () => (useBuilder.getState().view === "studio" ? useStudio.getState().copySelection() : useBuilder.getState().copyNode());
  const doPaste = () => (useBuilder.getState().view === "studio" ? useStudio.getState().paste() : useBuilder.getState().pasteNode());

  // グローバル・ショートカット（入力中は無効）：
  //  ? =ヘルプ / Z=戻す / Shift+Z・Y=やり直し / C=コピー / V=ペースト / S=保存。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (!typing && e.key === "?") { e.preventDefault(); setHelpOpen(true); return; }
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const k = e.key.toLowerCase();
      if (!"zycvs".includes(k) || k === "" || typing) return;
      const isStudioView = useBuilder.getState().view === "studio";
      const isAdmin = useBuilder.getState().mode === "admin"; // コピペ/保存は管理者のみ（クライアントは編集のみ）
      if (k === "z") { e.preventDefault(); (isStudioView ? studioHistory : builderHistory)[e.shiftKey ? "redo" : "undo"](); }
      else if (k === "y") { e.preventDefault(); (isStudioView ? studioHistory : builderHistory).redo(); }
      else if (k === "c") { if (isAdmin) { e.preventDefault(); doCopy(); } }
      else if (k === "v") { if (isAdmin) { e.preventDefault(); doPaste(); } }
      else if (k === "s") { if (isAdmin) { e.preventDefault(); saveProjectJson(); } }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 画面（管理者専用はクライアントに出さない）
  const navItems: { v: View; label: string; Icon: typeof Layers; adminOnly?: boolean }[] = [
    { v: "builder", label: "ビルダー", Icon: LayoutTemplate },
    { v: "templates", label: "テンプレート", Icon: LayoutGrid },
    { v: "assets", label: "アセット", Icon: Library, adminOnly: true },
    { v: "studio", label: "スタジオ", Icon: PenTool, adminOnly: true },
  ];

  return (
    <header className="relative flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="DesignSync" className="h-7 w-7 object-contain" />
        <span className="font-extrabold tracking-tight text-slate-900">DesignSync</span>
      </div>

      <div ref={barRef} className="flex items-center gap-0.5">
        {/* ファイル（プロジェクト保存/読込・自動保存・HTML入出力・初期化） */}
        <ProjectMenu open={openMenu === "file"} onToggle={() => toggle("file")} onClose={close} admin={admin} />

        {/* 編集 */}
        <Menu label="編集" open={openMenu === "edit"} onToggle={() => toggle("edit")}>
          <MenuItem icon={<Undo2 size={14} />} hint="⌘Z" disabled={!undoOk} onClick={() => { hist.undo(); close(); }}>元に戻す</MenuItem>
          <MenuItem icon={<Redo2 size={14} />} hint="⌘⇧Z" disabled={!redoOk} onClick={() => { hist.redo(); close(); }}>やり直す</MenuItem>
          {admin && (
            <>
              <MenuDivider />
              <MenuItem icon={<Copy size={14} />} hint="⌘C" onClick={() => { doCopy(); close(); }}>コピー</MenuItem>
              <MenuItem icon={<ClipboardPaste size={14} />} hint="⌘V" onClick={() => { doPaste(); close(); }}>ペースト</MenuItem>
            </>
          )}
        </Menu>
      </div>

      {/* 画面ナビ（中央固定） */}
      <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
        {navItems
          .filter((n) => !n.adminOnly || admin)
          .map((n) => (
            <button
              key={n.v}
              onClick={() => setView(n.v)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition ${view === n.v ? "bg-sky-50 text-sky-700" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <n.Icon size={15} />
              {n.label}
            </button>
          ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {/* Cursorとのライブ同期（管理者のみ） */}
        {admin && <LiveSync />}
        {/* よく使う 元に戻す/やり直す はバーにも残す */}
        <div className="flex items-center gap-0.5">
          <button onClick={() => hist.undo()} disabled={!undoOk} title="元に戻す（⌘Z）" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent">
            <Undo2 size={16} />
          </button>
          <button onClick={() => hist.redo()} disabled={!redoOk} title="やり直す（⌘⇧Z）" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent">
            <Redo2 size={16} />
          </button>
        </div>

        <button onClick={() => setHelpOpen(true)} title="ショートカット一覧（?）" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          <Keyboard size={16} />
        </button>

        {/* モード切替（トグルスイッチ）。管理者側へはパスワード入力を挟む。 */}
        <div className="flex items-center gap-2 text-xs font-semibold" title="管理者/クライアントの切替">
          <span className={`flex items-center gap-1 ${admin ? "text-slate-900" : "text-slate-400"}`}><ShieldCheck size={14} /> 管理者</span>
          <button
            role="switch"
            aria-checked={!admin}
            onClick={() => (admin ? toClient() : setGateOpen(true))}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${admin ? "bg-sky-500" : "bg-slate-400"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${admin ? "left-0.5" : "left-[22px]"}`} />
          </button>
          <span className={`flex items-center gap-1 ${!admin ? "text-slate-900" : "text-slate-400"}`}><User size={14} /> クライアント</span>
        </div>
      </div>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {gateOpen && <AdminGateModal onUnlock={toAdmin} onClose={() => setGateOpen(false)} />}
    </header>
  );
}
