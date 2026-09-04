"use client";

import { IconClock } from "@tabler/icons-react";
import Section from "@/components/ui/Section";
import { QueryEmptyState } from "@/components/cms/QueryEmptyState";
import { queryStates } from "@/constants/copy";
import { t, type Lang } from "@/features/lang/i18n";
import type { HomeContent } from "../types";

/** "9:00" -> 540 (minutes since midnight). */
function toMinutes(clock: string): number {
  const [hours, minutes] = clock.split(":").map(Number);
  return hours * 60 + minutes;
}

/** "9:00〜10:00" -> { start: 540, end: 600 }. */
function parseTimeRange(range: string): { start: number; end: number } {
  const [start, end] = range.split("〜");
  return { start: toMinutes(start), end: toMinutes(end) };
}

export function HomeExamplesSection({
  content,
  lang,
}: {
  content: HomeContent["examples"];
  lang: Lang;
}) {
  return (
    <Section lang={lang}>
      <div className="animate-fade-up text-center">
        <p className="text-lg font-bold text-body">{t(content.leadIn, lang)}</p>
        <h2 className="mt-2 text-3xl font-bold text-primary">{t(content.heading, lang)}</h2>
      </div>

      {content.cases.length > 0 ? (
        <div className="mt-4 flex flex-col">
          {content.cases.map((example, caseIndex) => {
            const accent = example.tone === "accent";
            const flip = caseIndex % 2 === 1;
            const ranges = example.schedule.map((row) => parseTimeRange(row.time));
            const dayStart = example.schedule[0]?.time.split("〜")[0] ?? "";
            const dayEnd =
              example.schedule[example.schedule.length - 1]?.time.split("〜")[1] ?? "";

            return (
              <article
                key={caseIndex}
                className="grid animate-fade-up items-center gap-10 border-t border-border py-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16"
                style={{ animationDelay: `${caseIndex * 100}ms` }}
              >
                <div className={flip ? "lg:order-2" : ""}>
                  <p
                    className={`text-lg font-bold tracking-wide ${
                      accent ? "text-accent" : "text-primary"
                    }`}
                  >
                    {t(example.label, lang)}
                  </p>
                  <h3 className="mt-3 text-2xl font-bold leading-snug text-heading md:text-3xl">
                    {t(example.request, lang)}
                  </h3>
                  <p className="mt-4 text-lg leading-relaxed text-body">
                    {t(example.title, lang)}
                  </p>

                  <p className="mt-7 text-lg font-bold text-muted">
                    {t(content.servicesLabel, lang)}
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {example.services.map((service, serviceIndex) => (
                      <li
                        key={serviceIndex}
                        className={`rounded-full px-4 py-1.5 text-lg text-heading ${
                          accent ? "bg-accent-light" : "bg-primary-light"
                        }`}
                      >
                        {t(service, lang)}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={flip ? "lg:order-1" : ""}>
                  <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
                    <p className="flex items-center gap-2 text-lg font-bold text-muted">
                      <ClockIcon />
                      {t(content.scheduleLabel, lang)}
                    </p>
                    <p className="text-lg font-bold tabular-nums text-heading">
                      <span className="mr-1 text-lg font-normal text-muted">
                        {t(content.hoursLabel, lang)}
                      </span>
                      {dayStart}–{dayEnd}
                      <span className="ml-2 text-lg font-normal text-muted">
                        {t(example.hours, lang)}
                      </span>
                    </p>
                  </div>

                  {example.schedule.length > 0 ? (
                    <ol className="mt-3 flex flex-col gap-1.5">
                      {example.schedule.map((row, rowIndex) => {
                        const minutes = ranges[rowIndex].end - ranges[rowIndex].start;
                        return (
                          <li
                            key={rowIndex}
                            style={{ minHeight: `${minutes * 1.05}px` }}
                            className={`flex items-center gap-4 rounded-r-xl border-l-4 px-5 py-3 ${
                              accent
                                ? rowIndex % 2 === 0
                                  ? "border-accent bg-accent-light"
                                  : "border-accent/50 bg-accent-light/50"
                                : rowIndex % 2 === 0
                                  ? "border-primary bg-primary-light"
                                  : "border-primary/50 bg-primary-light/50"
                            }`}
                          >
                            <span
                              className={`w-[7.5rem] shrink-0 text-lg font-bold tabular-nums ${
                                accent ? "text-accent" : "text-primary"
                              }`}
                            >
                              {row.time}
                            </span>
                            <span className="text-lg leading-snug text-body">
                              {t(row.activity, lang)}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <div className="mt-3">
                      <QueryEmptyState title={t(queryStates.empty, lang)} />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-8">
          <QueryEmptyState title={t(queryStates.empty, lang)} />
        </div>
      )}
    </Section>
  );
}

export function ClockIcon() {
  return <IconClock className="h-4 w-4 text-muted" stroke={1.5} aria-hidden="true" />;
}
