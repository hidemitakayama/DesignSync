"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { useStudio, orthoSnap, type Pt } from "@/lib/studioStore";
import StudioElementView from "./StudioElementView";
import PathEditor from "./PathEditor";

const CANVAS_W = 2400;
const CANVAS_H = 1600;
const clampZoom = (z: number) => Math.min(4, Math.max(0.2, z));

// 中央：Figma風のドット背景の作業エリア。要素を絶対座標で並べる。
// ⌘/Ctrl+ホイールで拡大縮小、Shift+ホイールで左右移動、ホイールで上下移動。
export default function StudioCanvas() {
  const elements = useStudio((s) => s.elements);
  const selectedIds = useStudio((s) => s.selectedIds);
  const select = useStudio((s) => s.select);
  const tool = useStudio((s) => s.tool);
  const draft = useStudio((s) => s.draft);
  const penAddPoint = useStudio((s) => s.penAddPoint);
  const penRemoveLast = useStudio((s) => s.penRemoveLast);
  const penToggleOrtho = useStudio((s) => s.penToggleOrtho);
  const penCommit = useStudio((s) => s.penCommit);
  const penCancel = useStudio((s) => s.penCancel);

  const innerRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Pt | null>(null);
  const penMode = tool === "pen";
  const nodeMode = tool === "node";
  // 曲線ツールは「1つのパスだけ」を選んでいるときに編集対象にする
  const soleId = selectedIds.length === 1 ? selectedIds[0] : null;
  const editingEl = elements.find((e) => e.id === soleId);
  const nodeTarget = nodeMode && editingEl?.points ? editingEl : null;

  // --- 拡大縮小・パン ---
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const focal = useRef<{ cx: number; cy: number; sx: number; sy: number } | null>(null);
  const setZoomAt = (nz: number, sx: number, sy: number, cx: number, cy: number) => {
    focal.current = { cx, cy, sx, sy };
    zoomRef.current = nz;
    setZoom(nz);
  };
  // ⌘/Ctrl+ホイールでズーム（カーソル位置を中心に）、Shift+ホイールで左右移動。
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const onWheel = (e: WheelEvent) => {
      if (e.metaKey || e.ctrlKey) {
        // ⌘/Ctrl+ホイール＝カーソル位置を中心に拡大縮小
        e.preventDefault();
        const rect = outer.getBoundingClientRect();
        const z = zoomRef.current;
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const cx = (sx + outer.scrollLeft) / z;
        const cy = (sy + outer.scrollTop) / z;
        setZoomAt(clampZoom(z * Math.exp(-e.deltaY * 0.0015)), sx, sy, cx, cy);
      } else if (e.shiftKey) {
        // Shift+ホイール＝左右移動。環境により横成分が deltaX に乗るので両方を見る。
        e.preventDefault();
        outer.scrollLeft += e.deltaX || e.deltaY;
      }
    };

    // 中ボタン（ホイールクリック）ドラッグで自由にパン
    let pan: { sx: number; sy: number; sl: number; st: number } | null = null;
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 1) return;
      e.preventDefault();
      pan = { sx: e.clientX, sy: e.clientY, sl: outer.scrollLeft, st: outer.scrollTop };
      outer.setPointerCapture(e.pointerId);
      outer.style.cursor = "grabbing";
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!pan) return;
      outer.scrollLeft = pan.sl - (e.clientX - pan.sx);
      outer.scrollTop = pan.st - (e.clientY - pan.sy);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!pan) return;
      pan = null;
      try { outer.releasePointerCapture(e.pointerId); } catch {}
      outer.style.cursor = "";
    };
    // 中クリックのオートスクロール（丸いカーソル）を抑止
    const onMouseDown = (e: MouseEvent) => { if (e.button === 1) e.preventDefault(); };

    outer.addEventListener("wheel", onWheel, { passive: false });
    outer.addEventListener("pointerdown", onPointerDown);
    outer.addEventListener("pointermove", onPointerMove);
    outer.addEventListener("pointerup", onPointerUp);
    outer.addEventListener("pointercancel", onPointerUp);
    outer.addEventListener("mousedown", onMouseDown);
    return () => {
      outer.removeEventListener("wheel", onWheel);
      outer.removeEventListener("pointerdown", onPointerDown);
      outer.removeEventListener("pointermove", onPointerMove);
      outer.removeEventListener("pointerup", onPointerUp);
      outer.removeEventListener("pointercancel", onPointerUp);
      outer.removeEventListener("mousedown", onMouseDown);
    };
  }, []);
  // ズーム変更後、カーソル（または中心）の位置を保つようスクロールを合わせる。
  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (focal.current && outer) {
      outer.scrollLeft = focal.current.cx * zoom - focal.current.sx;
      outer.scrollTop = focal.current.cy * zoom - focal.current.sy;
      focal.current = null;
    }
  }, [zoom]);
  const zoomBy = (factor: number) => {
    const outer = outerRef.current;
    if (!outer) return;
    const rect = outer.getBoundingClientRect();
    const z = zoomRef.current;
    const sx = rect.width / 2;
    const sy = rect.height / 2;
    setZoomAt(clampZoom(z * factor), sx, sy, (sx + outer.scrollLeft) / z, (sy + outer.scrollTop) / z);
  };
  const resetZoom = () => { focal.current = null; zoomRef.current = 1; setZoom(1); };

  // イベント座標 → キャンバス内座標（ズーム込み）
  const toPoint = (e: React.MouseEvent): Pt => {
    const r = innerRef.current!.getBoundingClientRect();
    const z = zoomRef.current;
    return { x: Math.round((e.clientX - r.left) / z), y: Math.round((e.clientY - r.top) / z) };
  };

  // シングルクリックで点追加（ダブルクリックの2打目 detail===2 は無視）
  const onPenClick = (e: React.MouseEvent) => {
    if (e.detail !== 1) return;
    penAddPoint(toPoint(e));
  };
  // ダブルクリック＝直角モード切替。1打目で入った点を1つ戻してから切り替える。
  const onPenDblClick = () => {
    penRemoveLast();
    penToggleOrtho();
  };

  const points = draft?.points ?? [];
  const last = points[points.length - 1];
  const previewTo = hover && last ? (draft?.ortho ? orthoSnap(last, hover) : hover) : null;

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-slate-100">
      {penMode && (
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-2 text-xs backdrop-blur">
          <span className="font-semibold text-sky-700">ペンツール</span>
          <span className="text-slate-500">クリックで点を追加 ／ ダブルクリックで直角切替</span>
          <span className={`rounded-full px-2 py-0.5 font-semibold ${draft?.ortho ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-400"}`}>
            直角モード：{draft?.ortho ? "ON" : "OFF"}
          </span>
          <span className="text-slate-400">点 {points.length}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => penCommit()} className="rounded-md bg-sky-500 px-2.5 py-1 font-semibold text-white hover:bg-sky-600">確定 (Enter)</button>
            <button onClick={() => penCancel()} className="rounded-md border border-slate-200 px-2.5 py-1 font-semibold text-slate-500 hover:border-slate-400">取消 (Esc)</button>
          </div>
        </div>
      )}

      {nodeMode && (
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-2 text-xs backdrop-blur">
          <span className="font-semibold text-sky-700">曲線ツール</span>
          {nodeTarget ? (
            <>
              <span className="text-slate-500">点をドラッグで移動 ／ ダブルクリックで曲線⇄角 ／ 線をクリックで追加 ／ Alt+クリックで削除</span>
              <span className="text-slate-400">点 {nodeTarget.points?.length}</span>
            </>
          ) : (
            <span className="text-slate-500">パスを選ぶと形を編集できます。四角形・円は右パネルの「パスに変換」で編集可能に。</span>
          )}
        </div>
      )}

      <div ref={outerRef} className="relative flex-1 overflow-auto">
        {/* スクロール領域はズーム後の実寸に合わせる（sizer）。中身はその中で scale する。 */}
        <div style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom, position: "relative" }}>
          <div
            ref={innerRef}
            // 背景クリックで選択解除（ペン中はしない）
            onPointerDown={(e) => { if (!penMode && e.target === e.currentTarget) select(null); }}
            onClick={penMode ? onPenClick : undefined}
            onDoubleClick={penMode ? onPenDblClick : undefined}
            onMouseMove={penMode ? (e) => setHover(toPoint(e)) : undefined}
            onMouseLeave={penMode ? () => setHover(null) : undefined}
            className="absolute left-0 top-0"
            style={{
              width: CANVAS_W,
              height: CANVAS_H,
              transform: `scale(${zoom})`,
              transformOrigin: "0 0",
              cursor: penMode ? "crosshair" : "default",
              backgroundColor: "#f8fafc",
              backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
              backgroundSize: "20px 20px",
              backgroundPosition: "-1px -1px",
            }}
          >
            {elements.map((el) => (
              <StudioElementView
                key={el.id}
                el={el}
                selected={selectedIds.includes(el.id)}
                soleSelected={selectedIds.length === 1 && selectedIds[0] === el.id}
                penMode={penMode}
                nodeMode={nodeMode}
                zoom={zoom}
              />
            ))}

            {nodeTarget && <PathEditor el={nodeTarget} toPoint={toPoint} />}

            {/* 描画中プレビュー（クリックを邪魔しないよう pointer-events: none） */}
            {penMode && points.length > 0 && (
              <svg className="pointer-events-none absolute left-0 top-0" width={CANVAS_W} height={CANVAS_H} style={{ overflow: "visible" }}>
                <polyline points={points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#0ea5e9" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {previewTo && last && (
                  <line x1={last.x} y1={last.y} x2={previewTo.x} y2={previewTo.y} stroke="#0ea5e9" strokeWidth={2} strokeDasharray="4 4" opacity={0.7} />
                )}
                {points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={i === 0 ? 4.5 : 3.5} fill={i === 0 ? "#0ea5e9" : "#ffffff"} stroke="#0ea5e9" strokeWidth={1.5} />
                ))}
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* 空のときの案内 */}
      {elements.length === 0 && !penMode && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-6 py-5 text-center backdrop-blur">
            <p className="text-sm font-semibold text-slate-600">要素がありません</p>
            <p className="mt-1 text-xs text-slate-400">左のツールで追加、またはキー <kbd className="rounded border border-slate-200 bg-slate-50 px-1 text-[10px] font-mono">R</kbd> <kbd className="rounded border border-slate-200 bg-slate-50 px-1 text-[10px] font-mono">O</kbd> <kbd className="rounded border border-slate-200 bg-slate-50 px-1 text-[10px] font-mono">T</kbd> で追加</p>
          </div>
        </div>
      )}

      {/* ズーム操作（右下・キャンバス上に固定表示） */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur">
        <button onClick={() => zoomBy(1 / 1.2)} className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-slate-100" title="縮小"><ZoomOut size={14} /></button>
        <button onClick={resetZoom} className="w-10 rounded px-1 py-0.5 text-center text-[11px] font-semibold tabular-nums text-slate-600 hover:bg-slate-100" title="100%に戻す">{Math.round(zoom * 100)}%</button>
        <button onClick={() => zoomBy(1.2)} className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-slate-100" title="拡大"><ZoomIn size={14} /></button>
        <button onClick={resetZoom} className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-slate-100" title="全体表示にリセット"><Maximize size={13} /></button>
      </div>
    </div>
  );
}
