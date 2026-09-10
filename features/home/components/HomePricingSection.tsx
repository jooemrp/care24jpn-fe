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

        <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h2 className="text-xl font-bold text-heading md:text-2xl">
            {t(content.payment.heading, lang)}
          </h2>
          <p className="mt-3 whitespace-pre-line text-base text-body">
            {t(content.payment.body, lang)}
          </p>

          {content.payment.icon.src ? (
            <div className="mt-6">
              <span className="inline-flex w-fit max-w-full items-center gap-3 rounded-xl border border-border bg-primary-light/60 px-4 py-3 sm:px-5 sm:py-3.5">
                <Image
                  src={content.payment.icon.src}
                  alt=""
                  width={160}
                  height={80}
                  className="h-10 w-auto object-contain sm:h-12"
                />
                <span className="text-sm font-semibold text-heading sm:text-base">
                  {t(content.payment.icon.alt, lang)}
                </span>
              </span>
            </div>
          ) : null}
          {settleNote ? (
            <p className="mt-4 text-sm leading-relaxed text-muted">{settleNote}</p>
          ) : null}
        </div>
      </div>
    </Section>
  );
}
