"use client";

import Section from "@/components/ui/Section";
import TabPanel, { type Tab } from "@/components/ui/TabPanel";
import CourseRateTable from "@/components/ui/CourseRateTable";
import { actionPlan as actionPlanCopy } from "@/constants/copy";
import { actionPlanRates } from "@/constants/pricing";
import { useLangStore, t } from "@/features/lang/store";

export default function FeesPage() {
  const { lang } = useLangStore();

  const tabs: Tab[] = actionPlanRates.map((course) => ({
    key: course.key,
    label: course.name,
    content: <CourseRateTable course={course} />,
  }));

  return (
    <>
      <Section heading={actionPlanCopy.hero.heading}>
        <p className="max-w-2xl text-base leading-relaxed text-body">
          {t(actionPlanCopy.hero.body, lang)}
        </p>
      </Section>

      <Section surface>
        <TabPanel tabs={tabs} />
        <p className="mt-6 text-xs text-muted">
          {t(actionPlanCopy.note, lang)}
        </p>
      </Section>
    </>
  );
}
