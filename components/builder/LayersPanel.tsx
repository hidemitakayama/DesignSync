"use client";
import { useState, useEffect, createContext, useContext } from "react";
import { Frame, Group, Type, Image as ImageIcon, Shapes, Trash2, Plus, ChevronDown, ChevronRight, ChevronUp, GripVertical, CornerDownRight, Combine } from "lucide-react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent, type DragStartEvent, type DragOverEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useBuilder, findNode } from "@/lib/store";
import { useUi } from "@/lib/uiStore";
import { type SceneNode, isContainer } from "@/lib/types";
import SvgPicker from "./SvgPicker";
import ShapePicker from "./ShapePicker";
import { Square } from "lucide-react";

// ドラッグ中の状態を全レイヤーへ配る（何を掴んで・どこに落ちるか）
type DropMode = "line" | "nest" | null;
const DragCtx = createContext<{ dragId: string | null; dropId: string | null; dropMode: DropMode }>({ dragId: null, dropId: null, dropMode: null });

// 選択中ノードまでの“祖先id”一覧（今編集している場所のパス）。選択時にそのパスだけ開くのに使う。
function pathToId(nodes: SceneNode[], id: string | null, acc: string[] = []): string[] | null {
  if (!id) return null;
  for (const n of nodes) {
    if (n.id === id) return acc; // 見つかった：acc が祖先id列
    if (isContainer(n)) {
      const r = pathToId(n.children, id, [...acc, n.id]);
      if (r) return r;
    }
  }
  return null;
}

// activeId の親id（トップレベルは null、未発見は undefined）
function parentIdOf(nodes: SceneNode[], id: string, parent: string | null = null): string | null | undefined {
  for (const n of nodes) {
    if (n.id === id) return parent;
    if (isContainer(n)) { const r = parentIdOf(n.children, id, n.id); if (r !== undefined) return r; }
  }
  return undefined;
}

// 左：レイヤー一覧（ページツリー）。
// - クリックで選択 / ダブルクリックで名前変更 / ドラッグ or ▲▼ で並び替え（同じ階層内）
// - 開閉状態は保存（uiStore）。構造編集は管理者のみ。
function iconFor(node: SceneNode) {
  if (isContainer(node)) return node.type === "section" ? <Frame size={14} className="text-slate-400" /> : <Group size={14} className="text-slate-400" />;
  if (node.atomType === "text") return <Type size={14} className="text-slate-400" />;
  if (node.atomType === "image") return <ImageIcon size={14} className="text-slate-400" />;
  return <Shapes size={14} className="text-slate-400" />;
}

