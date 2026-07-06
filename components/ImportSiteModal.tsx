"use client";
import { useRef, useState } from "react";
import { X, Globe, Loader2, FileUp } from "lucide-react";
import { useBuilder } from "@/lib/store";
import { htmlToPageRendered, saveImagesToDrive } from "@/lib/importDom";
import { dirSupported } from "@/lib/fsHandle";

// 「見た目ごと」サイト取り込み。HTML（CSS込み）を貼り付け or ファイル選択 → 描画して構造化。
export default function ImportSiteModal({ onClose }: { onClose: () => void }) {
  const [html, setHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveImages, setSaveImages] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async (source: string) => {
    if (!source.trim()) { window.alert("HTMLを貼り付けるか、ファイルを選択してください。"); return; }
    if (!window.confirm("読み込んだ内容で現在のページを置き換えます。よろしいですか？（元に戻す で戻せます）")) return;
    setBusy(true);
    try {
      const page = await htmlToPageRendered(source);
      if (saveImages && dirSupported()) {
        const r = await saveImagesToDrive(page); // 画像をDriveフォルダへ保存し drive:// 参照化
        if (r.fail > 0) window.alert(`画像 ${r.ok}件を保存、${r.fail}件は取得できませんでした（外部URLのCORS制限等）。取得できた分のみローカル化しています。`);
      }
      useBuilder.setState({ page, selectedId: null, view: "builder" });
      onClose();
    } catch (e) {
      window.alert("読み込みに失敗しました：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) setHtml(await f.text());
  };

  return (
    <div onPointerDown={busy ? undefined : onClose} className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4">
      <div onPointerDown={(e) => e.stopPropagation()} className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-sky-500" />
            <div>
              <h2 className="text-base font-extrabold text-slate-900">サイトを読み込み（見た目ごと）</h2>
              <p className="text-[11px] text-slate-400">HTMLを実際に描画してスタイルを取り込み、編集可能なページに変換します。</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>

        <div className="space-y-3 overflow-auto p-5">
          <input ref={fileRef} type="file" accept=".html,.htm,text/html" onChange={onFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-900">
            <FileUp size={14} /> HTMLファイルを選ぶ
          </button>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={10}
            placeholder={"ここにページのHTMLを貼り付け…\n\n※ Tailwind/CSSの“見た目”を取り込むには、CSSも含む完全なHTMLが必要です。\n・ブラウザで「ページを保存（完全）」したHTML\n・<head>に <style> や Tailwind CDN(<script src=\"https://cdn.tailwindcss.com\">) を含むHTML"}
            className="w-full rounded-md border border-slate-300 p-2 font-mono text-[11px]"
          />
          <div className="rounded-lg bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-700">
            <b>ヒント</b>：スタイル（CSS/Tailwind）が含まれていないHTMLは、構造だけ取り込まれ見た目が反映されません。
            ビルダーはFlexbox中心のため、Grid・複雑な絶対配置・アニメ・JS・レスポンシブは近似/省略されます。
          </div>

          {/* 取り込み前プレビュー（実際の描画結果） */}
          {html.trim() && (
            <div>
              <p className="mb-1 text-[11px] font-semibold text-slate-500">プレビュー（この見た目を取り込みます）</p>
              <iframe srcDoc={html} title="preview" className="h-72 w-full rounded-md border border-slate-200 bg-white" />
              <p className="mt-1 text-[10px] text-slate-400">見た目が崩れている＝CSSが含まれていない可能性。完全なHTML（CSS込み）を貼り付けてください。</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          {dirSupported() && (
            <label className="mr-auto flex items-center gap-1.5 text-[11px] font-semibold text-slate-500" title="外部URL/データ画像をDrive同期フォルダに保存して drive:// 参照にします（Chrome/Edge）">
              <input type="checkbox" checked={saveImages} onChange={(e) => setSaveImages(e.target.checked)} /> 画像をDriveフォルダに保存
            </label>
          )}
          <button onClick={onClose} disabled={busy} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-slate-400 disabled:opacity-50">キャンセル</button>
          <button onClick={() => run(html)} disabled={busy || !html.trim()} className="flex items-center gap-1.5 rounded-md bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-60">
            {busy ? <><Loader2 size={14} className="animate-spin" /> 取り込み中…</> : "この見た目で取り込む"}
          </button>
        </div>
      </div>
    </div>
  );
}
