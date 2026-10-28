import type { Lang } from "@/features/lang/i18n";

/** Date in the reader's language, pinned to Japan time (the site's market). */
export function formatDate(iso: string | undefined, lang: Lang): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(lang === "ja" ? "ja-JP" : "en-US", {
    dateStyle: "long",
    timeZone: "Asia/Tokyo",
  }).format(date);
}
