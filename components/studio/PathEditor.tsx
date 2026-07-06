"use client";
import { useRef } from "react";
import { useStudio, nodesToPathD, type Pt } from "@/lib/studioStore";
import type { StudioElement } from "@/lib/types";

// 曲線ツール（パス変形）のオーバーレイ。ベジェハンドルは出さず、点だけを操作する。
// - 点をドラッグ＝移動（曲線は自動生成）
// - 点をダブルクリック＝「曲線 ⇄ 角」を切り替え
// - Alt+クリック＝点を削除
// - 線（セグメント）をクリック＝点を追加
// マーカーは 曲線点=丸 / 角点=四角 で区別する（Illustrator流）。

// 線分 ab 上で p に最も近い点（クリック位置を線に載せる）
function project(a: Pt, b: Pt, p: Pt): Pt {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2));
  return { x: a.x + abx * t, y: a.y + aby * t };
}

export default function PathEditor({ el, toPoint }: { el: StudioElement; toPoint: (e: React.MouseEvent | React.PointerEvent) => Pt }) {
  const movePathPoint = useStudio((s) => s.movePathPoint);
  const insertPathPoint = useStudio((s) => s.insertPathPoint);
  const deletePathPoint = useStudio((s) => s.deletePathPoint);
  const toggleNodeCorner = useStudio((s) => s.toggleNodeCorner);
  const dragging = useRef<number | null>(null);

  const nodes = el.points ?? [];
  if (nodes.length === 0) return null;

  // セグメント（挿入用の当たり判定。曲線でも直線近似で拾う）。insertAt は挿入位置。
  const segments: { a: Pt; b: Pt; insertAt: number }[] = [];
  for (let i = 0; i < nodes.length - 1; i++) segments.push({ a: nodes[i], b: nodes[i + 1], insertAt: i + 1 });
  if (el.closed && nodes.length > 1) segments.push({ a: nodes[nodes.length - 1], b: nodes[0], insertAt: nodes.length });

  return (
    // z-index を要素より十分高くしないと、要素(style.zIndex)がマーカーを覆って操作できない
    <svg className="pointer-events-none absolute left-0 top-0" width={2400} height={1600} style={{ overflow: "visible", zIndex: 9999 }}>
      {/* 実際に生成される曲線のガイド */}
      <path d={nodesToPathD(nodes, !!el.closed)} fill="none" stroke="#0ea5e9" strokeWidth={1.5} strokeDasharray="5 4" className="pointer-events-none" />

      {/* セグメント：クリックで点を挿入（太い透明ストロークで当たり判定） */}
      {segments.map((sg, i) => (
        <line
          key={`seg-${i}`}
          x1={sg.a.x}
          y1={sg.a.y}
          x2={sg.b.x}
          y2={sg.b.y}
          stroke="transparent"
          strokeWidth={12}
          style={{ pointerEvents: "stroke", cursor: "copy" }}
          onClick={(e) => { e.stopPropagation(); insertPathPoint(el.id, sg.insertAt, project(sg.a, sg.b, toPoint(e))); }}
        />
      ))}

      {/* 点：曲線点=丸 / 角点=四角。ドラッグで移動、ダブルクリックで曲線⇄角、Alt+クリックで削除 */}
      {nodes.map((p, i) => {
        const common = {
          style: { pointerEvents: "all" as const, cursor: "grab" },
          onPointerDown: (e: React.PointerEvent) => {
            e.stopPropagation();
            if (e.altKey) { deletePathPoint(el.id, i); return; } // Alt+クリックで削除（ドラッグしない）
            (e.target as Element).setPointerCapture(e.pointerId);
            dragging.current = i;
          },
          onPointerMove: (e: React.PointerEvent) => { if (dragging.current === i) movePathPoint(el.id, i, toPoint(e)); },
          onPointerUp: (e: React.PointerEvent) => { if (dragging.current === i) { dragging.current = null; try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {} } },
          onDoubleClick: (e: React.MouseEvent) => { e.stopPropagation(); toggleNodeCorner(el.id, i); },
        };
        return p.isCorner ? (
          <rect key={`pt-${i}`} x={p.x - 5.5} y={p.y - 5.5} width={11} height={11} rx={1} fill="#ffffff" stroke="#0ea5e9" strokeWidth={2} {...common} />
        ) : (
          <circle key={`pt-${i}`} cx={p.x} cy={p.y} r={6} fill="#ffffff" stroke="#0ea5e9" strokeWidth={2} {...common} />
        );
      })}
    </svg>
  );
}
