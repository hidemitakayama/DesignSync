// 自動保存用のファイルハンドル管理。
// File System Access API のハンドルを IndexedDB に保存し、リロード後も（権限を再確認して）
// 同じファイルへ書き続けられるようにする。非対応ブラウザでは使わない。

// --- File System Access の最小型（TSのDOM型に無い場合があるため自前定義） ---
type PermMode = { mode?: "read" | "readwrite" };
interface Permissioned {
  queryPermission?: (opts?: PermMode) => Promise<PermissionState>;
  requestPermission?: (opts?: PermMode) => Promise<PermissionState>;
}
export interface FileHandle extends Permissioned {
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<{ write: (data: Blob | string) => Promise<void>; close: () => Promise<void> }>;
  isSameEntry?: (other: FileHandle) => Promise<boolean>;
}
export interface DirHandle extends Permissioned {
  name: string;
  getFileHandle: (name: string, opts?: { create?: boolean }) => Promise<FileHandle>;
}
type FileTypes = { description?: string; accept: Record<string, string[]> }[];
type SaveFilePicker = (opts?: { suggestedName?: string; types?: FileTypes }) => Promise<FileHandle>;
type OpenFilePicker = (opts?: { types?: FileTypes; multiple?: boolean }) => Promise<FileHandle[]>;
const JSON_TYPES: FileTypes = [{ description: "DesignSync プロジェクト", accept: { "application/json": [".json"] } }];

export const fsSupported = (): boolean => typeof window !== "undefined" && "showSaveFilePicker" in window;

// 保存先ファイルを選ぶ（新規/上書き）
export async function pickSaveFile(suggestedName: string): Promise<FileHandle> {
  const picker = (window as unknown as { showSaveFilePicker: SaveFilePicker }).showSaveFilePicker;
  return picker({ suggestedName, types: JSON_TYPES });
}

// 既存ファイルを開く（読み書き両用のハンドルを得る）
export async function pickOpenFile(): Promise<FileHandle> {
  const picker = (window as unknown as { showOpenFilePicker: OpenFilePicker }).showOpenFilePicker;
  const [h] = await picker({ types: JSON_TYPES, multiple: false });
  return h;
}

// --- ディレクトリ（画像フォルダ用） ---
type DirPicker = (opts?: { mode?: "read" | "readwrite" }) => Promise<DirHandle>;
export const dirSupported = (): boolean => typeof window !== "undefined" && "showDirectoryPicker" in window;
export async function pickDirectory(): Promise<DirHandle> {
  const picker = (window as unknown as { showDirectoryPicker: DirPicker }).showDirectoryPicker;
  return picker({ mode: "readwrite" });
}
// 2つのファイルハンドルが同じ実体か（重複排除に使う）
export async function isSameFile(a: FileHandle, b: FileHandle): Promise<boolean> {
  if (a === b) return true;
  try { return a.isSameEntry ? await a.isSameEntry(b) : false; } catch { return false; }
}

// ハンドルへ書き込み（上書き）
export async function writeHandle(handle: FileHandle, text: string): Promise<void> {
  const w = await handle.createWritable();
  await w.write(new Blob([text], { type: "application/json" }));
  await w.close();
}

// 権限を確認（request=trueなら要求も行う）。書き込み可能なら true。File/Dir どちらでも可。
export async function ensurePermission(handle: Permissioned, request: boolean): Promise<boolean> {
  const q = await handle.queryPermission?.({ mode: "readwrite" });
  if (q === "granted") return true;
  if (!request) return false;
  const r = await handle.requestPermission?.({ mode: "readwrite" });
  return r === "granted";
}

// --- IndexedDB（キー・バリュー1個だけの簡易ストア） ---
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("designsync", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("kv");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function idbSet(key: string, val: unknown): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  const val = await new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction("kv", "readonly");
    const rq = tx.objectStore("kv").get(key);
    rq.onsuccess = () => resolve(rq.result as T | undefined);
    rq.onerror = () => reject(rq.error);
  });
  db.close();
  return val;
}
export async function idbDel(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
