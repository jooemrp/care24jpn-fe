import type { Bilingual } from "./types";

/**
 * Applies a narrowly-scoped copy migration during a drift-gated CMS rollout.
 * Only the exact legacy locale values are replaced; any other dashboard edit
 * remains authoritative.
 */
export function replaceExactBilingual(
  value: Bilingual,
  fallback: Bilingual,
  legacy: Partial<Record<keyof Bilingual, string | readonly string[]>>,
): Bilingual {
  const matches = (current: string, candidate: string | readonly string[] | undefined) =>
    candidate !== undefined && (Array.isArray(candidate) ? candidate.includes(current) : current === candidate);

  return {
    ja: matches(value.ja, legacy.ja) ? fallback.ja : value.ja,
    en: matches(value.en, legacy.en) ? fallback.en : value.en,
  };
}
