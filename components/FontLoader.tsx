"use client";
import { useEffect } from "react";
import { useBuilder } from "@/lib/store";
import { googleFontsHref, usedFontIds } from "@/lib/fonts";

// 編集中のページで実際に使われているフォントだけを Google Fonts から読み込む。
// 全フォント（34種）をまとめて読むとCSSだけで約4.5MBになるため、使用分に絞る。
// フォントを変更すると page が変わり、その時点で必要なぶんだけ読み足される。
export default function FontLoader() {
  const page = useBuilder((s) => s.page);
  const altPage = useBuilder((s) => s.altPage);

  useEffect(() => {
    const href = googleFontsHref(usedFontIds(page, altPage));
    if (!href) return;
    const ID = "ds-fonts-used";
    let link = document.getElementById(ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = ID;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.getAttribute("href") !== href) link.setAttribute("href", href);
  }, [page, altPage]);

  return null;
}
