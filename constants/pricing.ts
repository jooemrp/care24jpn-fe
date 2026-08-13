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

/** Format an integer amount of yen as e.g. `¥3,500`. */
export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
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

export type CourseRates = {
  key: string;
  name: Bilingual;
  rows: CourseRateRow[];
};

/**
 * User-facing rate tables shown on /pricing — the customer column of the
 * client's Aug 2026 pricing sheet (per hour, tax included).
 */
export const courseRates: CourseRates[] = [
  {
    key: "care",
    name: { ja: "介護コース", en: "Caregiving course" },
    rows: [
      {
        key: "basic-day",
        label: { ja: "基本料金（1時間あたり）", en: "Basic rate (per hour)" },
        detail: { ja: "9時～18時", en: "9:00 AM – 6:00 PM" },
        price: CAREGIVING_BASIC_DAY_CUSTOMER_RATE,
      },
      {
        key: "basic-night",
        label: { ja: "基本料金（1時間あたり）", en: "Basic rate (per hour)" },
        detail: { ja: "18時～9時", en: "6:00 PM – 9:00 AM" },
        price: 4488,
      },
      {
        key: "nomination",
        label: { ja: "指名料（1時間あたり）", en: "Nomination fee (per hour)" },
        price: 330,
      },
      {
        key: "transport",
        label: { ja: "交通費", en: "Transportation expenses" },
        price: 990,
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
        price: 6600,
      },
      {
        key: "basic-night",
        label: { ja: "基本料金（1時間あたり）", en: "Basic rate (per hour)" },
        detail: { ja: "18時～9時", en: "6:00 PM – 9:00 AM" },
        price: 7920,
      },
      {
        key: "nomination",
        label: { ja: "指名料（1時間あたり）", en: "Nomination fee (per hour)" },
        price: 330,
      },
      {
        key: "transport",
        label: { ja: "交通費", en: "Transportation expenses" },
        price: 990,
      },
    ],
  },
];
