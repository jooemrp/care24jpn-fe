"use client";

import Section from "@/components/ui/Section";
import TabPanel, { type Tab } from "@/components/ui/TabPanel";
import { staffPricing as staffCopy } from "@/constants/copy";
import { staffRates, formatYen, nightSurchargeMultiplier } from "@/constants/pricing";
import { useLangStore, t } from "@/features/lang/store";

export default function FeesPage() {
  const { lang } = useLangStore();

  const tabs: Tab[] = staffRates.map((rate) => ({
    key: rate.key,
    label: rate.role,
    content: (
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <p className="text-xs uppercase tracking-widest text-muted">{rate.role.en}</p>
        <h3 className="mt-1 text-2xl font-bold text-heading">
          {t(rate.role, lang)}
        </h3>

        <div className="mt-6 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-heading">
            {formatYen(rate.hourlyRate)}
          </span>
          <span className="text-xs uppercase tracking-widest text-muted">
            {lang === "ja" ? "1時間あたり" : "per hour"}
          </span>
        </div>

        <p className="mt-4 max-w-xl text-sm leading-relaxed text-body">
          {t(rate.description, lang)}
        </p>

        <dl className="mt-6 border-t border-border pt-6">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm text-body">
              {lang === "ja" ? "深夜・早朝料金（22:00〜6:00）" : "Night / early-morning rate (22:00–6:00)"}
            </dt>
            <dd className="text-sm font-medium text-heading">
              {formatYen(Math.round(rate.hourlyRate * nightSurchargeMultiplier))}
              <span className="ml-2 text-xs text-muted">
                {lang === "ja" ? "/ 時間" : "per hour"}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    ),
  }));

  return (
    <>
      <Section heading={staffCopy.hero.heading}>
        <p className="max-w-2xl text-base leading-relaxed text-body">
          {t(staffCopy.hero.body, lang)}
        </p>
      </Section>

      <Section surface>
        <TabPanel tabs={tabs} />
        <p className="mt-6 text-xs text-muted">
          {t(staffCopy.note, lang)}
        </p>
      </Section>
    </>
  );
}
