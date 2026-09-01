import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
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
  const userHrefIsExternal = /^https?:\/\//.test(home.apply.user.href);
  const staffHrefIsExternal = /^https?:\/\//.test(home.apply.staff.href);
  const heroCtaIsExternal = /^https?:\/\//.test(home.hero.ctaPrimaryHref);

  return (
    <>
      {/* Hero — full-bleed key visual */}
      <section className="relative isolate overflow-hidden">
        {/* Key visual: spans the full viewport width behind the copy */}
        <Image
          src={home.hero.image}
          alt={t(home.hero.imageAlt, lang)}
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="-z-20 object-cover object-[70%_center] md:object-[center_35%]"
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

            <div className="mt-8 flex flex-col items-start gap-4">
              {heroCtaIsExternal ? (
                <a
                  href={localizeHref(home.hero.ctaPrimaryHref, lang)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-primary px-8 py-3 font-medium text-white shadow-lg shadow-primary/20 transition hover:bg-primary-mid"
                >
                  {t(home.hero.ctaPrimary, lang)}
                </a>
              ) : (
                <Link
                  href={localizeHref(home.hero.ctaPrimaryHref, lang)}
                  className="rounded-full bg-primary px-8 py-3 font-medium text-white shadow-lg shadow-primary/20 transition hover:bg-primary-mid"
                >
                  {t(home.hero.ctaPrimary, lang)}
                </Link>
              )}
              <div className="rounded-2xl border border-border bg-surface/85 px-4 py-3 backdrop-blur-sm">
                <p className="text-sm font-semibold text-heading">
                  {t(home.hero.areaBadge.main, lang)}
                </p>
                <p className="mt-1 text-xs text-muted">
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
        <ul className="mt-10 grid gap-6 sm:grid-cols-3">
          {home.about.cards.map((card, i) => (
            <li
              key={i}
              className="rounded-2xl border border-border bg-surface px-6 py-8 text-center"
            >
              <h3 className="text-lg font-bold text-heading">{t(card.title, lang)}</h3>
              <p className="mt-3 text-sm leading-relaxed text-body">{t(card.body, lang)}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Problems */}
      <Section surface heading={home.problems.heading} lang={lang}>
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
          {home.problems.items.map((item, i) => (
            <div
              key={i}
              className="flex min-h-[7rem] items-center gap-4 rounded-2xl border border-border bg-surface px-6 py-7 animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="text-xl leading-relaxed text-body">{t(item, lang)}</p>
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

      {/* Care course — leads the service block (matches /pricing order: care, then nursing). */}
      <Section id="service-details" surface lang={lang}>
        {/* Lead-in heading, with the course description directly under it —
            it explains the heading, so it belongs there rather than floating
            beside the price. */}
        <h2 className="whitespace-pre-line text-center text-2xl md:text-3xl font-bold leading-snug text-heading animate-fade-up">
          {t(home.careCourse.leadIn, lang)}
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-center text-lg leading-relaxed text-body animate-fade-up">
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

      {/* Service flow — vertical timeline on mobile, horizontal step row from md
          up. Numbered nodes on a dashed rail; title beside/below the node,
          description underneath. No per-step icon — `icon` is a CMS select
          field with no icon set in this repo to render it against. */}
      <Section surface heading={home.flow.heading} lang={lang}>
        <ol className="mx-auto max-w-5xl md:grid md:grid-cols-4 md:gap-x-5 lg:gap-x-8">
          {home.flow.steps.map((step, i) => {
            const last = i === home.flow.steps.length - 1;
            return (
              <li
                key={step.number}
                className="relative flex gap-5 pb-16 last:pb-0 md:flex-col md:items-center md:gap-0 md:pb-0 md:text-center animate-fade-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Vertical rail — mobile */}
                {!last && (
                  <span
                    className="absolute bottom-0 left-7 top-16 w-0 border-l-2 border-dashed border-primary/30 md:hidden"
                    aria-hidden="true"
                  />
                )}
                {/* Horizontal rail — md+ */}
                {!last && (
                  <span
                    className="absolute left-[calc(50%+2.25rem)] top-8 hidden h-0 w-[calc(100%-4.5rem)] border-t-2 border-dashed border-primary/30 md:block lg:top-9"
                    aria-hidden="true"
                  />
                )}
                <FlowStepNode
                  stepLabel={t(home.flow.stepLabel, lang)}
                  number={step.number}
                />
                <div className="min-w-0 flex-1 md:mt-7 md:px-1">
                  <h3 className="pt-1.5 text-xl font-bold leading-snug text-heading md:pt-0 md:text-lg lg:text-xl">
                    {t(step.title, lang)}
                  </h3>
                  <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-body md:mt-2.5 md:text-sm lg:text-base">
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
          end up pointing off-site.

          `href` is passed through `localizeHref()` here, at the call site —
          same as every other Link on this page — rather than inside
          `ApplyBanner` itself. `ApplyBanner` decides its own external-vs-
          internal rendering from the SAME href value it receives (external
          checked above from the raw CMS field; `#anchor` checked inside
          `ApplyBanner` itself), and `localizeHref()` is a no-op on both of
          those shapes (scheme'd URLs and pure fragments), so localizing
          before or after those checks is equivalent. Localizing here keeps
          `ApplyBanner` a plain presentational component that takes whatever
          href string it's given, instead of also needing a `lang` prop.

          The two explicit rows are load-bearing, not decoration: each card
          spans them via `grid-rows-subgrid`, which is what keeps the audience
          lines and the action lines aligned across the pair. Removing them
          leaves each card sizing its own rows again. */}
      <Section surface lang={lang}>
        <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-[1.15fr_0.85fr] sm:grid-rows-[auto_auto] sm:gap-4">
          <ApplyBanner
            href={localizeHref(home.apply.user.href, lang)}
            eyebrow={t(home.apply.user.eyebrow, lang)}
            label={t(home.apply.user.label, lang)}
            tone="accent"
            emphasis="primary"
            external={userHrefIsExternal}
            delay={0}
          />
          <ApplyBanner
            href={localizeHref(home.apply.staff.href, lang)}
            eyebrow={t(home.apply.staff.eyebrow, lang)}
            label={t(home.apply.staff.label, lang)}
            tone="primary"
            emphasis="secondary"
            external={staffHrefIsExternal}
            delay={100}
          />
        </div>
      </Section>

      {/* Contact */}
      <Section surface lang={lang}>
        <div
          id="contact"
          className="rounded-2xl bg-primary-light px-6 py-12 text-center md:py-16 animate-fade-up scroll-mt-36"
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
            <div className="flex h-16 w-40 shrink-0 items-center justify-center rounded-lg bg-white px-4 py-2">
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
                  className="h-auto max-h-12 w-auto"
                />
              </a>
            </div>
            <div className="flex h-16 w-32 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
              <Image
                src={home.contact.isoLogo}
                alt={t(home.contact.isoLogoAlt, lang)}
                width={257}
                height={182}
                className="h-auto max-h-full w-auto"
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

/** Numbered node for the service-flow timeline. */
function FlowStepNode({ stepLabel, number }: { stepLabel: string; number: string }) {
  return (
    <span className="relative z-10 flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-2 border-white/25 bg-primary text-white shadow-md shadow-primary/30 md:h-16 md:w-16">
      <span className="text-[9px] font-bold uppercase leading-none tracking-[0.2em] text-white/85 md:text-[10px]">
        {stepLabel}
      </span>
      <span className="mt-1 text-lg font-bold leading-none tabular-nums md:text-xl">
        {number}
      </span>
    </span>
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
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
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
