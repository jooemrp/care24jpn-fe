/**
 * Resolves the branded share card each locale's pages should advertise as
 * `og:image`, for the `seed-*.ts` scripts to put in the `seo` they send.
 *
 * ## Why this is a shared helper and not a script of its own
 *
 * There was a `seed-og-image.ts` that wrote ONLY `seo` — no blocks — on the
 * theory that a page update omitting `blocks` would leave them alone. That is
 * false, and it cost the `home` page all 29 of its blocks before its own
 * read-back check aborted the run. `lib.ts#ensurePublishedPage` says plainly
 * that the backend replaces the block list; a partial page is a destructive
 * page.
 *
 * So `og_image` is set the same way every other piece of repo-owned content
 * reaches Atlas: by the seed script that already owns the whole page and
 * already sends its complete block list. That also makes it reproducible —
 * a re-seed restores it instead of depending on a value that exists only in
 * Atlas, which is the failure `preserveEditorSeo` had to be written to
 * contain.
 *
 * ## Why the absolute URL, not the media id
 *
 * `seed-pages.ts` writes bare media ids into BLOCK fields and the delivery
 * API expands them, but that expansion is driven by the field's declared
 * `field_type: "image"` in `schema.ts`. `seo.og_image` is not a schema field
 * — it is a key inside the page's free-form SEO object — so nothing expands
 * it, and an id would reach the browser verbatim as
 * `<meta property="og:image" content="01a0...">`.
 *
 * The local card in `constants/seo.ts#fallbackOgImage` stays exactly where it
 * is. It is what renders when Atlas is unreachable, and what a brand-new page
 * gets before anyone sets its own.
 */
import { basename } from "node:path";
import { fallbackOgImage, seoRoutes } from "../../constants/seo";
import { requireMediaManifest, type MediaManifest } from "./lib";

export type OgLang = "ja" | "en";

/**
 * Card filenames come from `fallbackOgImage` rather than being typed again,
 * so the picture Atlas serves can never drift away from the picture the local
 * fallback serves. Rename the card in `constants/seo.ts` and this looks for
 * the new name and fails loudly, instead of silently seeding the old one.
 */
const CARD_FILE: Record<OgLang, string> = {
  ja: basename(fallbackOgImage.ja),
  en: basename(fallbackOgImage.en),
};

export function ogImageUrl(manifest: MediaManifest, lang: OgLang): string {
  const file = CARD_FILE[lang];
  const url = manifest.assets[file]?.url;
  if (!url) {
    throw new Error(
      `Media "${file}" is not in scripts/atlas/media-manifest.json. ` +
        `Add { file: "${file}" } to upload-media.ts#ASSETS and run ` +
        '"npm run atlas:media" (idempotent), then re-run this seed.',
    );
  }
  return url;
}

/** Both locales at once — what a seed script needs to fill `seo.og_image`
 * and `seo_translations.en.og_image` in the same breath. */
export function ogImagePair(manifest: MediaManifest = requireMediaManifest()): {
  ja: string;
  en: string;
} {
  return { ja: ogImageUrl(manifest, "ja"), en: ogImageUrl(manifest, "en") };
}

/**
 * Every Atlas page slug that backs a real public route, taken from
 * `constants/seo.ts#seoRoutes`. Pages outside it — `site` (page chrome) and
 * `rates` (internal price data) — have no URL to share and therefore no
 * `og:image` to set; giving them one would only put a field in the dashboard
 * that nothing ever reads.
 */
const ROUTED_SLUGS: ReadonlySet<string> = new Set(
  Object.values(seoRoutes).map((entry) => entry.atlasSlug),
);

/**
 * The `og_image` pair for one page, or `null` when that page backs no public
 * route. A seed script spreads the result into the `seo` it already sends:
 *
 *   const og = ogImageForSlug(slug, media);
 *   seo: { title, ...(og ? { og_image: og.ja } : {}) }
 */
export function ogImageForSlug(
  slug: string,
  manifest?: MediaManifest,
): { ja: string; en: string } | null {
  if (!ROUTED_SLUGS.has(slug)) return null;
  return ogImagePair(manifest ?? requireMediaManifest());
}
