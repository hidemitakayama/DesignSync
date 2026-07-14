"use client";
import { useRef, type CSSProperties } from "react";
import { useSortable, SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import { useBuilder } from "@/lib/store";
import { useUi } from "@/lib/uiStore";
import { type SceneNode, type AtomNode, isContainer, isAtom, paddingCss, marginCss } from "@/lib/types";
import { sectionPaddingCss } from "@/lib/layout";
import { resolveBackground, resolveBackgroundNoImage, needsBgLayer, bgImageLayerCss, bgOverlayLayerCss } from "@/lib/patterns";
import { maskCss, hasMask } from "@/lib/mask";
import { fontCss } from "@/lib/fonts";
import { svgScalable } from "@/lib/svg";
import { useImageSrc } from "@/components/studio/useImageSrc";

// 自由配置（背景）の要素かどうか
const isFreeAtom = (n: SceneNode): n is AtomNode => isAtom(n) && !!n.free;

// 選択中の要素の枠線・右上に出す削除ボタン（管理者のみ）。
// 親要素は position:relative（自由配置なら absolute）で、その右上角に絶対配置する。
function DeleteBadge({ id }: { id: string }) {
  const admin = useBuilder((s) => s.mode === "admin");
  const remove = useBuilder((s) => s.removeNode);
  if (!admin) return null;
  return (
    <button
      onPointerDown={(e) => e.stopPropagation()} // ドラッグ/選択に取られない
      onClick={(e) => { e.stopPropagation(); remove(id); }}
      title="削除"
      style={{
        position: "absolute",
        top: -10,
        right: -10,
        zIndex: 60,
        display: "grid",
        placeItems: "center",
        width: 20,
        height: 20,
        borderRadius: 9999,
        background: "#ef4444",
        color: "#fff",
        border: "2px solid #fff",
        boxShadow: "0 1px 4px rgba(0,0,0,.25)",
        cursor: "pointer",
      }}
    >
      <X size={12} strokeWidth={3} />
    </button>
  );
}

// 選択中の要素の右下に出すリサイズハンドル（ドラッグで width/height を変更）。
// 親は position:relative（自由配置なら absolute）である前提。
function ResizeHandle({ id, w, h }: { id: string; w: number; h: number }) {
  const update = useBuilder((s) => s.updateNode);
  const st = useRef<{ px: number; py: number; w: number; h: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    e.stopPropagation(); // 移動/選択/並び替えに取られない
    st.current = { px: e.clientX, py: e.clientY, w, h };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s) return;
    const dx = e.clientX - s.px;
    const dy = e.clientY - s.py;
    let width = Math.max(16, Math.round(s.w + dx));
    let height = Math.max(16, Math.round(s.h + dy));
    // 通常は縦横比を維持（動かした量が大きい軸を基準にもう一方を算出）。Shift中は自由変形。
    if (!e.shiftKey && s.w > 0 && s.h > 0) {
      const aspect = s.w / s.h;
      if (Math.abs(dx) >= Math.abs(dy)) height = Math.max(16, Math.round(width / aspect));
      else width = Math.max(16, Math.round(height * aspect));
    }
    update(id, { width, height });
  };
  const onUp = (e: React.PointerEvent) => {
    st.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };
  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      title="ドラッグでサイズ変更（縦横比を維持・Shiftで自由変形）"
      style={{
        position: "absolute",
        right: -6,
        bottom: -6,
        zIndex: 60,
        width: 12,
        height: 12,
        background: "#fff",
        border: "2px solid #2563eb",
        borderRadius: 3,
        cursor: "nwse-resize",
        touchAction: "none",
      }}
    />
  );
}

// flexアイテムの flex 短縮形。
// - basisOverride（親の columns から算出）が来たら、その等幅で固定＝N枚ごとに折り返す
// - なければ item 自身の basis / grow に従う
// flex は shorthand（flex-basis を含む）。sp.basis 等の flexBasis と混在させると React が警告するため、
// 個別プロパティ（flexGrow/flexShrink/flexBasis）で返す。
function flexStyle(n: SceneNode, basisOverride?: string): CSSProperties {
  if (basisOverride) return { flexGrow: 0, flexShrink: 0, flexBasis: basisOverride };
  if (n.basis != null) return { flexGrow: n.grow ? 1 : 0, flexShrink: 1, flexBasis: `${n.basis}px` };
  if (n.grow) return { flexGrow: 1, flexShrink: 1, flexBasis: 0 };
  return {};
}

// 画像/SVG は既定の flex:0 1 auto だと横だけ縮み、preserveAspectRatio="none" と相まって
// 幅（＝拡大率や親幅）に応じて歪む。伸縮の指定が無いときは縮ませない。
function atomFlexStyle(n: SceneNode, basisOverride?: string): CSSProperties {
  const f = flexStyle(n, basisOverride);
  return "flexGrow" in f ? f : { flexGrow: 0, flexShrink: 0, flexBasis: "auto" };
}

