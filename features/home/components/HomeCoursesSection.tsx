"use client";

import Image from "next/image";
import {
  IconBuildingHospital,
  IconHeartHandshake,
  IconHeartbeat,
  IconMessages,
  IconNeedle,
  IconPill,
  type Icon,
} from "@tabler/icons-react";
import Section from "@/components/ui/Section";
import { QueryEmptyState } from "@/components/cms/QueryEmptyState";
import { queryStates, type Bilingual } from "@/constants/copy";
import { CmsContentError } from "@/features/cms/errors";
import { t, type Lang } from "@/features/lang/i18n";
import type { HomeContent } from "../types";
import { SafeInternalLink } from "./HomeLinks";

export function HomeCoursesSection({
  careCourse,
  nursingCourse,
  pricingDetailsLink,
  pricingDetailsHref,
  lang,
}: {
  careCourse: HomeContent["careCourse"];
  nursingCourse: HomeContent["nursingCourse"];
  pricingDetailsLink: HomeContent["pricingDetailsLink"];
  pricingDetailsHref: HomeContent["pricingDetailsHref"];
  lang: Lang;
}) {
  return (
    <>
      <Section id="service-details" surface lang={lang}>
        <h2 className="animate-fade-up whitespace-pre-line text-center text-2xl font-bold leading-snug text-heading md:text-3xl">
          {t(careCourse.leadIn, lang)}
        </h2>
        <p className="mx-auto mt-5 max-w-3xl animate-fade-up whitespace-pre-line text-center text-lg leading-relaxed text-body">
          {t(careCourse.tagline, lang)}
          {t(careCourse.taglineSub, lang)}
        </p>

        <div className="mt-10 animate-fade-up rounded-2xl border border-primary/25 bg-primary-light/50 p-6 sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-10">
            <div className="lg:w-[38%] lg:shrink-0">
              <span className="inline-flex w-fit items-center rounded-full bg-primary px-5 py-1.5 text-lg font-bold text-white">
                {t(careCourse.badge, lang)}
              </span>
              <p className="mt-5 text-lg font-medium text-body">
                {t(careCourse.price.label, lang)}
                {t(careCourse.price.hours, lang)}
              </p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="text-5xl font-bold tabular-nums text-heading">
                  {t(careCourse.price.amount, lang)}
                </span>
                <span className="text-lg text-muted">{t(careCourse.price.taxNote, lang)}</span>
                <span className="text-lg font-medium text-body">
                  {t(careCourse.price.unit, lang)}
                </span>
              </p>
              <p className="mt-1 text-lg text-body">{t(careCourse.price.taxIncluded, lang)}</p>
              <p className="mt-5 text-lg">
                <SafeInternalLink
                  href={pricingDetailsHref}
                  lang={lang}
                  className="font-medium text-primary underline decoration-primary/30 underline-offset-2 transition hover:text-primary-mid hover:decoration-primary/60"
                >
                  {t(pricingDetailsLink, lang)}
                </SafeInternalLink>
              </p>
            </div>

            {careCourse.fees.length > 0 ? (
              <FeeGrid fees={careCourse.fees} lang={lang} />
            ) : (
              <div className="flex-1">
                <QueryEmptyState title={t(queryStates.empty, lang)} />
              </div>
            )}
          </div>
        </div>

        {careCourse.cards.length > 0 ? (
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {careCourse.cards.map((card, index) => (
              <div
                key={index}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                {card.image ? (
                  <div className="relative aspect-16/10 w-full overflow-hidden rounded-2xl border border-border">
                    <Image
                      src={card.image}
                      alt={t(card.imageAlt, lang)}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <h3 className="mt-5 text-xl font-bold text-heading">{t(card.title, lang)}</h3>
                <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
                  {card.items.map((item, itemIndex) => (
                    <li
                      key={itemIndex}
                      className="flex items-start gap-2 text-lg leading-snug text-body"
                    >
                      <span
                        className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                      {t(item, lang)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <QueryEmptyState title={t(queryStates.empty, lang)} />
          </div>
        )}
      </Section>

      <Section lang={lang}>
        <h2 className="animate-fade-up whitespace-pre-line text-center text-2xl font-bold leading-snug text-heading md:text-3xl">
          {t(nursingCourse.leadIn, lang)}
        </h2>
        <p className="mx-auto mt-5 max-w-3xl animate-fade-up whitespace-pre-line text-center text-lg leading-relaxed text-body">
          {t(nursingCourse.tagline, lang)}
          {t(nursingCourse.taglineSub, lang)}
        </p>
        <p className="mx-auto mt-6 max-w-3xl animate-fade-up rounded-xl border border-accent/30 bg-accent-light px-5 py-4 text-center text-base font-semibold leading-relaxed text-heading md:px-8 md:py-5 md:text-lg">
          {t(nursingCourse.medicalNote, lang)}
        </p>

        <div className="mt-10 animate-fade-up rounded-2xl border border-accent/25 bg-accent-light/50 p-6 sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-10">
            <div className="lg:w-[38%] lg:shrink-0">
              <span className="inline-flex w-fit items-center rounded-full bg-accent px-5 py-1.5 text-lg font-bold text-white">
                {t(nursingCourse.badge, lang)}
              </span>
              <p className="mt-5 text-lg font-medium text-body">
                {t(nursingCourse.price.label, lang)}
                {t(nursingCourse.price.hours, lang)}
              </p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="text-5xl font-bold tabular-nums text-heading">
                  {t(nursingCourse.price.amount, lang)}
                </span>
                <span className="text-lg text-muted">{t(nursingCourse.price.taxNote, lang)}</span>
                <span className="text-lg font-medium text-body">
                  {t(nursingCourse.price.unit, lang)}
                </span>
              </p>
              <p className="mt-1 text-lg text-body">{t(nursingCourse.price.taxIncluded, lang)}</p>
              <p className="mt-5 text-lg">
                <SafeInternalLink
                  href={pricingDetailsHref}
                  lang={lang}
                  className="font-medium text-accent underline decoration-accent/30 underline-offset-2 transition hover:text-accent/80 hover:decoration-accent/60"
                >
                  {t(pricingDetailsLink, lang)}
                </SafeInternalLink>
              </p>
            </div>

            {nursingCourse.fees.length > 0 ? (
              <FeeGrid fees={nursingCourse.fees} lang={lang} tone="accent" />
            ) : (
              <div className="flex-1">
                <QueryEmptyState title={t(queryStates.empty, lang)} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 animate-fade-up [animation-delay:120ms]">
          {nursingCourse.panel.heading && t(nursingCourse.panel.heading, lang).trim() ? (
            <h3 className="whitespace-pre-line text-xl font-bold leading-relaxed text-heading">
              {t(nursingCourse.panel.heading, lang)}
            </h3>
          ) : null}
          {nursingCourse.panel.items.length > 0 ? (
            <ul className="mt-6 flex flex-col gap-5 md:grid md:grid-cols-2">
              {nursingCourse.panel.items.map((item, index) => (
                <li key={index} className="flex items-center gap-3.5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-light text-accent">
                    <NursingIcon name={item.icon} />
                  </span>
                  <span className="text-lg leading-snug text-body">{t(item.label, lang)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6">
              <QueryEmptyState title={t(queryStates.empty, lang)} />
            </div>
          )}
        </div>
      </Section>
    </>
  );
}

function FeeGrid({
  fees,
  lang,
  tone = "primary",
}: {
  fees: Array<{ label: Bilingual; value: Bilingual; note?: Bilingual }>;
  lang: Lang;
  tone?: "primary" | "accent";
}) {
  const divider = tone === "accent" ? "bg-accent/20" : "bg-primary/20";
  return (
    <dl className={`grid flex-1 auto-rows-fr gap-px overflow-hidden rounded-xl ${divider} sm:grid-cols-3`}>
      {fees.map((fee, index) => (
        <div
          key={index}
          className="flex flex-col items-center justify-center bg-surface px-4 py-6 text-center"
        >
          <dt className="text-lg text-muted">{t(fee.label, lang)}</dt>
          <dd className="mt-1.5 text-lg font-bold text-heading">{t(fee.value, lang)}</dd>
          {fee.note ? (
            <dd className="mt-1 text-lg leading-snug text-muted">{t(fee.note, lang)}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

const NURSING_ICONS: Record<string, Icon> = {
  vitals: IconHeartbeat,
  procedure: IconNeedle,
  medication: IconPill,
  consult: IconMessages,
  palliative: IconHeartHandshake,
  hospital: IconBuildingHospital,
};

function NursingIcon({ name }: { name: string }) {
  const Component = NURSING_ICONS[name];
  if (!Component) {
    throw new CmsContentError(
      "CMS_INVALID_REQUIRED_FIELD",
      `CMS nursing feature icon "${name}" is not supported.`,
      ["home.home-nursing-feature.icon"],
      "home",
    );
  }
  return <Component className="h-[1.375rem] w-[1.375rem]" stroke={1.6} aria-hidden="true" />;
}
