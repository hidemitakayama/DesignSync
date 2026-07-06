"use client";
import { useEffect } from "react";
import { useImages, isDriveRef, IMG_PLACEHOLDER } from "@/lib/imageStore";

// content が drive:// 参照ならフォルダから解決したURLを返す。通常URL/dataURIはそのまま返す。
export function useImageSrc(content: string | undefined): string {
  const ref = content ?? "";
  const drive = isDriveRef(ref);
  const url = useImages((s) => (drive ? s.cache[ref] : undefined));
  const missing = useImages((s) => (drive ? !!s.missing[ref] : false));
  useEffect(() => {
    if (drive && !url && !missing) useImages.getState().resolve(ref);
  }, [drive, ref, url, missing]);
  if (!drive) return ref;
  return url ?? IMG_PLACEHOLDER;
}
