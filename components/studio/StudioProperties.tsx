"use client";
import { useEffect, useRef, useState } from "react";
import { warnIfUnsynced } from "@/lib/uiStore";
import { Spline, Upload } from "lucide-react";
import { useStudio } from "@/lib/studioStore";
import { useImages, isDriveRef } from "@/lib/imageStore";
import { dirSupported } from "@/lib/fsHandle";
import type { StudioElement } from "@/lib/types";
import { recolorSvg } from "@/lib/svg";
import { MaskControls } from "@/components/MaskControls";
import { outlineTextElement } from "@/lib/textToPath";

// 右：選択要素のプロパティ編集。X/Y/W/H、塗り（単色⇄グラデ）、角丸・透明度スライダー、影、種類別の中身。
// 既存ビルダーの PropertiesPanel と同じ見た目の部品（Field/inputCls）で統一する。

const inputCls = "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm";

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

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <p className="pt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{children}</p>;
}

function NumberInput({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  return <input type="number" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} className={inputCls} />;
}

function ColorInput({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value && /^#/.test(value) ? value : "#ffffff"} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 shrink-0 cursor-pointer rounded border border-slate-300" />
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-500" />
    </div>
  );
}

// ラベル付きスライダー（値も数値で表示）。
function Slider({ value, min, max, step = 1, suffix, onChange }: { value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-sky-500" />
      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-slate-500">{value}{suffix}</span>
    </div>
  );
}

// linear-gradient の簡易パース/生成（本パネルは常にこの形で書き出す）。
function buildGradient(angle: number, c1: string, c2: string) {
  return `linear-gradient(${angle}deg, ${c1}, ${c2})`;
}
function parseGradient(g?: string): { angle: number; c1: string; c2: string } {
  const fallback = { angle: 135, c1: "#0ea5e9", c2: "#6366f1" };
  if (!g) return fallback;
  const angle = Number(/(-?[\d.]+)deg/.exec(g)?.[1] ?? fallback.angle);
  const colors = g.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)/g) ?? [];
  return { angle: isFinite(angle) ? angle : fallback.angle, c1: colors[0] ?? fallback.c1, c2: colors[1] ?? fallback.c2 };
}

const SHADOWS: { label: string; value: string | undefined }[] = [
  { label: "なし", value: undefined },
  { label: "小", value: "0 1px 3px rgba(2,6,23,0.16)" },
  { label: "中", value: "0 6px 16px rgba(2,6,23,0.18)" },
  { label: "大", value: "0 16px 40px rgba(2,6,23,0.25)" },
];

// 画像：URL指定 or アップロード（Driveフォルダに格納し drive:// 参照で保存）。
function ImageControls({ el }: { el: StudioElement }) {
  const update = useStudio((s) => s.update);
  const dirName = useImages((s) => s.dirName);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { useImages.getState().hydrate(); }, []); // 保存済みフォルダ名を表示に反映

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      const ref = await useImages.getState().upload(f);
      update(el.id, { content: ref });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Field label={isDriveRef(el.content) ? "画像（アップロード済み）" : "画像URL"}>
        <input value={el.content} onChange={(e) => update(el.id, { content: e.target.value })} className={inputCls} />
      </Field>
      {dirSupported() ? (
        <>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 py-1.5 text-xs font-semibold text-sky-700 hover:border-sky-400 disabled:opacity-50"
          >
            <Upload size={13} /> {busy ? "アップロード中…" : "画像をアップロード（フォルダへ保存）"}
          </button>
          <p className="text-[10px] leading-relaxed text-slate-400">
            {dirName ? <>保存先フォルダ：<span className="font-semibold text-slate-500">{dirName}</span>。</> : "初回アップロード時に保存フォルダ（Googleドライブ同期フォルダ推奨）を選びます。"}{" "}
            <button onClick={() => useImages.getState().reconnect()} className="text-sky-600 underline">フォルダを{dirName ? "変更/再接続" : "選択"}</button>
            <br />JSONにはパス（ファイル名）だけ保存され、画像本体はフォルダ（Drive）に置かれます。
          </p>
        </>
      ) : (
        <p className="text-[10px] leading-relaxed text-slate-400">このブラウザはフォルダ保存に非対応です。画像はURLを指定してください（アップロード保存は Chrome/Edge 推奨）。</p>
      )}
      <MaskControls shape={el.maskShape} svg={el.maskSvg} onChange={(m) => update(el.id, m)} />
    </>
  );
}

