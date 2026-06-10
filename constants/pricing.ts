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
