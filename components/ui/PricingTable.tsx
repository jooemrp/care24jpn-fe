"use client";

import Link from "next/link";
import { formatYen } from "@/constants/pricing";
import { useLangStore, t } from "@/features/lang/store";
import type { BilingualSection, BilingualService } from "@/features/cms/types";

type PricingTableProps = {
  planSections: BilingualSection[];
  feeService?: BilingualService;
  note?: string;
};

function planField(section: BilingualSection, key: string, lang: "ja" | "en"): string {
  return section.fields?.[key]?.[lang] ?? "";
}

function planPrice(section: BilingualSection, lang: "ja" | "en"): number {
  return parseInt(planField(section, "price", lang), 10) || 0;
}

function planFeatured(section: BilingualSection, lang: "ja" | "en"): boolean {
  return planField(section, "featured", lang) === "true";
}

const ITEM_LABELS: Record<string, { ja: string; en: string }> = {
  nomination_fee:      { ja: "指名料", en: "Nomination fee" },
  transport_fee:       { ja: "交通費", en: "Transport fee" },
  same_day_surcharge:  { ja: "当日割増", en: "Same-day surcharge" },
};

const UNIT_LABELS: Record<string, { ja: string; en: string }> = {
  per_hour: { ja: "時間", en: "hr" },
  per_use:  { ja: "回", en: "use" },
};

function pricingItemLabel(itemKey: string, lang: "ja" | "en"): string {
  return ITEM_LABELS[itemKey]?.[lang] ?? itemKey;
}


export default function PricingTable({ planSections, feeService, note }: PricingTableProps) {
  const { lang } = useLangStore();

  const sorted = [...planSections].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      {sorted.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-3">
          {sorted.map((section, i) => {
            const featured = planFeatured(section, lang);
            return (
              <article
                key={section.section_key}
                className={`flex flex-col rounded-2xl border bg-surface p-6 shadow-sm transition-shadow duration-200 hover:shadow-md animate-fade-up ${
                  featured
                    ? "border-primary ring-1 ring-primary"
                    : "border-border"
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {featured && (
                  <span className="mb-3 inline-flex w-fit rounded-full bg-accent-light px-3 py-1 text-xs font-medium text-accent">
                    {lang === "ja" ? "おすすめ" : "Recommended"}
                  </span>
                )}

                <h3 className="text-xl font-bold text-heading">
                  {planField(section, "name", lang) || section.section_key}
                </h3>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-heading">
                    {formatYen(planPrice(section, lang))}
                  </span>
                  <span className="text-xs uppercase tracking-widest text-muted">
                    {planField(section, "unit", lang)}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-body">
                  {planField(section, "description", lang)}
                </p>

                <ul className="mt-6 flex-1 space-y-3">
                  {section.items.map((item) => (
                    <li key={item.id} className="flex gap-2 text-sm text-body">
                      <span aria-hidden="true" className="text-primary shrink-0">✓</span>
                      <span>{item.fields.feature?.[lang] ?? ""}</span>
                    </li>
                  ))}
                </ul>

                {section.cta_buttons?.[0] && (
                  <Link
                    href={section.cta_buttons[0].url}
                    className={`mt-6 inline-flex justify-center rounded-full px-8 py-3 text-sm font-medium transition ${
                      featured
                        ? "bg-accent text-white hover:opacity-90"
                        : "border-2 border-primary text-primary hover:bg-primary-light"
                    }`}
                  >
                    {t(section.cta_buttons[0].label, lang)}
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted">
          {lang === "ja" ? "現在、掲載している情報はありません。" : "No pricing information available."}
        </p>
      )}

      {feeService && feeService.items.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h4 className="text-sm font-bold text-heading mb-4">
            {lang === "ja" ? "その他料金" : "Additional fees"}
          </h4>
          <ul className="space-y-2">
            {feeService.items.filter((i) => i.price != null && i.unit != null).map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-4 text-sm text-body">
                <span>{pricingItemLabel(item.item_key, lang)}</span>
                <span className="text-heading font-medium">
                  {formatYen(item.price!)} / {UNIT_LABELS[item.unit!]?.[lang] ?? item.unit}
                </span>
              </li>
            ))}
            {feeService.items
              .filter((i) => i.price == null && i.unit === "percentage")
              .map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-4 text-sm text-body">
                  <span>{pricingItemLabel(item.item_key, lang)}</span>
                  <span className="text-heading font-medium">
                    {lang === "ja" ? "別途" : "extra"}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {note && (
        <p className="text-xs text-muted">{note}</p>
      )}
    </div>
  );
}
