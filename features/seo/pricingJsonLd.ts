/**
 * Pure builder for the `/pricing` OfferCatalog JSON-LD object.
 *
 * Split out of `app/[lang]/pricing/page.tsx` (a Server Component that
 * transitively imports `server-only` via `features/cms/rates.ts`) so this
 * object's construction can run under `node --test` with no bundler, no
 * Next.js runtime and no network — same shape as
 * `features/seo/organization.ts` (pure builder) + `components/JsonLd.tsx`
 * (thin async wrapper that awaits the CMS loaders and hands the result
 * across).
 *
 * `normalizeHtml` (`scripts/atlas/verify-html-parity.ts`) strips every
 * `<script>` tag before diffing rendered HTML, and JSON-LD lives in a
 * `<script type="application/ld+json">`. So the parity gate proves nothing
 * about this object's output, changed or not — `features/seo/pricingJsonLd.test.ts`
 * is the only thing that does.
 *
 * `@/` import aliases below are safe here because this module is only ever
 * loaded via `npx tsx` (see the `test` script in package.json), never bare
 * `node --test` — unlike `organization.ts`, which is loaded by bare
 * `node --test` and therefore avoids `@/` entirely.
 */

import { t } from "@/features/lang/i18n";
import type { Lang } from "@/features/lang/i18n";
import type { Bilingual } from "@/constants/copy";
import type { CourseRates } from "@/constants/pricing";

export type BuildPricingJsonLdInput = {
  /** `pricingCopy.hero.heading` — becomes the OfferCatalog's `name`. */
  heading: Bilingual;
  /** `courseRates` from `features/cms/rates.ts#getCourseRates()`. */
  courses: CourseRates[];
  /**
   * Locale-aware: `name` and each Offer's `name` read `lang` instead of
   * being forced to `.ja`, so `/en/pricing`'s structured data is actually
   * English instead of Japanese (ST-G2). The parity gate cannot see this —
   * verified instead by `features/seo/pricingJsonLd.test.ts`.
   */
  lang: Lang;
};

/**
 * Builds the plain object serialized into `/pricing`'s
 * `<script type="application/ld+json">` tag (`app/[lang]/pricing/page.tsx`).
 * Pure: no I/O, no CMS access, no `Date.now()`.
 *
 * Key order and flattening order are load-bearing — `JSON.stringify`
 * preserves insertion order, and that string is what actually ships:
 *   @context, @type, name, itemListElement
 * each item: @type, name, priceCurrency, price
 * `itemListElement` is course-major, then row-order within each course
 * (`courses.flatMap`, not `courses.map` — `map` would nest arrays instead
 * of flattening them into one list, producing a malformed catalog).
 *
 * An Offer's `name` appends the row's `detail` in full-width parentheses
 * (`（…）`) only when `detail` is present; `features/cms/rates.ts#withOptionalDetail`
 * deliberately OMITS the `detail` property (not `detail: undefined`) on rows
 * without one, so the branch below must check presence, not truthiness of an
 * always-defined field.
 *
 * Zero courses, or a course with zero rows, both yield an empty
 * `itemListElement: []` — present as an array, never omitted or thrown —
 * because `features/cms/rates.ts#mapRatesTable` documents that a rate-row
 * block whose `course_key` matches no course can legitimately leave a course
 * with no rows on live CMS data.
 */
export function buildPricingJsonLd({
  heading,
  courses,
  lang,
}: BuildPricingJsonLdInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: t(heading, lang),
    itemListElement: courses.flatMap((course) =>
      course.rows.map((row) => ({
        "@type": "Offer",
        name: row.detail
          ? `${t(course.name, lang)} ${t(row.label, lang)}（${t(row.detail, lang)}）`
          : `${t(course.name, lang)} ${t(row.label, lang)}`,
        priceCurrency: "JPY",
        price: row.price,
      })),
    ),
  };
}
