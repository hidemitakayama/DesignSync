import TopBar from "@/components/builder/TopBar";
import Workspace from "@/components/Workspace";
import Persist from "@/components/Persist";
import SyncGuardModal from "@/components/SyncGuardModal";

// 制約付きWebページビルダーのメイン画面。
// 上部バー（画面ナビ＋モード切替）＋ view に応じた作業エリア。
export default function Home() {
  return (
    <div className="flex h-screen flex-col">
      <Persist />
      <TopBar />
      <Workspace />
      <SyncGuardModal />
    </div>
  );
}
