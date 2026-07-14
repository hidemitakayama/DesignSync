// UIの一時状態（レイヤーの開閉など）。ドキュメントとは別に localStorage に保存する。
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PreviewDevice = "pc" | "sp"; // プレビュー幅：PC（全幅）/ SP（スマホ幅）
// Cursorライブ同期の状態："off"=未設定 / "disconnected"=設定済みだが未接続（再接続が必要） / "active"=同期中
export type SyncState = "off" | "disconnected" | "active";

interface UiState {
  // 開いているコンテナid（未登録＝畳む）。既定は全て畳む。保存しない（毎回たたんだ状態で開始）。
  expanded: Record<string, boolean>;
  toggleExpanded: (id: string) => void;
  openPath: (ids: string[]) => void; // 指定idだけ開く（他は畳む）＝選択パスのみ展開
  previewDevice: PreviewDevice; // ビルダーのプレビュー表示幅
  setPreviewDevice: (d: PreviewDevice) => void;
  zoom: number; // ビルダーキャンバスの拡大率（1=100%）
  setZoom: (z: number) => void; // 0.25〜2 にクランプ
  pathEditId: string | null; // パス変形（頂点編集）中の要素id。nullで編集オフ
  setPathEditId: (id: string | null) => void;
  syncState: SyncState; // Cursor同期の状態（LiveSyncが更新）
  setSyncState: (s: SyncState) => void;
  syncWarnAck: boolean; // 未接続編集の警告を今回のセッションで確認済みか
  setSyncWarnAck: (b: boolean) => void;
  syncGuardOpen: boolean; // 未接続時の中央モーダルを表示中か
  openSyncGuard: () => void;
  closeSyncGuard: () => void;
  // LiveSync が登録する「既存の内容のまま同期を再開（自動保存）」関数。未接続時はnull。
  syncReconnect: (() => void | Promise<void>) | null;
  setSyncReconnect: (f: (() => void | Promise<void>) | null) => void;
}

export const ZOOM_MIN = 0.25, ZOOM_MAX = 2;
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      expanded: {},
      toggleExpanded: (id) => set((s) => ({ expanded: { ...s.expanded, [id]: !s.expanded[id] } })),
      openPath: (ids) => set(() => ({ expanded: Object.fromEntries(ids.map((id) => [id, true])) })),
      previewDevice: "pc",
      setPreviewDevice: (d) => set({ previewDevice: d }),
      zoom: 1,
      setZoom: (z) => set({ zoom: clampZoom(z) }),
      pathEditId: null,
      setPathEditId: (id) => set({ pathEditId: id }),
      syncState: "off",
      // 接続できたら警告確認フラグとモーダルをリセット（次に未接続になったら再び警告）
      setSyncState: (s) => set(s === "active" ? { syncState: s, syncWarnAck: false, syncGuardOpen: false } : { syncState: s }),
      syncWarnAck: false,
      setSyncWarnAck: (b) => set({ syncWarnAck: b }),
      syncGuardOpen: false,
      openSyncGuard: () => set({ syncGuardOpen: true, syncWarnAck: true }),
      closeSyncGuard: () => set({ syncGuardOpen: false }),
      syncReconnect: null,
      setSyncReconnect: (f) => set({ syncReconnect: f }),
    }),
    // 開閉状態は保存しない（previewDevice と zoom のみ保存）。
    {
      name: "design-sync-ui",
      version: 4,
      skipHydration: true,
      partialize: (s) => ({ previewDevice: s.previewDevice, zoom: s.zoom }),
      // v4：全幅表示のため、以前の中途半端なズーム率は 100% にリセットする。
      migrate: (persisted) => {
        const p = persisted as { previewDevice?: PreviewDevice } | undefined;
        return { previewDevice: p?.previewDevice ?? "pc", zoom: 1 };
      },
    },
  ),
);

// 未接続（同期前）に編集しようとしたとき、中央モーダルで復旧の選択肢を出す。
// セッション内で一度（確認/解決するまで）。ビルダー/スタジオの操作開始時から呼ぶ。
export function warnIfUnsynced(): void {
  const s = useUi.getState();
  if (s.syncState === "disconnected" && !s.syncWarnAck && !s.syncGuardOpen) s.openSyncGuard();
}
