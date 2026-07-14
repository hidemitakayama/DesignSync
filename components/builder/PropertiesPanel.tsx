"use client";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useBuilder, findNode, type NodePatch } from "@/lib/store";
import { uploadToPublic, currentSiteSlug, ancestorSection, sectionSlug } from "@/lib/publicUpload";
import { type ContainerNode, type AtomNode, type SceneNode, type ItemProps, type FlexDirection, type JustifyContent, type AlignItems, type AlignSelf, type BgPatternKind, isContainer, isAtom } from "@/lib/types";
import { baseColorOf, patternSize } from "@/lib/patterns";
import { FONTS } from "@/lib/fonts";
import { warnIfUnsynced, useUi } from "@/lib/uiStore";
import type { SpOverride } from "@/lib/types";
import { recolorSvg } from "@/lib/svg";
import { svgToPoints } from "@/lib/pathedit";
import { MaskControls } from "@/components/MaskControls";
import RichTextEditor from "./RichTextEditor";

// SVG図形のパス変形（頂点編集）操作。convert→編集モードのオン/オフを提供。
function SvgPathControls({ node }: { node: AtomNode }) {
  const convertToPath = useBuilder((s) => s.convertNodeToPath);
  const pathEditId = useUi((s) => s.pathEditId);
  const setPathEditId = useUi((s) => s.setPathEditId);
  const editing = pathEditId === node.id;
  if (node.points && node.points.length) {
    return (
      <>
        <p className="pt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">パス変形</p>
        <button onClick={() => setPathEditId(editing ? null : node.id)} className={`w-full rounded-md border py-1.5 text-xs font-semibold ${editing ? "border-sky-500 bg-sky-500 text-white" : "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-400"}`}>
          {editing ? "頂点編集を終了" : `頂点をドラッグして変形（${node.points.length}点）`}
        </button>
        <p className="text-[10px] leading-relaxed text-slate-400">キャンバス上の丸をドラッグで形を変更。ダブルクリックで頂点を追加/削除できます。</p>
      </>
    );
  }
  const convertible = !!svgToPoints(node.svg ?? "");
  return (
    <>
      <p className="pt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">パス変形</p>
      <button disabled={!convertible} onClick={() => { convertToPath(node.id); setPathEditId(node.id); }} className="w-full rounded-md border border-sky-200 bg-sky-50 py-1.5 text-xs font-semibold text-sky-700 hover:border-sky-400 disabled:opacity-50">
        パスに変換して編集
      </button>
      <p className="text-[10px] leading-relaxed text-slate-400">{convertible ? "多角形・直線・長方形・円を、頂点編集できるパスに変換します。" : "この図形は頂点編集に変換できません（曲線・角丸・ハート等）。"}</p>
    </>
  );
}

// 画像を public/<サイト>/<セクション>/ へアップロードするボタン。保存先を事前表示する。
// apply で「画像URLに入れる／背景画像に入れる」など反映先を切り替える。
function ImageUpload({ nodeId, apply, label = "画像をアップロード" }: { nodeId: string; apply: (url: string) => void; label?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const admin = useBuilder((s) => s.mode === "admin"); // クライアントはサーバー(public/)へ保存しない
  useBuilder((s) => s.selectedId); // 選択/構成の変化で保存先プレビューを更新
  const sec = ancestorSection(nodeId);
  const dest = `public/${currentSiteSlug()}/${sec ? sectionSlug(sec.name, sec.index) : "misc"}/`;
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      // クライアント中は一切書き出さないので、ブラウザ内だけで完結する data URL にする。
      const url = admin ? await uploadToPublic(f, nodeId) : await fileToDataUrl(f);
      apply(url);
    }
    catch (err) { window.alert(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  };
  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 py-1.5 text-xs font-semibold text-sky-700 hover:border-sky-400 disabled:opacity-50"
      >
        <Upload size={13} /> {busy ? "アップロード中…" : label}
      </button>
      <p className="text-[10px] leading-relaxed text-slate-400">
        {admin
          ? <>保存先：<span className="font-mono text-slate-500">{dest}</span> に自動整理され、URLが入ります。</>
          : <>この画面ではブラウザ内でのみ表示され、ファイルには保存されません。</>}
      </p>
    </>
  );
}

