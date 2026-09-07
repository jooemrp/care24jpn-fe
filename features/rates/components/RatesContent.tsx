"use client";

import Link from "next/link";
import Section from "@/components/ui/Section";
import CourseRateCard from "@/components/ui/CourseRateCard";
import { QueryEmptyState } from "@/components/cms/QueryEmptyState";
import { formatYen, type SupporterRates } from "@/constants/pricing";
import { type Bilingual, queryStates } from "@/constants/copy";
import { localizeHref, t, type Lang } from "@/features/lang/i18n";
import type { RatesContent } from "../types";

function hasCompleteRates<T extends { rows: unknown[] }>(courses: T[]): boolean {
  return courses.length > 0 && courses.every((course) => course.rows.length > 0);
}

function EmptyRates({ lang }: { lang: Lang }) {
  return <QueryEmptyState title={t(queryStates.empty, lang)} />;
}

function courseTone(courseKey: string): "primary" | "accent" {
  return courseKey === "nursing" ? "accent" : "primary";
}

export function PricingRatesContent({
  rates,
  lang,
}: {
  rates: RatesContent;
  lang: Lang;
}) {
  const complete = hasCompleteRates(rates.courseRates);

  return (
    <>
      <Section heading={rates.pricing.hero.heading} level="h1" lang={lang}>
        <p className="max-w-2xl text-lg leading-relaxed text-body">
          {t(rates.pricing.hero.body, lang)}
        </p>

        <ul className="mt-7 grid gap-3 sm:grid-cols-2">
          {rates.pricing.highlights.map((highlight) => (
            <li
              key={highlight.en}
              className="rounded-xl bg-accent px-6 py-5 text-xl font-bold text-white"
            >
              {t(highlight, lang)}
            </li>
          ))}
        </ul>
      </Section>

      <Section surface lang={lang}>
        {complete ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {rates.courseRates.map((course) => (
              <CourseRateCard
                key={course.key}
                course={course}
                lang={lang}
                tone={courseTone(course.key)}
              />
            ))}
          </div>
        ) : (
          <EmptyRates lang={lang} />
        )}

        <p className="mt-8 text-base leading-relaxed text-body md:text-lg">
          {t(rates.pricing.paymentNote, lang)}
        </p>
        <p className="mt-8 text-lg text-muted">
          {t(rates.pricing.note, lang)}
        </p>
        <p className="mt-4 text-base text-body">
          <Link
            href={localizeHref(rates.pricing.cancellationHref, lang)}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {t(rates.pricing.cancellationLinkLabel, lang)}
          </Link>
        </p>
      </Section>
    </>
  );
}

export function FeesRatesContent({
  rates,
  lang,
  contactCta,
}: {
  rates: RatesContent;
  lang: Lang;
  contactCta: Bilingual;
}) {
  const complete = hasCompleteRates(rates.supporterRates);

  return (
    <>
      <Section heading={rates.fees.hero.heading} level="h1" lang={lang}>
        <p className="max-w-2xl text-lg leading-relaxed text-body">
          {t(rates.fees.hero.body, lang)}
        </p>
      </Section>

      <Section surface lang={lang}>
        {complete ? (
          <div className="flex flex-col gap-6">
            {rates.supporterRates.map((course) => (
              <SupporterRateTable
                key={course.key}
                course={course}
                columns={rates.fees.columns}
                lang={lang}
              />
            ))}
          </div>
        ) : (
          <EmptyRates lang={lang} />
        )}

        <p className="mt-8 text-lg text-muted">
          {t(rates.fees.note, lang)}
        </p>

        <div className="mt-10 animate-fade-up">
          <Link
            href={localizeHref(rates.fees.ctaHref, lang)}
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-8 py-4 text-lg font-bold text-white transition hover:bg-primary-mid"
          >
            {t(contactCta, lang)}
          </Link>
        </div>
      </Section>
    </>
  );
}

function SupporterRateTable({
  course,
  columns,
  lang,
}: {
  course: SupporterRates;
  columns: RatesContent["fees"]["columns"];
  lang: Lang;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <h2 className="bg-primary-light px-7 py-5 text-xl font-bold text-heading">
        {t(course.name, lang)}
      </h2>
      <div className="overflow-x-auto px-7 pb-6">
        <table className="w-full text-lg">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-4 pr-4 font-bold text-heading">
                {columns.service ? t(columns.service, lang) : null}
              </th>
              <th className="py-4 pr-4 text-right font-bold text-heading">
                {t(columns.customer, lang)}
              </th>
              <th className="py-4 text-right font-bold text-heading">
                {t(columns.supporter, lang)}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {course.rows.map((row) => (
              <tr key={row.key}>
                <td className="py-4 pr-4">
                  <span className="font-medium text-heading">
                    {t(row.label, lang)}
                  </span>
                  {row.detail ? (
                    <span className="mt-0.5 block text-lg text-muted">
                      {t(row.detail, lang)}
                    </span>
                  ) : null}
                </td>
                <td className="py-4 pr-4 text-right tabular-nums text-body">
                  {formatYen(row.customer, lang)}
                </td>
                <td className="py-4 text-right font-bold tabular-nums text-primary">
                  {formatYen(row.supporter, lang)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
