/**
 * Care 24 Japan — canonical site origin.
 *
 * Single source of truth for the deployed base URL. No trailing slash.
 * Used by metadata (metadataBase), sitemap.ts, robots.ts, and JSON-LD.
 *
 * Read from `NEXT_PUBLIC_SITE_URL` so every environment can point at its
 * own domain. In production this is required: a missing value would mean
 * every canonical URL, sitemap entry, and og:url silently falls back to
 * whatever host the build happens to run on (e.g. a Vercel preview alias),
 * which is a broken feature that looks correct. Mirrors Next's own
 * metadataBase contract, where a relative URL without a base is a build
 * error rather than a silent guess.
 */
const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

if (!envSiteUrl && process.env.NODE_ENV === "production") {
  throw new Error(
    "NEXT_PUBLIC_SITE_URL is not set. Every deploy environment must set " +
      "NEXT_PUBLIC_SITE_URL (no trailing slash) so canonical URLs, the " +
      "sitemap, robots.txt, and Organization/og:url all point at the real " +
      "domain instead of silently falling back."
  );
}

export const SITE_URL = envSiteUrl ?? "https://care24jpn.vercel.app";
