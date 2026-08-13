"use client";

import Link from "next/link";
import Image from "next/image";
import Section from "@/components/ui/Section";
import { home, cta } from "@/constants/copy";
import { useLangStore, t } from "@/features/lang/store";

export default function HomePage() {
  const { lang } = useLangStore();
  const staffHrefIsExternal = /^https?:\/\//.test(home.apply.staff.href);

  return (
    <>
      {/* Hero — full-bleed key visual */}
      <section className="relative isolate overflow-hidden">
        {/* Key visual: spans the full viewport width behind the copy */}
        <Image
          src="/images/hero.webp"
          alt={t(home.hero.imageAlt, lang)}
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="-z-20 object-cover object-[center_40%]"
        />

        {/* Scrim — keeps the navy copy legible over the photo.
            Horizontal on desktop (copy sits left), vertical on mobile. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-linear-to-b from-bg/95 via-bg/85 to-bg/60 md:bg-linear-to-r md:from-bg md:from-28% md:via-bg/72 md:via-52% md:to-transparent md:to-78%"
        />
        {/* Soft sakura glow + bottom fade into the next section */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(55%_50%_at_92%_8%,var(--color-accent-light)_0%,transparent_60%)] opacity-40"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-linear-to-b from-transparent to-bg"
        />

        {/* Fills the screen below the sticky header. Measured header height:
            81px on mobile (tier 1 + border) and 130px from md up (tier 1 +
            nav tab row + both borders). */}
        <div className="relative mx-auto flex min-h-[calc(100dvh-81px)] max-w-6xl flex-col justify-center px-6 py-20 md:min-h-[calc(100dvh-130px)] md:py-24">
          <div className="max-w-xl animate-fade-up">
            <h1 className="whitespace-pre-line text-4xl font-bold leading-tight text-heading md:text-5xl">
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
                className="rounded-full bg-primary px-8 py-3 font-medium text-white shadow-lg shadow-primary/20 transition hover:bg-primary-mid"
              >
                {t(home.hero.ctaPrimary, lang)}
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border-2 border-primary bg-surface/70 px-8 py-3 font-medium text-primary backdrop-blur-sm transition hover:bg-primary-light"
              >
                {t(home.hero.ctaSecondary, lang)}
              </Link>
            </div>

            {/* Trust strip — the three reasons families choose us */}
            <ul className="mt-10 flex flex-wrap gap-2.5">
              {home.values.items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-full border border-border bg-surface/80 py-2 pl-3 pr-4 text-sm font-medium text-heading shadow-sm backdrop-blur-sm animate-fade-up"
                  style={{ animationDelay: `${120 + i * 80}ms` }}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                    <svg viewBox="0 0 16 16" fill="none" className="h-2.5 w-2.5" aria-hidden="true">
                      <path
                        d="M3 8l3.5 3.5L13 4.5"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {t(item.title, lang)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Problems */}
      <Section surface heading={home.problems.heading}>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {home.problems.items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-2xl border border-border bg-white px-6 py-5 animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="text-base leading-relaxed text-body">{t(item, lang)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Answer to the problems above — inverted pyramid, redrawn as an
          original shape (softly concave "funnel" sides, rounded corners,
          sakura gradient) rather than the competitor's flat sharp triangle. */}
      <div className="flex flex-col items-center bg-surface px-6 pb-12 pt-2 md:pb-16">
        <PyramidStatement
          badge={t(home.hero.badge, lang)}
          resolve={t(home.hero.resolve, lang)}
        />
        <p className="mx-auto mt-8 max-w-2xl text-center text-base leading-relaxed text-heading animate-fade-up md:text-lg">
          {t(home.hero.assist, lang)}
        </p>
      </div>

      {/* Nursing course — now leads the service block.
          Reworked away from the competitor's signature: the course name is a
          pill rather than a solid rectangle, the rate label sits above the
          figure instead of in a colour block welded to its left, and the whole
          offer is one tinted card rather than loose chips on the page. */}
      <Section id="service-details">
        {/* Lead-in heading */}
        <h2 className="whitespace-pre-line text-center text-2xl md:text-3xl font-bold leading-snug text-heading animate-fade-up">
          {t(home.nursingCourse.leadIn, lang)}
        </h2>

        <div className="mt-10 grid gap-8 md:grid-cols-2 md:items-start">
          {/* Left: the offer, as a single card */}
          <div className="rounded-2xl border border-accent/25 bg-accent-light/60 p-7 animate-fade-up">
            <span className="inline-flex items-center rounded-full bg-accent px-5 py-1.5 text-sm font-bold text-white">
              {t(home.nursingCourse.badge, lang)}
            </span>

            <p className="mt-6 text-xs font-medium text-body">
              {t(home.nursingCourse.price.label, lang)}
              {t(home.nursingCourse.price.hours, lang)}
            </p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-5xl font-bold tabular-nums text-heading">
                {t(home.nursingCourse.price.amount, lang)}
              </span>
              <span className="text-xs text-muted">{t(home.nursingCourse.price.taxNote, lang)}</span>
              <span className="text-lg font-medium text-body">{t(home.nursingCourse.price.unit, lang)}</span>
            </p>
            <p className="mt-1 text-sm text-body">
              {t(home.nursingCourse.price.taxIncluded, lang)}
            </p>

            <p className="mt-6 text-sm text-muted">{t(home.nursingCourse.note, lang)}</p>
          </div>

          {/* Right: what the course covers */}
          <div className="animate-fade-up [animation-delay:120ms] md:pt-2">
            <h3 className="whitespace-pre-line text-lg font-bold leading-relaxed text-heading md:text-xl">
              {t(home.nursingCourse.panel.heading, lang)}
            </h3>
            <ul className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {home.nursingCourse.panel.items.map((item, i) => (
                <li key={i} className="flex items-center gap-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-light text-accent">
                    <NursingIcon name={item.icon} />
                  </span>
                  <span className="text-sm leading-snug text-body">{t(item.label, lang)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Care course — second, after the nursing course */}
      <Section surface>
        {/* Lead-in heading */}
        <h2 className="whitespace-pre-line text-center text-2xl md:text-3xl font-bold leading-snug text-heading animate-fade-up">
          {t(home.careCourse.leadIn, lang)}
        </h2>

        {/* Course badge + tagline */}
        <div className="mt-10 flex flex-wrap items-center gap-4 animate-fade-up">
          <span className="inline-flex items-center rounded-lg bg-primary px-6 py-2 text-lg font-bold text-white">
            {t(home.careCourse.badge, lang)}
          </span>
          <div className="text-base text-body">
            <p>{t(home.careCourse.tagline, lang)}</p>
            <p>{t(home.careCourse.taglineSub, lang)}</p>
          </div>
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
                  src={`/images/use-case-${i + 1}.webp`}
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

      {/* Examples — three usage cases, each with its request, services and a
          vertical schedule. (Replaced the horizontal icon timelines, which
          followed the competitor's layout.) */}
      <Section>
        <div className="text-center animate-fade-up">
          <p className="text-sm font-bold text-body">{t(home.examples.leadIn, lang)}</p>
          <h2 className="mt-2 text-3xl font-bold text-primary">{t(home.examples.heading, lang)}</h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {home.examples.cases.map((c, ci) => {
            const accent = c.tone === "accent";
            return (
              <article
                key={ci}
                className="flex flex-col rounded-3xl border border-border/50 bg-white p-6 shadow-[0_8px_24px_rgba(27,31,94,0.05)] animate-fade-up"
                style={{ animationDelay: `${ci * 100}ms` }}
              >
                {/* Case pill + scenario category */}
                <span
                  className={`self-start rounded-full px-3.5 py-1 text-xs font-bold ${
                    accent ? "bg-accent-light text-accent" : "bg-primary-light text-primary"
                  }`}
                >
                  {t(c.label, lang)}
                </span>
                <p className="mt-3 text-xs font-medium tracking-wide text-muted">
                  {t(c.title, lang)}
                </p>

                {/* The family's request — the headline of the card */}
                <div
                  className={`relative mt-2 rounded-2xl px-4 py-3.5 ${
                    accent ? "bg-accent-light/50" : "bg-primary-light/50"
                  }`}
                >
                  <h3 className="text-base font-bold leading-relaxed text-heading">
                    {t(c.request, lang)}
                  </h3>
                  {/* Speech-bubble tail */}
                  <span
                    className={`absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 rounded-[3px] ${
                      accent ? "bg-accent-light/50" : "bg-primary-light/50"
                    }`}
                    aria-hidden="true"
                  />
                </div>

                {/* Services provided */}
                <p className="mt-5 text-xs font-bold text-muted">
                  {t(home.examples.servicesLabel, lang)}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {c.services.map((s, si) => (
                    <li
                      key={si}
                      className="rounded-full bg-bg px-3 py-1 text-xs text-body"
                    >
                      {t(s, lang)}
                    </li>
                  ))}
                </ul>

                {/* Schedule header: label + usage time */}
                <div className="mt-5 flex items-center justify-between gap-2 border-t border-border/60 pt-4">
                  <p className="text-xs font-bold text-muted">
                    {t(home.examples.scheduleLabel, lang)}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-body">
                    <ClockIcon />
                    {t(home.examples.hoursLabel, lang)}
                    <span className="text-sm font-bold text-heading">{t(c.hours, lang)}</span>
                  </p>
                </div>

                {/* Timetable rows */}
                <ol className="mt-2 divide-y divide-border/40">
                  {c.schedule.map((row, ri) => (
                    <li key={ri} className="grid grid-cols-[5.5rem_1fr] gap-x-3 py-2.5">
                      <span
                        className={`pt-0.5 text-xs font-semibold tabular-nums ${
                          accent ? "text-accent" : "text-primary"
                        }`}
                      >
                        {row.time}
                      </span>
                      <span className="text-sm leading-snug text-body">
                        {t(row.activity, lang)}
                      </span>
                    </li>
                  ))}
                </ol>
              </article>
            );
          })}
        </div>
      </Section>

      {/* Service flow — vertical timeline: numbered nodes on a dashed rail so
          the sequence reads top-to-bottom in one glance; title sits beside the
          node, description underneath, line-art icon floats at the right. */}
      <Section surface heading={home.flow.heading}>
        <ol className="mx-auto max-w-2xl">
          {home.flow.steps.map((step, i) => {
            const last = i === home.flow.steps.length - 1;
            return (
              <li
                key={step.number}
                className="relative flex gap-6 pb-12 last:pb-0 animate-fade-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Rail connecting this node to the next */}
                {!last && (
                  <span
                    className="absolute bottom-0 left-6 top-12 w-0 border-l-2 border-dashed border-primary/25"
                    aria-hidden="true"
                  />
                )}
                <span className="z-10 flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full bg-primary text-white shadow-[0_4px_12px_rgba(43,126,193,0.25)]">
                  <span className="text-[8px] font-bold leading-none tracking-[0.18em] opacity-80">
                    STEP
                  </span>
                  <span className="mt-0.5 text-base font-bold leading-none tabular-nums">
                    {step.number}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="pt-3 text-lg font-bold leading-snug text-heading">
                    {t(step.title, lang)}
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-body">
                    {t(step.body, lang)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      {/* Application banners — one for prospective users, one for nursing
          staff recruitment. The staff banner's target/rel are conditional
          because the client's real registration URL is still pending and may
          end up pointing off-site. Original layout: text stack with a
          circular arrow chip, tinted per audience. */}
      <Section surface>
        <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
          <a
            href="#contact"
            className="group flex items-center justify-between gap-4 rounded-3xl bg-accent-light px-7 py-6 transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(201,79,124,0.18)] animate-fade-up"
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium text-accent">
                {t(home.apply.user.eyebrow, lang)}
              </span>
              <span className="mt-1.5 block text-lg font-bold leading-snug text-heading md:text-xl">
                {t(home.apply.user.label, lang)}
              </span>
            </span>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-accent shadow-[0_4px_12px_rgba(201,79,124,0.15)] transition group-hover:translate-x-1">
              <ArrowRightIcon />
            </span>
          </a>
          <a
            href={home.apply.staff.href}
            {...(staffHrefIsExternal
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="group flex items-center justify-between gap-4 rounded-3xl bg-primary-light px-7 py-6 transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(43,126,193,0.18)] animate-fade-up"
            style={{ animationDelay: "100ms" }}
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium text-primary">
                {t(home.apply.staff.eyebrow, lang)}
              </span>
              <span className="mt-1.5 block text-lg font-bold leading-snug text-heading md:text-xl">
                {t(home.apply.staff.label, lang)}
              </span>
            </span>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-[0_4px_12px_rgba(43,126,193,0.15)] transition group-hover:translate-x-1">
              <ArrowRightIcon />
            </span>
          </a>
        </div>
      </Section>

      {/* Contact */}
      <Section surface>
        <div
          id="contact"
          className="rounded-2xl bg-primary-light px-6 py-12 text-center md:py-16 animate-fade-up scroll-mt-36"
        >
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
            </div>
            <Link
              href="/service-flow"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-mid"
            >
              {t(cta.contact, lang)}
            </Link>
          </div>

          {/* Certification: mics logo + BSI ISO 27001 badge */}
          <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
            <div className="flex h-16 w-40 shrink-0 items-center justify-center rounded-lg bg-white px-4 py-2">
              <Image
                src="/images/mics-logo.png"
                alt="mics — MedicalInformatics Co.,Ltd."
                width={401}
                height={140}
                className="h-auto max-h-12 w-auto"
              />
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

/**
 * Inverted pyramid that answers the problem list above.
 *
 * A true inverted triangle (the client's requested silhouette). What keeps it
 * off the competitor's design: generously rounded corners via a round-joined
 * stroke of the same paint, and the flat brand sakura fill that matches the
 * other solid colour blocks on the page.
 *
 * The copy is real HTML over the shape — not SVG `<text>` — so it wraps and is
 * read out properly in either language. It sits in the upper band, where the
 * triangle is still wide enough to hold a line of text.
 */
function PyramidStatement({ badge, resolve }: { badge: string; resolve: string }) {
  return (
    <div className="relative w-full max-w-2xl animate-fade-up">
      {/* Narrow, deeper triangle for small screens */}
      <svg viewBox="0 0 600 500" className="block h-auto w-full md:hidden" aria-hidden="true">
        <path
          d="M24 24 H576 L300 476 Z"
          fill="var(--color-accent)"
          stroke="var(--color-accent)"
          strokeWidth="36"
          strokeLinejoin="round"
        />
      </svg>
      {/* Wide, shallower triangle from md up */}
      <svg viewBox="0 0 800 380" className="hidden h-auto w-full md:block" aria-hidden="true">
        <path
          d="M24 24 H776 L400 356 Z"
          fill="var(--color-accent)"
          stroke="var(--color-accent)"
          strokeWidth="36"
          strokeLinejoin="round"
        />
      </svg>

      {/* Copy — centred on the triangle's visual mass. A triangle's centroid
          sits ~40% down, not at the bounding box's halfway line, so the flex
          centre is biased upward with bottom padding; the max-widths keep the
          lines inside the slanted edges at the block's lowest point. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pb-[18%] px-[10%] text-center text-white">
        <p className="text-xs font-medium tracking-wide text-white/90 md:text-sm">
          {badge}
        </p>
        <p className="mt-1.5 max-w-[56%] text-lg font-bold leading-snug md:mt-2 md:max-w-[62%] md:text-xl">
          {resolve}
        </p>
      </div>
    </div>
  );
}

/** Line-art icons for the nursing-course coverage list. */
function NursingIcon({ name }: { name: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    className: "h-5.5 w-5.5",
    "aria-hidden": true,
    stroke: "currentColor" as const,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "vitals") {
    return (
      <svg {...common}>
        {/* Pulse line over a heart */}
        <path d="M12 20.5C6.5 16.5 3.5 13 3.5 9.5a4.5 4.5 0 018.5-2 4.5 4.5 0 018.5 2c0 3.5-3 7-8.5 11z" />
        <path d="M6.5 12h3l1.5-3 2 5 1.5-2.5h3" />
      </svg>
    );
  }

  if (name === "procedure") {
    return (
      <svg {...common}>
        {/* Syringe angled down-left: barrel, needle, plunger, dose ticks */}
        <path d="M16.5 5.5L6.5 15.5M18.5 7.5L8.5 17.5M16.5 5.5l2 2M6.5 15.5l2 2" />
        <path d="M7.5 16.5L4 20" />
        <path d="M17.5 6.5L20 4M18.6 2.6l2.8 2.8" />
        <path d="M13.5 8.5l1.5 1.5M11 11l1.5 1.5" />
      </svg>
    );
  }

  if (name === "medication") {
    return (
      <svg {...common}>
        {/* Pill bottle */}
        <rect x="7" y="7.5" width="8" height="13" rx="1.5" />
        <path d="M6.5 7.5h9M9 4.5h4v3H9zM9.5 13.5h3M11 12v3" />
        <circle cx="18.5" cy="16.5" r="0.2" />
      </svg>
    );
  }

  if (name === "consult") {
    return (
      <svg {...common}>
        {/* Two speech bubbles */}
        <path d="M4 5.5h10a1.5 1.5 0 011.5 1.5v5a1.5 1.5 0 01-1.5 1.5H9l-3.5 3v-3H4A1.5 1.5 0 012.5 12V7A1.5 1.5 0 014 5.5z" />
        <path d="M18.5 9.5h1.5A1.5 1.5 0 0121.5 11v4.5a1.5 1.5 0 01-1.5 1.5h-.5v2.5l-3-2.5h-3" />
      </svg>
    );
  }

  if (name === "palliative") {
    return (
      <svg {...common}>
        {/* Heart resting on an open palm */}
        <path d="M12 12.5c-2.8-2-4.3-3.8-4.3-5.7A2.55 2.55 0 0112 5.4a2.55 2.55 0 014.3 1.4c0 1.9-1.5 3.7-4.3 5.7z" />
        <path d="M4.5 17c2-1.5 3.5-2 5-2h4a1.25 1.25 0 010 2.5H10" />
        <path d="M13.5 17.5l4.5-1.5a1.3 1.3 0 011 2.4l-5.5 2.6c-1.5.7-3 .5-4.5-.2l-4.5-2" />
      </svg>
    );
  }

  // default: "hospital" — building with a cross
  return (
    <svg {...common}>
      <rect x="5" y="5.5" width="14" height="15" rx="1" />
      <path d="M3.5 20.5h17" />
      <path d="M12 8.5v4M10 10.5h4" />
      <path d="M8.5 16h2v4.5h3V16h2" />
    </svg>
  );
}

/** Right arrow used in the application banner chips. */
function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
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
