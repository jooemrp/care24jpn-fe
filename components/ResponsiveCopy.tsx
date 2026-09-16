"use client";

import { t, type Lang } from "@/features/lang/i18n";
import type { Bilingual } from "@/constants/copy";

export type ResponsiveCopyMode = "always" | "desktop-only";

type ResponsiveCopyProps = {
  text: Bilingual;
  lang: Lang;
  mode?: ResponsiveCopyMode;
  className?: string;
};

/**
 * Renders editorial line breaks without forcing a narrow viewport to keep a
 * desktop-only wrap. `desktop-only` keeps the CMS-authored break at `md` and
 * joins it naturally on phones; `always` is the regular pre-line rendering.
 */
export function ResponsiveCopy({
  text,
  lang,
  mode = "always",
  className = "",
}: ResponsiveCopyProps) {
  const value = t(text, lang);
  const classes = className.trim();

  if (mode === "always") {
    return <span className={`whitespace-pre-line ${classes}`.trim()}>{value}</span>;
  }

  const mobileValue = value.replace(/\s*\n\s*/g, lang === "en" ? " " : "");
  return (
    <>
      <span className={`md:hidden ${classes}`.trim()}>{mobileValue}</span>
      <span className={`hidden md:inline whitespace-pre-line ${classes}`.trim()}>{value}</span>
    </>
  );
}
