"use client";
import { Lock } from "lucide-react";
import { useBuilder } from "@/lib/store";
import Builder from "./builder/Builder";
import AssetLibrary from "./assets/AssetLibrary";
import Studio from "./studio/Studio";
import TemplatesLibrary from "./templates/TemplatesLibrary";

// view に応じて中身を出し分ける。管理者専用画面はクライアントには出さない。
export default function Workspace() {
  const view = useBuilder((s) => s.view);
  const mode = useBuilder((s) => s.mode);

  const adminOnly = view === "assets" || view === "studio";
  if (adminOnly && mode === "client") {
    return (
      <div className="grid flex-1 place-items-center bg-slate-50">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <Lock size={22} />
          <p className="text-sm font-semibold">この画面は管理者専用です</p>
        </div>
      </div>
    );
  }

  switch (view) {
    case "assets":
      return <AssetLibrary />;
    case "studio":
      return <Studio />;
    case "templates":
      return <TemplatesLibrary />;
    default:
      return <Builder />;
  }
}
