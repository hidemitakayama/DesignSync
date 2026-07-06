// ショートカット一覧（マニュアルの唯一の情報源）。ヘルプモーダルはこれを表示する。
// 実際のキー処理は各画面のハンドラ側にあるが、表記はここに集約する。

export interface Shortcut { keys: string; desc: string }
export interface ShortcutGroup { title: string; items: Shortcut[] }

const MOD = "⌘/Ctrl";

export const SHORTCUTS: ShortcutGroup[] = [
  {
    title: "全般",
    items: [
      { keys: `${MOD}+Z`, desc: "元に戻す" },
      { keys: `${MOD}+Shift+Z / ${MOD}+Y`, desc: "やり直す" },
      { keys: `${MOD}+C`, desc: "コピー" },
      { keys: `${MOD}+V`, desc: "ペースト" },
      { keys: `${MOD}+S`, desc: "プロジェクトを保存（.json）" },
      { keys: "?", desc: "このショートカット一覧を開く" },
      { keys: "Esc", desc: "選択解除 / ダイアログを閉じる" },
    ],
  },
  {
    title: "ビルダー",
    items: [
      { keys: "Delete / Backspace", desc: "選択した要素を削除" },
      { keys: `${MOD}+D`, desc: "選択した要素を複製" },
      { keys: "Esc", desc: "選択解除" },
    ],
  },
  {
    title: "スタジオ：ツール切替",
    items: [
      { keys: "V", desc: "選択ツール" },
      { keys: "P", desc: "ペンツール" },
      { keys: "N", desc: "曲線（ノード）ツール" },
    ],
  },
  {
    title: "スタジオ：要素を追加",
    items: [
      { keys: "R", desc: "四角形" },
      { keys: "O", desc: "円" },
      { keys: "T", desc: "テキスト" },
      { keys: "I", desc: "画像" },
      { keys: "S", desc: "SVG" },
    ],
  },
  {
    title: "スタジオ：編集",
    items: [
      { keys: `${MOD}+A`, desc: "すべて選択" },
      { keys: `${MOD}+D`, desc: "複製" },
      { keys: `${MOD}+G / ${MOD}+Shift+G`, desc: "グループ化 / 解除" },
      { keys: "Delete / Backspace", desc: "削除" },
      { keys: "矢印キー", desc: "1px 移動" },
      { keys: "Shift + 矢印キー", desc: "10px 移動" },
      { keys: "Esc", desc: "選択解除 / ツール終了" },
    ],
  },
  {
    title: "スタジオ：表示（ズーム/パン）",
    items: [
      { keys: `${MOD} + ホイール`, desc: "拡大縮小（カーソル中心）" },
      { keys: "Shift + ホイール", desc: "左右移動" },
      { keys: "ホイールクリック＋ドラッグ", desc: "自由にパン" },
    ],
  },
  {
    title: "スタジオ：ペン / 曲線ツール",
    items: [
      { keys: "クリック", desc: "点を追加" },
      { keys: "ダブルクリック", desc: "直角モード切替（ペン）/ 曲線⇄角（曲線ツール）" },
      { keys: "Enter", desc: "パスを確定（ペン）" },
      { keys: "Alt + クリック", desc: "点を削除（曲線ツール）" },
    ],
  },
];
