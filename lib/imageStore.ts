// アップロードした画像を「Googleドライブ同期フォルダ」に格納し、JSONには drive://ファイル名 という
// パスだけを保存する。表示時はフォルダからファイルを読み出して objectURL 化して表示する。
// これにより JSON は軽いまま、画像本体は Drive（クラウド）に置け、別PCでも同フォルダを開けば表示できる。

import { create } from "zustand";
import { pickDirectory, ensurePermission, idbGet, idbSet, type DirHandle } from "./fsHandle";

const PREFIX = "drive://";
export const isDriveRef = (s?: string | null): boolean => !!s && s.startsWith(PREFIX);
const nameOf = (ref: string) => ref.slice(PREFIX.length);
const extOf = (file: File) => {
  const m = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  return (m ? m[1] : file.type.split("/")[1] || "png").toLowerCase();
};

// 解決前・見つからない時に出すプレースホルダ
export const IMG_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#94a3b8" font-family="sans-serif" font-size="13">画像</text></svg>',
  );

let counter = 0;
const newName = (file: File) => { counter += 1; return `img-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 7)}.${extOf(file)}`; };

interface ImageState {
  dir: DirHandle | null;
  dirName: string | null;
  hydrated: boolean;
  cache: Record<string, string>; // ref -> objectURL
  missing: Record<string, true>; // 見つからない ref
  hydrate: () => Promise<DirHandle | null>;
  chooseDir: () => Promise<boolean>;
  reconnect: () => Promise<boolean>;
  upload: (file: File) => Promise<string>;
  resolve: (ref: string) => Promise<void>;
}

export const useImages = create<ImageState>((set, get) => ({
  dir: null,
  dirName: null,
  hydrated: false,
  cache: {},
  missing: {},

  // 保存済みのフォルダハンドルを IndexedDB から復元（権限要求はしない）。
  hydrate: async () => {
    const s = get();
    if (s.dir) return s.dir;
    if (s.hydrated) return null;
    const h = await idbGet<DirHandle>("imageDir").catch(() => undefined);
    set({ hydrated: true });
    if (h) { set({ dir: h, dirName: h.name }); return h; }
    return null;
  },

  chooseDir: async () => {
    try {
      const dir = await pickDirectory();
      await idbSet("imageDir", dir);
      set({ dir, dirName: dir.name, missing: {} });
      return true;
    } catch { return false; }
  },

  reconnect: async () => {
    const dir = get().dir ?? (await get().hydrate());
    if (!dir) return get().chooseDir();
    const ok = await ensurePermission(dir, true);
    if (ok) set({ missing: {} });
    return ok;
  },

  // 画像をフォルダへ書き込み、drive://名 を返す。
  upload: async (file) => {
    let dir = get().dir ?? (await get().hydrate());
    if (!dir) { if (!(await get().chooseDir())) throw new Error("画像フォルダが選択されていません"); dir = get().dir!; }
    if (!(await ensurePermission(dir, true))) throw new Error("画像フォルダへの書き込み許可が得られませんでした");
    const name = newName(file);
    const fh = await dir.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(file);
    await w.close();
    const ref = PREFIX + name;
    set((st) => ({ cache: { ...st.cache, [ref]: URL.createObjectURL(file) } })); // 即時表示
    return ref;
  },

  // 表示用URLを用意（非同期で cache を更新 → 再描画で反映）。
  resolve: async (ref) => {
    const s = get();
    if (!isDriveRef(ref) || s.cache[ref] || s.missing[ref]) return;
    const dir = s.dir ?? (await get().hydrate());
    if (!dir) return; // フォルダ未接続。UI から接続を促す
    try {
      if (!(await ensurePermission(dir, false))) return; // 権限が無ければ待つ（要求はユーザー操作で）
      const fh = await dir.getFileHandle(nameOf(ref));
      const url = URL.createObjectURL(await fh.getFile());
      set((st) => ({ cache: { ...st.cache, [ref]: url } }));
    } catch {
      set((st) => ({ missing: { ...st.missing, [ref]: true } }));
    }
  },
}));

// URL / dataURL の画像を取得して Drive フォルダに保存し drive:// 参照を返す（失敗時 null）。
// 取り込み時に外部画像をローカル(Drive)へ持ってくるために使う。
export async function uploadFromSrc(src: string, name = "img"): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith("drive://")) return src;
  try {
    const res = await fetch(src, src.startsWith("data:") ? {} : { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const ext = (blob.type.split("/")[1] || "png").split("+")[0];
    const file = new File([blob], `${name}.${ext}`, { type: blob.type || "image/png" });
    return await useImages.getState().upload(file);
  } catch {
    return null;
  }
}

// エクスポート（ラスタライズ）用：drive:// を dataURI にして埋め込む。
export async function refToDataUri(ref: string): Promise<string | null> {
  if (!isDriveRef(ref)) return null;
  const dir = useImages.getState().dir ?? (await useImages.getState().hydrate());
  if (!dir) return null;
  try {
    if (!(await ensurePermission(dir, false))) return null;
    const fh = await dir.getFileHandle(nameOf(ref));
    const file = await fh.getFile();
    return await new Promise<string | null>((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = () => res(null);
      fr.readAsDataURL(file);
    });
  } catch { return null; }
}
