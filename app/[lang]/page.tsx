import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  IconArrowDown,
  IconArrowRight,
  IconBuildingHospital,
  IconClock,
  IconHeartbeat,
  IconHeartHandshake,
  IconMapPin,
  IconMessages,
  IconNeedle,
  IconPhone,
  IconPill,
  type Icon,
} from "@tabler/icons-react";
import Section from "@/components/ui/Section";
import { getHome } from "@/features/cms/home";
import { getSite } from "@/features/cms/site";
import { pageMetadata } from "@/features/seo/pageMetadata";
import { t, localizeHref, isLang } from "@/features/lang/i18n";

// Only route under app/[lang]/** without its own generateMetadata before
// this — it inherited app/[lang]/layout.tsx's `title.default` (brand name +
// tagline only), so it never carried a per-page description or the
// og:image/og:url/og:locale:alternate every other route gets from
// `pageMetadata()` (audit finding #15). `constants/seo.ts#home`'s
// title/description are copied VERBATIM from what the layout renders today
// (`${brand.name} — ${brand.tagline[lang]}` / `brand.tagline[lang]`), so
// this call is additive: it fills in alternates/openGraph without moving
// the rendered title or description.
//
// `title.absolute` is required here, not a plain string: the root layout
// sets `title.template = "%s | ${brand.name}"`, and `home.title` already
// ends with the brand name ("Care 24 Japan — …"), so a templated title would
// double-append it ("… | Care 24 Japan | Care 24 Japan"). `absolute`
// bypasses the parent template entirely (see node_modules/next/dist/docs/
// 01-app/03-api-reference/04-functions/generate-metadata.md:291-344), which
// is exactly "ignore the template, use this string as-is" — the same
// contract the layout's own `title.default` already relies on.
export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const meta = await pageMetadata({ key: "home", lang });
  return { ...meta, title: { absolute: meta.title as string } };
}

/** "9:00" -> 540 (minutes since midnight). */
function toMinutes(clock: string): number {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
}

/** "9:00〜10:00" -> { start: 540, end: 600 }, in minutes since midnight. */
function parseTimeRange(range: string): { start: number; end: number } {
  const [start, end] = range.split("〜");
  return { start: toMinutes(start), end: toMinutes(end) };
}

