"use client";
import { useState } from "react";
import { Frame, Group, Type, Image as ImageIcon, Shapes, Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { useBuilder } from "@/lib/store";
import { type SceneNode, isContainer } from "@/lib/types";
import SvgPicker from "./SvgPicker";

// 左：レイヤー/コンポーネント一覧（ページツリー）。
// - クリックで選択（プレビュー・右パネルと連動）
// - 管理者モードのみ：追加ツールバー＋削除が使える（構造編集は管理者の権限）
function iconFor(node: SceneNode) {
  if (isContainer(node)) {
    return node.type === "section"
      ? <Frame size={14} className="text-slate-400" />
      : <Group size={14} className="text-slate-400" />;
  }
  if (node.atomType === "text") return <Type size={14} className="text-slate-400" />;
  if (node.atomType === "image") return <ImageIcon size={14} className="text-slate-400" />;
  return <Shapes size={14} className="text-slate-400" />;
}

function TreeItem({ node, depth }: { node: SceneNode; depth: number }) {
  const select = useBuilder((s) => s.select);
  const remove = useBuilder((s) => s.removeNode);
  const selected = useBuilder((s) => s.selectedId === node.id);
  const admin = useBuilder((s) => s.mode === "admin");
  const [collapsed, setCollapsed] = useState(false);

  const container = isContainer(node);
  const hasChildren = container && node.children.length > 0;

  return (
    <div>
      <div
        onClick={() => select(node.id)}
        style={{ paddingLeft: 8 + depth * 14 }}
        className={`group flex cursor-pointer items-center gap-1.5 rounded-md py-1 pr-1.5 text-sm ${
          selected ? "bg-sky-50 text-sky-700" : "text-slate-700 hover:bg-slate-50"
        }`}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setCollapsed((c) => !c); }}
            className="grid h-4 w-4 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            title={collapsed ? "開く" : "畳む"}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" /> // 三角のない要素の位置合わせ用
        )}
        {iconFor(node)}
        <span className="flex-1 truncate">{node.name}</span>
        {admin && (
          <button
            onClick={(e) => { e.stopPropagation(); remove(node.id); }}
            className="opacity-0 transition group-hover:opacity-100 hover:text-red-500"
            title="削除"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
      {container && !collapsed && node.children.map((c) => <TreeItem key={c.id} node={c} depth={depth + 1} />)}
    </div>
  );
}

export default function LayersPanel() {
  const page = useBuilder((s) => s.page);
  const admin = useBuilder((s) => s.mode === "admin");
  const addSection = useBuilder((s) => s.addSection);
  const addGroup = useBuilder((s) => s.addGroup);
  const addAtom = useBuilder((s) => s.addAtom);
  const [svgPickerOpen, setSvgPickerOpen] = useState(false);

  const addBtn = (label: string, onClick: () => void, Icon: typeof Plus) => (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:border-slate-900"
    >
      <Icon size={12} />
      {label}
    </button>
  );

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-3 py-2.5">
        <p className="text-xs font-bold text-slate-500">構成（レイヤー）</p>
        <p className="mt-0.5 text-[10px] text-slate-400">クリックで選択・ドラッグで並び替え</p>
      </div>

      {admin && (
        <div className="border-b border-slate-100 p-2">
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">追加する</p>
          <div className="flex flex-wrap gap-1">
            {addBtn("セクション", addSection, Frame)}
            {addBtn("グループ", addGroup, Group)}
            {addBtn("テキスト", () => addAtom("text"), Type)}
            {addBtn("画像", () => addAtom("image"), ImageIcon)}
            {addBtn("SVG", () => setSvgPickerOpen(true), Shapes)}
          </div>
          <p className="mt-1.5 px-1 text-[10px] leading-relaxed text-slate-400">
            選んでいる枠の中に追加されます（未選択なら最後のセクション）。
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {page.children.map((c) => (
          <TreeItem key={c.id} node={c} depth={0} />
        ))}
      </div>

      {!admin && (
        <div className="border-t border-slate-100 px-3 py-2 text-[10px] leading-relaxed text-slate-400">
          クライアントモードでは、構成の変更はできません。テキストや画像の内容だけ編集できます。
        </div>
      )}

      {svgPickerOpen && <SvgPicker onClose={() => setSvgPickerOpen(false)} />}
    </aside>
  );
}