// クライアント用：ファイルを data URL に変換（サーバーへは送らない）。
function fileToDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("画像を読み込めませんでした"));
    r.readAsDataURL(f);
  });
}

// 揃えの選択肢を「操作する軸が横か縦か」で分かりやすい語（左/右 or 上/下）にして返す。
function axisOptions<T extends string>(horizontal: boolean, extra: { v: T; label: string }[]): { v: T; label: string }[] {
  const base = (horizontal
    ? [{ v: "flex-start", label: "左揃え" }, { v: "center", label: "中央揃え" }, { v: "flex-end", label: "右揃え" }]
    : [{ v: "flex-start", label: "上揃え" }, { v: "center", label: "中央揃え" }, { v: "flex-end", label: "下揃え" }]) as { v: T; label: string }[];
  return [...base, ...extra];
}
// id の“親コンテナ”の並べる向き（トップレベル＝ページはセクションを縦に積むので column 扱い）
function parentDirectionOf(nodes: SceneNode[], id: string, parentDir: FlexDirection = "column"): FlexDirection | null {
  for (const n of nodes) {
    if (n.id === id) return parentDir;
    if (isContainer(n)) { const r = parentDirectionOf(n.children, id, n.direction); if (r) return r; }
  }
  return null;
}

// 右：設定パネル。選択した要素の内容・レイアウトを編集する。
// 2面性：管理者=レイアウトやスタイルまで全部 / クライアント=中身（テキスト・画像）だけ。
// 表記は分かりやすい日本語を主にし、CSSの用語は薄いヒントとして添える。

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-slate-600">{label}</span>
        {hint && <span className="min-w-0 truncate text-right text-[10px] font-normal text-slate-300" title={hint}>{hint}</span>}
      </span>
      {children}
    </label>
  );
}

// 設定のまとまりを示す小見出し
function GroupTitle({ children }: { children: React.ReactNode }) {
  return <p className="pt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{children}</p>;
}

const inputCls = "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm";

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />;
}
function NumberInput({ value, onChange, step }: { value: number | undefined; onChange: (v: number) => void; step?: number }) {
  return <input type="number" step={step} value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} className={inputCls} />;
}
function ColorInput({ value, onChange, onClear }: { value?: string; onChange: (v: string) => void; onClear?: () => void }) {
  const isHex = !!value && /^#[0-9a-fA-F]{3,8}$/.test(value);
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={isHex ? value! : "#ffffff"} onChange={(e) => onChange(e.target.value)} className="h-8 w-9 shrink-0 cursor-pointer rounded border border-slate-300" title="スウォッチで選ぶ" />
      {/* カラーコードを直接入力・貼り付けできる欄 */}
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000（貼り付け可）"
        spellCheck={false}
        className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 font-mono text-xs text-slate-700 outline-none focus:border-sky-400"
      />
      {onClear && (
        <button onClick={onClear} className="shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 hover:border-slate-900" title="色をなしに">なし</button>
      )}
    </div>
  );
}
// 背景パターンの選択肢（表示ラベル）。実際のCSS生成は lib/patterns.ts に集約。
const PATTERN_OPTIONS: { k: BgPatternKind | "none"; label: string }[] = [
  { k: "none", label: "なし" },
  { k: "grid", label: "方眼" },
  { k: "ruled", label: "罫線" },
  { k: "dot", label: "ドット" },
];
const DEFAULT_PATTERN_COLOR = "#dbe3f0";

// チェックボックス行。Field(=<label>) の中に別の<label>を入れると入れ子になり、
// クリックが二重に伝わってトグルが相殺される（＝反応しないように見える）。
// そのため見出しは<span>にして、ラベルは1つだけにする。
function CheckRow({ label, caption, hint, checked, onChange }: { label: string; caption: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div>
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-slate-600">{label}</span>
        {hint && <span className="min-w-0 truncate text-right text-[10px] font-normal text-slate-300" title={hint}>{hint}</span>}
      </span>
      <label className="flex items-center gap-2 text-sm leading-snug text-slate-600">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="shrink-0" /> <span className="min-w-0">{caption}</span>
      </label>
    </div>
  );
}

