"use client";
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useBuilder } from "@/lib/store";
import NodeView from "./Renderer";

// 中央：プレビューキャンバス。ページツリーを実DOMで描画する。
// DndContext 配下で“同じコンテナ内の並び替え”を可能にする（6px以上動かすとドラッグ開始＝
// クリック選択と両立）。ページ幅は960px固定でLPの見え方を再現。
export default function Canvas() {
  const sections = useBuilder((s) => s.page.children);
  const select = useBuilder((s) => s.select);
  const reorder = useBuilder((s) => s.reorder);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) reorder(String(active.id), String(over.id));
  };

  return (
    <main className="flex-1 overflow-auto bg-slate-100 p-8" onClick={() => select(null)}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="mx-auto w-[960px] max-w-full overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          {sections.length === 0 ? (
            <div className="grid h-64 place-items-center text-sm text-slate-400">
              左の「セクション」から追加してください
            </div>
          ) : (
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {sections.map((sec) => <NodeView key={sec.id} node={sec} />)}
            </SortableContext>
          )}
        </div>
      </DndContext>
    </main>
  );
}
