/**
 * Points every real route's `og:image` at the branded share card stored in
 * Atlas media, by writing `seo.og_image` (JA) and
 * `seo_translations.en.seo.og_image` (EN) on each backing page.
 *
 * ## Why this script exists
 *
 * ST-OG generated the two cards (`scripts/atlas/make-og-card.ts` ->
 * `public/images/og-card.png` and `og-card-en.png`) and ST-05 wired them into
 * metadata — but only as the FALLBACK layer
 * (`constants/seo.ts#fallbackOgImage`). The CMS side of that same rule,
 * `features/seo/pageMetadata.ts#resolveOgImage` -> `cmsOgImage ||
 * fallbackOgImage[lang]`, has never had anything to read: `seo.og_image` is
 * `""` on all 15 live pages, so the fallback fires every time. Nothing was
 * broken by that — the cards do render — but the CMS could not override them,
 * which is the whole point of the field. This script fills it in, so an
 * editor can swap a page's share card from the dashboard without a deploy.
 *
 * The local fallback stays exactly where it is. It is not dead weight: it is
 * what renders if Atlas is unreachable, and what a NEW page gets before
 * anyone sets its `og_image`.
 *
 * ## Why the absolute URL, not the media id
 *
 * `seed-pages.ts` writes bare media ids into block fields (`image:
 * mediaId(media, ...)`) and the delivery API expands them into S3 URLs. That
 * expansion is driven by the field's declared `field_type: "image"` in
 * `scripts/atlas/schema.ts`. `seo.og_image` is NOT a schema field — it is a
 * key inside the page's free-form SEO object — so nothing expands it, and an
 * id written here would reach the browser verbatim as
 * `<meta property="og:image" content="01a01e63-...">`. The manifest's
 * absolute `url` is therefore what belongs in this field. Verified against
 * the live payload: every block `image` comes back as a full
 * `https://horizoon.s3...` URL while `seo.og_image` comes back as whatever
 * string was stored.
 *
 * ## Why read-modify-write instead of `ensurePublishedPage`
 *
 * `lib.ts#ensurePublishedPage` is the right helper for a seed that OWNS its
 * page: it sends the complete desired page, and the backend replaces the
 * block list wholesale. This script owns exactly one key of one object and
 * must not touch anything else — in particular the 13 `seo.description`
 * values that live only in Atlas and are not reproduced by any seed script.
 * So it fetches each page's current `seo` over the read-only delivery path,
 * adds `og_image` to a copy, and sends back only `seo` +
 * `seo_translations`. Every other key is carried through byte-for-byte, and
 * `verifyWrite` below re-reads the page afterwards and fails the run if
 * anything except `og_image` moved — including the block count.
 *
 * ## Safety
 *
 * Dry run by default: it prints exactly what it would write and exits
 * without a single write request. Pass `--apply` to perform the writes.
 *
 * Usage (from marketing-web/):
 *   npx tsx scripts/atlas/seed-og-image.ts            # dry run, no writes
 *   npx tsx scripts/atlas/seed-og-image.ts --apply    # perform the writes
 *
 * Prerequisite: both cards must be in `scripts/atlas/media-manifest.json`,
 * which means they must be listed in `upload-media.ts#ASSETS` and that
 * script must have been run. This script fails with that instruction rather
 * than guessing a URL.
 *
 * After `--apply`, re-run `npm run atlas:drift` (the live snapshot moves) and
 * `npm run atlas:verify` (the CMS-on build now emits S3 card URLs where the
 * CMS-off build still emits `/images/og-card.png`, which is a real and
 * intentional divergence the gate's ledger has to account for).
 */
import { basename } from "node:path";
import {
  loadEnv,
  requireAtlasEnv,
  createScriptManagementClient,
  requireMediaManifest,
  type MediaManifest,
} from "./lib";
import { seoRoutes, fallbackOgImage } from "../../constants/seo";

type Lang = "ja" | "en";

/**
 * Which `public/images/` file backs each locale's card — derived from
 * `constants/seo.ts#fallbackOgImage` rather than typed again here, so the
 * picture Atlas serves can never drift away from the picture the local
 * fallback serves. If someone renames the card in `constants/seo.ts`, this
 * script looks for the new name in the manifest and fails loudly instead of
 * silently seeding the old one.
 */
const CARD_FILE: Record<Lang, string> = {
  ja: basename(fallbackOgImage.ja),
  en: basename(fallbackOgImage.en),
};

