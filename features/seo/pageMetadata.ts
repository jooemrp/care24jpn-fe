/**
 * One helper for the `generateMetadata` shape every non-home route under
 * `app/[lang]/**` shares: `{ title, description, alternates: { canonical,
 * languages: { ja, en, "x-default" } }, openGraph: { title, description,
 * url, siteName, locale, alternateLocale, images } }`.
 *
 * CMS-driven per decision D-3 (ST-05): awaits `getPageMeta(entry.atlasSlug)`
 * (ST-03) and, for each of title/description/og:image, uses the CMS value
 * when present, else the `constants/seo.ts` literal (title/description) or
 * the per-locale local fallback card (og:image,
 * `constants/seo.ts#fallbackOgImage` — see ST-OG). Every field still has
 * exactly one winner; there is no dual-source churn.
 *
 * `route` must be an absolute, unprefixed path ("/pricing", not "pricing"
 * or "/en/pricing") — the same shape `app/[lang]/layout.tsx` uses for its
 * own `alternates` block. "ja" is the default, prefix-less language (see
 * `features/lang/i18n.ts`), so canonical/`languages.ja` are the bare route
 * and `languages.en`/non-ja canonical get the `/en` prefix.
 *
 * This module also exports the single source of truth for the brand suffix
 * appended to every non-home `<title>`: `TITLE_BRAND_SEPARATOR`,
 * `titleTemplate` (consumed by `app/[lang]/layout.tsx#generateMetadata`'s
 * `title.template`) and `withBrandSuffix` (consumed by
 * `buildPageMetadataFields` below, for `og:title`/`twitter:title`). Both
 * surfaces must render the identical string; see `TITLE_BRAND_SEPARATOR`'s
 * own comment and `features/seo/pageMetadata.test.ts` for how that is
 * enforced.
 */

import type { Metadata } from "next";
import type { Bilingual } from "@/constants/copy";
import { SITE_URL } from "@/constants/site";
import { fallbackOgImage, seoRoutes, type SeoRouteKey } from "@/constants/seo";
import { localizeHref, type Lang } from "@/features/lang/i18n";

// `getPageMeta` (features/cms/client.ts) and `getSite` (features/cms/site.ts)
// are intentionally NOT imported here — see the dynamic `import()` at their
// only call site, inside `pageMetadata()` below, for why.

/**
 * The canonical/`languages` ternary every route (including the root
 * `app/[lang]/layout.tsx`, which is not route-shaped and so calls this
 * directly instead of going through `pageMetadata`) shares. `route` must be
 * an absolute, unprefixed path ("/pricing" or "/" for home, not "pricing"
 * or "/en/pricing").
 *
 * `languages["x-default"]` points at the JA (prefix-less) URL — the same
 * value as `languages.ja` — per the hreflang spec's convention for "no
 * matching locale, send here". This is NOT a Next API; Next forwards the
 * `languages` object's keys VERBATIM as `hreflang` attribute values (see
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/
 * generate-metadata.md:402-407,417-418,823-846), so `"x-default"` renders
 * as `hreflang="x-default"` with zero special-casing on Next's side.
 *
 * Every `route` value in `constants/seo.ts#seoRoutes` is a plain absolute
 * path ("/", "/pricing", ...) with no existing "/ja"/"/en" prefix, no hash,
 * and no scheme — exactly the input shape `localizeHref` (the canonical
 * ja-prefix-less-by-default rule, `features/lang/i18n.ts`) handles, so this
 * reuses it instead of re-implementing the same ternary a second time.
 */
export function routeAlternates(
  route: string,
  lang: Lang,
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: canonicalPath(route, lang),
    languages: {
      ja: canonicalPath(route, "ja"),
      en: canonicalPath(route, "en"),
      "x-default": canonicalPath(route, "ja"),
    },
  };
}

/**
 * `route`, localized for `lang` — thin wrapper over `localizeHref` (see the
 * comment on `routeAlternates` above for why that function applies here
 * unchanged). Exposed standalone so `openGraph.url` below can build an
 * absolute URL from it without reading back through
 * `Metadata["alternates"]["canonical"]`'s wider `string | URL | null` type.
 */
function canonicalPath(route: string, lang: Lang): string {
  return localizeHref(route, lang);
}

