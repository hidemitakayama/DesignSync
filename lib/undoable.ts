// Zustand ストア向けの軽量な Undo/Redo。外部ライブラリなし。
// 「追跡スライス」(pick) の変化を監視し、ドラッグ/スライダー等の連続変更は
// バースト単位で1つの履歴にまとめる（＝1操作＝1 undo）。
// past/future はストアの状態に持たせ、length を購読すればボタンの活性を反応させられる。

import type { StoreApi } from "zustand";

export interface HistoryConfig<T, S> {
  pick: (s: T) => S; // 追跡するスナップショット（ページや要素など不変参照）
  changed: (a: S, b: S) => boolean; // 追跡対象が変わったか
  put: (snap: S) => Partial<T>; // スナップショットを状態へ書き戻す（選択のリセット等も含めてよい）
  readStacks: (s: T) => { past: S[]; future: S[] };
  writeStacks: (past: S[], future: S[]) => Partial<T>;
  limit?: number; // 履歴の上限
  debounceMs?: number; // バーストの区切り（この時間 変化が無ければ1操作の終わり）
}

export interface HistoryApi {
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

export function wireHistory<T extends object, S>(store: StoreApi<T>, cfg: HistoryConfig<T, S>): HistoryApi {
  const limit = cfg.limit ?? 100;
  const debounceMs = cfg.debounceMs ?? 250;

  let committed = cfg.pick(store.getState()); // 直近で確定しているスナップショット
  let burst = false; // 連続変更（ドラッグ等）の最中か
  let timer: ReturnType<typeof setTimeout> | null = null;
  let traveling = false; // undo/redo/履歴更新による setState を無視するフラグ

  const stopTimer = () => { if (timer) { clearTimeout(timer); timer = null; } };

  store.subscribe((state, prev) => {
    if (traveling) return;
    const cur = cfg.pick(state);
    if (!cfg.changed(cfg.pick(prev), cur)) return; // 追跡対象が変わっていなければ無視（選択や履歴スタックの変化など）
    // バースト開始時に「変更前の状態(committed)」を past に積み、future を捨てる
    if (!burst) {
      const { past } = cfg.readStacks(state);
      traveling = true;
      store.setState(cfg.writeStacks([...past, committed].slice(-limit), []) as Partial<T>);
      traveling = false;
      burst = true;
    }
    committed = cur;
    stopTimer();
    timer = setTimeout(() => { burst = false; timer = null; }, debounceMs);
  });

  const flush = () => { stopTimer(); burst = false; }; // 進行中バーストを確定

  const undo = () => {
    flush();
    const s = store.getState();
    const { past, future } = cfg.readStacks(s);
    if (past.length === 0) return;
    const snap = past[past.length - 1];
    const curSnap = cfg.pick(s);
    traveling = true;
    store.setState({ ...cfg.put(snap), ...cfg.writeStacks(past.slice(0, -1), [curSnap, ...future].slice(0, limit)) } as Partial<T>);
    traveling = false;
    committed = cfg.pick(store.getState());
  };

  const redo = () => {
    flush();
    const s = store.getState();
    const { past, future } = cfg.readStacks(s);
    if (future.length === 0) return;
    const snap = future[0];
    const curSnap = cfg.pick(s);
    traveling = true;
    store.setState({ ...cfg.put(snap), ...cfg.writeStacks([...past, curSnap].slice(-limit), future.slice(1)) } as Partial<T>);
    traveling = false;
    committed = cfg.pick(store.getState());
  };

  const clear = () => {
    flush();
    traveling = true;
    store.setState(cfg.writeStacks([], []) as Partial<T>);
    traveling = false;
    committed = cfg.pick(store.getState());
  };

  return { undo, redo, clear };
}