function TreeItem({ node, depth, siblings, index }: { node: SceneNode; depth: number; siblings: SceneNode[]; index: number }) {
  const select = useBuilder((s) => s.select);
  const remove = useBuilder((s) => s.removeNode);
  const reorder = useBuilder((s) => s.reorder);
  const updateNode = useBuilder((s) => s.updateNode);
  const selected = useBuilder((s) => s.selectedIds.includes(node.id));
  const admin = useBuilder((s) => s.mode === "admin");
  const open = useUi((s) => !!s.expanded[node.id]); // 既定は閉じ。開いているものだけ true
  const toggleExpanded = useUi((s) => s.toggleExpanded);
  const [renaming, setRenaming] = useState(false);

  // attributes（tabIndex/role）は付与しない：行にフォーカスが移るとショートカットに干渉するため。ドラッグは listeners（ポインタ）だけで動く。
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id, disabled: !admin });
  const { dropId, dropMode } = useContext(DragCtx);
  const showLine = dropMode === "line" && dropId === node.id; // この要素の“直前”に入る
  const nestHere = dropMode === "nest" && dropId === node.id; // この枠の“中”に入る

  const container = isContainer(node);
  const hasChildren = container && node.children.length > 0;
  const canUp = index > 0;
  const canDown = index < siblings.length - 1;

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : undefined }}>
      {/* 挿入位置ライン（この要素の直前に入る） */}
      {showLine && (
        <div className="pointer-events-none flex items-center gap-1" style={{ paddingLeft: 4 + depth * 14 }}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
          <span className="h-0.5 flex-1 rounded-full bg-sky-500" />
        </div>
      )}
      <div
        {...(admin ? listeners : {})}
        onClick={(e) => select(node.id, e.shiftKey || e.metaKey || e.ctrlKey)}
        style={{ paddingLeft: 4 + depth * 14 }}
        className={`group flex items-center gap-1 rounded-md py-1 pr-1 text-sm ${admin ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${
          nestHere ? "bg-sky-50 text-sky-700 ring-2 ring-inset ring-sky-400" : selected ? "bg-sky-50 text-sky-700" : "text-slate-700 hover:bg-slate-50"
        }`}
        title={admin ? "ドラッグで並び替え／クリックで選択" : undefined}
      >
        {admin ? (
          <span className="grid h-4 w-3 shrink-0 place-items-center text-slate-300 opacity-0 transition group-hover:opacity-100" aria-hidden>
            <GripVertical size={12} />
          </span>
        ) : (
          <span className="h-4 w-3 shrink-0" />
        )}
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); toggleExpanded(node.id); }} className="grid h-4 w-4 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700" title={open ? "畳む" : "開く"}>
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}
        {iconFor(node)}
        {renaming ? (
          <input
            autoFocus
            defaultValue={node.name}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={(e) => { updateNode(node.id, { name: e.target.value.trim() || node.name }); setRenaming(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setRenaming(false); }}
            className="min-w-0 flex-1 rounded border border-sky-300 px-1 text-sm outline-none"
          />
        ) : (
          <span onDoubleClick={admin ? (e) => { e.stopPropagation(); setRenaming(true); } : undefined} className="flex-1 truncate" title={admin ? "ダブルクリックで名前変更" : undefined}>
            {node.name}
          </span>
        )}
        {nestHere && (
          <span className="mr-0.5 flex shrink-0 items-center gap-0.5 rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            <CornerDownRight size={10} /> 中へ
          </span>
        )}
        {admin && !renaming && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
            <button onClick={(e) => { e.stopPropagation(); if (canUp) reorder(node.id, siblings[index - 1].id); }} disabled={!canUp} className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30" title="上へ"><ChevronUp size={13} /></button>
            <button onClick={(e) => { e.stopPropagation(); if (canDown) reorder(node.id, siblings[index + 1].id); }} disabled={!canDown} className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30" title="下へ"><ChevronDown size={13} /></button>
            <button onClick={(e) => { e.stopPropagation(); remove(node.id); }} className="rounded p-0.5 text-slate-400 hover:text-red-500" title="削除"><Trash2 size={13} /></button>
          </div>
        )}
      </div>
      {container && open && node.children.length > 0 && (
        <SortableContext items={node.children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {node.children.map((c, i) => <TreeItem key={c.id} node={c} depth={depth + 1} siblings={node.children} index={i} />)}
        </SortableContext>
      )}
    </div>
  );
}