/**
 * The ONE separator between a page's own title and the brand name — shared
 * by `app/[lang]/layout.tsx`'s `title.template` (drives every non-home
 * `<title>`, via `titleTemplate` below) and this module's `openGraph.title`/
 * `twitter:title` reconstruction (via `withBrandSuffix` below, see its call
 * site in `buildPageMetadataFields` for why a manual reconstruction is
 * needed at all). Before this constant existed, `layout.tsx` hand-typed `` `%s | ${...}`
 * `` and this file hand-typed `` `${title} | ${...}` `` as two separate
 * string literals that happened to agree — nothing enforced that. Change the
 * separator ONCE, here, and both surfaces move together; `pageMetadata.test.ts`
 * locks the two outputs together so a future edit to only one side fails loudly
 * instead of quietly reopening the divergence ST-FIX1 fixed.
 */
export const TITLE_BRAND_SEPARATOR = " | ";

/**
 * The exact `title.template` string Next applies to every non-home route's
 * `<title>` (`app/[lang]/layout.tsx#generateMetadata`). `%s` is Next's own
 * template placeholder (node_modules/next/dist/docs/01-app/03-api-reference/
 * 04-functions/generate-metadata.md's `title.template` section) — this
 * function only supplies the brand-name half and the separator between them,
 * both from `TITLE_BRAND_SEPARATOR` above.
 */
export function titleTemplate(brandName: string): string {
  return `%s${TITLE_BRAND_SEPARATOR}${brandName}`;
}

/**
 * What `title.template` (see `titleTemplate` above) would have produced for
 * a given page title, computed by hand. Needed because an explicit
 * `openGraph.title` bypasses `title.template` entirely (see the comment at
 * this function's call site below) — so `og:title`/`twitter:title` cannot
 * rely on the template and must reproduce its output instead. Both this
 * function and `titleTemplate` read `TITLE_BRAND_SEPARATOR`, so they cannot
 * drift apart from each other.
 */
export function withBrandSuffix(title: string, brandName: string): string {
  return `${title}${TITLE_BRAND_SEPARATOR}${brandName}`;
}

/**
 * True when `title` already carries `brandName` somewhere in it — matched
 * loosely (whitespace-insensitive, case-insensitive) because the CMS titles
 * this guards against spell the brand two different ways in the same
 * workspace: `site.brand.name` is "Care 24 Japan" (spaced), but 4 legal
 * pages' Atlas `seo.title` carries "Care24Japan" (no space) as part of the
 * client's legally-reviewed document name (see `care 24 update.xlsx`:
 * "Care24Japan ケアサポーター報酬規程_リーガルチェック済"). A plain `===`/
 * `includes()` check would miss that pairing entirely.
 *
 * Used by `buildPageMetadataFields` below to render such a title as
 * `title.absolute` instead of a plain string — see that function's own
 * comment for why a plain string is the wrong shape once this is true.
 * Deliberately NOT a hardcoded route list: any route whose resolved title
 * (CMS-or-fallback) starts carrying the brand name gets this treatment
 * automatically, the same way any route that DROPS it stops getting it.
 */
export function titleContainsBrand(title: string, brandName: string): boolean {
  const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  return normalize(title).includes(normalize(brandName));
}

/**
 * The `og:image`/`twitter:image` selection rule `pageMetadata()` applies:
 * the CMS value when present, else the per-locale local fallback card
 * (`constants/seo.ts#fallbackOgImage` — see ST-OG). Pulled out to its own
 * function, not left inlined in `pageMetadata()`, so `pageMetadata.test.ts`
 * can prove the fallback actually fires on an empty/missing CMS value
 * without a live Atlas read — `pageMetadata()` itself cannot be imported
 * outside Next's bundler (see the dynamic `import()` comment on its body).
 */
export function resolveOgImage(
  cmsOgImage: string | undefined,
  lang: Lang,
): string {
  return cmsOgImage || fallbackOgImage[lang];
}

/**
 * Plain-data input to `buildPageMetadataFields` below: everything the final
 * `Metadata` object needs, already resolved (CMS-or-fallback title/
 * description/og-image, and the brand name off `getSite()`). Kept separate
 * from `pageMetadata()`'s CMS reads on purpose — see `buildPageMetadataFields`'s
 * own comment for why.
 */
type PageMetadataFieldsInput = {
  route: string;
  lang: Lang;
  title: string;
  description: string;
  ogImage: string;
  brandName: string;
};

