/**
 * Care 24 Japan — All ¥ values live here.
 *
 * RULES:
 * - Never hardcode ¥ values inside components — import from this file.
 * - All numbers below are EDITABLE PLACEHOLDERS. Replace with real prices.
 * - Store amounts as plain integers (yen). Format with `formatYen()`.
 */

import type { Bilingual } from "./copy";

/** Format an integer amount of yen as e.g. `¥3,500`. */
export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export type PricingPlan = {
  /** Stable key for React lists. */
  key: string;
  name: Bilingual;
  /** Integer yen. */
  price: number;
  /** Billing unit, e.g. per hour / per month. */
  unit: Bilingual;
  description: Bilingual;
  features: Bilingual[];
  /** Visually emphasize this plan as the recommended option. */
  featured?: boolean;
};

/** Main care plans shown on /pricing. */
export const plans: PricingPlan[] = [
  {
    key: "spot",
    name: { ja: "スポット訪問", en: "Spot visit" },
    price: 3500,
    unit: { ja: "1時間あたり", en: "per hour" },
    description: {
      ja: "必要なときだけ、時間単位でご利用いただけるプランです。",
      en: "Pay-as-you-go care, billed by the hour.",
    },
    features: [
      { ja: "1時間から利用可能", en: "From 1 hour" },
      { ja: "生活援助・身体介護", en: "Daily-living & personal care" },
      { ja: "事前予約制", en: "Advance booking" },
    ],
  },
  {
    key: "daily",
    name: { ja: "デイリーケア", en: "Daily care" },
    price: 180000,
    unit: { ja: "1ヶ月あたり", en: "per month" },
    description: {
      ja: "毎日決まった時間に訪問する、定期ケアプランです。",
      en: "Scheduled daily visits on a monthly plan.",
    },
    features: [
      { ja: "毎日の定期訪問", en: "Daily scheduled visits" },
      { ja: "担当スタッフ制", en: "Dedicated caregiver" },
      { ja: "ケア記録の共有", en: "Shared care records" },
      { ja: "ご家族への定期報告", en: "Regular family updates" },
    ],
    featured: true,
  },
  {
    key: "live-in",
    name: { ja: "24時間ケア", en: "24-hour care" },
    price: 580000,
    unit: { ja: "1ヶ月あたり", en: "per month" },
    description: {
      ja: "昼夜を通して常駐し、24時間体制で見守るプランです。",
      en: "Round-the-clock live-in care, day and night.",
    },
    features: [
      { ja: "24時間常駐ケア", en: "Round-the-clock presence" },
      { ja: "看護師との連携", en: "Nurse coordination" },
      { ja: "緊急時の即時対応", en: "Immediate emergency response" },
      { ja: "オーダーメイドのケアプラン", en: "Fully customized plan" },
    ],
  },
];

export type StaffRate = {
  key: string;
  role: Bilingual;
  /** Integer yen per hour. */
  hourlyRate: number;
  description: Bilingual;
};

/** Per-staff hourly rates shown on /staff-pricing. */
export const staffRates: StaffRate[] = [
  {
    key: "home-helper",
    role: { ja: "ホームヘルパー", en: "Home helper" },
    hourlyRate: 2800,
    description: {
      ja: "掃除・調理・買い物など、日常生活の援助を行います。",
      en: "Support with cleaning, cooking, and errands.",
    },
  },
  {
    key: "certified-care-worker",
    role: { ja: "介護福祉士", en: "Certified care worker" },
    hourlyRate: 3500,
    description: {
      ja: "国家資格を持ち、身体介護を含む専門的なケアを提供します。",
      en: "Certified professional providing personal and physical care.",
    },
  },
  {
    key: "nurse",
    role: { ja: "看護師", en: "Registered nurse" },
    hourlyRate: 5200,
    description: {
      ja: "医療的ケアや健康管理を担当する有資格の看護師です。",
      en: "Licensed nurse for medical care and health management.",
    },
  },
];

/** Surcharge applied to night / early-morning hours, as a multiplier. */
export const nightSurchargeMultiplier = 1.25;

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
        customer: 3740,
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
        price: 3740,
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
