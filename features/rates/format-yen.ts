import type { Lang } from "@/features/lang/i18n";

/** Formats a CMS-provided numeric amount without supplying or looking up a price. */
export function formatYen(amount: number, lang: Lang): string {
  const grouped = amount.toLocaleString(lang === "ja" ? "ja-JP" : "en-US");
  return lang === "ja" ? `¥${grouped}` : `JPY ${grouped}`;
}
