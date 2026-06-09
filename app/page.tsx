"use client";

import Link from "next/link";
import Image from "next/image";
import Section from "@/components/ui/Section";
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

      {/* Nursing course */}
      <Section surface>
        {/* Lead-in heading */}
        <h2 className="whitespace-pre-line text-center text-2xl md:text-3xl font-bold leading-snug text-heading animate-fade-up">
          {t(home.nursingCourse.leadIn, lang)}
        </h2>

        <div className="mt-10 grid gap-8 md:grid-cols-2 md:items-start">
          {/* Left: badge + pricing + note */}
          <div className="animate-fade-up">
            <span className="inline-flex items-center rounded-lg bg-accent px-6 py-2 text-lg font-bold text-white">
              {t(home.nursingCourse.badge, lang)}
            </span>

            <div className="mt-6 flex items-center gap-4">
              <span className="inline-flex flex-col items-center rounded-lg bg-accent px-4 py-2 text-center text-sm font-bold leading-tight text-white">
                {t(home.nursingCourse.price.label, lang)}
                <span className="text-xs font-normal">{t(home.nursingCourse.price.hours, lang)}</span>
              </span>
              <div className="flex flex-col">
                <span className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-heading">{t(home.nursingCourse.price.amount, lang)}</span>
                  <span className="text-xs text-muted">{t(home.nursingCourse.price.taxNote, lang)}</span>
                  <span className="text-lg font-medium text-body">{t(home.nursingCourse.price.unit, lang)}</span>
                </span>
                <span className="text-sm text-body">{t(home.nursingCourse.price.taxIncluded, lang)}</span>
              </div>
            </div>

            <p className="mt-6 text-sm text-muted">{t(home.nursingCourse.note, lang)}</p>
          </div>

          {/* Right: panel heading + list */}
          <div className="animate-fade-up [animation-delay:120ms]">
            <h3 className="whitespace-pre-line text-xl font-bold leading-snug text-heading">
              {t(home.nursingCourse.panel.heading, lang)}
            </h3>
            <ul className="mt-4 space-y-2">
              {home.nursingCourse.panel.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-body">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  {t(item, lang)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Examples header + timeline */}
      <Section>
        <div className="text-center animate-fade-up">
          <p className="text-sm font-bold text-body">{t(home.examples.leadIn, lang)}</p>
          <h2 className="mt-2 text-3xl font-bold text-primary">{t(home.examples.heading, lang)}</h2>
        </div>

        {/* Sample-day timelines */}
        {home.examples.timelines.map((timeline, ti) => (
          <div key={ti} className="mt-12">
            <h3 className="text-center text-lg font-bold text-heading animate-fade-up">
              {t(timeline.title, lang)}
            </h3>
            <ol
              className="mt-8 grid gap-10"
              style={{ gridTemplateColumns: `repeat(${timeline.steps.length}, minmax(0, 1fr))` }}
            >
              {timeline.steps.map((step, i) => (
                <li
                  key={i}
                  className="relative flex flex-col items-center text-center animate-fade-up"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  {/* Connector line to the next step */}
                  {i < timeline.steps.length - 1 && (
                    <span
                      className="absolute left-1/2 top-16 h-px w-full bg-border"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10 flex h-32 w-32 items-center justify-center rounded-full bg-primary-light text-primary">
                    <TimelineIcon name={step.icon} />
                  </span>
                  <span className="mt-4 flex items-center gap-1 text-sm font-medium text-body">
                    <ClockIcon />
                    {step.time}
                  </span>
                  <span className="mt-1 whitespace-pre-line text-base font-bold text-primary">
                    {t(step.label, lang)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </Section>

      {/* Service flow */}
      <Section surface heading={home.flow.heading}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {home.flow.steps.map((step, i) => (
            <div
              key={step.number}
              className="flex flex-col items-center rounded-2xl bg-white px-5 py-8 text-center animate-fade-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="text-3xl font-bold text-primary-mid">{step.number}</span>
              <h3 className="mt-2 whitespace-pre-line text-base font-bold text-heading">
                {t(step.title, lang)}
              </h3>
              <span className="mt-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary-light text-primary">
                <FlowIcon name={step.icon} />
              </span>
              <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-body">
                {t(step.body, lang)}
              </p>
              {step.hasCta && (
                <Link
                  href="/service-flow"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {t(cta.contact, lang)}
                </Link>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Contact */}
      <Section surface>
        <div className="rounded-2xl bg-primary-light px-6 py-12 text-center md:py-16 animate-fade-up">
          <p className="text-sm font-medium text-primary">
            ＼ {t(home.contact.leadIn, lang)} ／
          </p>
          <h2 className="mt-2 text-2xl md:text-3xl font-bold text-heading">
            {t(home.contact.heading, lang)}
          </h2>

          <div className="mt-8 flex flex-col items-center justify-center gap-6 sm:flex-row">
            <div className="flex flex-col items-center sm:items-start">
              <a
                href={`tel:${home.contact.phone.replace(/-/g, "")}`}
                className="flex items-center gap-2 text-3xl md:text-4xl font-bold text-heading"
              >
                <PhoneIcon />
                {home.contact.phone}
              </a>
              <span className="mt-1 text-xs text-muted">{t(home.contact.hours, lang)}</span>
            </div>
            <Link
              href="/service-flow"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-mid"
            >
              {t(cta.contact, lang)}
            </Link>
          </div>

          {/* Certification: mics logo + BSI ISO 27001 badge (placeholders) */}
          <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
            {/* TODO: replace with /images/mics-logo.png */}
            <div className="flex h-16 w-40 shrink-0 items-center justify-center rounded border border-dashed border-border bg-white text-[10px] text-muted">
              mics logo
            </div>
            {/* TODO: replace with /images/iso27001-bsi.png */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-dashed border-border bg-white text-[10px] text-muted">
              ISO 27001
            </div>
            <p className="text-left text-xs leading-relaxed text-muted">
              {t(home.contact.isms, lang)}
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}

/** Line-art icons for the service-flow step circles. */
function FlowIcon({ name }: { name: string }) {
  const common = {
    viewBox: "0 0 48 48",
    fill: "none",
    className: "h-10 w-10",
    "aria-hidden": true,
    stroke: "currentColor" as const,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "register") {
    return (
      <svg {...common}>
        {/* Clipboard / form */}
        <rect x="13" y="12" width="22" height="26" rx="2" />
        <path d="M19 12v-2h10v2M18 20h12M18 26h12M18 32h7" />
      </svg>
    );
  }

  if (name === "confirm") {
    return (
      <svg {...common}>
        {/* Calendar with check */}
        <rect x="11" y="14" width="26" height="22" rx="2" />
        <path d="M11 20h26M17 11v6M31 11v6" />
        <path d="M19 27l4 4 7-8" />
      </svg>
    );
  }

  if (name === "report") {
    return (
      <svg {...common}>
        {/* Document with checkmark */}
        <path d="M15 10h13l6 6v22H15z" />
        <path d="M28 10v6h6" />
        <path d="M19 28l3 3 6-7" />
      </svg>
    );
  }

  if (name === "start") {
    return (
      <svg {...common}>
        {/* Caregiver assisting */}
        <circle cx="18" cy="14" r="3.5" />
        <path d="M18 17.5v9l-4 8M18 26.5l4 8M18 21l-5 3M18 21l6 2" />
        <circle cx="33" cy="16" r="3" />
        <path d="M33 19v8M33 23l4 3" />
      </svg>
    );
  }

  // default: "contact" — envelope
  return (
    <svg {...common}>
      <rect x="9" y="14" width="30" height="20" rx="2" />
      <path d="M10 16l14 10 14-10" />
    </svg>
  );
}

/** Freephone receiver glyph shown beside the contact number. */
function PhoneIcon() {
  return (
    <svg viewBox="0 0 32 24" fill="none" className="h-7 w-9 text-primary" aria-hidden="true">
      {/* Freephone-style handset over a bar */}
      <path
        d="M6 9c0-2.5 4-4.5 10-4.5S26 6.5 26 9c0 1.4-1 2.2-2.3 2.2-1.2 0-2-.7-2-1.8 0-.6.2-1-.3-1.4-.8-.5-2.3-.8-5.4-.8s-4.6.3-5.4.8c-.5.4-.3.8-.3 1.4 0 1.1-.8 1.8-2 1.8C7 11.2 6 10.4 6 9z"
        fill="currentColor"
      />
      <rect x="4" y="16" width="24" height="3" rx="1.5" fill="currentColor" />
    </svg>
  );
}

/** Small clock glyph shown beside each timeline step's time. */
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-muted" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Line-art icons for the sample-day timeline circles. */
function TimelineIcon({ name }: { name: string }) {
  const common = {
    viewBox: "0 0 48 48",
    fill: "none",
    className: "h-14 w-14",
    "aria-hidden": true,
    stroke: "currentColor" as const,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "medication") {
    return (
      <svg {...common}>
        {/* Pill bottle */}
        <rect x="14" y="14" width="14" height="22" rx="2" />
        <path d="M13 14h16M18 10h6v4h-6z" />
        <path d="M18 24h6M21 21v6" />
        {/* Clock */}
        <circle cx="34" cy="30" r="6" />
        <path d="M34 27v3l2 1.5" />
      </svg>
    );
  }

  if (name === "outing") {
    return (
      <svg {...common}>
        {/* Two walking figures */}
        <circle cx="17" cy="11" r="3" />
        <path d="M17 14v8l-4 8M17 22l4 6M17 18l-4 2M17 18l4 2" />
        <circle cx="32" cy="13" r="3" />
        <path d="M32 16v7l-4 7M32 23l4 6M32 20l-4 2M32 20l4 2" />
      </svg>
    );
  }

  if (name === "injection") {
    return (
      <svg {...common}>
        {/* Syringe */}
        <path d="M30 12l6 6M33 9l6 6" />
        <path d="M31.5 16.5L16 32l-4 1-1 4-2-2 4-1 1-4 15.5-15.5z" />
        <path d="M27 21l3 3M23 25l3 3" />
      </svg>
    );
  }

  if (name === "rehab") {
    return (
      <svg {...common}>
        {/* Seated person with assisting hand (rehabilitation) */}
        <circle cx="20" cy="13" r="3" />
        <path d="M20 16v6l-5 4M20 22l5 3 6-1M15 26l-1 8M15 26h7" />
        <path d="M31 21l5-2" />
      </svg>
    );
  }

  // default: "care" — two people side by side (assistance)
  return (
    <svg {...common}>
      <circle cx="18" cy="12" r="3.5" />
      <path d="M18 15.5v12M18 19l-5 3M18 19l5 3M18 27.5l-4 8M18 27.5l4 8" />
      <circle cx="32" cy="13" r="3" />
      <path d="M32 16v10l-3 8M32 26l3 8M32 19l4 2" />
    </svg>
  );
}
