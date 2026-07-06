"use client";
import { Square, Circle, Type, Image as ImageIcon, Shapes, Trash2, ChevronUp, ChevronDown, Copy, MousePointer2, PenTool, Spline, Boxes, Group as GroupIcon, Ungroup } from "lucide-react";
import { useStudio } from "@/lib/studioStore";
import type { StudioElement, StudioElementType } from "@/lib/types";
import StudioExport from "./StudioExport";

// 左：追加ツールバー ＋ レイヤー一覧（重なり順。上ほど前面）。
// レイヤーは「配列の逆順」で表示し、上へ/下への移動で z-index を入れ替える。

const TOOLS: { type: StudioElementType; label: string; Icon: typeof Square }[] = [
  { type: "rectangle", label: "四角形", Icon: Square },
  { type: "circle", label: "円", Icon: Circle },
  { type: "text", label: "テキスト", Icon: Type },
  { type: "image", label: "画像", Icon: ImageIcon },
  { type: "svg", label: "SVG", Icon: Shapes },
];

const ICON: Record<StudioElementType, typeof Square> = {
  rectangle: Square,
  circle: Circle,
  text: Type,
  image: ImageIcon,
  svg: Shapes,
};

function labelOf(el: StudioElement): string {
  if (el.type === "text") return el.content.trim().slice(0, 14) || "テキスト";
  return { rectangle: "四角形", circle: "円", image: "画像", svg: "SVG", text: "テキスト" }[el.type];
}

export default function StudioLayers() {
  const elements = useStudio((s) => s.elements);
  const selectedIds = useStudio((s) => s.selectedIds);
  const tool = useStudio((s) => s.tool);
  const setTool = useStudio((s) => s.setTool);
  const add = useStudio((s) => s.add);
  const select = useStudio((s) => s.select);
  const remove = useStudio((s) => s.remove);
  const duplicate = useStudio((s) => s.duplicate);
  const group = useStudio((s) => s.group);
  const ungroup = useStudio((s) => s.ungroup);
  const bringForward = useStudio((s) => s.bringForward);
  const sendBackward = useStudio((s) => s.sendBackward);

  // 前面が上に来るよう逆順で表示
  const layers = [...elements].reverse();
  // 選択中に「グループ化できるか（2つ以上）」「解除できるか（グループ要素を含む）」
  const canGroup = selectedIds.length >= 2;
  const canUngroup = elements.some((e) => selectedIds.includes(e.id) && e.groupId);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-3 py-2.5">
        <p className="text-xs font-bold text-slate-500">スタジオ</p>
        <p className="mt-0.5 text-[10px] text-slate-400">図形やテキストを自由に配置</p>
      </div>

      {/* ツール（選択 / ペン） */}
      <div className="border-b border-slate-100 p-2">
        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">ツール</p>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setTool("select")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1 text-xs font-semibold transition ${tool === "select" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <MousePointer2 size={13} /> 選択
          </button>
          <button
            onClick={() => setTool("pen")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1 text-xs font-semibold transition ${tool === "pen" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <PenTool size={13} /> ペン
          </button>
          <button
            onClick={() => setTool("node")}
            title="曲線ツール（パス変形）"
            className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1 text-xs font-semibold transition ${tool === "node" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Spline size={13} /> 曲線
          </button>
        </div>
      </div>

      {/* 追加ツール */}
      <div className="border-b border-slate-100 p-2">
        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">追加する</p>
        <div className="flex flex-wrap gap-1">
          {TOOLS.map(({ type, label, Icon }) => (
            <button
              key={type}
              onClick={() => add(type)}
              className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:border-slate-900"
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* グループ化 / 解除（クリックで選択、Shift/⌘クリックで複数選択） */}
      {(canGroup || canUngroup) && (
        <div className="flex gap-1 border-b border-slate-100 p-2">
          <button
            onClick={() => group()}
            disabled={!canGroup}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:border-slate-900 disabled:opacity-40"
          >
            <GroupIcon size={13} /> グループ化
          </button>
          <button
            onClick={() => ungroup()}
            disabled={!canUngroup}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:border-slate-900 disabled:opacity-40"
          >
            <Ungroup size={13} /> 解除
          </button>
        </div>
      )}

      {/* レイヤー一覧 */}
      <div className="flex items-center justify-between px-3 pb-1 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">レイヤー</p>
        <span className="text-[10px] text-slate-300">Shiftで複数選択</span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {layers.length === 0 && <p className="px-2 py-4 text-center text-xs text-slate-400">要素がありません。上のツールで追加してください。</p>}
        {layers.map((el) => {
          const Icon = ICON[el.type];
          const isSelected = selectedIds.includes(el.id);
          return (
            <div
              key={el.id}
              onClick={(e) => select(el.id, e.shiftKey || e.metaKey || e.ctrlKey)}
              className={`group flex cursor-pointer items-center gap-1.5 rounded-md py-1 pl-2 pr-1 text-sm ${
                isSelected ? "bg-sky-50 text-sky-700" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon size={14} className={isSelected ? "text-sky-500" : "text-slate-400"} />
              <span className="flex-1 truncate">{labelOf(el)}</span>
              {el.groupId && <Boxes size={12} className="shrink-0 text-slate-300" aria-label="グループ" />}
              <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                <button onClick={(e) => { e.stopPropagation(); bringForward(el.id); }} className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700" title="前面へ">
                  <ChevronUp size={13} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); sendBackward(el.id); }} className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700" title="背面へ">
                  <ChevronDown size={13} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); duplicate(el.id); }} className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700" title="複製">
                  <Copy size={12} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); remove(el.id); }} className="rounded p-0.5 text-slate-400 hover:text-red-500" title="削除">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <StudioExport />
    </aside>
  );
}