/**
 * The pure tail of `pageMetadata()`: turns already-resolved title/
 * description/og-image/brand-name into the `Metadata` object every non-home
 * route returns. Split out from `pageMetadata()` so it can be exercised by
 * `pageMetadata.test.ts` WITHOUT touching Atlas — `pageMetadata()` itself
 * cannot be imported outside Next's bundler at all (see the dynamic
 * `import()` comment at its two CMS reads below), so this is the only part
 * of this file's `Metadata`-shaping logic a plain `node --test`/`npx tsx`
 * run can reach directly, matching the same server-only-avoidance PATTERN as
 * `features/cms/merge.ts` / `features/cms/site-map.ts` / `features/seo/
 * organization.ts` — but staying in this one file rather than a new one,
 * since none of the code below needs `server-only` itself.
 */
export function buildPageMetadataFields({
  route,
  lang,
  title,
  description,
  ogImage,
  brandName,
}: PageMetadataFieldsInput): Metadata {
  // `og:title`/`twitter:title` must equal the `<title>` actually rendered,
  // not the bare `title` param above. For every route except home, the root
  // layout's `title.template` (`titleTemplate` above) wraps `title` into the
  // rendered `<title>` — but an explicit `openGraph.title` here BYPASSES
  // that template entirely (verified against node_modules/next/dist/lib/
  // metadata/resolve-metadata.js's `resolveOpenGraph`: it takes whatever
  // string it is given as `title.absolute`, the same "ignore the template"
  // contract `app/[lang]/page.tsx` documents for `<title>` itself). Setting
  // `openGraph.title: title` therefore silently dropped the brand suffix —
  // `withBrandSuffix` reproduces the template's output by hand so `<title>`
  // and `og:title` stay identical. (`twitter:title` needs no separate
  // handling: resolve-metadata.js auto-fills `twitter` from `openGraph`
  // whenever a route's `metadata` does not declare its own `twitter` key,
  // which none of these routes do.)
  //
  // Home is the one legitimate exception, and for the same reason
  // `app/[lang]/page.tsx` passes `title: { absolute: ... }`: `route === "/"`
  // is home-only (see `constants/seo.ts#seoRoutes`), its title already ends
  // with the brand name, and IT bypasses the template on the `<title>` side
  // too — so `og:title` must stay suffix-free there as well, or the two
  // would newly disagree in the other direction.
  //
  // `brandAlreadyInTitle` is the second exception (CMS audit 0820, finding
  // N-brand-double / ST-U2 Tugas 2): some non-home routes' resolved title
  // (CMS `page.seo.title`, which wins over the `constants/seo.ts` literal
  // per D-3 above) already carries the brand name by itself — verified live
  // for `terms-for-users`, `terms-for-care-supporters`, `compensation`,
  // `cancellation-policy` (their Atlas titles are literal legal-document
  // names starting with "Care24Japan"). Templating those would print the
  // brand a second time, spelled a second way ("Care24Japan ... | Care 24
  // Japan"). This is intentionally NOT a hardcoded route check — see
  // `titleContainsBrand`'s own comment — so it also protects any OTHER
  // route whose title starts carrying the brand later.
  const brandAlreadyInTitle = route !== "/" && titleContainsBrand(title, brandName);
  const ogTitle = route === "/" || brandAlreadyInTitle ? title : withBrandSuffix(title, brandName);

  return {
    // Same `title.absolute` shape `app/[lang]/page.tsx` already uses for
    // home, applied here too when the title itself already contains the
    // brand — `title.template` (`app/[lang]/layout.tsx`) only reads a plain
    // string `title`, so returning one for `brandAlreadyInTitle` routes is
    // exactly what would let the template re-append the brand.
    title: brandAlreadyInTitle ? { absolute: title } : title,
    description,
    alternates: routeAlternates(route, lang),
    openGraph: {
      // `type`/`locale`/`siteName` are restated here, not "inherited from
      // the root layout" — verified against node_modules/next/dist/lib/
      // metadata/resolve-metadata.js (mergeMetadata, ~L166-186): a segment's
      // `openGraph` key REPLACES the parent's wholesale (shallow merge, see
      // generate-metadata.md's "Merging" section), it does not deep-merge
      // per field. Every route below this already exports its own
      // `generateMetadata` calling `pageMetadata`, so once that return value
      // gains an `openGraph` key, layout.tsx's `openGraph` (type/locale/
      // siteName) would otherwise silently stop rendering on all 24
      // non-home routes — a real regression, not the "additive only" this
      // sub-task promises. Restating them keeps their rendered VALUES
      // byte-identical to today; only their position in the emitted <head>
      // moves (Next's tag order is a fixed template keyed off which fields
      // are present, not object key order — node_modules/next/dist/lib/
      // metadata/metadata.js ~L640-850 — so this is a position shift of
      // unchanged content, not a content change).
      type: "website",
      locale: lang === "ja" ? "ja_JP" : "en_US",
      siteName: brandName,
      title: ogTitle,
      description,
      url: `${SITE_URL}${canonicalPath(route, lang)}`,
      alternateLocale: lang === "ja" ? "en_US" : "ja_JP",
      images: ogImage,
    },
  };
}

