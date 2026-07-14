"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBuilder, findNode } from "@/lib/store";
import { useUi } from "@/lib/uiStore";
import { isAtom, type PathNode } from "@/lib/types";

// パス変形（頂点編集）のオーバーレイ。編集中の自由配置SVG図形の上に、
// ドラッグ可能な頂点ハンドルを重ねる。座標は要素の実表示矩形(getBoundingClientRect)基準なので
// ズーム/スクロールに影響されない。点は 0..100 のローカル空間で保持。
export default function PathEditOverlay() {
  const pathEditId = useUi((s) => s.pathEditId);
  const setPathEditId = useUi((s) => s.setPathEditId);
  const selectedId = useBuilder((s) => s.selectedId);
  const node = useBuilder((s) => (pathEditId ? findNode(s.page, pathEditId) : null));
  const updatePoints = useBuilder((s) => s.updateNodePoints);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const drag = useRef<{ i: number } | null>(null);

  const active = !!pathEditId && pathEditId === selectedId && !!node && isAtom(node) && !!node.points?.length;

  // 対象要素の画面矩形を毎フレーム追従（スクロール/ズーム/移動に追随）
  useEffect(() => {
    if (!active || !pathEditId) { setRect(null); return; }
    let raf = 0;
    const tick = () => {
      const el = document.querySelector(`[data-node-id="${pathEditId}"]`);
      if (el) setRect(el.getBoundingClientRect());
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [active, pathEditId]);

  if (!active || !node || !isAtom(node) || !node.points || !rect) return null;
  const pts = node.points;

  const toLocal = (clientX: number, clientY: number) => ({
    x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
    y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
  });
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const { x, y } = toLocal(e.clientX, e.clientY);
    const np: PathNode[] = pts.map((p, i) => (i === d.i ? { ...p, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 } : p));
    updatePoints(node.id, np);
  };
  // ダブルクリック：辺の中点に頂点追加 / 既存頂点を削除（3点以上のとき）
  const addMidpoint = () => {
    const closed = node.closed ?? true;
    const np: PathNode[] = [];
    for (let i = 0; i < pts.length; i++) {
      np.push(pts[i]);
      const next = pts[(i + 1) % pts.length];
      if (i < pts.length - 1 || closed) np.push({ id: `p${Date.now()}${i}`, x: (pts[i].x + next.x) / 2, y: (pts[i].y + next.y) / 2, isCorner: true });
    }
    updatePoints(node.id, np);
  };
  const removePoint = (i: number) => { if (pts.length > 2) updatePoints(node.id, pts.filter((_, k) => k !== i)); };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none" }}>
      {/* ガイド線 */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "fixed", left: rect.left, top: rect.top, width: rect.width, height: rect.height, overflow: "visible" }}>
        <polygon points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#3b82f6" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray="4 3" />
      </svg>
      {/* 頂点ハンドル */}
      {pts.map((p, i) => (
        <div
          key={p.id}
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { i }; }}
          onPointerMove={onMove}
          onPointerUp={(e) => { drag.current = null; try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {} }}
          onDoubleClick={(e) => { e.stopPropagation(); removePoint(i); }}
          title="ドラッグで移動／ダブルクリックで削除"
          style={{ position: "fixed", left: rect.left + (p.x / 100) * rect.width - 6, top: rect.top + (p.y / 100) * rect.height - 6, width: 12, height: 12, borderRadius: "50%", background: "#fff", border: "2px solid #3b82f6", boxShadow: "0 1px 3px rgba(0,0,0,.3)", pointerEvents: "auto", cursor: "grab", touchAction: "none" }}
        />
      ))}
      {/* 操作バー */}
      <div style={{ position: "fixed", left: rect.left, top: rect.top - 34, display: "flex", gap: 6, pointerEvents: "auto" }}>
        <button onClick={addMidpoint} className="rounded-md bg-sky-500 px-2 py-1 text-[11px] font-semibold text-white shadow hover:bg-sky-600">＋頂点</button>
        <button onClick={() => setPathEditId(null)} className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white shadow hover:bg-slate-700">完了</button>
      </div>
    </div>,
    document.body,
  );
}