// ページツリーを実DOMへ描画する再帰コンポーネント。「プレビュー＝データ」。
// - クリックで選択（親へ伝播させない）。選択中は inset のリングで示す。
// - ドラッグで“同じコンテナ内の並び替え”（@dnd-kit/sortable）。出力は order の変化のみ＝制約維持。
// - align-self で自分だけの揃えを反映（これも純粋なFlexbox）。
// basisOverride: 親コンテナが columns 指定のとき、この要素の等幅(flex-basis)を親から受け取る。
export default function NodeView({ node, basisOverride }: { node: SceneNode; basisOverride?: string }) {
  const select = useBuilder((s) => s.select);
  const selected = useBuilder((s) => s.selectedIds.includes(node.id));
  const admin = useBuilder((s) => s.mode === "admin"); // クライアントは並び替え・リサイズ不可（内容編集のみ）
  const imgSrc = useImageSrc(isAtom(node) && node.atomType === "image" ? node.src : undefined); // drive:// を解決

  // クライアントは並び替え不可（構造は変えられない＝編集のみ）
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id, disabled: !admin });

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    select(node.id, e.shiftKey || e.metaKey || e.ctrlKey); // Shift/⌘で複数選択
  };
  // 最も内側のノードだけがドラッグを開始するよう、pointerdownを親へ伝播させない（管理者のみドラッグ）
  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (admin) listeners?.onPointerDown?.(e);
  };

  // flexアイテムとしての共通スタイル（並び替えの一時transform・alignSelf・外側余白・選択リング）
  const itemStyle: CSSProperties = {
    alignSelf: node.alignSelf && node.alignSelf !== "auto" ? node.alignSelf : undefined,
    margin: marginCss(node), // 外側余白（上下左右・全要素共通。自由配置には効かない）
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : node.opacity,
    cursor: admin ? "grab" : "pointer",
    touchAction: "none",
    ...(selected ? { boxShadow: "inset 0 0 0 2px #3b82f6" } : {}),
  };

  const dndProps = { ref: setNodeRef, onClick, onPointerDown, ...attributes };

  // SP（スマホ）プレビュー時の上書き。未指定はPC値を継承。
  const isSp = useUi((s) => s.previewDevice === "sp");
  const sp = isSp ? node.sp : undefined;
  if (sp?.hidden) return null; // SPで非表示
  if (!isSp && node.hiddenPc) return null; // PCで非表示（＝SPのみ表示）
  // SPの内側余白（指定があれば PC の padding より優先。セクションの全幅calcも上書き）
  const spPadding = (): string | undefined => {
    if (!sp || (sp.padding == null && sp.paddingX == null && sp.paddingY == null)) return undefined;
    if (sp.padding != null) return `${sp.padding}px`;
    const side = (u?: number, s?: number) => s ?? u ?? 0;
    const T = sp.paddingY ?? side(node.padding, node.paddingTop), B = sp.paddingY ?? side(node.padding, node.paddingBottom);
    const L = sp.paddingX ?? side(node.padding, node.paddingLeft), R = sp.paddingX ?? side(node.padding, node.paddingRight);
    return `${T}px ${R}px ${B}px ${L}px`;
  };

  if (isContainer(node)) {
    // columns 指定（row方向）：レスポンシブ・グリッドで等幅N列にし、幅が狭ければ自動で折り返す。
    const useColumns = node.direction === "row" && !!node.columns && node.columns > 0;
    const cols = useColumns ? Math.min(4, Math.max(2, node.columns!)) : 0;
    const wrapped = node.wrap && !useColumns;
    const bgLayer = needsBgLayer(node.bgImage); // 反転/拡大がある背景画像は変形レイヤーで描画

    // 共通の見た目（枠線・影・余白など）。SP時は sp 値で上書き。
    const box: CSSProperties = {
      gap: sp?.gap ?? node.gap,
      // 最上位セクションは背景を全幅にしつつ中身を中央へ制約（フルブリード）。SP余白があれば優先。
      padding: spPadding() ?? (node.type === "section" ? sectionPaddingCss(node) : paddingCss(node)),
      background: bgLayer ? resolveBackgroundNoImage(node) : resolveBackground(node),
      borderRadius: node.radius,
      border: node.borderWidth ? `${node.borderWidth}px solid ${node.borderColor ?? "#e5e7eb"}` : undefined,
      boxShadow: node.boxShadow,
      width: sp?.width ?? node.width,
      minHeight: node.fullHeight ? "100vh" : (sp?.minHeight ?? node.minHeight),
      ...flexStyle(node, basisOverride),
      ...itemStyle,
      ...(sp?.basis != null ? { flexBasis: sp.basis === "auto" ? "auto" : sp.basis } : {}),
      ...(sp?.alignSelf ? { alignSelf: sp.alignSelf } : {}),
    };
    // columns はグリッド（display は .ds-grid クラス側で指定）。それ以外は従来どおり Flex。
    const style: CSSProperties = useColumns
      ? box
      : {
          display: "flex",
          flexDirection: sp?.direction ?? node.direction,
          flexWrap: wrapped ? "wrap" : undefined,
          justifyContent: sp?.justify ?? node.justify,
          alignItems: sp?.alignItems ?? node.align,
          ...box,
        };
    const columnsClass = useColumns ? `ds-grid ds-cols-${cols}` : undefined;
    const childBasis = undefined; // グリッドが等幅を担うので子の basis 上書きは不要
    // 子を「フロー（Flex制約内）」と「自由配置（背景・absolute）」に分ける
    const flowChildren = node.children.filter((c) => !isFreeAtom(c));
    const freeChildren = node.children.filter(isFreeAtom);
    // 自由配置の子があるコンテナは、absolute の基準＆背景レイヤーの重なり文脈にする
    if (freeChildren.length > 0) {
      style.position = "relative";
      style.isolation = "isolate";
    }
    if (bgLayer) { style.position = "relative"; style.isolation = "isolate"; style.overflow = "hidden"; } // 変形画像を背後に敷き、はみ出しを切る
    if (selected) style.position = "relative"; // 削除ボタンの基準
    const strategy = node.direction === "row" ? horizontalListSortingStrategy : verticalListSortingStrategy;
    return (
      <div {...dndProps} style={style} className={columnsClass}>
        {/* 変形（反転・拡大縮小）できる背景画像レイヤー＋暗さオーバーレイ（本文の後ろ z-index:-1） */}
        {bgLayer && node.bgImage && <div aria-hidden style={bgImageLayerCss(node.bgImage) as CSSProperties} />}
        {bgLayer && node.bgImage?.overlay ? <div aria-hidden style={bgOverlayLayerCss(node.bgImage.overlay) as CSSProperties} /> : null}
        {/* 背景の自由配置SVG（フローの外・本文の後ろ） */}
        {freeChildren.map((f) => (
          <FreeNodeView key={f.id} node={f} />
        ))}
        <SortableContext items={flowChildren.map((c) => c.id)} strategy={strategy}>
          {flowChildren.flatMap((c) => {
            const el = <NodeView key={c.id} node={c} basisOverride={childBasis} />;
            // 「この要素の後で折り返す」：flex-basis:100% の見えない要素で次行へ送る（親がwrapのとき）
            return c.breakAfter && wrapped
              ? [el, <div key={`${c.id}-br`} aria-hidden style={{ flexBasis: "100%", width: 0, height: 0 }} />]
              : [el];
          })}
        </SortableContext>
        {selected && <DeleteBadge id={node.id} />}
      </div>
    );
  }

  // --- Atom ---
  if (node.atomType === "text") {
    const st = node.style ?? {};
    const style: CSSProperties = {
      color: st.color,
      fontSize: sp?.fontSize ?? st.fontSize,
      fontWeight: st.fontWeight,
      fontFamily: fontCss(st.fontFamily),
      textAlign: sp?.align ?? st.align,
      padding: spPadding() ?? paddingCss(node), // テキストの内側余白（上下左右・管理者が調整可）
      border: st.borderWidth ? `${st.borderWidth}px solid ${st.borderColor ?? "#0f172a"}` : undefined,
      borderRadius: st.borderRadius || undefined,
      ...flexStyle(node, basisOverride),
      lineHeight: sp?.lineHeight ?? st.lineHeight,
      letterSpacing: sp?.letterSpacing ?? st.letterSpacing,
      whiteSpace: st.preserveBreaks === false ? "normal" : "pre-wrap", // 改行を反映するか
      ...itemStyle,
      ...(sp?.minHeight != null ? { minHeight: sp.minHeight } : {}),
      ...(sp?.basis != null ? { flexBasis: sp.basis === "auto" ? "auto" : sp.basis } : {}),
      ...(sp?.alignSelf ? { alignSelf: sp.alignSelf } : {}),
      ...(selected ? { position: "relative" } : {}),
    };
    return (
      <div {...dndProps} style={style}>
        {node.runs && node.runs.length
          ? node.runs.map((r, i) => <span key={i} style={r.color ? { color: r.color } : undefined}>{r.text}</span>)
          : node.text ? node.text : <span style={{ opacity: 0.4 }}>テキストを入力</span>}
        {selected && <DeleteBadge id={node.id} />}
      </div>
    );
  }

  if (node.atomType === "image") {
    // img は子要素を持てないので、削除ボタンを載せるためラッパーで包む。
    return (
      <div {...dndProps} style={{ position: "relative", width: node.width, height: node.height, ...atomFlexStyle(node, basisOverride), ...itemStyle }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc} alt={node.alt ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...maskCss({ shape: node.maskShape, svg: node.maskSvg }), boxShadow: hasMask({ shape: node.maskShape, svg: node.maskSvg }) ? undefined : node.boxShadow, filter: hasMask({ shape: node.maskShape, svg: node.maskSvg }) && node.boxShadow ? `drop-shadow(${node.boxShadow})` : undefined }} />
        {selected && <DeleteBadge id={node.id} />}
        {selected && admin && <ResizeHandle id={node.id} w={node.width ?? 0} h={node.height ?? 0} />}
      </div>
    );
  }

  // svg（生コードを埋め込み、枠に合わせて伸縮）。dangerouslySetInnerHTML は子を持てないので
  // 中身は内側のdivに入れ、外側のラッパーに削除ボタンを載せる。
  return (
    <div {...dndProps} style={{ position: "relative", width: node.width, height: node.height, ...atomFlexStyle(node, basisOverride), ...itemStyle }}>
      {/* SVGはアイコン形状に沿う drop-shadow で影を出す */}
      <div className="[&>svg]:h-full [&>svg]:w-full" style={{ width: "100%", height: "100%", filter: node.boxShadow ? `drop-shadow(${node.boxShadow})` : undefined }} dangerouslySetInnerHTML={{ __html: svgScalable(node.svg ?? "") }} />
      {selected && <DeleteBadge id={node.id} />}
      {selected && admin && <ResizeHandle id={node.id} w={node.width ?? 0} h={node.height ?? 0} />}
    </div>
  );
}

