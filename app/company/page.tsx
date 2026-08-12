"use client";

import Section from "@/components/ui/Section";
import { company } from "@/constants/copy";
import { useLangStore, t } from "@/features/lang/store";

export default function CompanyPage() {
  const { lang } = useLangStore();

  return (
    <Section heading={company.heading}>
      <dl className="max-w-3xl animate-fade-up">
        {company.rows.map((row) => (
          <div
            key={row.label.en}
            className="grid grid-cols-[6.5rem_1fr] gap-x-6 border-b border-border/60 py-5 first:border-t md:grid-cols-[9rem_1fr]"
          >
            <dt className="text-sm font-bold text-heading">{t(row.label, lang)}</dt>
            <dd className="whitespace-pre-line text-sm leading-relaxed text-body">
              {t(row.value, lang)}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
