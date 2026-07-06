"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2, Code2, ImageIcon, Search, Library } from "lucide-react";
import { useBuilder } from "@/lib/store";
import type { AssetItem } from "@/lib/types";
import { svgScalable } from "@/lib/svg";

// ① 管理者用アセットライブラリ。
// Figma等からエクスポートしたSVG生コード、または画像URLを「素材」として登録・管理する。
// ここで登録した素材が、②スタジオでキャンバスにインポートされる。
export default function AssetLibrary() {
  const assets = useBuilder((s) => s.assets);
  const addAsset = useBuilder((s) => s.addAsset);
  const removeAsset = useBuilder((s) => s.removeAsset);

  const [kind, setKind] = useState<"svg" | "image">("svg");
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [svg, setSvg] = useState("");
  const [src, setSrc] = useState("");

  // 検索・絞り込み
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "svg" | "image">("all");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (filter !== "all" && a.kind !== filter) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q));
    });
  }, [assets, query, filter]);

  const content = kind === "svg" ? svg.trim() : src.trim();
  const canAdd = name.trim().length > 0 && content.length > 0;

  const submit = () => {
    if (!canAdd) return;
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    addAsset(kind === "svg" ? { name: name.trim(), kind, svg, tags: tagList } : { name: name.trim(), kind, src, tags: tagList });
    setName(""); setTags(""); setSvg(""); setSrc("");
  };

  // ファイルから読み込む：SVGはテキスト、画像はデータURL(自己完結)として取り込む。
  const onFile = (file?: File | null) => {
    if (!file) return;
    if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, "")); // 名前が空ならファイル名を流用
    const reader = new FileReader();
    if (kind === "svg") {
      reader.onload = () => setSvg(String(reader.result ?? ""));
      reader.readAsText(file);
    } else {
      reader.onload = () => setSrc(String(reader.result ?? ""));
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-900"><Library size={20} className="text-sky-500" /> アセットライブラリ</h1>
        <p className="mt-1 text-sm text-slate-500">SVG・画像を素材として登録します。ファイルからの読み込みにも対応（管理者専用）。</p>

        {/* 追加フォーム */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-xs font-bold text-slate-500">アセットを追加</p>
          <div className="flex gap-2">
            <button onClick={() => setKind("svg")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold ${kind === "svg" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>
              <Code2 size={14} /> SVG
            </button>
            <button onClick={() => setKind("image")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold ${kind === "image" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>
              <ImageIcon size={14} /> 画像
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-[11px] font-semibold text-slate-500">
              名前
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：チェックアイコン" className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal" />
            </label>
            <label className="text-[11px] font-semibold text-slate-500">
              タグ（カンマ区切り）
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="アイコン, 装飾" className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal" />
            </label>
          </div>

          {kind === "svg" ? (
            <div className="mt-3 space-y-2">
              <label className="block text-[11px] font-semibold text-slate-500">
                SVGファイルから読み込む
                <input type="file" accept=".svg,image/svg+xml" onChange={(e) => onFile(e.target.files?.[0])} className="mt-1 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-slate-900 file:px-2 file:py-1 file:text-white" />
              </label>
              <label className="block text-[11px] font-semibold text-slate-500">
                またはSVGコードを貼り付け
                <textarea value={svg} onChange={(e) => setSvg(e.target.value)} rows={4} placeholder='<svg viewBox="0 0 24 24">...</svg>' className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-[11px] font-normal" />
              </label>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <label className="block text-[11px] font-semibold text-slate-500">
                画像ファイルから読み込む
                <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} className="mt-1 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-slate-900 file:px-2 file:py-1 file:text-white" />
              </label>
              <label className="block text-[11px] font-semibold text-slate-500">
                またはURLを指定
                <input value={src} onChange={(e) => setSrc(e.target.value)} placeholder="https://..." className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal" />
              </label>
              {src.startsWith("data:") && <p className="text-[10px] text-slate-400">ファイルを読み込みました（データURLとして保存されます）。</p>}
            </div>
          )}

          <button onClick={submit} disabled={!canAdd} className="mt-3 flex items-center gap-1.5 rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-40">
            <Plus size={15} /> 登録する
          </button>
        </div>

        {/* 一覧：検索・絞り込み */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold text-slate-500">登録済み（{filtered.length}{query || filter !== "all" ? ` / ${assets.length}` : ""}）</p>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="名前・タグで検索" className="w-52 rounded-md border border-slate-300 py-1.5 pl-8 pr-2 text-sm" />
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {([["all", "すべて"], ["svg", "SVG"], ["image", "画像"]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setFilter(k)} className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${filter === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
            {assets.length === 0 ? "まだアセットがありません。上のフォームから登録してください。" : "条件に合うアセットがありません。"}
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((a) => (
              <AssetCard key={a.id} asset={a} onRemove={() => removeAsset(a.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssetCard({ asset, onRemove }: { asset: AssetItem; onRemove: () => void }) {
  return (
    <div className="group overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid h-28 place-items-center border-b border-slate-100 bg-slate-50 p-4">
        {asset.kind === "svg" ? (
          <div className="h-16 w-16 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svgScalable(asset.svg ?? "") }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.src} alt={asset.name} className="max-h-full max-w-full object-contain" />
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-slate-800">{asset.name}</span>
          <button onClick={onRemove} className="shrink-0 text-slate-300 transition hover:text-red-500" title="削除">
            <Trash2 size={14} />
          </button>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{asset.kind === "svg" ? "SVG" : "画像"}</span>
          {asset.tags.map((t) => (
            <span key={t} className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] text-sky-600">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
