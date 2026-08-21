import type { MetadataRoute } from "next";

import { SITE_URL } from "@/constants/site";
import { seoRoutes, type SeoRouteEntry } from "@/constants/seo";
import { getPageMeta } from "@/features/cms/client";
import { DEFAULT_LANG, LANGS, localizeHref, type Lang } from "@/features/lang/i18n";

/**
 * `sitemap.ts` sits OUTSIDE `app/[lang]/`, so `app/[lang]/layout.tsx:23`'s
 * `export const dynamic = "force-dynamic"` does not reach it — route segment
 * config only applies within its own segment's tree (verified against
 * node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md:80,
 * "You can configure caching behavior at the route level by exporting config
 * options from a Page, Layout, or Route Handler" — this file counts as the
 * "Route Handler" case per node_modules/next/dist/docs/01-app/03-api-reference/
 * 03-file-conventions/01-metadata/sitemap.md:44, "sitemap.js is a special
 * Route Handler that is cached by default unless it uses a Request-time API
 * or dynamic config option"). Below now reads a live `updated_at` per route on
 * every request (see `lastModifiedFor`), so it must not be frozen at build
 * time — declaring `force-dynamic` here, in this file, is what actually
 * un-prerenders it, per the same doc. Matches `features/cms/client.ts`'s
 * `cache: "no-store"` fetch policy (content must reflect the CMS immediately
 * after an editor publishes, with no rebuild/redeploy) rather than
 * introducing a third caching story via ISR's `revalidate`.
 */
export const dynamic = "force-dynamic";

const routeEntries: SeoRouteEntry[] = Object.values(seoRoutes);

// Every `route` value in `constants/seo.ts#seoRoutes` is a plain absolute
// path ("/", "/pricing", ...) with no existing "/ja"/"/en" prefix, no hash,
// and no scheme — exactly the input shape `localizeHref` (the canonical
// ja-prefix-less-by-default rule) handles, so this reuses it instead of
// re-implementing the same "ja" special-case a second time.
function localizedUrl(lang: Lang, route: string): string {
  return `${SITE_URL}${localizeHref(route, lang)}`;
}

/**
 * A route's real `lastmod`, from Atlas's `updated_at` for its page
 * (`getPageMeta`, ST-03) — falls back to build time (`new Date()`) per route,
 * inside its own try/catch, so one missing/malformed page or Atlas being
 * unreachable entirely (e.g. `ATLAS_API_KEY` unset) can never fail the whole
 * sitemap request or the build. `getPageMeta` itself already never throws
 * (see features/cms/client.ts), but the acceptance criteria for this route
 * ask for an explicit per-route guard rather than relying on that contract
 * alone.
 */
async function lastModifiedFor(entry: SeoRouteEntry): Promise<Date> {
  try {
    const meta = await getPageMeta(entry.atlasSlug);
    if (meta?.updatedAt) {
      const parsed = new Date(meta.updatedAt);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  } catch (error) {
    console.error(
      `[sitemap] getPageMeta("${entry.atlasSlug}") failed, falling back to build time:`,
      error,
    );
  }
  return new Date();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const withLastModified = await Promise.all(
    routeEntries.map(async (entry) => ({
      entry,
      lastModified: await lastModifiedFor(entry),
    })),
  );

  return withLastModified.flatMap(({ entry, lastModified }) => {
    const languages = Object.fromEntries(
      LANGS.map((lang) => [lang, localizedUrl(lang, entry.route)]),
    ) as Record<Lang, string>;

    // Same convention as `features/seo/pageMetadata.ts#routeAlternates`:
    // `x-default` points at the JA (prefix-less) URL — "ja" is the site's
    // default, prefix-less language (features/lang/i18n.ts) — per the
    // hreflang spec's "no matching locale, send here" convention. Pages
    // already emit this in <head>; the sitemap did not until now.
    const alternates = {
      languages: { ...languages, "x-default": languages[DEFAULT_LANG] },
    };

    return LANGS.map((lang) => ({
      url: languages[lang],
      lastModified,
      alternates,
    }));
  });
}
