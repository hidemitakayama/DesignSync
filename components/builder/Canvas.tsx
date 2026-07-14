"use client";
import { useEffect, useRef, useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Minus, Plus } from "lucide-react";
import { useBuilder } from "@/lib/store";
import { useUi, ZOOM_MIN, ZOOM_MAX, warnIfUnsynced } from "@/lib/uiStore";
import NodeView from "./Renderer";
import PathEditOverlay from "./PathEditOverlay";

// ズームのプリセット段階（−/＋で気持ちよく飛ぶ）
const ZOOM_LEVELS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.25, 1.5, 1.75, 2];

// 中央：プレビューキャンバス。ページツリーを実DOMで描画する。
// DndContext 配下で“同じコンテナ内の並び替え”を可能にする（6px以上動かすとドラッグ開始＝クリック選択と両立）。
// 拡大縮小は transform:scale（レイアウト＝コンテナクエリに影響しない＝表示だけ拡縮）で行う。
export default function Canvas() {
  const sections = useBuilder((s) => s.page.children);
  const select = useBuilder((s) => s.select);
  const reorder = useBuilder((s) => s.reorder);
  const editing = useBuilder((s) => s.editing);
  const setEditing = useBuilder((s) => s.setEditing);
  const hasSpPage = useBuilder((s) => s.editing === "sp" || s.altPage != null);
  const device = useUi((s) => s.previewDevice);
  const setDevice = useUi((s) => s.setPreviewDevice);
  const zoom = useUi((s) => s.zoom);
  const setZoom = useUi((s) => s.setZoom);
  const syncState = useUi((s) => s.syncState);
  const openSyncGuard = useUi((s) => s.openSyncGuard);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) reorder(String(active.id), String(over.id));
  };

  const mainRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameH, setFrameH] = useState(0);
  const [availW, setAvailW] = useState(1200); // 編集エリアの実幅（PCはこれいっぱい＝背景を端まで）
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFrameH(el.offsetHeight)); // transform非依存の実寸
    ro.observe(el);
    setFrameH(el.offsetHeight);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvailW(el.clientWidth));
    ro.observe(el);
    setAvailW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // 拡縮の実描画幅。PCは縮小時(zoom<1)に幅を 1/zoom へ広げ、scale後もちょうど編集エリアを埋める
  // ＝背景は常に左右いっぱい。中身は中央1120pxに制約されたまま（レイアウトは不変）。SPは390固定で中央寄せ。
  const scaleW = device === "sp" ? 390 : Math.max(360, zoom < 1 ? availW / zoom : availW);

  const zoomIn = () => setZoom(ZOOM_LEVELS.find((l) => l > zoom + 0.001) ?? ZOOM_MAX);
  const zoomOut = () => { const below = ZOOM_LEVELS.filter((l) => l < zoom - 0.001); setZoom(below.length ? below[below.length - 1] : ZOOM_MIN); };

  const frameCls = device === "sp"
    ? "ds-canvas overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-300"
    : "ds-canvas overflow-hidden bg-white";

  const btn = "grid h-6 w-6 place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40";

  const content = sections.length === 0 ? (
    <div className="grid h-64 place-items-center text-sm text-slate-400">左の「セクション」から追加してください</div>
  ) : (
    <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
      {sections.map((sec) => <NodeView key={sec.id} node={sec} />)}
    </SortableContext>
  );

  return (
    <main ref={mainRef} className="flex-1 overflow-auto bg-slate-100" onClick={() => select(null)} onPointerDownCapture={warnIfUnsynced}>
      <PathEditOverlay />
      {/* ツールバー：左=同期警告 / 中央=デバイス幅切替 / 右=ズーム */}
      <div
        className="sticky top-0 z-10 flex items-center border-b border-slate-200 bg-white/85 px-3 py-1.5 backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-1 items-center">
          {syncState === "disconnected" && (
            <button onClick={openSyncGuard} className="flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-200" title="クリックで復旧メニューを開く">
              ⚠ 同期未接続：この編集は保存されません
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(["pc", "sp"] as const).map((d) => (
            <button
              key={d}
              onClick={() => { setDevice(d); setEditing(d); }}
              className={`rounded-md px-3 py-1 text-xs font-bold transition ${editing === d ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200" : "text-slate-500 hover:bg-slate-50"}`}
              title={d === "pc" ? "PC版を編集（背景全幅／中身は中央）" : hasSpPage ? "SP版を編集（PCとは別データ）" : "SP版を作成して編集（現ページを複製）"}
            >
              {d === "pc" ? "PC" : "SP"}
            </button>
          ))}
          {editing === "sp" && <span className="ml-1 rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">SP版を編集中</span>}
        </div>
        {/* ズーム */}
        <div className="flex flex-1 items-center justify-end gap-0.5">
          <button onClick={zoomOut} disabled={zoom <= ZOOM_MIN} className={btn} title="縮小"><Minus size={14} /></button>
          <button
            onClick={() => setZoom(1)}
            className="min-w-[52px] rounded-md px-2 py-1 text-center text-xs font-bold tabular-nums text-slate-600 hover:bg-slate-100"
            title="100%に戻す"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={zoomIn} disabled={zoom >= ZOOM_MAX} className={btn} title="拡大"><Plus size={14} /></button>
        </div>
      </div>

      {/* キャンバス。PCは背景を編集エリアの端まで（全幅）。
          ズーム100%は width:100% で確実に全幅／拡縮時のみ測定幅×scaleで外枠にスペースを確保しスクロールを正す。 */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className={device === "sp" ? "p-6" : "py-6"}>
          {zoom === 1 ? (
            <div
              ref={frameRef}
              className={frameCls}
              style={device === "sp" ? { width: 390, margin: "0 auto" } : { width: "100%" }}
            >
              {content}
            </div>
          ) : (
            <div className="mx-auto" style={{ width: scaleW * zoom, height: frameH ? frameH * zoom : undefined }}>
              <div ref={frameRef} className={frameCls} style={{ width: scaleW, transform: `scale(${zoom})`, transformOrigin: "top left" }}>
                {content}
              </div>
            </div>
          )}
        </div>
      </DndContext>
    </main>
  );
}