/**
 * The pages this script touches: every `atlasSlug` in
 * `constants/seo.ts#seoRoutes`, deduplicated. Taking the list from there
 * rather than restating it means a route added to the site is a route this
 * script covers on its next run — and it deliberately EXCLUDES `site` (page
 * chrome, not a route) and `rates` (internal price data, no public URL),
 * neither of which has an `og:image` to set.
 */
const TARGET_SLUGS: readonly string[] = [
  ...new Set(Object.values(seoRoutes).map((entry) => entry.atlasSlug)),
];

interface DeliveryEnv {
  baseUrl: string;
  apiKey: string;
}

/** Read-only delivery env — the same key and path `drift-check.ts` uses, and
 * the same one `features/cms/client.ts` reads at runtime, so what this script
 * sees is what the site sees. */
function requireDeliveryEnv(): DeliveryEnv {
  loadEnv();
  const baseUrl = process.env.ATLAS_BASE_URL;
  const apiKey = process.env.ATLAS_API_KEY;
  if (!baseUrl || !apiKey) {
    const missing = [!baseUrl && "ATLAS_BASE_URL", !apiKey && "ATLAS_API_KEY"]
      .filter(Boolean)
      .join(", ");
    throw new Error(`${missing} is not set. Add it to marketing-web/.env before running this.`);
  }
  return { baseUrl, apiKey };
}

type SeoObject = Record<string, unknown>;

interface LivePage {
  /** `seo` as stored (base/JA). */
  ja: SeoObject;
  /** The EN row of `seo_translations`, or `{}` when Atlas has no EN row. */
  en: SeoObject;
  /** Guards against this script silently destroying content. */
  blockCount: number;
  status: string | undefined;
}

/** Atlas returns `seo` and `seo_translations[].seo` as JSON-encoded STRINGS
 * on this backend (same quirk `features/cms/merge.ts` documents for block
 * data) — but tolerate an object too, so a backend that stops double-encoding
 * does not break this script. */
function parseSeo(value: unknown): SeoObject {
  if (typeof value === "string") {
    if (value.trim() === "") return {};
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as SeoObject) : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" ? (value as SeoObject) : {};
}

async function fetchLivePage(env: DeliveryEnv, slug: string): Promise<LivePage> {
  const res = await fetch(`${env.baseUrl}/api/v1/public/pages/${slug}`, {
    headers: { "X-API-Key": env.apiKey },
  });
  if (!res.ok) {
    throw new Error(`GET /api/v1/public/pages/${slug} -> ${res.status}. Expected a published page.`);
  }
  const body = (await res.json()) as {
    data?: {
      page?: { seo?: unknown; status?: string };
      blocks?: unknown[];
      seo_translations?: { locale?: string; seo?: unknown }[];
    };
  };
  const data = body.data ?? {};
  const enRow = (data.seo_translations ?? []).find((row) => row.locale === "en");
  return {
    ja: parseSeo(data.page?.seo),
    en: parseSeo(enRow?.seo),
    blockCount: (data.blocks ?? []).length,
    status: data.page?.status,
  };
}

/** Looks up one card's absolute URL, with an actionable message when the
 * manifest does not know it — the exact failure a first run hits before
 * `upload-media.ts` has been taught about the cards. */
function cardUrl(manifest: MediaManifest, lang: Lang): string {
  const file = CARD_FILE[lang];
  const url = manifest.assets[file]?.url;
  if (!url) {
    throw new Error(
      `Media "${file}" is not in scripts/atlas/media-manifest.json. ` +
        `Add { file: "${file}" } to upload-media.ts#ASSETS and run ` +
        '"npx tsx scripts/atlas/upload-media.ts" (idempotent), then re-run this script.',
    );
  }
  return url;
}

/** Everything except `og_image`, for the "nothing else moved" comparison. */
function withoutOgImage(seo: SeoObject): SeoObject {
  return Object.fromEntries(Object.entries(seo).filter(([key]) => key !== "og_image"));
}

function sameShape(a: SeoObject, b: SeoObject): boolean {
  return JSON.stringify(a, Object.keys(a).sort()) === JSON.stringify(b, Object.keys(b).sort());
}

/**
 * Re-reads the page after the write and refuses to continue unless the ONLY
 * observable change is the one this script intended. A silent `seo` overwrite
 * would take the 13 meta descriptions with it, and those exist nowhere but
 * Atlas — there is no seed script to restore them from.
 */