export default function StudioProperties() {
  const selectedIds = useStudio((s) => s.selectedIds);
  const elements = useStudio((s) => s.elements);
  const update = useStudio((s) => s.update);
  const convertToPath = useStudio((s) => s.convertToPath);
  const setTool = useStudio((s) => s.setTool);
  const group = useStudio((s) => s.group);
  const ungroup = useStudio((s) => s.ungroup);

  // 未選択
  if (selectedIds.length === 0) {
    return (
      <aside className="w-72 shrink-0 border-l border-slate-200 bg-white p-4" onPointerDownCapture={warnIfUnsynced}>
        <p className="text-sm text-slate-400">要素を選ぶと、ここで編集できます。</p>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">Shift／⌘＋クリックで複数選択できます。</p>
      </aside>
    );
  }

  // 複数選択：グループ化/解除だけ扱う（個別スタイル編集は単独選択時）
  if (selectedIds.length >= 2) {
    const canUngroup = elements.some((e) => selectedIds.includes(e.id) && e.groupId);
    return (
      <aside className="flex w-72 shrink-0 flex-col border-l border-slate-200 bg-white" onPointerDownCapture={warnIfUnsynced}>
        <div className="border-b border-slate-100 px-4 py-2.5">
          <p className="text-xs font-bold text-slate-500">設定</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{selectedIds.length}個を選択中</p>
        </div>
        <div className="space-y-2 p-4">
          <button onClick={() => group()} className="w-full rounded-md border border-sky-200 bg-sky-50 py-1.5 text-xs font-semibold text-sky-700 hover:border-sky-400">グループ化</button>
          {canUngroup && <button onClick={() => ungroup()} className="w-full rounded-md border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-900">グループ解除</button>}
          <p className="text-[11px] leading-relaxed text-slate-400">複数選択中は、まとめて移動・複製・削除・書き出しができます。個別のスタイルは1つだけ選ぶと編集できます。</p>
        </div>
      </aside>
    );
  }

  const el = elements.find((e) => e.id === selectedIds[0]);
  if (!el) return <aside className="w-72 shrink-0 border-l border-slate-200 bg-white p-4" />;

  const s = el.style;
  const typeLabel = { rectangle: "四角形", circle: "円", text: "テキスト", image: "画像", svg: "SVG図形" }[el.type];
  const isGradient = !!s.backgroundGradient;
  const grad = parseGradient(s.backgroundGradient);
  const svgColor = el.content.match(/(?:stroke|fill)\s*=\s*"(?!none)([^"]+)"/i)?.[1] ?? s.color ?? "#0ea5e9";

  const setStyle = (patch: Partial<StudioElement["style"]>) => update(el.id, { style: patch });

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white" onPointerDownCapture={warnIfUnsynced}>
      <div className="border-b border-slate-100 px-4 py-2.5">
        <p className="text-xs font-bold text-slate-500">設定</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{typeLabel}</p>
      </div>

      <div className="space-y-3 p-4">
        {/* 位置とサイズ */}
        <GroupTitle>位置とサイズ</GroupTitle>
        <div className="grid grid-cols-2 gap-2">
          <Field label="X" hint="px"><NumberInput value={el.position.x} onChange={(v) => update(el.id, { position: { x: v } })} /></Field>
          <Field label="Y" hint="px"><NumberInput value={el.position.y} onChange={(v) => update(el.id, { position: { y: v } })} /></Field>
          <Field label="幅 W" hint="px"><NumberInput value={el.size.width} onChange={(v) => update(el.id, { size: { width: Math.max(12, v) } })} /></Field>
          <Field label="高さ H" hint="px"><NumberInput value={el.size.height} onChange={(v) => update(el.id, { size: { height: Math.max(12, v) } })} /></Field>
        </div>

        {/* パス編集 */}
        {(el.type === "rectangle" || el.type === "circle") && (
          <>
            <GroupTitle>パス編集</GroupTitle>
            <button
              onClick={() => { convertToPath(el.id); setTool("node"); }}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 py-1.5 text-xs font-semibold text-sky-700 hover:border-sky-400"
            >
              <Spline size={13} /> パスに変換して編集
            </button>
            <p className="text-[10px] leading-relaxed text-slate-400">四角形・円を編集可能なパスに変換します。変換後は「曲線」ツールで点を動かし、ダブルクリックで曲線⇄角を切り替えられます。</p>
          </>
        )}
        {el.type === "svg" && el.points && (
          <>
            <GroupTitle>パス編集</GroupTitle>
            <button
              onClick={() => setTool("node")}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 py-1.5 text-xs font-semibold text-sky-700 hover:border-sky-400"
            >
              <Spline size={13} /> 曲線ツールで編集（{el.points.length}点）
            </button>
          </>
        )}

        {/* 種類別の中身 */}
        {el.type === "text" && (
          <>
            <GroupTitle>テキスト</GroupTitle>
            <Field label="内容"><textarea value={el.content} onChange={(e) => update(el.id, { content: e.target.value })} rows={2} className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="文字サイズ" hint="px"><NumberInput value={s.fontSize ?? 16} onChange={(v) => setStyle({ fontSize: v })} /></Field>
              <Field label="太さ">
                <select value={String(s.fontWeight ?? 400)} onChange={(e) => setStyle({ fontWeight: Number(e.target.value) })} className={inputCls}>
                  <option value="400">標準</option>
                  <option value="600">やや太</option>
                  <option value="700">太字</option>
                  <option value="800">極太</option>
                </select>
              </Field>
            </div>
            <Field label="揃え">
              <select value={s.textAlign ?? "left"} onChange={(e) => setStyle({ textAlign: e.target.value as "left" | "center" | "right" })} className={inputCls}>
                <option value="left">左揃え</option>
                <option value="center">中央揃え</option>
                <option value="right">右揃え</option>
              </select>
            </Field>
            <Field label="文字色"><ColorInput value={s.color} onChange={(v) => setStyle({ color: v })} /></Field>
            <button
              onClick={async (ev) => {
                const btn = ev.currentTarget; const label = btn.textContent;
                if (!el.content.trim()) { window.alert("先にテキストを入力してください。"); return; }
                btn.disabled = true; btn.textContent = "アウトライン化中…（フォント取得）";
                try {
                  const r = await outlineTextElement(el.content, s.fontSize ?? 16, s.fontWeight ?? 400, s.textAlign ?? "left", s.color ?? "#0f172a");
                  update(el.id, { type: "svg", content: r.svg, size: { width: r.width, height: r.height }, style: { color: s.color ?? "#0f172a" } });
                } catch (e) {
                  window.alert("アウトライン化に失敗しました（フォントの読み込み）。オンライン環境でお試しください。\n" + (e instanceof Error ? e.message : String(e)));
                  btn.disabled = false; btn.textContent = label;
                }
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 py-1.5 text-xs font-semibold text-violet-700 hover:border-violet-400 disabled:opacity-60"
            >
              <Spline size={13} /> 文字をアウトライン化（パス）
            </button>
            <p className="text-[10px] leading-relaxed text-slate-400">文字をベクターパス（SVG図形）に変換します。フォント非依存になり、曲線ツールでの編集や忠実な書き出しが可能に。※初回はフォント取得に数秒（日本語は数MB）。変換後は元に戻せないため複製推奨。</p>
          </>
        )}
        {el.type === "image" && (
          <>
            <GroupTitle>画像</GroupTitle>
            <ImageControls el={el} />
          </>
        )}
        {el.type === "svg" && (
          <>
            <GroupTitle>SVG</GroupTitle>
            <Field label="SVGコード"><textarea value={el.content} onChange={(e) => update(el.id, { content: e.target.value })} rows={4} className={`${inputCls} font-mono text-[11px]`} /></Field>
            <Field label="色" hint="stroke/fill を一括で塗り替え">
              <ColorInput value={svgColor} onChange={(v) => { update(el.id, { content: recolorSvg(el.content, v) }); setStyle({ color: v }); }} />
            </Field>
          </>
        )}

        {/* 塗り（図形・画像背景・テキスト/SVG背景いずれも編集可） */}
        <GroupTitle>塗り</GroupTitle>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setStyle({ backgroundGradient: undefined })}
            className={`flex-1 rounded-md py-1 text-xs font-semibold transition ${!isGradient ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            単色
          </button>
          <button
            onClick={() => setStyle({ backgroundGradient: buildGradient(grad.angle, s.backgroundColor && /^#/.test(s.backgroundColor) ? s.backgroundColor : grad.c1, grad.c2) })}
            className={`flex-1 rounded-md py-1 text-xs font-semibold transition ${isGradient ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            グラデーション
          </button>
        </div>
        {!isGradient ? (
          <Field label="背景色"><ColorInput value={s.backgroundColor} onChange={(v) => setStyle({ backgroundColor: v })} /></Field>
        ) : (
          <>
            <Field label="開始色"><ColorInput value={grad.c1} onChange={(v) => setStyle({ backgroundGradient: buildGradient(grad.angle, v, grad.c2) })} /></Field>
            <Field label="終了色"><ColorInput value={grad.c2} onChange={(v) => setStyle({ backgroundGradient: buildGradient(grad.angle, grad.c1, v) })} /></Field>
            <Field label="角度" hint="deg"><Slider value={grad.angle} min={0} max={360} suffix="°" onChange={(v) => setStyle({ backgroundGradient: buildGradient(v, grad.c1, grad.c2) })} /></Field>
          </>
        )}

        {/* 見た目 */}
        <GroupTitle>見た目</GroupTitle>
        {el.type !== "circle" && (
          <Field label="角丸" hint="border-radius"><Slider value={s.borderRadius} min={0} max={200} suffix="px" onChange={(v) => setStyle({ borderRadius: v })} /></Field>
        )}
        <Field label="透明度" hint="opacity"><Slider value={Math.round(s.opacity * 100)} min={0} max={100} suffix="%" onChange={(v) => setStyle({ opacity: v / 100 })} /></Field>
        <Field label="影">
          <div className="grid grid-cols-4 gap-1">
            {SHADOWS.map((sh) => (
              <button
                key={sh.label}
                onClick={() => setStyle({ boxShadow: sh.value })}
                className={`rounded-md border py-1 text-xs font-semibold transition ${
                  (s.boxShadow ?? undefined) === sh.value ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-500 hover:border-slate-400"
                }`}
              >
                {sh.label}
              </button>
            ))}
          </div>
        </Field>
        <p className="pt-1 text-[10px] text-slate-400">重なり順：{s.zIndex + 1} 番目（左パネルの▲▼で変更）</p>
      </div>
    </aside>
  );
}
