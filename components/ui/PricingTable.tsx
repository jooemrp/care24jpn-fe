"use client";

import Link from "next/link";
import { formatYen, type PricingPlan } from "@/constants/pricing";
import { cta, type Bilingual } from "@/constants/copy";
import { useLangStore, t } from "@/features/lang/store";

type PricingTableProps = {
  plans: PricingPlan[];
  note?: Bilingual;
};

export default function PricingTable({ plans, note }: PricingTableProps) {
  const { lang } = useLangStore();

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan, i) => (
          <article
            key={plan.key}
            className={`flex flex-col rounded-2xl border bg-surface p-6 shadow-sm transition-shadow duration-200 hover:shadow-md animate-fade-up ${
              plan.featured
                ? "border-primary ring-1 ring-primary"
                : "border-border"
            }`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {plan.featured && (
              <span className="mb-3 inline-flex w-fit rounded-full bg-accent-light px-3 py-1 text-xs font-medium text-accent">
                {lang === "ja" ? "おすすめ" : "Recommended"}
              </span>
            )}

            <h3 className="text-xl font-bold text-heading">{t(plan.name, lang)}</h3>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-heading">
                {formatYen(plan.price)}
              </span>
              <span className="text-xs uppercase tracking-widest text-muted">
                {t(plan.unit, lang)}
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-body">
              {t(plan.description, lang)}
            </p>

            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature.en} className="flex gap-2 text-sm text-body">
                  <span aria-hidden="true" className="text-primary">✓</span>
                  <span>{t(feature, lang)}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/service-flow"
              className={`mt-6 inline-flex justify-center rounded-full px-8 py-3 text-sm font-medium transition ${
                plan.featured
                  ? "bg-accent text-white hover:opacity-90"
                  : "border-2 border-primary text-primary hover:bg-primary-light"
              }`}
            >
              {t(cta.primary, lang)}
            </Link>
          </article>
        ))}
      </div>

      {note && (
        <p className="text-xs text-muted">{t(note, lang)}</p>
      )}
    </div>
  );
}
