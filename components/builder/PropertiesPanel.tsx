"use client";
import { useBuilder, findNode, type NodePatch } from "@/lib/store";
import { type ContainerNode, type AtomNode, type SceneNode, type ItemProps, isContainer, isAtom } from "@/lib/types";
import { FONTS } from "@/lib/fonts";

// 右：設定パネル。選択した要素の内容・レイアウトを編集する。
// 2面性：管理者=レイアウトやスタイルまで全部 / クライアント=中身（テキスト・画像）だけ。
// 表記は分かりやすい日本語を主にし、CSSの用語は薄いヒントとして添える。

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-600">{label}</span>
        {hint && <span className="shrink-0 text-[10px] font-normal text-slate-300">{hint}</span>}
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
function NumberInput({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  return <input type="number" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} className={inputCls} />;
}
function ColorInput({ value, onChange, onClear }: { value?: string; onChange: (v: string) => void; onClear?: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value && /^#/.test(value) ? value : "#ffffff"} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 shrink-0 cursor-pointer rounded border border-slate-300" />
      <span className="flex-1 truncate text-xs text-slate-500">{value ?? "なし"}</span>
      {onClear && (
        <button onClick={onClear} className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 hover:border-slate-900">なし</button>
      )}
    </div>
  );
}
// チェックボックス行。Field(=<label>) の中に別の<label>を入れると入れ子になり、
// クリックが二重に伝わってトグルが相殺される（＝反応しないように見える）。
// そのため見出しは<span>にして、ラベルは1つだけにする。
function CheckRow({ label, caption, hint, checked, onChange }: { label: string; caption: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div>
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-600">{label}</span>
        {hint && <span className="shrink-0 text-[10px] font-normal text-slate-300">{hint}</span>}
      </span>
      <label className="flex h-8 items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {caption}
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

  if (!node) {
    return (
      <aside className="w-72 shrink-0 border-l border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-400">要素を選ぶと、ここで編集できます。</p>
      </aside>
    );
  }

  const set = (patch: Parameters<typeof update>[1]) => update(node.id, patch);
  const isFree = isAtom(node) && !!node.free; // 背景・自由配置中はフロー系の設定を隠す
  const typeLabel = isContainer(node)
    ? node.type === "section" ? "セクション（大枠）" : "グループ（部品のまとまり）"
    : node.atomType === "text" ? "テキスト" : node.atomType === "image" ? "画像" : "SVG図形";

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-2.5">
        <p className="text-xs font-bold text-slate-500">設定</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{typeLabel}</p>
      </div>

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
            <Field label="自分だけのそろえ" hint="align-self">
              <Select
                value={node.alignSelf ?? "auto"}
                onChange={(v) => set({ alignSelf: v })}
                options={[
                  { v: "auto", label: "自動（親に合わせる）" },
                  { v: "flex-start", label: "先頭に寄せる" },
                  { v: "center", label: "中央に寄せる" },
                  { v: "flex-end", label: "末尾に寄せる" },
                  { v: "stretch", label: "いっぱいに広げる" },
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
      <Field label="そろえ（並ぶ向き）" hint="justify-content">
        <Select value={node.justify} onChange={(v) => set({ justify: v })} options={[
          { v: "flex-start", label: "先頭" }, { v: "center", label: "中央" }, { v: "flex-end", label: "末尾" }, { v: "space-between", label: "両端に振り分け" }, { v: "space-around", label: "均等に配置" },
        ]} />
      </Field>
      <Field label="そろえ（反対向き）" hint="align-items">
        <Select value={node.align} onChange={(v) => set({ align: v })} options={[
          { v: "flex-start", label: "先頭" }, { v: "center", label: "中央" }, { v: "flex-end", label: "末尾" }, { v: "stretch", label: "いっぱいに広げる" },
        ]} />
      </Field>

      <GroupTitle>大きさ・余白</GroupTitle>
      <Field label="高さ（最小）" hint="px・0＝自動">
        <NumberInput value={node.minHeight ?? 0} onChange={(v) => set({ minHeight: v > 0 ? v : undefined })} />
      </Field>
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
    </>
  );
}

function AtomEditor({ node, admin, set }: { node: AtomNode; admin: boolean; set: (p: NodePatch) => void }) {
  if (node.atomType === "text") {
    const st = node.style ?? {};
    return (
      <>
        <Field label="テキスト">
          <textarea value={node.text ?? ""} onChange={(e) => set({ text: e.target.value })} rows={3} className={inputCls} />
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
              <Select value={st.align ?? "left"} onChange={(v) => set({ style: { ...st, align: v } })} options={[{ v: "left", label: "左" }, { v: "center", label: "中央" }, { v: "right", label: "右" }]} />
            </Field>
            <Field label="文字色">
              <ColorInput value={st.color} onChange={(v) => set({ style: { ...st, color: v } })} />
            </Field>
            <SpacingEditor label="内側の余白" hint="padding・px" kind="padding" node={node} set={set} />
          </>
        )}
      </>
    );
  }

  if (node.atomType === "image") {
    return (
      <>
        <Field label="画像URL"><TextInput value={node.src ?? ""} onChange={(v) => set({ src: v })} /></Field>
        <Field label="画像の説明" hint="代替テキスト"><TextInput value={node.alt ?? ""} onChange={(v) => set({ alt: v })} /></Field>
        {admin && (
          <>
            <GroupTitle>大きさ</GroupTitle>
            <div className="grid grid-cols-2 gap-2">
              <Field label="幅" hint="px"><NumberInput value={node.width} onChange={(v) => set({ width: v })} /></Field>
              <Field label="高さ" hint="px"><NumberInput value={node.height} onChange={(v) => set({ height: v })} /></Field>
            </div>
          </>
        )}
      </>
    );
  }

  // svg
  if (!admin) {
    return <p className="rounded-md bg-slate-50 p-2 text-xs leading-relaxed text-slate-500">SVG図形の編集は、管理者だけができます。</p>;
  }
  return (
    <>
      <Field label="SVGコード"><textarea value={node.svg ?? ""} onChange={(e) => set({ svg: e.target.value })} rows={5} className={`${inputCls} font-mono text-[11px]`} /></Field>
      <GroupTitle>大きさ</GroupTitle>
      <div className="grid grid-cols-2 gap-2">
        <Field label="幅" hint="px"><NumberInput value={node.width} onChange={(v) => set({ width: v })} /></Field>
        <Field label="高さ" hint="px"><NumberInput value={node.height} onChange={(v) => set({ height: v })} /></Field>
      </div>
    </>
  );
}
