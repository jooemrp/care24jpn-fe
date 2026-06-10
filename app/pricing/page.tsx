"use client";

import Section from "@/components/ui/Section";
import TabPanel, { type Tab } from "@/components/ui/TabPanel";
import CourseRateTable from "@/components/ui/CourseRateTable";
import { pricing as pricingCopy } from "@/constants/copy";
import { courseRates } from "@/constants/pricing";
import { useLangStore, t } from "@/features/lang/store";

export default function PricingPage() {
  const { lang } = useLangStore();

  const tabs: Tab[] = courseRates.map((course) => ({
    key: course.key,
    label: course.name,
    content: <CourseRateTable course={course} />,
  }));

  return (
    <>
      <Section heading={pricingCopy.hero.heading}>
        <p className="max-w-2xl text-base leading-relaxed text-body">
          {t(pricingCopy.hero.body, lang)}
        </p>

        <ul className="mt-6 flex flex-wrap gap-3">
          {pricingCopy.highlights.map((highlight) => (
            <li
              key={highlight.en}
              className="rounded-full bg-accent-light px-4 py-2 text-sm font-medium text-accent"
            >
              {t(highlight, lang)}
            </li>
          ))}
        </ul>
      </Section>

      <Section surface>
        <TabPanel tabs={tabs} />
        <p className="mt-6 text-xs text-muted">
          {t(pricingCopy.note, lang)}
        </p>
      </Section>
    </>
  );
}