async function verifyWrite(
  env: DeliveryEnv,
  slug: string,
  before: LivePage,
  expected: { ja: string; en: string },
): Promise<void> {
  const after = await fetchLivePage(env, slug);

  if (after.blockCount !== before.blockCount) {
    throw new Error(
      `"${slug}": block count changed ${before.blockCount} -> ${after.blockCount}. ` +
        "The write touched content it must not touch — STOP and inspect the page before re-running.",
    );
  }
  if (after.ja.og_image !== expected.ja) {
    throw new Error(
      `"${slug}": ja og_image is ${JSON.stringify(after.ja.og_image)}, expected ${JSON.stringify(expected.ja)}.`,
    );
  }
  if (after.en.og_image !== expected.en) {
    throw new Error(
      `"${slug}": en og_image is ${JSON.stringify(after.en.og_image)}, expected ${JSON.stringify(expected.en)}.`,
    );
  }
  if (!sameShape(withoutOgImage(before.ja), withoutOgImage(after.ja))) {
    throw new Error(
      `"${slug}": a ja seo field other than og_image changed. Before: ` +
        `${JSON.stringify(withoutOgImage(before.ja))} After: ${JSON.stringify(withoutOgImage(after.ja))}`,
    );
  }
  if (!sameShape(withoutOgImage(before.en), withoutOgImage(after.en))) {
    throw new Error(
      `"${slug}": an en seo field other than og_image changed. Before: ` +
        `${JSON.stringify(withoutOgImage(before.en))} After: ${JSON.stringify(withoutOgImage(after.en))}`,
    );
  }
}

/** Publish, tolerating "it was already published" — the same 400 shape
 * `lib.ts#publishIfNeeded` swallows, reproduced here because that helper is
 * module-private and takes a status this script reads from a different
 * source. */
async function publishTolerant(
  client: Awaited<ReturnType<typeof createScriptManagementClient>>,
  slug: string,
): Promise<void> {
  try {
    await client.pages.publish(slug);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/cannot be published from status 'published'/.test(message)) throw error;
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const deliveryEnv = requireDeliveryEnv();
  requireAtlasEnv();
  const manifest = requireMediaManifest();

  const expected = { ja: cardUrl(manifest, "ja"), en: cardUrl(manifest, "en") };

  console.log(
    `[atlas:seed-og] ${apply ? "APPLYING" : "DRY RUN (no writes — pass --apply to write)"} ` +
      `across ${TARGET_SLUGS.length} page(s)`,
  );
  console.log(`  ja card: ${expected.ja}`);
  console.log(`  en card: ${expected.en}\n`);

  const client = apply ? await createScriptManagementClient() : null;

  let changed = 0;
  let already = 0;

  for (const slug of TARGET_SLUGS) {
    const before = await fetchLivePage(deliveryEnv, slug);

    if (before.ja.og_image === expected.ja && before.en.og_image === expected.en) {
      already += 1;
      console.log(`= ${slug.padEnd(34)} already set`);
      continue;
    }

    const nextJa: SeoObject = { ...before.ja, og_image: expected.ja };
    const nextEn: SeoObject = { ...before.en, og_image: expected.en };

    if (!apply || !client) {
      changed += 1;
      console.log(
        `~ ${slug.padEnd(34)} ja ${JSON.stringify(before.ja.og_image ?? "")} -> card` +
          `, en ${JSON.stringify(before.en.og_image ?? "")} -> card` +
          `  (keeping ${Object.keys(withoutOgImage(before.ja)).length} other ja seo field(s))`,
      );
      continue;
    }

    await client.pages.update(slug, { seo: nextJa, seo_translations: { en: nextEn } });
    await publishTolerant(client, slug);
    await verifyWrite(deliveryEnv, slug, before, expected);

    changed += 1;
    console.log(`+ ${slug.padEnd(34)} og_image set (ja + en), everything else verified unchanged`);
  }

  console.log(
    `\n[atlas:seed-og] ${apply ? "wrote" : "would write"} ${changed} page(s), ` +
      `${already} already correct.`,
  );
  if (!apply && changed > 0) {
    console.log("[atlas:seed-og] Re-run with --apply to perform these writes.");
  }
  if (apply && changed > 0) {
    console.log(
      '[atlas:seed-og] Next: "npm run atlas:drift" (snapshot moved) then "npm run atlas:verify".',
    );
  }
}

main().catch((error: unknown) => {
  console.error("[atlas:seed-og] failed:", error);
  process.exit(1);
});
