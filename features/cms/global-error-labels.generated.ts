/**
 * GENERATED FILE — do not edit by hand.
 *
 * Contents come from the LIVE Atlas CMS: run
 * `npx tsx scripts/atlas/generate-global-error-labels.ts` after any change
 * to the `site-global-error-labels` / `site-brand` blocks on the "site" page
 * (the seed that writes them is scripts/atlas/seed-site.ts).
 *
 * `app/global-error.tsx` imports this module: a root-layout error boundary
 * MUST be a Client Component (error.md), so it can never `await getSite()`
 * at runtime — and by the time it renders, the layout that would have
 * supplied the data is itself the thing that threw. Baking the CMS values
 * at seed time is the only build-friendly way to keep this surface
 * CMS-sourced with no `constants/*.ts` import in the render path (same
 * pattern as the generated `atlas.types.ts`).
 */
export const GLOBAL_ERROR_LABELS = {
  title: { ja: "エラーが発生しました", en: "" },
  body: { ja: "しばらくしてから再度お試しください。", en: "" },
  retryLabel: { ja: "再試行", en: "" },
} as const;

export const GLOBAL_BRAND_NAME = "Care 24 Japan";
