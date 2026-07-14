"use client";
import { useRef, useState } from "react";
import { useStudio } from "@/lib/studioStore";
import { svgScalable, applyPathGradient } from "@/lib/svg";
import { maskCss, hasMask } from "@/lib/mask";
import type { StudioElement } from "@/lib/types";
import { useImageSrc } from "./useImageSrc";

// キャンバス上の1要素。標準DOMのみで「ドラッグ移動」と「端のハンドルでリサイズ」を行う。
// react-rnd を使わず Pointer Events で自作（座標は等倍のキャンバス基準＝スクロールに依らず delta で算出）。

const MIN = 12; // 最小サイズ(px)

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
// 8方向ハンドルの配置（%）とカーソル。
const HANDLES: { dir: Handle; x: number; y: number; cursor: string }[] = [
  { dir: "nw", x: 0, y: 0, cursor: "nwse-resize" },
  { dir: "n", x: 50, y: 0, cursor: "ns-resize" },
  { dir: "ne", x: 100, y: 0, cursor: "nesw-resize" },
  { dir: "e", x: 100, y: 50, cursor: "ew-resize" },
  { dir: "se", x: 100, y: 100, cursor: "nwse-resize" },
  { dir: "s", x: 50, y: 100, cursor: "ns-resize" },
  { dir: "sw", x: 0, y: 100, cursor: "nesw-resize" },
  { dir: "w", x: 0, y: 50, cursor: "ew-resize" },
];

// ドラッグ/リサイズ中の開始状態。move は選択中すべての開始位置を持ち、まとめて動かす。
type Gesture =
  | { kind: "move"; startX: number; startY: number; items: { id: string; ox: number; oy: number }[] }
  | { kind: "resize"; dir: Handle; startX: number; startY: number; px: number; py: number; w: number; h: number };

export default function StudioElementView({ el, selected, soleSelected = false, penMode = false, nodeMode = false, zoom = 1 }: { el: StudioElement; selected: boolean; soleSelected?: boolean; penMode?: boolean; nodeMode?: boolean; zoom?: number }) {
  const select = useStudio((s) => s.select);
  const update = useStudio((s) => s.update);
  const moveElements = useStudio((s) => s.moveElements);
  const rootRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [editing, setEditing] = useState(false); // テキストのインライン編集中

  // --- ドラッグ開始（本体） ---
  const onBodyPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || editing) return;
    e.stopPropagation();
    if (nodeMode) { select(el.id); return; } // ノード編集中は選択のみ（箱ごと動かさない）
    // Shift/⌘ は加算選択（ドラッグしない）
    if (e.shiftKey || e.metaKey || e.ctrlKey) { select(el.id, true); return; }
    // 未選択の要素を掴んだら、その要素（グループ）を選択してから移動
    const st = useStudio.getState();
    let ids = st.selectedIds;
    if (!ids.includes(el.id)) { select(el.id); ids = useStudio.getState().selectedIds; }
    const els = useStudio.getState().elements;
    const items = ids.map((id) => { const e2 = els.find((x) => x.id === id)!; return { id, ox: e2.position.x, oy: e2.position.y }; });
    rootRef.current?.setPointerCapture(e.pointerId);
    gesture.current = { kind: "move", startX: e.clientX, startY: e.clientY, items };
  };

  // --- リサイズ開始（ハンドル） ---
  const onHandlePointerDown = (e: React.PointerEvent, dir: Handle) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    select(el.id);
    rootRef.current?.setPointerCapture(e.pointerId);
    gesture.current = { kind: "resize", dir, startX: e.clientX, startY: e.clientY, px: el.position.x, py: el.position.y, w: el.size.width, h: el.size.height };
  };

  // 移動・リサイズ共通の追従処理（capture により本体で受ける）。
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    // 画面上の移動量をズーム倍率で割ってキャンバス座標の移動量にする
    const dx = (e.clientX - g.startX) / zoom;
    const dy = (e.clientY - g.startY) / zoom;

    if (g.kind === "move") {
      moveElements(g.items.map((it) => ({ id: it.id, x: Math.round(it.ox + dx), y: Math.round(it.oy + dy) })));
      return;
    }

    // resize: 方向に応じて幅・高さ・位置を更新（西/北側は位置も動かす）。
    const d = g.dir;
    let w = g.w;
    let h = g.h;
    if (d.includes("e")) w = g.w + dx;
    if (d.includes("s")) h = g.h + dy;
    if (d.includes("w")) w = g.w - dx;
    if (d.includes("n")) h = g.h - dy;
    w = Math.max(MIN, Math.round(w));
    h = Math.max(MIN, Math.round(h));
    const x = d.includes("w") ? g.px + (g.w - w) : g.px;
    const y = d.includes("n") ? g.py + (g.h - h) : g.py;
    update(el.id, { position: { x, y }, size: { width: w, height: h } });
  };

  const endGesture = (e: React.PointerEvent) => {
    if (gesture.current) {
      gesture.current = null;
      rootRef.current?.releasePointerCapture(e.pointerId);
    }
  };

  const s = el.style;
  // svg（パス）は箱ではなくパスで描くので、箱の背景は出さない（グラデはパス側に適用）。
  const background = el.type === "svg" ? undefined : (s.backgroundGradient ?? s.backgroundColor);
  const radius = el.type === "circle" ? "50%" : `${s.borderRadius}px`;
  // 画像を図形/SVGでマスクしている場合は、箱の背景・矩形の影・角丸を消す（形状は画像側のマスクで表現）。
  const imgMasked = el.type === "image" && hasMask({ shape: el.maskShape, svg: el.maskSvg });

  return (
    <div
      ref={rootRef}
      onPointerDown={onBodyPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onDoubleClick={el.type === "text" && !nodeMode ? () => setEditing(true) : undefined}
      style={{
        position: "absolute",
        left: el.position.x,
        top: el.position.y,
        width: el.size.width,
        height: el.size.height,
        opacity: s.opacity,
        zIndex: s.zIndex,
        background: imgMasked ? undefined : background, // 塗り（グラデ優先）。text/svg は既定 transparent なので無害
        borderRadius: imgMasked ? 0 : radius,
        // svg（パス）／マスク画像は箱に影を付けない（四角い影になるため）。影は形状に沿わせる（下の filter/drop-shadow）。
        boxShadow: el.type === "svg" || imgMasked ? undefined : s.boxShadow,
        cursor: editing ? "text" : nodeMode ? "pointer" : "move",
        touchAction: "none",
        userSelect: "none",
        pointerEvents: penMode ? "none" : undefined, // ペン描画中は要素をクリック透過に
      }}
      className={selected ? "outline-2 outline-sky-500 outline-offset-1" : "outline-1 outline-transparent hover:outline-sky-300"}
    >
      <ElementContent el={el} editing={editing} onCommit={(text) => { update(el.id, { content: text }); setEditing(false); }} onCancel={() => setEditing(false)} />

      {/* 単独選択のときだけ 8方向リサイズハンドルを表示（複数選択/ノード編集中は隠す） */}
      {soleSelected && !editing && !penMode && !nodeMode && (
        <>
          {HANDLES.map((h) => (
            <span
              key={h.dir}
              onPointerDown={(e) => onHandlePointerDown(e, h.dir)}
              onPointerMove={onPointerMove}
              onPointerUp={endGesture}
              onPointerCancel={endGesture}
              style={{ left: `${h.x}%`, top: `${h.y}%`, cursor: h.cursor, touchAction: "none" }}
              className="absolute z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-sky-500 bg-white shadow-sm"
            />
          ))}
        </>
      )}
    </div>
  );
}

