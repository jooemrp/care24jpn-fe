import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Section from "@/components/ui/Section";
import CourseRateCard from "@/components/ui/CourseRateCard";
import JsonLd from "@/components/JsonLd";
import { getPricingCopy, getCourseRates } from "@/features/cms/rates";
import { t, isLang } from "@/features/lang/i18n";
import { pageMetadata } from "@/features/seo/pageMetadata";
import { buildPricingJsonLd } from "@/features/seo/pricingJsonLd";

/**
 * Card tone, by `course.key` — not by array position. `CourseRateCard.tsx`
 * documents `tone` as "the brand colour this course carries — matches the
 * home page", and the home page hardcodes that mapping per section
 * (`nursingCourse` = accent, `careCourse` = primary; see `app/[lang]/page.tsx`),
 * never by an array index. Deriving tone from position here instead of key
 * broke that contract silently: reordering the two `rate-course` blocks in
 * the dashboard would swap the colours on `/pricing` while the home page's
 * colours stayed fixed, so "nursing" would carry two different brand colours
 * across the site depending on unrelated CMS ordering. Any key other than
 * "nursing" (today just "care") falls back to "primary", matching both the
 * home page's default and this function's previous index-0 output for the
 * live two-course order (care, nursing) — so this is a no-op for today's
 * data and only changes behaviour if the dashboard order ever changes.
 */
function courseTone(courseKey: string): "primary" | "accent" {
  return courseKey === "nursing" ? "accent" : "primary";
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return pageMetadata({ key: "pricing", lang });
}

export default async function PricingPage({
  params,
}: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  const [pricingCopy, courseRates] = await Promise.all([getPricingCopy(), getCourseRates()]);

  // PriceSpecification per rate row, built directly from the CMS-sourced
  // `courseRates` (features/cms/rates.ts) so the JSON-LD amounts can never
  // drift from the rates rendered by CourseRateCard below. The object
  // construction itself lives in the pure, unit-tested
  // features/seo/pricingJsonLd.ts (same shape as organization.ts +
  // JsonLd.tsx) — this call site only supplies the CMS-sourced arguments.
  const pricingJsonLd = buildPricingJsonLd({
    heading: pricingCopy.hero.heading,
    courses: courseRates,
    lang,
  });

  return (
    <>
      <JsonLd data={pricingJsonLd} />
      <Section heading={pricingCopy.hero.heading} level="h1" lang={lang}>
        <p className="max-w-2xl text-lg leading-relaxed text-body">
          {t(pricingCopy.hero.body, lang)}
        </p>

        {/* The two standing terms (no joining fee, two-hour minimum) decide
            whether a visitor can use the service at all, so they are solid
            blocks — same flat language as the apply banners and the course
            headers. 20px rather than 18px because white on this fill is
            4.0:1, which only clears WCAG AA as large text (bold ≥18.66px). */}
        <ul className="mt-7 grid gap-3 sm:grid-cols-2">
          {pricingCopy.highlights.map((highlight) => (
            <li
              key={highlight.en}
              className="rounded-xl bg-accent px-6 py-5 text-xl font-bold text-white"
            >
              {t(highlight, lang)}
            </li>
          ))}
        </ul>
      </Section>

      {/* Both courses side by side instead of behind tabs: choosing between
          caregiving and nursing is the whole job of this page, and a tab
          hides exactly the number the visitor wants to compare against. */}
      <Section surface lang={lang}>
        <div className="grid gap-6 lg:grid-cols-2">
          {courseRates.map((course) => (
            <CourseRateCard
              key={course.key}
              course={course}
              lang={lang}
              tone={courseTone(course.key)}
            />
          ))}
        </div>
        <p className="mt-8 text-lg text-muted">{t(pricingCopy.note, lang)}</p>
      </Section>
    </>
  );
}