export default async function HomePage({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [home, site] = await Promise.all([getHome(), getSite()]);
  // Computed against the raw, CMS-editable href — localizeHref() is called
  // separately below, at the ApplyBanner call sites. That's safe: localizeHref()
  // is a no-op on anything with a scheme (see its own doc comment), so this
  // externality check gives the same answer whether it runs before or after
  // localization. Checking the raw value here just keeps this line next to
  // the CMS field it's actually describing.
  const staffHrefIsExternal = /^https?:\/\//.test(home.apply.staff.href);
  const heroCtaIsExternal = /^https?:\/\//.test(home.hero.ctaPrimaryHref);

  return (
    <>
      {/* Hero — full-bleed key visual */}
      <section className="relative isolate overflow-hidden">
        {/* Key visual: absolute inset so the photo always edge-to-edges the viewport */}
        <div className="absolute inset-0 -z-20">
          <Image
            src={home.hero.image}
            alt={t(home.hero.imageAlt, lang)}
            fill
            priority
            fetchPriority="high"
            sizes="100vw"
            className="object-cover object-[62%_38%] md:object-[58%_32%]"
          />
        </div>

        {/* Soft sakura glow + gentle left veil for headline contrast + bottom fade.
            Keep the left veil soft so it never reads as a hard crop edge. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(55%_50%_at_92%_8%,var(--color-accent-light)_0%,transparent_60%)] opacity-30"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-linear-to-r from-bg/50 via-bg/15 to-transparent md:from-bg/40 md:via-bg/8"
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

            <div className="mt-8 flex flex-col items-start gap-3">
              {heroCtaIsExternal ? (
                <a
                  href={localizeHref(home.hero.ctaPrimaryHref, lang)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 rounded-full bg-accent px-7 py-3.5 font-medium text-white shadow-lg shadow-accent/25 transition hover:opacity-90"
                >
                  {t(home.hero.ctaPrimary, lang)}
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20"
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                  </span>
                </a>
              ) : (
                <Link
                  href={localizeHref(home.hero.ctaPrimaryHref, lang)}
                  className="inline-flex items-center gap-3 rounded-full bg-accent px-7 py-3.5 font-medium text-white shadow-lg shadow-accent/25 transition hover:opacity-90"
                >
                  {t(home.hero.ctaPrimary, lang)}
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20"
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                  </span>
                </Link>
              )}
              <div className="flex flex-col items-start gap-1.5">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-border bg-surface/90 px-4 py-2.5 shadow-sm backdrop-blur-sm">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary"
                    aria-hidden="true"
                  >
                    <IconMapPin className="h-4 w-4" stroke={1.8} aria-hidden="true" />
                  </span>
                  <p className="text-sm font-semibold text-heading">
                    {t(home.hero.areaBadge.main, lang)}
                  </p>
                </div>
                <p className="px-1 text-xs text-muted">
                  {t(home.hero.areaBadge.sub, lang)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About — what Care24Japan is, before the problems grid */}
      <Section heading={home.about.heading} lang={lang}>
        <p className="max-w-3xl text-xl font-semibold leading-relaxed text-heading md:text-2xl">
          {t(home.about.catchphrase, lang)}
        </p>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-body">
          {t(home.about.body, lang)}
        </p>
        <ul className="mt-12 grid gap-8 sm:grid-cols-3">
          {home.about.cards.map((card, i) => (
              <li key={i} className="flex flex-col items-center text-center animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <span className="flex h-24 w-24 items-center justify-center rounded-full border border-border bg-surface p-4 shadow-sm sm:h-28 sm:w-28">
                  {card.image ? (
                    <Image
                      src={card.image}
                      alt=""
                      width={96}
                      height={96}
                      className="h-full w-full object-contain"
                    />
                  ) : null}
                </span>
                <h3 className="mt-5 text-lg font-bold text-heading">{t(card.title, lang)}</h3>
                <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-body">{t(card.body, lang)}</p>
              </li>
            ))}
        </ul>
        <div className="mx-auto mt-12 max-w-xl animate-fade-up" aria-hidden="true">
          <Image
            src={home.about.illustration}
            alt=""
            width={960}
            height={480}
            className="mx-auto h-auto w-full max-w-md object-contain"
          />
        </div>
      </Section>

      {/* Problems — Visual Ref 3 illustrated concern cards */}
      <Section surface heading={home.problems.heading} lang={lang}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {home.problems.items.map((item, i) => (
            <div
              key={i}
              className="flex flex-col items-center rounded-2xl border border-border bg-surface px-4 py-6 text-center animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light p-2.5 text-primary">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt=""
                    width={48}
                    height={48}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ProblemIcon name={item.icon} />
                )}
              </span>
              <h3 className="mt-4 text-base font-bold leading-snug text-heading">
                {t(item.title, lang)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-body">
                {t(item.body, lang)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-lg font-semibold text-heading md:text-xl">
          {t(home.problems.closing, lang)}
        </p>
      </Section>

      {/* TOP baseline pricing + payment — Visual Ref 4 */}
      <Section lang={lang}>
        <div className="grid items-stretch gap-6 lg:grid-cols-2">
          <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <h2 className="text-xl font-bold text-heading md:text-2xl">
              {t(home.pricingSummary.heading, lang)}
            </h2>
            <div className="mt-6 grid flex-1 gap-5 sm:grid-cols-2">
              {([home.pricingSummary.care, home.pricingSummary.nursing] as const).map((course, i) => (
                <div key={i} className="flex flex-col rounded-xl bg-primary-light/60 px-4 py-5">
                  <p className="text-sm font-semibold text-primary">{t(course.label, lang)}</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-accent md:text-3xl">
                    {t(course.amount, lang)}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-muted">{t(course.minNote, lang)}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{t(course.transportNote, lang)}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">{t(home.pricingSummary.extensionNote, lang)}</p>
            <p className="mt-5 text-base">
              <Link
                href={localizeHref("/pricing", lang)}
                className="font-medium text-primary underline decoration-primary/30 underline-offset-2 transition hover:text-primary-mid hover:decoration-primary/60"
              >
                {t(home.pricingDetailsLink, lang)}
              </Link>
            </p>
          </div>

          <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <h2 className="text-xl font-bold text-heading md:text-2xl">
              {t(home.pricingSummary.payment.heading, lang)}
            </h2>
            <p className="mt-3 text-base text-body">
              {t(home.pricingSummary.payment.body, lang)}
            </p>

            {/*
              Mirror the left fee card's visual weight: a filled inner panel
              with a 2×2 logo grid (same rhythm as the two course tiles) so
              the payment card does not read as empty whitespace.
            */}
            <div className="mt-6 flex flex-1 flex-col rounded-xl bg-primary-light/60 p-4 sm:p-5">
              <ul className="grid flex-1 grid-cols-2 content-center gap-3 sm:gap-4">
                {home.pricingSummary.payment.logos.map((logo) => (
                  <li key={logo.mark} className="min-w-0">
                    <PaymentBrand src={logo.src} alt={t(logo.alt, lang)} />
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-center text-xs leading-relaxed text-muted sm:text-sm">
                {t(home.pricingSummary.payment.settleNote, lang)}
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Answer to the problems above — inverted pyramid, redrawn as an
          original shape (softly concave "funnel" sides, rounded corners,
          sakura gradient) rather than the competitor's flat sharp triangle. */}
      <div className="flex flex-col items-center bg-surface px-6 pb-8 pt-2 md:pb-10">
        <PyramidStatement
          badge={t(home.hero.badge, lang)}
          resolve={t(home.hero.resolve, lang)}
        />
        <p className="mx-auto mt-8 max-w-2xl text-center text-base leading-relaxed text-heading animate-fade-up md:text-lg">
          {t(home.hero.assist, lang)}
        </p>
      </div>

      {/* Care course — leads the service block (matches /pricing order: care, then nursing). */}
      <Section id="service-details" surface lang={lang}>
        {/* Lead-in heading, with the course description directly under it —
            it explains the heading, so it belongs there rather than floating
            beside the price. */}
        <h2 className="whitespace-pre-line text-center text-2xl md:text-3xl font-bold leading-snug text-heading animate-fade-up">
          {t(home.careCourse.leadIn, lang)}
        </h2>
        <p className="mx-auto mt-5 max-w-3xl whitespace-pre-line text-center text-lg leading-relaxed text-body animate-fade-up">
          {t(home.careCourse.tagline, lang)}
          {t(home.careCourse.taglineSub, lang)}
        </p>

        {/* The whole offer as ONE band: price on the left, the three extra
            terms as equal cells on the right, hairline-divided (gap-px over
            the band's own border colour). Section palette only — the blue
            tint already used for the care course. */}
        <div className="mt-10 rounded-2xl border border-primary/25 bg-primary-light/50 p-6 animate-fade-up sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-10">
            <div className="lg:w-[38%] lg:shrink-0">
              <span className="inline-flex w-fit items-center rounded-full bg-primary px-5 py-1.5 text-lg font-bold text-white">
                {t(home.careCourse.badge, lang)}
              </span>
              <p className="mt-5 text-lg font-medium text-body">
                {t(home.careCourse.price.label, lang)}
                {t(home.careCourse.price.hours, lang)}
              </p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="text-5xl font-bold tabular-nums text-heading">
                  {t(home.careCourse.price.amount, lang)}
                </span>
                <span className="text-lg text-muted">{t(home.careCourse.price.taxNote, lang)}</span>
                <span className="text-lg font-medium text-body">
                  {t(home.careCourse.price.unit, lang)}
                </span>
              </p>
              <p className="mt-1 text-lg text-body">
                {t(home.careCourse.price.taxIncluded, lang)}
              </p>
              <p className="mt-5 text-lg">
                <Link
                  href={localizeHref("/pricing", lang)}
                  className="font-medium text-primary underline decoration-primary/30 underline-offset-2 transition hover:text-primary-mid hover:decoration-primary/60"
                >
                  {t(home.pricingDetailsLink, lang)}
                </Link>
              </p>
            </div>

            {/* Three equal cells, hairline-divided */}
            <dl className="grid flex-1 auto-rows-fr gap-px overflow-hidden rounded-xl bg-primary/20 sm:grid-cols-3">
              {home.careCourse.fees.map((fee, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center bg-surface px-4 py-6 text-center"
                >
                  <dt className="text-lg text-muted">{t(fee.label, lang)}</dt>
                  <dd className="mt-1.5 text-lg font-bold text-heading">{t(fee.value, lang)}</dd>
                  {fee.note && (
                    <dd className="mt-1 text-lg leading-snug text-muted">{t(fee.note, lang)}</dd>
                  )}
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Two service cards */}
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {home.careCourse.cards.map((card, i) => (
            <div key={i} className="animate-fade-up" style={{ animationDelay: `${i * 120}ms` }}>
              {/* The card's OWN image — not `/images/use-case-${i + 1}.webp`.
                  A 5th card added in the dashboard used to render a 404; now
                  it renders the media the editor picked. `card.image` is only
                  empty for a card that has neither a CMS image nor a bundled
                  counterpart, and an empty `src` throws in `next/image`. */}
              {card.image && (
                <div className="relative aspect-16/10 w-full overflow-hidden rounded-2xl border border-border">
                  <Image
                    src={card.image}
                    alt={t(card.imageAlt, lang)}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              )}
              <h3 className="mt-5 text-xl font-bold text-heading">{t(card.title, lang)}</h3>
              <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
                {card.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-lg leading-snug text-body">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    {t(item, lang)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Nursing course — second, after the care course.
          Reworked away from the competitor's signature: the course name is a
          pill rather than a solid rectangle, the rate label sits above the
          figure instead of in a colour block welded to its left, and the whole
          offer is one tinted card rather than loose chips on the page. */}
      <Section lang={lang}>
        {/* Lead-in heading */}
        <h2 className="whitespace-pre-line text-center text-2xl md:text-3xl font-bold leading-snug text-heading animate-fade-up">
          {t(home.nursingCourse.leadIn, lang)}
        </h2>
        <p className="mx-auto mt-5 max-w-3xl whitespace-pre-line text-center text-lg leading-relaxed text-body animate-fade-up">
          {t(home.nursingCourse.tagline, lang)}
          {t(home.nursingCourse.taglineSub, lang)}
        </p>

        {/* The coverage list runs as one tall column, so the price card sticks
            below the header (130px tall) and stays in view the whole way
            down it. `items-start` is required — a stretched or centred grid
            item can't stick. */}
        <div className="mt-10 grid gap-8 md:grid-cols-2 md:items-start">
          {/* Left: the offer, as a single card */}
          <div className="rounded-2xl border border-accent/25 bg-accent-light/60 p-8 animate-fade-up md:sticky md:top-36">
            <span className="inline-flex w-fit items-center rounded-full bg-accent px-5 py-1.5 text-lg font-bold text-white">
              {t(home.nursingCourse.badge, lang)}
            </span>

            <p className="mt-6 text-lg font-medium text-body">
              {t(home.nursingCourse.price.label, lang)}
              {t(home.nursingCourse.price.hours, lang)}
            </p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="text-5xl font-bold tabular-nums text-heading">
                {t(home.nursingCourse.price.amount, lang)}
              </span>
              <span className="text-lg text-muted">{t(home.nursingCourse.price.taxNote, lang)}</span>
              <span className="text-lg font-medium text-body">{t(home.nursingCourse.price.unit, lang)}</span>
            </p>
            <p className="mt-1 text-lg text-body">
              {t(home.nursingCourse.price.taxIncluded, lang)}
            </p>

            <p className="mt-6 text-lg">
              <Link
                href={localizeHref("/pricing", lang)}
                className="font-medium text-accent underline decoration-accent/30 underline-offset-2 transition hover:text-accent/80 hover:decoration-accent/60"
              >
                {t(home.pricingDetailsLink, lang)}
              </Link>
            </p>
          </div>

          {/* Right: what the course covers */}
          <div className="animate-fade-up [animation-delay:120ms]">
            <h3 className="whitespace-pre-line text-xl font-bold leading-relaxed text-heading">
              {t(home.nursingCourse.panel.heading, lang)}
            </h3>
            {/* One column: each item gets the full width, so labels wrap at
                most twice and the icons stay on a single vertical rhythm. */}
            <ul className="mt-6 flex flex-col gap-5">
              {home.nursingCourse.panel.items.map((item, i) => (
                <li key={i} className="flex items-center gap-3.5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-light text-accent">
                    <NursingIcon name={item.icon} />
                  </span>
                  <span className="text-lg leading-snug text-body">{t(item.label, lang)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Examples — three usage cases as an alternating editorial spread:
          the person's request stands on one half, their actual day on the
          other, sides flipping per case. The day is drawn like a calendar
          column — each block's height follows its real duration — so a
          reader sees how a visit is shaped without reading every line.
          No cards, no tabs: all three cases stay open. */}
      <Section lang={lang}>
        <div className="text-center animate-fade-up">
          <p className="text-lg font-bold text-body">{t(home.examples.leadIn, lang)}</p>
          <h2 className="mt-2 text-3xl font-bold text-primary">{t(home.examples.heading, lang)}</h2>
        </div>

        <div className="mt-4 flex flex-col">
          {home.examples.cases.map((c, ci) => {
            const accent = c.tone === "accent";
            const flip = ci % 2 === 1;
            const ranges = c.schedule.map((row) => parseTimeRange(row.time));
            const dayStart = c.schedule[0].time.split("〜")[0];
            const dayEnd = c.schedule[c.schedule.length - 1].time.split("〜")[1];
            return (
              <article
                key={ci}
                className="grid animate-fade-up items-center gap-10 border-t border-border py-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16"
                style={{ animationDelay: `${ci * 100}ms` }}
              >
                {/* The ask */}
                <div className={flip ? "lg:order-2" : ""}>
                  <p
                    className={`text-lg font-bold tracking-wide ${
                      accent ? "text-accent" : "text-primary"
                    }`}
                  >
                    {t(c.label, lang)}
                  </p>
                  <h3 className="mt-3 text-2xl font-bold leading-snug text-heading md:text-3xl">
                    {t(c.request, lang)}
                  </h3>
                  <p className="mt-4 text-lg leading-relaxed text-body">{t(c.title, lang)}</p>

                  <p className="mt-7 text-lg font-bold text-muted">
                    {t(home.examples.servicesLabel, lang)}
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {c.services.map((s, si) => (
                      <li
                        key={si}
                        className={`rounded-full px-4 py-1.5 text-lg text-heading ${
                          accent ? "bg-accent-light" : "bg-primary-light"
                        }`}
                      >
                        {t(s, lang)}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* The day, drawn to scale */}
                <div className={flip ? "lg:order-1" : ""}>
                  <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
                    <p className="flex items-center gap-2 text-lg font-bold text-muted">
                      <ClockIcon />
                      {t(home.examples.scheduleLabel, lang)}
                    </p>
                    <p className="text-lg font-bold tabular-nums text-heading">
                      <span className="mr-1 text-lg font-normal text-muted">
                        {t(home.examples.hoursLabel, lang)}
                      </span>
                      {dayStart}–{dayEnd}
                      <span className="ml-2 text-lg font-normal text-muted">
                        {t(c.hours, lang)}
                      </span>
                    </p>
                  </div>

                  <ol className="mt-3 flex flex-col gap-1.5">
                    {c.schedule.map((row, ri) => {
                      const minutes = ranges[ri].end - ranges[ri].start;
                      return (
                        <li
                          key={ri}
                          style={{ minHeight: `${minutes * 1.05}px` }}
                          className={`flex items-center gap-4 rounded-r-xl border-l-4 px-5 py-3 ${
                            accent
                              ? ri % 2 === 0
                                ? "border-accent bg-accent-light"
                                : "border-accent/50 bg-accent-light/50"
                              : ri % 2 === 0
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
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      {/* Service flow — Visual Ref 5: circular icon steps with arrows */}
      <Section surface heading={home.flow.heading} lang={lang}>
        <ol className="mx-auto grid max-w-5xl grid-cols-1 gap-y-8 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:items-start md:gap-x-1 lg:gap-x-2">
          {home.flow.steps.flatMap((step, i) => {
            const last = i === home.flow.steps.length - 1;
            const nodes = [
              <li
                key={step.number}
                className="flex flex-col items-center text-center animate-fade-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span className="relative flex h-28 w-28 items-center justify-center md:h-32 md:w-32">
                  <span className="absolute inset-0 overflow-hidden rounded-full border-4 border-primary/20 shadow-sm">
                    <FlowStepIcon src={step.image} />
                  </span>
                  <span className="absolute -top-1 left-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[11px] font-bold tracking-wide text-white shadow-sm">
                    {step.number}
                  </span>
                </span>
                <h3 className="mt-5 text-lg font-bold leading-snug text-heading md:text-base lg:text-lg">
                  {t(step.title, lang)}
                </h3>
                <p className="mt-2 max-w-[14rem] text-sm leading-relaxed text-body">
                  {t(step.body, lang)}
                </p>
              </li>,
            ];
            if (!last) {
              nodes.push(
                <li
                  key={`arrow-${step.number}`}
                  className="flex items-center justify-center text-primary md:h-32"
                  aria-hidden="true"
                >
                  <span className="md:hidden">
                    <FlowDownArrowIcon />
                  </span>
                  <span className="hidden md:block">
                    <FlowArrowIcon />
                  </span>
                </li>,
              );
            }
            return nodes;
          })}
        </ol>
      </Section>

      {/* Consultation CTA — Visual Ref 6 primary band; staff remains secondary */}
      <Section surface lang={lang}>
        <div className="overflow-hidden rounded-2xl border border-accent/20 bg-accent-light/70 px-5 py-8 sm:px-8 md:px-10 md:py-10">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between md:gap-8">
            <div className="hidden shrink-0 md:block" aria-hidden="true">
              <FamilyIllustration src={home.apply.consult.illustration} />
            </div>
            <div className="min-w-0 flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-heading md:text-3xl">
                {t(home.apply.consult.heading, lang)}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-body md:text-lg">
                {t(home.apply.consult.body, lang)}
              </p>
            </div>
            <a
              href={localizeHref(home.apply.consult.href, lang)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-3 rounded-full bg-accent px-7 py-3.5 font-medium text-white shadow-lg shadow-accent/25 transition hover:opacity-90"
            >
              {t(home.apply.consult.cta, lang)}
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20"
              >
                <ArrowRightIcon className="h-4 w-4" />
              </span>
            </a>
          </div>
        </div>

        <div className="mx-auto mt-4 max-w-xl">
          <ApplyBanner
            href={localizeHref(home.apply.staff.href, lang)}
            eyebrow={t(home.apply.staff.eyebrow, lang)}
            label={t(home.apply.staff.label, lang)}
            tone="primary"
            emphasis="secondary"
            external={staffHrefIsExternal}
            delay={80}
          />
        </div>
      </Section>

      {/* Contact */}
      <Section surface lang={lang}>
        <div
          id="contact"
          className="rounded-2xl bg-primary-light px-6 py-8 text-center md:py-12 animate-fade-up scroll-mt-36"
        >
          <p className="text-sm font-medium text-primary">
            {t(home.contact.leadInOrnamentStart, lang)} {t(home.contact.leadIn, lang)} {t(home.contact.leadInOrnamentEnd, lang)}
          </p>
          <h2 className="mt-2 text-2xl md:text-3xl font-bold text-heading">
            {t(home.contact.heading, lang)}
          </h2>

          <div className="mt-8 flex flex-col items-center justify-center gap-6 sm:flex-row">
            <a
              href={`tel:${home.contact.phone.replace(/-/g, "")}`}
              className="flex items-center gap-2 text-3xl md:text-4xl font-bold text-heading"
            >
              <PhoneIcon />
              {home.contact.phone}
            </a>
            <Link
              href={localizeHref(home.contact.ctaHref, lang)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-mid"
            >
              {t(site.cta.contact, lang)}
            </Link>
          </div>

          {/* Certification: mics logo + BSI ISO 27001 badge */}
          <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
            <div className="flex h-20 w-48 shrink-0 items-center justify-center rounded-lg bg-white px-3 py-2">
              <a
                href="https://mics.tokyo/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition opacity-90 hover:opacity-100"
              >
                <Image
                  src={home.contact.micsLogo}
                  alt={t(home.contact.micsLogoAlt, lang)}
                  width={401}
                  height={140}
                  className="h-auto max-h-14 w-auto"
                />
              </a>
            </div>
            <div className="flex h-20 w-auto shrink-0 items-center justify-center rounded-lg bg-white p-1">
              <Image
                src={home.contact.isoLogo}
                alt={t(home.contact.isoLogoAlt, lang)}
                width={257}
                height={182}
                className="h-[4.5rem] w-auto"
              />
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
    <div className="relative w-full max-w-sm animate-fade-up">
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
      <div className="absolute inset-0 pt-5 flex flex-col items-center justify-center pb-[18%] px-[10%] text-center text-white">
        <p className="text-xs font-medium tracking-wide text-white/90 md:text-sm">
          {badge}
        </p>
        <p className="mt-1.5 max-w-[56%] text-md font-bold leading-snug md:mt-2 md:max-w-[62%] md:text-lg">
          {resolve}
        </p>
      </div>
    </div>
  );
}

/** Line-art icons for the nursing-course coverage list (Tabler). */
const NURSING_ICONS: Record<string, Icon> = {
  vitals: IconHeartbeat,
  procedure: IconNeedle,
  medication: IconPill,
  consult: IconMessages,
  palliative: IconHeartHandshake,
  hospital: IconBuildingHospital,
};

function NursingIcon({ name }: { name: string }) {
  const Comp = NURSING_ICONS[name] ?? IconBuildingHospital;
  return <Comp className="h-[1.375rem] w-[1.375rem]" stroke={1.6} aria-hidden="true" />;
}

const PROBLEM_ICON_SRC: Record<string, string> = {
  absence: "/images/problem-absence.png",
  bathing: "/images/problem-bathing.png",
  hospital: "/images/problem-hospital.png",
  insurance: "/images/problem-insurance.png",
  discharge: "/images/problem-discharge.png",
};

function ProblemIcon({ name }: { name: string }) {
  const src = PROBLEM_ICON_SRC[name] ?? PROBLEM_ICON_SRC.discharge!;
  return (
    <Image
      src={src}
      alt=""
      width={64}
      height={64}
      className="h-full w-full object-contain"
    />
  );
}

function FlowStepIcon({ src }: { src: string }) {
  if (!src) return null;
  return (
    <Image
      src={src}
      alt=""
      width={256}
      height={256}
      className="h-full w-full object-cover"
    />
  );
}

function FlowArrowIcon() {
  return <IconArrowRight className="h-5 w-10" stroke={2} aria-hidden="true" />;
}

function FlowDownArrowIcon() {
  return <IconArrowDown className="h-6 w-4" stroke={2} aria-hidden="true" />;
}

function PaymentBrand({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="flex h-full min-h-20 w-full items-center justify-center rounded-xl border border-border/80 bg-surface px-4 py-4 sm:min-h-24 sm:px-5 sm:py-5">
      <Image
        src={src}
        alt={alt}
        width={240}
        height={160}
        className="h-10 w-auto max-w-[7.5rem] object-contain sm:h-12 sm:max-w-[9rem]"
      />
    </span>
  );
}

function FamilyIllustration({ src }: { src: string }) {
  if (!src) return null;
  return (
    <Image
      src={src}
      alt=""
      width={320}
      height={240}
      className="h-28 w-auto max-w-[14rem] object-contain"
    />
  );
}

/**
 * The two entry points off this page (book care / apply to work).
 *
 * Solid in the audience's own colour — no gradient, no glass, no glow. What
 * carries the design is hierarchy, not ornament: the audience line is small
 * and slightly recessed, the action is large and pure white, and the arrow
 * lives in a chip that inverts on hover.
 *
 * `emphasis="primary"` is the user-facing application CTA (filled, prominent).
 * `emphasis="secondary"` is the staff-recruitment path (outlined, quieter).
 *
 * Two things make the pair read as a set rather than two loose blocks:
 *
 * 1. `grid-rows-subgrid` — both cards borrow the *parent's* two rows, so the
 *    audience lines share one row and the actions share another. The English
 *    「For those who wish to use our service」 wraps to two lines while its
 *    twin does not, and the two actions still land on the same line.
 * 2. The deepened fills (see --color-*-deep in globals.css), which take white
 *    past 4.5:1 at any size. On the undeepened brand colours every word here
 *    would have to be 18.66px+ bold, which is what flattened the hierarchy.
 */


/**
 * The two entry points off this page (book care / apply to work).
 *
 * Solid in the audience's own colour — no gradient, no glass, no glow. What
 * carries the design is hierarchy, not ornament: the audience line is small
 * and slightly recessed, the action is large and pure white, and the arrow
 * lives in a chip that inverts on hover.
 *
 * `emphasis="primary"` is the user-facing application CTA (filled, prominent).
 * `emphasis="secondary"` is the staff-recruitment path (outlined, quieter).
 *
 * Two things make the pair read as a set rather than two loose blocks:
 *
 * 1. `grid-rows-subgrid` — both cards borrow the *parent's* two rows, so the
 *    audience lines share one row and the actions share another. The English
 *    「For those who wish to use our service」 wraps to two lines while its
 *    twin does not, and the two actions still land on the same line.
 * 2. The deepened fills (see --color-*-deep in globals.css), which take white
 *    past 4.5:1 at any size. On the undeepened brand colours every word here
 *    would have to be 18.66px+ bold, which is what flattened the hierarchy.
 */
function ApplyBanner({
  href,
  eyebrow,
  label,
  tone,
  emphasis = "primary",
  external = false,
  delay,
}: {
  href: string;
  eyebrow: string;
  label: string;
  tone: "accent" | "primary";
  emphasis?: "primary" | "secondary";
  external?: boolean;
  delay: number;
}) {
  const accent = tone === "accent";
  const isPrimary = emphasis === "primary";

  // The shadow is tinted from the fill rather than black — a grey shadow under
  // a saturated block reads as dirt.
  const className = isPrimary
    ? [
        "group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 gap-y-2",
        "rounded-2xl px-7 py-8 text-white ring-1 ring-inset ring-white/15",
        "sm:row-span-2 sm:grid-rows-subgrid",
        "animate-fade-up transition duration-200 motion-safe:hover:-translate-y-0.5",
        "motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-3",
        accent
          ? "bg-accent-deep shadow-[0_4px_16px_-6px_rgba(122,32,68,0.5)] hover:shadow-[0_20px_36px_-18px_rgba(122,32,68,0.65)] focus-visible:outline-accent-deep"
          : "bg-primary-deep shadow-[0_4px_16px_-6px_rgba(16,66,105,0.5)] hover:shadow-[0_20px_36px_-18px_rgba(16,66,105,0.65)] focus-visible:outline-primary-deep",
      ].join(" ")
    : [
        "group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1.5",
        "rounded-xl border border-primary/25 bg-surface px-5 py-5 text-heading",
        "sm:row-span-2 sm:grid-rows-subgrid",
        "animate-fade-up transition duration-200",
        "hover:border-primary/40 hover:bg-primary-light/50",
        "motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary",
      ].join(" ");

  const style = { animationDelay: `${delay}ms` };
  const content = isPrimary ? (
    <>
      {/* white/90 rather than a lighter tint: it still reads as secondary but
          holds 4.8:1, so the line stays legible at 14px. */}
      <span className="col-start-1 row-start-1 self-end text-sm font-medium leading-relaxed text-white/90">
        {eyebrow}
      </span>
      <span className="col-start-1 row-start-2 self-end text-2xl font-bold leading-tight tracking-tight md:text-[1.875rem]">
        {label}
      </span>

      <span
        aria-hidden="true"
        className={`col-start-2 row-start-1 row-span-2 flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-full bg-white/15 ring-1 ring-inset ring-white/25 transition duration-200 group-hover:bg-white group-hover:ring-white motion-reduce:transition-none ${
          accent ? "group-hover:text-accent-deep" : "group-hover:text-primary-deep"
        }`}
      >
        <ArrowRightIcon className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
      </span>
    </>
  ) : (
    <>
      <span className="col-start-1 row-start-1 self-end text-xs font-medium leading-relaxed text-muted">
        {eyebrow}
      </span>
      <span className="col-start-1 row-start-2 self-end text-lg font-semibold leading-snug text-heading md:text-xl">
        {label}
      </span>

      <span
        aria-hidden="true"
        className="col-start-2 row-start-1 row-span-2 flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/15 transition duration-200 group-hover:bg-primary group-hover:text-white group-hover:ring-primary motion-reduce:transition-none"
      >
        <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
      </span>
    </>
  );

  // A same-page anchor and an off-site URL both want a plain <a>; an in-app
  // route wants <Link>, or the click costs a full document reload.
  if (external || href.startsWith("#")) {
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        style={style}
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} style={style} className={className}>
      {content}
    </Link>
  );
}

function ArrowRightIcon({ className = "h-5 w-5" }: { className?: string }) {
  return <IconArrowRight className={className} stroke={2.5} aria-hidden="true" />;
}

/** Freephone receiver glyph shown beside the contact number. */
function PhoneIcon() {
  return <IconPhone className="h-7 w-9 text-primary" stroke={1.6} aria-hidden="true" />;
}

/** Small clock glyph shown beside each timeline step's time. */
function ClockIcon() {
  return <IconClock className="h-4 w-4 text-muted" stroke={1.5} aria-hidden="true" />;
}
