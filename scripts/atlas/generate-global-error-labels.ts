/**
 * Regenerates `features/cms/global-error-labels.generated.ts` from the LIVE
 * Atlas CMS — the "site" page's `site-global-error-labels` block (title /
 * body / retry_label, en via `block_translations`) plus the `site-brand`
 * block's `name` for the global-error <title>.
 *
 * Why a generated file instead of `app/global-error.tsx` just calling
 * `getSite()`: the global-error boundary MUST be a Client Component
 * (error.md), so it can never await a loader at runtime — and when it
 * renders, the root layout (the thing that would have fetched) is the thing
 * that threw. Reading the CMS at SEED time and committing the result is the
 * same pattern as the generated `atlas.types.ts`, and it keeps this last
 * error surface CMS-sourced without a `constants/*.ts` import in any render
 * path.
 *
 * Run from marketing-web/ after `npm run atlas:seed` (or whenever the
 * `site_global_error_labels`/`site_brand` block copy changes in the
 * dashboard):
 *   npx tsx scripts/atlas/generate-global-error-labels.ts
 *
 * Idempotent, read-only against Atlas, and overwrites the generated file
 * deterministically (values that fail validation stop the script rather
 * than writing empty labels).
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { requireAtlasEnv, loadEnv } from "./lib";

interface Block {
  type?: string;
  data?: string;
  block_translations?: { locale?: string; data?: string }[];
}

function parseData(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function asBilingual(ja: unknown, en: unknown): { ja: string; en: string } {
  return { ja: typeof ja === "string" ? ja : "", en: typeof en === "string" ? en : "" };
}

async function main(): Promise<void> {
  const env = requireAtlasEnv();
  loadEnv();

  const baseUrl = process.env.ATLAS_BASE_URL;
  const apiKey = process.env.ATLAS_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error('ATLAS_API_KEY is required to read the live "site" page.');
  }

  const res = await fetch(`${baseUrl}/api/v1/public/pages/site`, {
    headers: { "X-API-Key": apiKey },
  });
  if (!res.ok) {
    throw new Error(`GET /api/v1/public/pages/site -> ${res.status}`);
  }

  const payload = (await res.json()) as { data?: { blocks?: Block[] } };
  const blocks = payload.data?.blocks ?? [];

  const globalErrorBlock = blocks.find((b) => b.type === "site-global-error-labels");
  const brandBlock = blocks.find((b) => b.type === "site-brand");

  if (!globalErrorBlock) {
    throw new Error(
      'Block "site-global-error-labels" not found on the "site" page — run "npm run atlas:seed" first.',
    );
  }

  const enData = (globalErrorBlock.block_translations ?? [])
    .filter((t) => t.locale === "en")
    .map((t) => parseData(t.data))
    .reduce((acc, row) => ({ ...acc, ...row }), {});

  const ja = parseData(globalErrorBlock.data);
  const title = asBilingual(ja.title, enData.title);
  const bodyJa = parseData(globalErrorBlock.data).body;
  const enBody = enData.body;
  const body = asBilingual(bodyJa, enBody);
  const retryLabel = asBilingual(ja.retry_label, enData.retry_label);

  if (title.ja === "" || body.ja === "" || retryLabel.ja === "") {
    throw new Error(
      'site-global-error-labels block is missing required ja values (title/body/retry_label) — refusing to write empty labels.',
    );
  }

  const brandJa = brandBlock ? parseData(brandBlock.data) : {};
  const brandName = typeof brandJa.name === "string" ? brandJa.name : "";

  const output = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Contents come from the LIVE Atlas CMS: run
 * \`npx tsx scripts/atlas/generate-global-error-labels.ts\` after any change
 * to the \`site-global-error-labels\` / \`site-brand\` blocks on the "site" page
 * (the seed that writes them is scripts/atlas/seed-site.ts).
 *
 * \`app/global-error.tsx\` imports this module: a root-layout error boundary
 * MUST be a Client Component (error.md), so it can never \`await getSite()\`
 * at runtime — and by the time it renders, the layout that would have
 * supplied the data is itself the thing that threw. Baking the CMS values
 * at seed time is the only build-friendly way to keep this surface
 * CMS-sourced with no \`constants/*.ts\` import in the render path (same
 * pattern as the generated \`atlas.types.ts\`).
 */
export const GLOBAL_ERROR_LABELS = {
  title: { ja: ${JSON.stringify(title.ja)}, en: ${JSON.stringify(title.en)} },
  body: { ja: ${JSON.stringify(body.ja)}, en: ${JSON.stringify(body.en)} },
  retryLabel: { ja: ${JSON.stringify(retryLabel.ja)}, en: ${JSON.stringify(retryLabel.en)} },
} as const;

export const GLOBAL_BRAND_NAME = ${JSON.stringify(brandName)};
`;

  const dest = resolve(__dirname, "..", "..", "features", "cms", "global-error-labels.generated.ts");
  writeFileSync(dest, output, "utf8");
  console.log(`+ wrote ${dest}`);
}

main().catch((error) => {
  console.error("[atlas:generate-global-error-labels] failed:", error);
  process.exitCode = 1;
});