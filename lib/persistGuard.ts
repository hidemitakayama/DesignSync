// クライアントモード中は「保存・同期を一切行わない」ためのガード。
// localStorage への書き込みだけを止める（読み込みは可＝管理者が保存した内容は見られる）。
// 管理者モードに入ったときだけ書き込みを許可する（store.ts の setMode が切り替える）。
// 循環importを避けるため、mode 本体ではなく真偽値だけをこのモジュールで持つ。
import { createJSONStorage } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";

let writable = false; // 既定はクライアント（＝書き込み禁止）。管理者の解錠で true になる。

export const setPersistWritable = (b: boolean) => { writable = b; };
export const isPersistWritable = () => writable;

const guarded: StateStorage = {
  getItem: (name) => (typeof window === "undefined" ? null : window.localStorage.getItem(name)),
  setItem: (name, value) => { if (writable && typeof window !== "undefined") window.localStorage.setItem(name, value); },
  removeItem: (name) => { if (writable && typeof window !== "undefined") window.localStorage.removeItem(name); },
};

// zustand persist の storage オプションに渡す（ドキュメント系ストア専用）。
export const guardedStorage = () => createJSONStorage(() => guarded);