function Select<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={inputCls}>
      {options.map((o) => (
        <option key={o.v} value={o.v}>{o.label}</option>
      ))}
    </select>
  );
}

// 上下左右の余白エディタ。各辺= 個別指定 ?? 一括値。空欄にすると個別指定を消して一括値に戻る。
const SIDES = [
  { key: "Top", label: "上" },
  { key: "Right", label: "右" },
  { key: "Bottom", label: "下" },
  { key: "Left", label: "左" },
] as const;

function SpacingEditor({ label, hint, kind, node, set }: { label: string; hint: string; kind: "padding" | "margin"; node: SceneNode; set: (p: NodePatch) => void }) {
  const ip = node as ItemProps;
  const uniform = ip[kind] as number | undefined;
  const disp = (s: (typeof SIDES)[number]["key"]) => (ip[`${kind}${s}` as keyof ItemProps] as number | undefined) ?? uniform ?? 0;
  const setSide = (s: string, raw: string) => set({ [`${kind}${s}`]: raw === "" ? undefined : Number(raw) } as NodePatch);
  return (
    <div>
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-600">{label}</span>
        <span className="shrink-0 text-[10px] font-normal text-slate-300">{hint}</span>
      </span>
      <div className="grid grid-cols-4 gap-1">
        {SIDES.map((s) => (
          <label key={s.key} className="block">
            <span className="mb-0.5 block text-center text-[9px] text-slate-400">{s.label}</span>
            <input type="number" value={disp(s.key)} onChange={(e) => setSide(s.key, e.target.value)} className="w-full rounded border border-slate-300 px-1 py-1 text-center text-xs tabular-nums" />
          </label>
        ))}
      </div>
    </div>
  );
}

