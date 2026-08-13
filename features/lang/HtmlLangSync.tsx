"use client";

import { useEffect } from "react";
import { useLangStore } from "@/features/lang/store";

export function HtmlLangSync() {
  const lang = useLangStore((s) => s.lang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
}
