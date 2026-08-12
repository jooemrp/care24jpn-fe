"use client";

import Section from "@/components/ui/Section";
import TabPanel, { type Tab } from "@/components/ui/TabPanel";
import { actionPlan as feesCopy } from "@/constants/copy";
import {
  supporterRates,
  formatYen,
  type SupporterRates,
} from "@/constants/pricing";
import { useLangStore, t } from "@/features/lang/store";

/** Two-column rate table: what the customer pays vs. what the supporter earns. */
function SupporterRateTable({ course }: { course: SupporterRates }) {
  const { lang } = useLangStore();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-3 pr-4 font-bold text-heading" />
            <th className="py-3 pr-4 text-right font-bold text-heading">
              {t(feesCopy.columns.customer, lang)}
            </th>
            <th className="py-3 text-right font-bold text-heading">
              {t(feesCopy.columns.supporter, lang)}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {course.rows.map((row) => (
            <tr key={row.key}>
              <td className="py-4 pr-4">
                <span className="font-medium text-heading">{t(row.label, lang)}</span>
                {row.detail && (
                  <span className="mt-0.5 block text-xs text-muted">
                    {t(row.detail, lang)}
                  </span>
                )}
              </td>
              <td className="py-4 pr-4 text-right tabular-nums text-body">
                {formatYen(row.customer)}
              </td>
              <td className="py-4 text-right font-bold tabular-nums text-primary">
                {formatYen(row.supporter)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FeesPage() {
  const { lang } = useLangStore();

  const tabs: Tab[] = supporterRates.map((course) => ({
    key: course.key,
    label: course.name,
    content: <SupporterRateTable course={course} />,
  }));

  return (
    <>
      <Section heading={feesCopy.hero.heading}>
        <p className="max-w-2xl text-base leading-relaxed text-body">
          {t(feesCopy.hero.body, lang)}
        </p>
      </Section>

      <Section surface>
        <TabPanel tabs={tabs} />
        <p className="mt-6 text-xs text-muted">{t(feesCopy.note, lang)}</p>
      </Section>
    </>
  );
}