/** What a `titleFrom: "legal-heading"` route needs from its page: the doc
 * heading already fetched for rendering, plus the brand name for the
 * description template. Both are cheap to pass — the page already fetched
 * them via `getLegalDoc`/`getSite` before this call. */
type LegalHeadingInput = {
  heading: Bilingual;
  brandName: string;
};

type PageMetadataOptions = {
  key: SeoRouteKey;
  lang: Lang;
  legal?: LegalHeadingInput;
};

export async function pageMetadata({
  key,
  lang,
  legal,
}: PageMetadataOptions): Promise<Metadata> {
  const entry = seoRoutes[key];
  const { route, atlasSlug } = entry;

  let title: string;
  let description: string;

  if ("titleFrom" in entry) {
    if (!legal) {
      throw new Error(
        `pageMetadata("${key}"): this route is titleFrom: "legal-heading" but no "legal" heading was passed`,
      );
    }
    title = legal.heading[lang];
    description =
      lang === "ja"
        ? `${legal.heading.ja} | ${legal.heading.en} — ${legal.brandName}`
        : `${legal.heading.en} — ${legal.brandName}`;
  } else {
    title = entry.title[lang];
    description = entry.description[lang];
  }

  // D-3: CMS `page.seo` wins when present, else the literal above.
  // `getPageMeta`/`getSite` never throw (see features/cms/client.ts /
  // features/cms/site.ts) — both fall back to `constants/*.ts` on any
  // failure, so this call cannot take a route's metadata down.
  //
  // Dynamic, not static: both route through `features/cms/client.ts`/
  // `features/cms/site.ts`, which open with `import "server-only"` — a
  // package Next.js aliases only inside its own bundler and that is not
  // actually installed in node_modules (same finding `features/cms/
  // site.test.ts`'s header documents for `site.ts` itself, and the reason
  // `merge.ts`/`site-map.ts` exist as their pure-logic siblings). A STATIC
  // top-of-file import of either would fail evaluating THIS ENTIRE MODULE
  // under plain `node --test`/`npx tsx` (`Cannot find module 'server-only'`)
  // — including `routeAlternates`/`titleTemplate`/`withBrandSuffix`/
  // `buildPageMetadataFields` above, none of which need `server-only` at
  // all. Deferring just these two calls to runtime keeps the CMS-independent
  // majority of this file importable and testable directly; Next's bundler
  // still resolves and includes a literal-string dynamic `import()` exactly
  // like a static one (this module has no "use client" and is only ever
  // invoked from `generateMetadata`, itself server-only, so nothing about
  // WHERE this code runs changes). `pageMetadata.test.ts` exercises
  // `buildPageMetadataFields` directly and never calls `pageMetadata()`
  // itself, so it never reaches this line.
  const [{ getPageMeta }, { getSite }] = await Promise.all([
    import("@/features/cms/client"),
    import("@/features/cms/site"),
  ]);
  const [cmsMeta, site] = await Promise.all([getPageMeta(atlasSlug), getSite()]);
  if (cmsMeta?.title?.[lang]) title = cmsMeta.title[lang];
  if (cmsMeta?.description?.[lang]) description = cmsMeta.description[lang];
  const ogImage = resolveOgImage(cmsMeta?.ogImage?.[lang], lang);

  return buildPageMetadataFields({
    route,
    lang,
    title,
    description,
    ogImage,
    brandName: site.brand.name,
  });
}