export default function LayersPanel() {
  const page = useBuilder((s) => s.page);
  const admin = useBuilder((s) => s.mode === "admin");
  const addSection = useBuilder((s) => s.addSection);
  const addGroup = useBuilder((s) => s.addGroup);
  const addAtom = useBuilder((s) => s.addAtom);
  const moveNode = useBuilder((s) => s.moveNode);
  const groupSelected = useBuilder((s) => s.groupSelected);
  const selectedId = useBuilder((s) => s.selectedId);
  const selCount = useBuilder((s) => s.selectedIds.length);
  const [svgPickerOpen, setSvgPickerOpen] = useState(false);
  const [shapePickerOpen, setShapePickerOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  // ⌘G / Ctrl+G で選択をグループ化
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "g" || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const s = useBuilder.getState();
      if (s.mode !== "admin" || !s.selectedIds.length) return;
      e.preventDefault();
      s.groupSelected();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 選択が変わったら、その要素までのパス（＝今編集している場所）だけを開き、他は畳む。
  useEffect(() => {
    const pg = useBuilder.getState().page;
    const anc = pathToId(pg.children, selectedId) ?? [];
    const node = findNode(pg, selectedId);
    const ids = node && isContainer(node) ? [...anc, node.id] : anc;
    useUi.getState().openPath(ids);
  }, [selectedId]);
  const [drag, setDrag] = useState<{ dragId: string | null; dropId: string | null; dropMode: DropMode }>({ dragId: null, dropId: null, dropMode: null });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ドラッグ中：何を掴んでいるか / どこに落ちるか（直前に挿入＝line / 枠の中へ＝nest）を算出して表示に反映
  const onDragStart = (e: DragStartEvent) => setDrag({ dragId: String(e.active.id), dropId: null, dropMode: null });
  const onDragOver = (e: DragOverEvent) => {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId || overId === activeId) { setDrag((d) => ({ ...d, dropId: null, dropMode: null })); return; }
    const overNode = findNode(page, overId);
    const sameParent = parentIdOf(page.children, activeId) === parentIdOf(page.children, overId);
    const nest = !!overNode && isContainer(overNode) && !sameParent; // 別の枠のコンテナに重ねた＝中へネスト
    setDrag((d) => ({ dragId: d.dragId, dropId: overId, dropMode: nest ? "nest" : "line" }));
  };
  const clearDrag = () => setDrag({ dragId: null, dropId: null, dropMode: null });
  // ドラッグ＆ドロップは階層をまたいで移動できる（別のセクション/グループへ、任意の位置へ）
  const onDragEnd = (e: DragEndEvent) => { const { active, over } = e; if (over && active.id !== over.id) moveNode(String(active.id), String(over.id)); clearDrag(); };

  const activeNode = drag.dragId ? findNode(page, drag.dragId) : null;

  // 「＋追加」ドロップダウン内の1項目。
  const menuItem = (Icon: typeof Plus, label: string, onClick: () => void) => (
    <button
      key={label}
      onClick={() => { onClick(); setAddMenuOpen(false); }}
      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-sky-50 hover:text-sky-700"
    >
      <Icon size={14} className="text-slate-400" /> {label}
    </button>
  );

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <p className="text-xs font-bold text-slate-500">レイヤー</p>
        {admin && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => groupSelected()}
              disabled={!selCount}
              title="選択をグループ化 (⌘G)"
              className="grid h-[26px] w-[26px] place-items-center rounded-md border border-slate-200 text-slate-600 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200"
            >
              <Combine size={14} />
            </button>
            <div className="relative">
            <button
              onClick={() => setAddMenuOpen((o) => !o)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${addMenuOpen ? "bg-slate-700 text-white" : "bg-slate-900 text-white hover:bg-slate-700"}`}
              title="要素を追加"
            >
              <Plus size={13} /> 追加 <ChevronDown size={12} className="opacity-70" />
            </button>
            {addMenuOpen && (
              <>
                {/* クリック外で閉じる */}
                <div className="fixed inset-0 z-20" onClick={() => setAddMenuOpen(false)} />
                <div className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                  <p className="px-3 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">構造</p>
                  {menuItem(Frame, "セクション", () => addSection())}
                  {menuItem(Group, "グループ", () => addGroup())}
                  <div className="my-1 h-px bg-slate-100" />
                  <p className="px-3 pb-0.5 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">コンテンツ</p>
                  {menuItem(Type, "テキスト", () => addAtom("text"))}
                  {menuItem(ImageIcon, "画像", () => addAtom("image"))}
                  {menuItem(Square, "図形", () => setShapePickerOpen(true))}
                  {menuItem(Shapes, "SVG", () => setSvgPickerOpen(true))}
                  <div className="mt-1 border-t border-slate-100 px-3 py-1.5 text-[10px] leading-relaxed text-slate-400">選択中の枠の中に追加（未選択なら最後のセクション）</div>
                </div>
              </>
            )}
            </div>
          </div>
        )}
      </div>
      {admin && (
        <div className="border-b border-slate-100 px-3 py-1.5 text-[10px] text-slate-400" title="青線＝ここに入る／枠が光る＝中へ">
          行のどこでもドラッグで並び替え・ダブルクリックで改名・⌘Gでグループ化
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={clearDrag}>
          <DragCtx.Provider value={drag}>
            <SortableContext items={page.children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {page.children.map((c, i) => <TreeItem key={c.id} node={c} depth={0} siblings={page.children} index={i} />)}
            </SortableContext>
          </DragCtx.Provider>
          {/* 掴んでいる要素を指の先に表示（何を動かしているか一目で分かる） */}
          <DragOverlay dropAnimation={null}>
            {activeNode ? (
              <div className="flex items-center gap-1.5 rounded-md border border-sky-300 bg-white px-2 py-1 text-sm text-sky-700 shadow-lg">
                {iconFor(activeNode)}
                <span className="max-w-[150px] truncate">{activeNode.name}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {!admin && (
        <div className="border-t border-slate-100 px-3 py-2 text-[10px] leading-relaxed text-slate-400">
          クライアントモードでは、構成の変更はできません。テキストや画像の内容だけ編集できます。
        </div>
      )}

      {svgPickerOpen && <SvgPicker onClose={() => setSvgPickerOpen(false)} />}
      {shapePickerOpen && <ShapePicker onClose={() => setShapePickerOpen(false)} />}
    </aside>
  );
}