// 種類ごとの中身。図形は空、テキストは文字（編集時はtextarea）、画像はimg、SVGは生コード。
function ElementContent({ el, editing, onCommit, onCancel }: { el: StudioElement; editing: boolean; onCommit: (text: string) => void; onCancel: () => void }) {
  const s = el.style;
  const imgSrc = useImageSrc(el.type === "image" ? el.content : undefined); // drive:// は自動解決

  if (el.type === "text") {
    if (editing) {
      return (
        <textarea
          autoFocus
          defaultValue={el.content}
          placeholder="テキストを入力"
          onPointerDown={(e) => e.stopPropagation()}
          onBlur={(e) => onCommit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onCommit((e.target as HTMLTextAreaElement).value);
          }}
          style={{ color: s.color, fontSize: s.fontSize, fontWeight: s.fontWeight, textAlign: s.textAlign }}
          className="h-full w-full resize-none bg-white/70 p-1 outline-none"
        />
      );
    }
    return (
      <div
        style={{ color: s.color, fontSize: s.fontSize, fontWeight: s.fontWeight, textAlign: s.textAlign, whiteSpace: "pre-wrap", overflow: "hidden", opacity: el.content ? undefined : 0.4 }}
        className="pointer-events-none h-full w-full p-1 leading-tight"
      >
        {el.content || "テキストを入力"}
      </div>
    );
  }

  if (el.type === "image") {
    const masked = hasMask({ shape: el.maskShape, svg: el.maskSvg });
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imgSrc} alt="" draggable={false} className="pointer-events-none h-full w-full select-none object-cover" style={{ borderRadius: masked ? 0 : `${s.borderRadius}px`, ...maskCss({ shape: el.maskShape, svg: el.maskSvg }), filter: masked && s.boxShadow ? `drop-shadow(${s.boxShadow})` : undefined }} />;
  }

  if (el.type === "svg") {
    // グラデーション塗り/線があればパスに適用（無ければ currentColor のまま）
    const html = applyPathGradient(svgScalable(el.content), s.backgroundGradient, el.id);
    // 影はパスの形に沿わせる（drop-shadow は描画ピクセルの形に影を落とす）
    const filter = s.boxShadow ? `drop-shadow(${s.boxShadow})` : undefined;
    return <div className="pointer-events-none h-full w-full" style={{ color: s.color, filter }} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  // rectangle / circle は塗りのみ（背景は親div側で描画）
  return null;
}
