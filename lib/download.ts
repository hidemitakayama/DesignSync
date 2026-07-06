// ファイル保存の共通ヘルパー。
// File System Access API に対応していれば「保存先フォルダを選ぶ」ダイアログを出し、
// 非対応ブラウザでは従来のダウンロード（保存先はブラウザ設定に従う）にフォールバックする。

type FsWritable = { write: (data: Blob) => Promise<void>; close: () => Promise<void> };
type FsHandle = { createWritable: () => Promise<FsWritable> };
type SaveFilePicker = (opts?: {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}) => Promise<FsHandle>;

export async function saveBlob(blob: Blob, suggestedName: string, accept?: Record<string, string[]>): Promise<void> {
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({
        suggestedName,
        types: accept ? [{ description: "ファイル", accept }] : undefined,
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e) {
      // ユーザーがキャンセルしたら何もしない。それ以外はフォールバックへ。
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }
  // フォールバック：通常のダウンロード
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
