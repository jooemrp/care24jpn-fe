"use client";

import Image from "next/image";
import Section from "@/components/ui/Section";
import { t, type Lang } from "@/features/lang/i18n";
import type { HomeContent } from "../types";
import { SafeInternalLink } from "./HomeLinks";

export function HomePricingSection({
  content,
  pricingDetailsLink,
  pricingDetailsHref,
  lang,
}: {
  content: HomeContent["pricingSummary"];
  pricingDetailsLink: HomeContent["pricingDetailsLink"];
  pricingDetailsHref: HomeContent["pricingDetailsHref"];
  lang: Lang;
}) {
  const courses = [content.care, content.nursing] as const;
  const settleNote = content.payment.settleNote
    ? t(content.payment.settleNote, lang).trim()
    : "";

  return (
    <Section lang={lang}>
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h2 className="text-xl font-bold text-heading md:text-2xl">
            {t(content.heading, lang)}
          </h2>
          <div className="mt-6 grid flex-1 gap-5 sm:grid-cols-2">
            {courses.map((course) => (
              <div
                key={course.label.ja}
                className="flex flex-col rounded-xl bg-primary-light/60 px-4 py-5"
              >
                <p className="text-sm font-semibold text-primary">{t(course.label, lang)}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-accent md:text-3xl">
                  {t(course.amount, lang)}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-muted">{t(course.minNote, lang)}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {t(course.transportNote, lang)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">{t(content.extensionNote, lang)}</p>
          <p className="mt-5 text-base">
            <SafeInternalLink
              href={pricingDetailsHref}
              lang={lang}
              className="font-medium text-primary underline decoration-primary/30 underline-offset-2 transition hover:text-primary-mid hover:decoration-primary/60"
            >
              {t(pricingDetailsLink, lang)}
            </SafeInternalLink>
          </p>
        </div>

        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="px-6 pt-6 sm:px-8 sm:pt-8">
            <h2 className="text-xl font-bold text-heading md:text-2xl">
              {t(content.payment.heading, lang)}
            </h2>
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-body">
              {t(content.payment.body, lang)}
            </p>
            {settleNote ? (
              <p className="mt-3 text-sm leading-relaxed text-muted">{settleNote}</p>
            ) : null}
          </div>

          {content.payment.icon.src ? (
            <div className="relative mt-6 flex min-h-0 flex-1 flex-col items-center justify-center border-t border-border bg-primary-light px-6 py-8 sm:px-8 sm:py-10">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,var(--color-surface),transparent_64%)]"
              />
              <div className="relative flex min-h-40 w-full max-w-[17rem] flex-1 items-center justify-center sm:min-h-44 sm:max-w-[19rem] lg:max-w-[21rem]">
                <Image
                  src={content.payment.icon.src}
                  alt=""
                  width={400}
                  height={400}
                  className="h-full w-full object-contain"
                />
              </div>
              <p className="relative mt-4 shrink-0 text-center text-sm font-semibold text-heading sm:mt-5 sm:text-base">
                {t(content.payment.icon.alt, lang)}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Section>
  );
}
