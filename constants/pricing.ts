/**
 * Care 24 Japan — All ¥ values live here.
 *
 * RULES:
 * - Never hardcode ¥ values inside components — import from this file.
 * - All numbers below are the live, client-reviewed prices. Edit here —
 *   never inline in components.
 * - Store amounts as plain integers (yen). Format with `formatYen()`.
 */

import type { Bilingual } from "./copy";
import type { Lang } from "@/features/lang/i18n";

/**
 * Format an integer amount of yen for display — `¥3,500` on `ja`, `JPY 3,500`
 * on `en` (client decision, Aug 2026: the EN site reads by English currency
 * convention, not by mirroring the JA symbol).
 *
 * The digit grouping itself is locale-aware in its plumbing only: for every
 * amount this site renders, `ja-JP` and `en-US` group digits identically (no
 * amount here reaches the thousand-separator edge cases where the two
 * locales diverge), so only the currency marker moves between the two
 * branches, never the digits. Do NOT switch the `ja` branch to
 * `Intl.NumberFormat(..., { style: "currency", currency: "JPY" })` —
 * `ja-JP` emits the full-width ￥ (U+FFE5), not the halfwidth ¥ this site has
 * always used, and would change every price on every JA page.
 */
export function formatYen(amount: number, lang: Lang): string {
  const grouped = amount.toLocaleString(lang === "ja" ? "ja-JP" : "en-US");
  return lang === "ja" ? `¥${grouped}` : `JPY ${grouped}`;
}

/**
 * Daytime (9:00 AM – 6:00 PM) basic caregiving rate — shared by the
 * care-supporter wage table (`supporterRates`) and the customer-facing rate
 * table (`courseRates`) so the two can never drift apart.
 */
const CAREGIVING_BASIC_DAY_CUSTOMER_RATE = 3740;

export type SupporterRateRow = {
  key: string;
  label: Bilingual;
  /** Optional sub-label, e.g. the time band for this row. */
  detail?: Bilingual;
  /** What the customer pays — integer yen, tax included. */
  customer: number;
  /** What the care supporter receives — integer yen, tax included. */
  supporter: number;
};

export type SupporterRates = {
  key: string;
  name: Bilingual;
  rows: SupporterRateRow[];
};

/**
 * Care-supporter wage tables shown on /fees (client sheet Aug 2026):
 * customer price vs. care-supporter pay, per hour, tax included.
 */
export const supporterRates: SupporterRates[] = [
  {
    key: "care",
    name: { ja: "介護コース", en: "Caregiving course" },
    rows: [
      {
        key: "basic-day",
        label: { ja: "基本料金（1時間あたり）", en: "Basic rate (per hour)" },
        detail: { ja: "9時～18時", en: "9:00 AM – 6:00 PM" },
        customer: CAREGIVING_BASIC_DAY_CUSTOMER_RATE,
        supporter: 2000,
      },
      {
        key: "basic-night",
        label: { ja: "基本料金（1時間あたり）", en: "Basic rate (per hour)" },
        detail: { ja: "18時～9時", en: "6:00 PM – 9:00 AM" },
        customer: 4488,
        supporter: 2200,
      },
      {
        key: "nomination",
        label: { ja: "指名料（1時間あたり）", en: "Nomination fee (per hour)" },
        customer: 330,
        supporter: 330,
      },
      {
        key: "transport",
        label: { ja: "交通費", en: "Transportation expenses" },
        customer: 990,
        supporter: 990,
      },
    ],
  },
  {
    key: "nursing",
    name: { ja: "看護コース", en: "Nursing course" },
    rows: [
      {
        key: "basic-day",
        label: { ja: "基本料金（1時間あたり）", en: "Basic rate (per hour)" },
        detail: { ja: "9時～18時", en: "9:00 AM – 6:00 PM" },
        customer: 6600,
        supporter: 3300,
      },
      {
        key: "basic-night",
        label: { ja: "基本料金（1時間あたり）", en: "Basic rate (per hour)" },
        detail: { ja: "18時～9時", en: "6:00 PM – 9:00 AM" },
        customer: 7920,
        supporter: 3630,
      },
      {
        key: "nomination",
        label: { ja: "指名料（1時間あたり）", en: "Nomination fee (per hour)" },
        customer: 330,
        supporter: 330,
      },
      {
        key: "transport",
        label: { ja: "交通費", en: "Transportation expenses" },
        customer: 990,
        supporter: 990,
      },
    ],
  },
];

export type CourseRateRow = {
  key: string;
  label: Bilingual;
  /** Optional sub-label, e.g. the time band or condition for this row. */
  detail?: Bilingual;
  /** Integer yen amount for this row. */
  price: number;
};

/**
 * `CourseRates`/`CourseRateRow` are still exported: `features/cms/rates.ts`
 * imports `CourseRates` for its `/pricing` projection (`getCourseRates()`).
 * The module-level fallback ARRAY that used to live here was dead code —
 * `getCourseRates()` derives its fallback from `supporterRates` above via
 * `features/cms/rates.ts`'s `FALLBACK_TABLE`, never from a second literal —
 * so it was deleted (ST-G2). Do not re-add a `courseRates` value here.
 */
export type CourseRates = {
  key: string;
  name: Bilingual;
  rows: CourseRateRow[];
};
