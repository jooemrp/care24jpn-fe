"use client";

import { t, type Lang } from "@/features/lang/i18n";
import type { Bilingual } from "@/constants/copy";
import { PhraseText } from "@/components/PhraseText";

export type ResponsiveCopyMode = "always" | "desktop-only";

type ResponsiveCopyProps = {
  text: Bilingual;
  mobileText?: Bilingual;
  lang: Lang;
  mode?: ResponsiveCopyMode;
  className?: string;
  /** Extra classes for the `md:` desktop span only (e.g. a one-line lock). */
  desktopClassName?: string;
};

/**
 * Renders editorial line breaks without forcing a narrow viewport to keep a
 * desktop-only wrap. `desktop-only` keeps the CMS-authored break at `md` and
 * joins it naturally on phones; `always` is the regular pre-line rendering.
 */
export function ResponsiveCopy({
  text,
  mobileText,
  lang,
  mode = "always",
  className = "",
  desktopClassName = "",
}: ResponsiveCopyProps) {
  const value = t(text, lang);
  const classes = className.trim();
  const desktopClasses = desktopClassName.trim();

  if (mode === "always") {
    return <PhraseText text={value} className={`whitespace-pre-line ${classes}`.trim()} />;
  }

  const mobileValue = mobileText
    ? t(mobileText, lang)
    : value.replace(/\s*\n\s*/g, lang === "en" ? " " : "");
  const mobileClassName = mobileText ? "md:hidden whitespace-pre-line" : "md:hidden";
  return (
    <>
      <PhraseText text={mobileValue} className={`${mobileClassName} ${classes}`.trim()} />
      <PhraseText
        text={value}
        className={`hidden md:inline whitespace-pre-line ${classes} ${desktopClasses}`.trim()}
      />
    </>
  );
}
