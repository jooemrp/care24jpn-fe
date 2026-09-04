"use client";

import Section from "@/components/ui/Section";
import { t, type Lang } from "@/features/lang/i18n";
import type { CompanyContent } from "@/features/cms/pages-map";

export function CompanyContentView({ content, lang }: { content: CompanyContent; lang: Lang }) {
  return (
    <Section
      heading={content.heading}
      level="h1"
      lang={lang}
    >
      <dl className="max-w-3xl animate-fade-up">
        {content.rows.map((row) => (
          <div
            key={row.label.en}
            className="grid grid-cols-[minmax(5.5rem,6.5rem)_minmax(0,1fr)] gap-x-4 border-b border-border/60 py-5 first:border-t sm:gap-x-6 md:grid-cols-[9rem_1fr]"
          >
            <dt className="text-sm font-bold text-heading">
              {t(row.label, lang)}
            </dt>
            <dd className="whitespace-pre-line text-sm leading-relaxed text-body">
              {t(row.value, lang)}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
