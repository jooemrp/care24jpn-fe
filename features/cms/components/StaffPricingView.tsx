"use client";

import Section from "@/components/ui/Section";
import TabPanel, { type Tab } from "@/components/ui/TabPanel";
import { staffPricing as fallbackCopy } from "@/constants/copy";
import { formatYen } from "@/constants/pricing";
import { useLangStore, t } from "@/features/lang/store";
import type { Lang } from "@/features/lang/store";
import { findSection, getField } from "@/features/cms/mapping";
import type { BilingualPageData, BilingualService } from "@/features/cms/types";

const ITEM_LABELS: Record<string, { ja: string; en: string }> = {
  base_rate:      { ja: "基本報酬（時給）", en: "Hourly base rate" },
  nomination_fee: { ja: "指名料バック", en: "Nomination fee back" },
  transport_fee:  { ja: "交通費支給", en: "Transport allowance" },
};

function itemLabel(itemKey: string, lang: Lang): string {
  return ITEM_LABELS[itemKey]?.[lang] ?? itemKey;
}

function nightRate(price: number): number {
  return Math.round(price * 1.25);
}

function serviceToTab(service: BilingualService, lang: Lang): Tab {
  const baseRate = service.items.find(
    (i) => i.item_key === "base_rate" && i.price != null
  );

  return {
    key: service.slug,
    label: service.name,
    content: (
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <p className="text-xs uppercase tracking-widest text-muted">
          {service.name.en}
        </p>
        <h3 className="mt-1 text-2xl font-bold text-heading">
          {service.name[lang]}
        </h3>

        {service.description?.[lang] && (
          <p className="mt-3 text-sm leading-relaxed text-body">
            {service.description[lang]}
          </p>
        )}

        {baseRate && (
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-heading">
              {formatYen(baseRate.price!)}
            </span>
            <span className="text-xs uppercase tracking-widest text-muted">
              {lang === "ja" ? "1時間あたり" : "per hour"}
            </span>
          </div>
        )}

        <ul className="mt-6 space-y-3">
          {service.items.filter((i) => i.price != null).map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm text-body">
              <span aria-hidden="true" className="text-primary shrink-0">✓</span>
              <span>
                {itemLabel(item.item_key, lang)} — {formatYen(item.price!)}
                <span className="text-xs text-muted ml-1">
                  / {lang === "ja" ? "時間" : "hr"}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {baseRate && (
          <dl className="mt-6 border-t border-border pt-6">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-body">
                {lang === "ja" ? "深夜・早朝料金（22:00〜6:00）" : "Night / early-morning rate (22:00–6:00)"}
              </dt>
              <dd className="text-sm font-medium text-heading">
                {formatYen(nightRate(baseRate.price!))}
                <span className="ml-2 text-xs text-muted">
                  {lang === "ja" ? "/ 時間" : "per hour"}
                </span>
              </dd>
            </div>
          </dl>
        )}
      </div>
    ),
  };
}

export default function StaffPricingView({ data }: { data?: BilingualPageData }) {
  const { lang } = useLangStore();

  const headingSection = data ? findSection(data.sections, "heading") : undefined;
  const heroHeading = getField(headingSection, "heading", lang) || t(fallbackCopy.hero.heading, lang);
  const heroBody = getField(headingSection, "sub_heading", lang) || t(fallbackCopy.hero.body, lang);

  const services = data?.services ?? [];
  const mainServices = services.filter((s) => s.slug !== "additional-fees");
  const tabs = mainServices.map((s) => serviceToTab(s, lang));

  return (
    <>
      <Section heading={heroHeading ? { ja: heroHeading, en: heroHeading } : undefined}>
        {heroBody && (
          <p className="max-w-2xl text-base leading-relaxed text-body">{heroBody}</p>
        )}
      </Section>

      <Section surface>
        {tabs.length > 0 ? (
          <TabPanel tabs={tabs} />
        ) : (
          <p className="text-sm text-muted">
            {lang === "ja" ? "現在、掲載している情報はありません。" : "No pricing information available."}
          </p>
        )}
      </Section>
    </>
  );
}