export default function PropertiesPanel() {
  const node = useBuilder((s) => findNode(s.page, s.selectedId));
  const admin = useBuilder((s) => s.mode === "admin");
  const update = useBuilder((s) => s.updateNode);
  const pageChildren = useBuilder((s) => s.page.children);
  const selectedCount = useBuilder((s) => s.selectedIds.length);
  const removeSelected = useBuilder((s) => s.removeSelected);
  const isSp = useUi((s) => s.previewDevice === "sp"); // SPプレビュー中はSP設定を編集

  if (!node) {
    return (
      <aside className="w-72 shrink-0 border-l border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-400">要素を選ぶと、ここで編集できます。</p>
      </aside>
    );
  }

  const set = (patch: Parameters<typeof update>[1]) => update(node.id, patch);
  // SP（スマホ）プレビュー中は SP専用の上書きを編集する
  const sp = node.sp ?? {};
  const setSp = (patch: Partial<SpOverride>) => {
    const next: SpOverride = { ...sp, ...patch };
    // 値が全部空になったら sp 自体を消す
    const empty = Object.values(next).every((v) => v == null || v === false);
    set({ sp: empty ? undefined : next });
  };
  const isFree = isAtom(node) && !!node.free; // 背景・自由配置中はフロー系の設定を隠す
  const typeLabel = isContainer(node)
    ? node.type === "section" ? "セクション（大枠）" : "グループ（部品のまとまり）"
    : node.atomType === "text" ? "テキスト" : node.atomType === "image" ? "画像" : "SVG図形";

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white" onPointerDownCapture={warnIfUnsynced}>
      <div className="border-b border-slate-100 px-4 py-2.5">
        <p className="text-xs font-bold text-slate-500">設定</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{typeLabel}</p>
      </div>

      {admin && selectedCount > 1 && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-md bg-sky-50 px-3 py-2 text-xs ring-1 ring-sky-100">
          <span className="font-semibold text-sky-700">{selectedCount}個を選択中</span>
          <button onClick={removeSelected} className="rounded border border-red-200 bg-white px-2 py-1 font-semibold text-red-500 hover:bg-red-50">まとめて削除</button>
        </div>
      )}

      {/* SP（スマホ）専用の上書き設定。PC/SPトグルが「SP」のときに表示 */}
      {isSp && admin && (
        <div className="mx-4 mt-3 rounded-lg bg-indigo-50 p-3 ring-1 ring-indigo-100">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-indigo-700">📱 スマホ（SP）専用の設定</p>
            {node.sp && <button onClick={() => set({ sp: undefined })} className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-600">リセット</button>}
          </div>
          <p className="mt-0.5 text-[10px] leading-relaxed text-indigo-400">空欄＝PCの値を引き継ぎます。ここでの変更はスマホ表示だけに反映されます（PCは変わりません）。</p>
          <div className="mt-2 space-y-2">
            <CheckRow label="スマホで非表示" caption="この要素をSPで隠す" checked={!!sp.hidden} onChange={(v) => setSp({ hidden: v || undefined })} />
            <CheckRow label="PCで非表示（スマホのみ表示）" caption="ハンバーガー等・SP専用の要素に" checked={!!node.hiddenPc} onChange={(v) => set({ hiddenPc: v || undefined })} />
            {isAtom(node) && node.atomType === "text" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="文字サイズ" hint="SP・px"><NumberInput value={sp.fontSize ?? 0} onChange={(v) => setSp({ fontSize: v > 0 ? v : undefined })} /></Field>
                  <Field label="行間" hint="SP・倍率"><NumberInput value={sp.lineHeight ?? 0} step={0.1} onChange={(v) => setSp({ lineHeight: v > 0 ? v : undefined })} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="文字間隔" hint="SP・px"><NumberInput value={sp.letterSpacing ?? 0} step={0.5} onChange={(v) => setSp({ letterSpacing: v !== 0 ? v : undefined })} /></Field>
                  <Field label="揃え" hint="SP"><Select value={sp.align ?? ""} onChange={(v) => setSp({ align: v || undefined })} options={[{ v: "", label: "PCと同じ" }, { v: "left", label: "左揃え" }, { v: "center", label: "中央揃え" }, { v: "right", label: "右揃え" }]} /></Field>
                </div>
              </>
            )}
            {isContainer(node) && (
              <>
                <Field label="並び方" hint="SP・逆順で写真→文字に揃える等"><Select value={sp.direction ?? ""} onChange={(v) => setSp({ direction: v || undefined })} options={[{ v: "", label: "PCと同じ" }, { v: "column", label: "縦に積む" }, { v: "column-reverse", label: "縦に積む（逆順）" }, { v: "row", label: "横に並べる" }, { v: "row-reverse", label: "横に並べる（逆順）" }]} /></Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="左右の余白" hint="SP・px"><NumberInput value={sp.paddingX ?? 0} onChange={(v) => setSp({ paddingX: v > 0 ? v : undefined })} /></Field>
                  <Field label="上下の余白" hint="SP・px"><NumberInput value={sp.paddingY ?? 0} onChange={(v) => setSp({ paddingY: v > 0 ? v : undefined })} /></Field>
                </div>
                <Field label="要素の間隔" hint="SP・gap・px"><NumberInput value={sp.gap ?? 0} onChange={(v) => setSp({ gap: v > 0 ? v : undefined })} /></Field>
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3 p-4">
        {admin && (
          <Field label="名前" hint="一覧の表示名">
            <TextInput value={node.name} onChange={(v) => set({ name: v })} />
          </Field>
        )}

        {isContainer(node) ? (
          <ContainerEditor node={node} admin={admin} set={set} />
        ) : (
          <AtomEditor node={node} admin={admin} set={set} />
        )}

        {admin && (
          <>
            <GroupTitle>不透明度</GroupTitle>
            <div className="flex items-center gap-2">
              <input
                type="range" min={0} max={100} step={1}
                value={Math.round((node.opacity ?? 1) * 100)}
                onChange={(e) => { const v = Number(e.target.value); set({ opacity: v >= 100 ? undefined : v / 100 }); }}
                className="h-1.5 flex-1 accent-sky-500"
              />
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-slate-500">{Math.round((node.opacity ?? 1) * 100)}%</span>
            </div>
          </>
        )}

        {/* 画像・SVGは自由配置（Flexから外して絶対配置）にできる */}
        {admin && isAtom(node) && (node.atomType === "image" || node.atomType === "svg") && (
          <>
            <GroupTitle>自由配置</GroupTitle>
            <CheckRow
              label="自由に配置"
              caption="Flexから外して自由に置く"
              hint="absolute"
              checked={!!node.free}
              onChange={(v) => set(v ? { free: true, x: node.x ?? 40, y: node.y ?? 40 } : { free: false })}
            />
            {node.free && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="横位置 X" hint="px"><NumberInput value={node.x} onChange={(v) => set({ x: v })} /></Field>
                  <Field label="縦位置 Y" hint="px"><NumberInput value={node.y} onChange={(v) => set({ y: v })} /></Field>
                </div>
                <CheckRow label="前面に表示" caption="本文より前に出す（既定は背面）" checked={!!node.front} onChange={(v) => set({ front: v })} />
              </>
            )}
          </>
        )}

        {admin && !isFree && (
          <>
            <GroupTitle>まわりとの関係</GroupTitle>
            <SpacingEditor label="外側の余白" hint="margin・px（負も可）" kind="margin" node={node} set={set} />
            <Field label="この要素だけの寄せ方" hint="他と違う位置に寄せる・align-self">
              <Select
                value={node.alignSelf ?? "auto"}
                onChange={(v) => set({ alignSelf: v })}
                options={[
                  { v: "auto", label: "自動（親に合わせる）" },
                  ...axisOptions<AlignSelf>((parentDirectionOf(pageChildren, node.id) ?? "column") === "column", [{ v: "stretch", label: "いっぱいに広げる" }]),
                ]}
              />
            </Field>
            <Field label="折り返しの基準幅" hint="px・0＝自動">
              <NumberInput value={node.basis ?? 0} onChange={(v) => set({ basis: v > 0 ? v : undefined })} />
            </Field>
            <CheckRow label="この後で改行" caption="ここで次の行へ送る" hint="折り返し時のみ" checked={!!node.breakAfter} onChange={(v) => set({ breakAfter: v })} />
          </>
        )}
      </div>
    </aside>
  );
}

// 影プリセット（プロらしい控えめな影）。キー→CSS。
const SHADOWS: Record<string, string> = {
  none: "",
  sm: "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.10)",
  md: "0 4px 6px -1px rgba(16,24,40,0.08), 0 2px 4px -2px rgba(16,24,40,0.06)",
  lg: "0 10px 15px -3px rgba(16,24,40,0.08), 0 4px 6px -4px rgba(16,24,40,0.05)",
};
const shadowKey = (v?: string): string => Object.keys(SHADOWS).find((k) => SHADOWS[k] === (v ?? "")) ?? "none";

function ContainerEditor({ node, admin, set }: { node: ContainerNode; admin: boolean; set: (p: NodePatch) => void }) {
  if (!admin) {
    return <p className="rounded-md bg-slate-50 p-2 text-xs leading-relaxed text-slate-500">配置や余白などのレイアウトは、管理者だけが変更できます。</p>;
  }
  return (
    <>
      <GroupTitle>中の要素の並べ方</GroupTitle>
      <Field label="並べる向き" hint="flex-direction">
        <Select value={node.direction} onChange={(v) => set({ direction: v })} options={[{ v: "row", label: "横に並べる" }, { v: "column", label: "縦に並べる" }]} />
      </Field>
      <CheckRow label="折り返し" caption="はみ出たら次の行へ" hint="flex-wrap" checked={!!node.wrap} onChange={(v) => set({ wrap: v })} />
      {node.direction === "row" && (
        <Field label="1行に並べる数" hint="0＝自動">
          <NumberInput value={node.columns ?? 0} onChange={(v) => set({ columns: v > 0 ? v : undefined })} />
        </Field>
      )}
      <Field label={node.direction === "row" ? "横のそろえ（左右）" : "縦のそろえ（上下）"} hint="justify-content">
        <Select value={node.justify} onChange={(v) => set({ justify: v })}
          options={axisOptions<JustifyContent>(node.direction === "row", [{ v: "space-between", label: "両端に配置" }, { v: "space-around", label: "均等に配置" }])} />
      </Field>
      <Field label={node.direction === "row" ? "縦のそろえ（上下）" : "横のそろえ（左右）"} hint="align-items">
        <Select value={node.align} onChange={(v) => set({ align: v })}
          options={axisOptions<AlignItems>(node.direction === "column", [{ v: "stretch", label: "いっぱいに広げる" }])} />
      </Field>
      {node.type === "section" && (
        <Field label="中身の寄せ（背景は全幅）" hint="背景は常に画面いっぱい／中身を中央か左に">
          <Select
            value={node.contentAlign ?? "center"}
            onChange={(v) => set({ contentAlign: v === "center" ? undefined : v })}
            options={[{ v: "center", label: "中央に置く" }, { v: "left", label: "常に画面左に寄せる" }]}
          />
        </Field>
      )}

      <GroupTitle>大きさ・余白</GroupTitle>
      <div className="grid grid-cols-2 gap-2">
        <Field label="幅" hint="px・0＝自動">
          <NumberInput value={node.width ?? 0} onChange={(v) => set({ width: v > 0 ? v : undefined })} />
        </Field>
        <Field label="高さ（最小）" hint={node.fullHeight ? "全画面が優先" : "px・0＝自動"}>
          <NumberInput value={node.minHeight ?? 0} onChange={(v) => set({ minHeight: v > 0 ? v : undefined })} />
        </Field>
      </div>
      {node.type === "section" && (
        <CheckRow label="全画面" caption="画面の高さいっぱい（100vh）" hint="ヒーロー等" checked={!!node.fullHeight} onChange={(v) => set({ fullHeight: v || undefined })} />
      )}
      <Field label="要素の間隔" hint="gap・px"><NumberInput value={node.gap} onChange={(v) => set({ gap: v })} /></Field>
      <SpacingEditor label="内側の余白" hint="padding・px" kind="padding" node={node} set={set} />

      <GroupTitle>見た目</GroupTitle>
      <div className="grid grid-cols-2 gap-2">
        <Field label="角の丸み" hint="px"><NumberInput value={node.radius} onChange={(v) => set({ radius: v })} /></Field>
        <CheckRow label="広げる" caption="余白いっぱいに" hint="flex:1" checked={!!node.grow} onChange={(v) => set({ grow: v })} />
      </div>
      <Field label="背景色">
        <ColorInput value={node.background} onChange={(v) => set({ background: v })} onClear={() => set({ background: undefined })} />
      </Field>
      <Field label="背景パターン" hint="ノート風の方眼・罫線・ドット">
        <div className="grid grid-cols-4 gap-1">
          {PATTERN_OPTIONS.map((p) => {
            const active = (node.bgPattern?.kind ?? "none") === p.k;
            return (
              <button
                key={p.k}
                onClick={() =>
                  set(
                    p.k === "none"
                      ? { bgPattern: undefined }
                      : {
                          // 種類を選ぶと、色は現状維持（無ければ既定）。ベースは単色に整える。
                          bgPattern: { kind: p.k, color: node.bgPattern?.color ?? DEFAULT_PATTERN_COLOR, size: node.bgPattern?.size },
                          background: baseColorOf(node.background) ?? "#ffffff",
                        },
                  )
                }
                className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition ${active ? "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-300 text-slate-600 hover:border-sky-400 hover:text-sky-600"}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </Field>
      {node.bgPattern && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="パターンの色" hint="自由に指定">
            <ColorInput value={node.bgPattern.color} onChange={(v) => set({ bgPattern: { ...node.bgPattern!, color: v } })} />
          </Field>
          <Field label="間隔" hint="px">
            <NumberInput value={patternSize(node.bgPattern)} onChange={(v) => set({ bgPattern: { ...node.bgPattern!, size: v > 0 ? v : undefined } })} />
          </Field>
        </div>
      )}
      <Field label="背景画像" hint="全画面写真など・URL貼付 or アップロード">
        <TextInput value={node.bgImage?.src ?? ""} onChange={(v) => set({ bgImage: v.trim() ? { ...(node.bgImage ?? {}), src: v.trim() } : undefined })} />
      </Field>
      {admin && <ImageUpload nodeId={node.id} apply={(url) => set({ bgImage: { ...(node.bgImage ?? {}), src: url } })} label="背景画像をアップロード" />}
      {node.bgImage?.src && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="合わせ方" hint="background-size">
              <Select
                value={node.bgImage.fit ?? "cover"}
                onChange={(v) => set({ bgImage: { ...node.bgImage!, fit: v } })}
                options={[{ v: "cover", label: "全面を覆う" }, { v: "contain", label: "全体を収める" }]}
              />
            </Field>
            <Field label="暗くする" hint="%・文字を読みやすく">
              <NumberInput
                value={Math.round((node.bgImage.overlay ?? 0) * 100)}
                onChange={(v) => { const o = Math.max(0, Math.min(100, v)) / 100; set({ bgImage: { ...node.bgImage!, overlay: o > 0 ? o : undefined } }); }}
              />
            </Field>
          </div>
          <Field label="拡大縮小" hint="50〜250%・100=等倍">
            <div className="flex items-center gap-2">
              <input
                type="range" min={50} max={250} step={5}
                value={Math.round((node.bgImage.scale ?? 1) * 100)}
                onChange={(e) => { const v = Number(e.target.value); set({ bgImage: { ...node.bgImage!, scale: v === 100 ? undefined : v / 100 } }); }}
                className="h-1.5 flex-1 accent-sky-500"
              />
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-slate-500">{Math.round((node.bgImage.scale ?? 1) * 100)}%</span>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => set({ bgImage: { ...node.bgImage!, flipH: !node.bgImage!.flipH } })}
              className={`rounded-md border py-1.5 text-xs font-semibold transition ${node.bgImage.flipH ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-300 text-slate-600 hover:border-slate-900"}`}
            >⇄ 水平反転</button>
            <button
              onClick={() => set({ bgImage: { ...node.bgImage!, flipV: !node.bgImage!.flipV } })}
              className={`rounded-md border py-1.5 text-xs font-semibold transition ${node.bgImage.flipV ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-300 text-slate-600 hover:border-slate-900"}`}
            >⇅ 垂直反転</button>
          </div>
        </>
      )}
      <Field label="枠線の太さ" hint="px・0＝なし"><NumberInput value={node.borderWidth ?? 0} onChange={(v) => set({ borderWidth: v > 0 ? v : undefined })} /></Field>
      <Field label="枠線の色"><ColorInput value={node.borderColor} onChange={(v) => set({ borderColor: v })} onClear={() => set({ borderColor: undefined })} /></Field>
      <Field label="影" hint="box-shadow">
        <Select value={shadowKey(node.boxShadow)} onChange={(v) => set({ boxShadow: SHADOWS[v] || undefined })} options={[
          { v: "none", label: "なし" }, { v: "sm", label: "弱" }, { v: "md", label: "中" }, { v: "lg", label: "強" },
        ]} />
      </Field>
    </>
  );
}

function AtomEditor({ node, admin, set }: { node: AtomNode; admin: boolean; set: (p: NodePatch) => void }) {
  if (node.atomType === "text") {
    const st = node.style ?? {};
    return (
      <>
        <Field label="テキスト" hint="一部を選択して色変更可">
          <RichTextEditor key={node.id} runs={node.runs} text={node.text} onChange={(runs, text) => set({ runs, text })} />
        </Field>
        {admin && (
          <>
            <GroupTitle>文字の見た目</GroupTitle>
            <Field label="フォント">
              <Select
                value={st.fontFamily ?? ""}
                onChange={(v) => set({ style: { ...st, fontFamily: v } })}
                options={[{ v: "", label: "標準（指定なし）" }, ...FONTS.map((f) => ({ v: f.id as string, label: f.label }))]}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="文字サイズ" hint="px"><NumberInput value={st.fontSize} onChange={(v) => set({ style: { ...st, fontSize: v } })} /></Field>
              <Field label="文字の太さ">
                <Select value={String(st.fontWeight ?? 400)} onChange={(v) => set({ style: { ...st, fontWeight: Number(v) } })} options={[
                  { v: "400", label: "標準" }, { v: "500", label: "中" }, { v: "600", label: "やや太" }, { v: "700", label: "太字" }, { v: "800", label: "極太" },
                ]} />
              </Field>
            </div>
            <Field label="文字のそろえ">
              <Select value={st.align ?? "left"} onChange={(v) => set({ style: { ...st, align: v } })} options={[{ v: "left", label: "左揃え" }, { v: "center", label: "中央揃え" }, { v: "right", label: "右揃え" }]} />
            </Field>
            <CheckRow label="改行を反映" caption="オフにすると改行を無視して詰める" hint="pre-wrap / normal" checked={st.preserveBreaks !== false} onChange={(v) => set({ style: { ...st, preserveBreaks: v } })} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="行間" hint="倍率・0＝既定">
                <NumberInput value={st.lineHeight ?? 0} step={0.1} onChange={(v) => set({ style: { ...st, lineHeight: v > 0 ? v : undefined } })} />
              </Field>
              <Field label="文字間隔" hint="px・0＝なし">
                <NumberInput value={st.letterSpacing ?? 0} step={0.5} onChange={(v) => set({ style: { ...st, letterSpacing: v !== 0 ? v : undefined } })} />
              </Field>
            </div>

            <Field label="文字色">
              <ColorInput value={st.color} onChange={(v) => set({ style: { ...st, color: v } })} />
            </Field>
            <SpacingEditor label="内側の余白" hint="padding・px" kind="padding" node={node} set={set} />

            <GroupTitle>枠線</GroupTitle>
            <div className="grid grid-cols-2 gap-2">
              <Field label="太さ" hint="px・0＝なし"><NumberInput value={st.borderWidth ?? 0} onChange={(v) => set({ style: { ...st, borderWidth: v > 0 ? v : undefined } })} /></Field>
              <Field label="角丸" hint="px"><NumberInput value={st.borderRadius ?? 0} onChange={(v) => set({ style: { ...st, borderRadius: v > 0 ? v : undefined } })} /></Field>
            </div>
            <Field label="枠線の色">
              <ColorInput value={st.borderColor} onChange={(v) => set({ style: { ...st, borderColor: v } })} />
            </Field>
          </>
        )}
      </>
    );
  }

  if (node.atomType === "image") {
    return (
      <>
        <Field label="画像URL"><TextInput value={node.src ?? ""} onChange={(v) => set({ src: v })} /></Field>
        {admin && <ImageUpload nodeId={node.id} apply={(url) => set({ src: url })} />}
        <Field label="画像の説明" hint="代替テキスト"><TextInput value={node.alt ?? ""} onChange={(v) => set({ alt: v })} /></Field>
        {admin && (
          <>
            <GroupTitle>大きさ・見た目</GroupTitle>
            <div className="grid grid-cols-2 gap-2">
              <Field label="幅" hint="px"><NumberInput value={node.width} onChange={(v) => set({ width: v })} /></Field>
              <Field label="高さ" hint="px"><NumberInput value={node.height} onChange={(v) => set({ height: v })} /></Field>
            </div>
            <CheckRow label="影をつける" caption="ドロップシャドウのオン/オフ" checked={!!node.boxShadow} onChange={(v) => set({ boxShadow: v ? SHADOWS.md : undefined })} />
            <MaskControls shape={node.maskShape} svg={node.maskSvg} onChange={(m) => set(m)} />
          </>
        )}
      </>
    );
  }

  // svg
  if (!admin) {
    return <p className="rounded-md bg-slate-50 p-2 text-xs leading-relaxed text-slate-500">SVG図形の編集は、管理者だけができます。</p>;
  }
  const svgColor = node.svg?.match(/(?:stroke|fill)\s*=\s*"(?!none)([^"]+)"/i)?.[1] ?? "#0ea5e9";
  return (
    <>
      <Field label="アイコンの色" hint="stroke/fill を一括で塗り替え">
        <ColorInput value={svgColor} onChange={(v) => set({ svg: recolorSvg(node.svg ?? "", v) })} />
      </Field>
      <Field label="SVGコード"><textarea value={node.svg ?? ""} onChange={(e) => set({ svg: e.target.value })} rows={5} className={`${inputCls} font-mono text-[11px]`} /></Field>
      <GroupTitle>大きさ・見た目</GroupTitle>
      <div className="grid grid-cols-2 gap-2">
        <Field label="幅" hint="px"><NumberInput value={node.width} onChange={(v) => set({ width: v })} /></Field>
        <Field label="高さ" hint="px"><NumberInput value={node.height} onChange={(v) => set({ height: v })} /></Field>
      </div>
      <CheckRow label="影をつける" caption="形に沿ったドロップシャドウのオン/オフ" checked={!!node.boxShadow} onChange={(v) => set({ boxShadow: v ? SHADOWS.md : undefined })} />
      <SvgPathControls node={node} />
    </>
  );
}
