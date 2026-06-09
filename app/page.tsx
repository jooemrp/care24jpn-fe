"use client";

import Link from "next/link";
import Image from "next/image";
import Section from "@/components/ui/Section";
import ServiceCard from "@/components/ui/ServiceCard";
import { home, cta } from "@/constants/copy";
import { useLang, t } from "@/context/LanguageContext";

export default function HomePage() {
  const { lang } = useLang();

  return (
    <>
      {/* Hero */}
      <section className="bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24 grid items-center gap-12 md:grid-cols-2">
          <div className="animate-fade-up">
            <h1 className="whitespace-pre-line text-4xl md:text-5xl font-bold leading-tight text-heading">
              {t(home.hero.heading, lang)}
            </h1>
            {t(home.hero.body, lang) && (
              <p className="mt-6 text-base leading-relaxed text-body">
                {t(home.hero.body, lang)}
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/service-flow"
                className="bg-primary text-white px-8 py-3 rounded-full font-medium transition hover:bg-primary-mid"
              >
                {t(cta.primary, lang)}
              </Link>
              <Link
                href="/pricing"
                className="border-2 border-primary text-primary px-8 py-3 rounded-full font-medium transition hover:bg-primary-light"
              >
                {t(cta.secondary, lang)}
              </Link>
            </div>
          </div>
          <div className="relative aspect-4/5 w-full overflow-hidden rounded-2xl border border-border animate-fade-up [animation-delay:120ms]">
            <Image
              src="/images/hero.jpg"
              alt={t(home.hero.imageAlt, lang)}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Problems */}
      <Section surface heading={home.problems.heading}>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {home.problems.items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-2xl border border-border bg-white px-5 py-4 animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden="true">
                  <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="text-sm leading-snug text-body">{t(item, lang)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Triangle badge */}
      <div className="flex flex-col items-center bg-surface py-8 md:py-8">
        <svg viewBox="0 0 357 173" xmlns="http://www.w3.org/2000/svg" className="w-80 md:w-104 h-auto animate-fade-up">
          {/* Triangle shape from public/triangle_badge.svg */}
          <path
            d="M188.285 168.439C182.641 173.348 174.242 173.348 168.598 168.439L5.18646 26.3183C-5.28121 17.2144 1.15736 0 15.0301 0L341.853 0C355.726 0 362.164 17.2145 351.696 26.3183L188.285 168.439Z"
            fill="#C94F7C"
          />
          <text x="178.5" y="50" textAnchor="middle" fill="white" fontSize="22" fontWeight="400" fontFamily="var(--font-sans)">
            {t(home.hero.badge, lang).split("\n")[0]}
          </text>
          <text x="178.5" y="80" textAnchor="middle" fill="white" fontSize="22" fontWeight="400" fontFamily="var(--font-sans)">
            {t(home.hero.badge, lang).split("\n")[1]}
          </text>
          <text x="178.5" y="110" textAnchor="middle" fill="white" fontSize="22" fontWeight="400" fontFamily="var(--font-sans)">
            {t(home.hero.badge, lang).split("\n")[2]}
          </text>
        </svg>
        <p className="mt-16 text-3xl font-bold text-heading animate-fade-up">
          {t(home.hero.resolve, lang)}
        </p>
      </div>

      {/* Care course */}
      <Section>
        {/* Lead-in heading */}
        <h2 className="whitespace-pre-line text-center text-2xl md:text-3xl font-bold leading-snug text-heading animate-fade-up">
          {t(home.careCourse.leadIn, lang)}
        </h2>

        {/* Course badge + tagline */}
        <div className="mt-10 flex flex-wrap items-center gap-4 animate-fade-up">
          <span className="inline-flex items-center rounded-lg bg-primary px-6 py-2 text-lg font-bold text-white">
            {t(home.careCourse.badge, lang)}
          </span>
          <span className="text-base text-body">{t(home.careCourse.tagline, lang)}</span>
        </div>

        {/* Pricing row */}
        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 animate-fade-up">
          <div className="flex items-center gap-4">
            <span className="inline-flex flex-col items-center rounded-lg bg-primary-mid px-4 py-2 text-center text-sm font-bold leading-tight text-white">
              {t(home.careCourse.price.label, lang)}
              <span className="text-xs font-normal">{t(home.careCourse.price.hours, lang)}</span>
            </span>
            <div className="flex flex-col">
              <span className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-heading">{t(home.careCourse.price.amount, lang)}</span>
                <span className="text-xs text-muted">{t(home.careCourse.price.taxNote, lang)}</span>
                <span className="text-lg font-medium text-body">{t(home.careCourse.price.unit, lang)}</span>
              </span>
              <span className="text-sm text-body">{t(home.careCourse.price.taxIncluded, lang)}</span>
            </div>
          </div>

          {/* Fee chips */}
          <div className="flex flex-wrap gap-3">
            {home.careCourse.fees.map((fee, i) => (
              <div key={i} className="flex flex-col items-center rounded-lg border border-border px-4 py-2 text-center">
                <span className="text-xs text-muted">{t(fee.label, lang)}</span>
                <span className="text-sm font-bold text-heading">{t(fee.value, lang)}</span>
                {fee.note && <span className="text-[10px] text-muted">{t(fee.note, lang)}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Two service cards */}
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {home.careCourse.cards.map((card, i) => (
            <div key={i} className="animate-fade-up" style={{ animationDelay: `${i * 120}ms` }}>
              <div className="relative aspect-16/10 w-full overflow-hidden rounded-2xl border border-border">
                <Image
                  src={`/images/use-case-${i + 1}.jpg`}
                  alt={t(card.imageAlt, lang)}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <h3 className="mt-5 text-xl font-bold text-heading">{t(card.title, lang)}</h3>
              <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
                {card.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-body">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    {t(item, lang)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Values */}
      <Section heading={home.values.heading}>
        <div className="grid gap-6 md:grid-cols-3">
          {home.values.items.map((item, i) => (
            <ServiceCard key={item.title.en} title={item.title} body={item.body} index={i} />
          ))}
        </div>
      </Section>

      {/* Closing CTA */}
      <Section surface>
        <div className="rounded-2xl bg-accent-light px-6 py-12 text-center md:py-16 animate-fade-up">
          <h2 className="text-3xl font-bold text-heading">
            {t(home.closing.heading, lang)}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-body">
            {t(home.closing.body, lang)}
          </p>
          <Link
            href="/service-flow"
            className="mt-8 inline-flex bg-accent text-white px-8 py-3 rounded-full font-medium transition hover:opacity-90"
          >
            {t(cta.primary, lang)}
          </Link>
        </div>
      </Section>
    </>
  );
}