// 自由配置（背景）のSVG。Flexフローから外れ、親コンテナ基準で x,y に絶対配置。
// 通常は本文の後ろ（z-index:-1）＝背景。選択中だけ前面(z-index:50)へ出して編集しやすくする。
// dnd-kit は使わず、独自のポインタドラッグで x,y を更新する。
function FreeNodeView({ node }: { node: AtomNode }) {
  const select = useBuilder((s) => s.select);
  const update = useBuilder((s) => s.updateNode);
  const selected = useBuilder((s) => s.selectedIds.includes(node.id));
  const admin = useBuilder((s) => s.mode === "admin"); // クライアントは移動不可（内容編集のみ）
  const imgSrc = useImageSrc(node.atomType === "image" ? node.src : undefined); // drive:// を解決
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  const onDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    select(node.id, additive);
    if (!admin || additive) return; // クライアント/複数選択時は位置を動かさない
    drag.current = { px: e.clientX, py: e.clientY, x: node.x ?? 0, y: node.y ?? 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    update(node.id, { x: Math.round(d.x + (e.clientX - d.px)), y: Math.round(d.y + (e.clientY - d.py)) });
  };
  const onUp = (e: React.PointerEvent) => {
    drag.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  // 中身：テキスト / 画像 / SVG。イベントは外側の枠で扱うので pointer-events:none。
  const st = node.style ?? {};
  const inner =
    node.atomType === "text" ? (
      <div style={{ color: st.color, fontSize: st.fontSize, fontWeight: st.fontWeight, fontFamily: fontCss(st.fontFamily), textAlign: st.align, lineHeight: st.lineHeight, letterSpacing: st.letterSpacing, whiteSpace: st.preserveBreaks === false ? "normal" : "pre-wrap", pointerEvents: "none" }}>
        {node.runs && node.runs.length ? node.runs.map((r, i) => <span key={i} style={r.color ? { color: r.color } : undefined}>{r.text}</span>) : node.text}
      </div>
    ) : node.atomType === "image" ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imgSrc} alt={node.alt ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
    ) : (
      <div className="[&>svg]:h-full [&>svg]:w-full" style={{ width: "100%", height: "100%", pointerEvents: "none" }} dangerouslySetInnerHTML={{ __html: svgScalable(node.svg ?? "") }} />
    );

  return (
    <div
      data-node-id={node.id}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      style={{
        position: "absolute",
        left: node.x ?? 0,
        top: node.y ?? 0,
        width: node.width,
        height: node.height,
        // 選択中は前面(50)。通常は front なら本文の前(10)、既定は背景(-1)。
        zIndex: selected ? 50 : node.front ? 10 : -1,
        cursor: admin ? "move" : "pointer",
        touchAction: "none",
        opacity: node.opacity,
        boxShadow: selected ? "inset 0 0 0 2px #3b82f6" : undefined,
      }}
    >
      {inner}
      {selected && <DeleteBadge id={node.id} />}
      {selected && admin && <ResizeHandle id={node.id} w={node.width ?? 0} h={node.height ?? 0} />}
    </div>
  );
}
