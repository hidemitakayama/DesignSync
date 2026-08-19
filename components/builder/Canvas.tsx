"use client";
import { useEffect, useRef, useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Minus, Plus, RefreshCw } from "lucide-react";
import { useBuilder } from "@/lib/store";
import { useUi, ZOOM_MIN, ZOOM_MAX, warnIfUnsynced } from "@/lib/uiStore";
import NodeView from "./Renderer";
import PathEditOverlay from "./PathEditOverlay";
import { RAIL_W } from "./PanelRail";

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
  const admin = useBuilder((s) => s.mode === "admin"); // 左パネル（レール）の有無＝基準幅の計算に使う
  const rebuildSpFromPc = useBuilder((s) => s.rebuildSpFromPc);
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
  const [availW, setAvailW] = useState(1200); // 編集エリアの実幅（サイドパネルを開くと狭くなる）
  const [rowW, setRowW] = useState(0); // ビルダー1行の全幅（左パネル＋編集エリア＋右パネル）
  const [sbw, setSbw] = useState(0); // 縦スクロールバーの占有幅（macOSの重ね表示なら0）
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
    const row = el?.parentElement;
    if (!el || !row) return;
    const measure = () => { setAvailW(el.clientWidth); setRowW(row.clientWidth); setSbw(el.offsetWidth - el.clientWidth); };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(row); // 行の幅（＝ウィンドウ幅）が変わったときも基準幅を取り直す
    measure();
    return () => ro.disconnect();
  }, []);

  // レイアウトの基準幅＝「左右パネルを畳んだ状態」の編集エリア幅（＝行の全幅からレール分を引く）。
  // 畳んだときに残るレールは、右＝常設／左＝管理者のみ（クライアントにはレイヤーを出さない）。
  // スクロールバー分も引いておく（両方畳んだときに fit=1 ちょうどになり、開閉で揺れない）。
  const sideRails = RAIL_W * (admin ? 2 : 1);
  const baseW = Math.max(360, rowW - sideRails - sbw);
  // パネルを開いた分の縮小率。レイアウト幅は基準幅のまま固定し、表示だけを等倍で縮める
  // ＝サイドバーを開閉しても「見た目」は変わらず、全体が小さく／大きくなるだけ。
  const fit = device === "sp" ? 1 : Math.min(1, availW / baseW);
  const scale = zoom * fit; // 実際に transform で掛ける倍率（ツールバーの表示は zoom のまま）
  const exact = Math.abs(scale - 1) < 0.002; // 実質100%（測定の丸め誤差込み）

  // 拡縮の実描画幅。PCは縮小時(zoom<1)に幅を 1/zoom へ広げ、scale後もちょうど編集エリアを埋める
  // ＝背景は常に左右いっぱい。中身は中央1120pxに制約されたまま（レイアウトは不変）。SPは390固定で中央寄せ。
  const scaleW = device === "sp" ? 390 : Math.max(360, zoom < 1 ? baseW / zoom : baseW);

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
              title={d === "pc" ? "PC版を編集（背景全幅／中身は中央）" : hasSpPage ? "SP版を編集（PCとは別データ）" : "SP版を作成して編集（PC版から自動変換：横並び→縦積み・余白と文字を縮小）"}
            >
              {d === "pc" ? "PC" : "SP"}
            </button>
          ))}
          {editing === "sp" && <span className="ml-1 rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">SP版を編集中</span>}
          {/* PC版を直したあとにSP版を追従させる用。今のSP版は破棄されるので確認を挟む。 */}
          {editing === "sp" && admin && (
            <button
              onClick={() => {
                const ok = window.confirm(
                  "いまのPC版から、SP版を作り直します。\n今のSP版の編集内容は破棄されます（直前の状態はテンプレート一覧の「（自動保存）」から戻せます）。\n\nよろしいですか？",
                );
                if (ok) rebuildSpFromPc();
              }}
              title="PC版を元にSP版を自動生成しなおす（横並び→縦積み・余白と文字を縮小）"
              className="ml-1 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <RefreshCw size={12} /> PC版から作り直す
            </button>
          )}
        </div>
        {/* ズーム */}
        <div className="flex flex-1 items-center justify-end gap-0.5">
          <button onClick={zoomOut} disabled={zoom <= ZOOM_MIN} className={btn} title="縮小"><Minus size={14} /></button>
          <button
            onClick={() => setZoom(1)}
            className="min-w-[52px] rounded-md px-2 py-1 text-center text-xs font-bold tabular-nums text-slate-600 hover:bg-slate-100"
            title={fit < 0.998 ? `100%に戻す（パネルを開いている分、実際の表示は${Math.round(scale * 100)}%に縮小中）` : "100%に戻す"}
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
          {exact ? (
            <div
              ref={frameRef}
              className={frameCls}
              style={device === "sp" ? { width: 390, margin: "0 auto" } : { width: "100%" }}
            >
              {content}
            </div>
          ) : (
            // 外枠の幅は切り捨て。1pxでも編集エリアを超えると横スクロールバーが出て
            // 幅が縮み→再計算…と揺れるため、はみ出さない側へ丸める。
            <div className="mx-auto" style={{ width: Math.floor(scaleW * scale), height: frameH ? Math.ceil(frameH * scale) : undefined }}>
              <div ref={frameRef} className={frameCls} style={{ width: scaleW, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                {content}
              </div>
            </div>
          )}
        </div>
      </DndContext>
    </main>
  );
}
