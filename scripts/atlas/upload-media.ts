/**
 * Uploads the eight images the site renders (`public/images/*`) into the
 * Atlas media library and records the resulting media ids in
 * `scripts/atlas/media-manifest.json`, which the seed-*.ts scripts read to
 * fill the `image` fields added in schema.ts.
 *
 * Why media *ids* and not URLs: the dashboard's image editor
 * (`dashboard/components/content-field/renderers/image-field-renderer.tsx`)
 * renders `<MediaPicker>` without a `valueType`, and that prop defaults to
 * `"id"` (`dashboard/features/media/components/media-picker.tsx`). So the
 * moment an editor touches an `image` field, the dashboard writes a media id
 * into it. Seeding a URL instead would mean the seed and the dashboard
 * disagree about the field's shape, and the renderer would break as soon as
 * anyone changed a picture. We write what the dashboard writes.
 *
 * ## Idempotency
 *
 * A second run must not create a second copy of anything. It cannot be done
 * by "look the file up by name and skip if present": this backend has no
 * media list endpoint reachable with the keys this repo holds (see the
 * MEDIA_FOLDER/manifest comment in lib.ts — `GET /api/v1/media` needs a
 * dashboard session and answers 401 to a management key). So the manifest IS
 * the index:
 *
 *   1. read `media-manifest.json` (absent on a first run);
 *   2. for every asset already listed, confirm the id still resolves through
 *      the DELIVERY api (`media.get(id)` -> `GET /api/v1/public/media/:id`).
 *      Present -> reuse it, refresh url/width/height from the live record;
 *      deleted -> re-upload, because the id in the seeded pages is dead;
 *   3. upload only what's left, and rewrite the manifest.
 *
 * A rerun therefore performs zero uploads and produces a byte-identical
 * manifest apart from `generated_at`.
 *
 * ## The .webp detour
 *
 * Five of the eight files are WebP, and **the backend refuses them**. Upload
 * runs `image.DecodeConfig` (`backend/internal/media/usecase/upload_media.go
 * #extractImageDimensions`) with only `image/gif`, `image/jpeg` and
 * `image/png` decoders registered — no `golang.org/x/image/webp` anywhere in
 * `backend/go.mod`. Verified against the live workspace, not assumed:
 *
 *     hero.webp -> 400 invalid input provided: failed to extract image
 *                  dimensions: image: unknown format
 *
 * The backend is out of scope here, so this script transcodes those five in
 * memory and uploads the result. JPEG (mozjpeg, quality 92) rather than
 * lossless PNG, and that is not a preference — it is the second live limit
 * this hit. Atlas itself allows 10MB (`maxFileSize` in the same file), but
 * the deployment sits behind nginx 1.24 with its default 1MB
 * `client_max_body_size`, and the PNG of use-case-4.webp is 1.38MB:
 *
 *     use-case-4 as PNG (1379KB) -> 413 (nginx, before the app sees it)
 *
 * At quality 92 the same file is 146KB — the whole set lands between 64KB and
 * 146KB, in the same range as the WebP originals (28-124KB), with a re-encode
 * generation that is not visible at these sizes. Nothing about the delivered
 * format changes either way: `next/image` re-encodes remote sources to
 * WebP/AVIF per request, so visitors keep getting a modern format regardless
 * of what the master is stored as. None of the five carries an alpha channel
 * (checked with sharp's metadata: `channels: 3, hasAlpha: false`), so JPEG
 * loses nothing. The two real PNGs (logo.png, mics-logo.png) DO have alpha
 * and are uploaded untouched.
 *
 * `sharp` does the conversion; it is already installed as one of `next`'s own
 * dependencies, and this is a manually-run script, never bundled.
 *
 * ## Crash safety
 *
 * The manifest is rewritten after every single upload, not once at the end.
 * A run that dies midway (the 413 above did exactly this) would otherwise
 * leave the assets it already uploaded recorded nowhere — unreachable through
 * any list endpoint, and re-uploaded as duplicates on the next attempt. With
 * incremental writes, a failed run is simply resumed by re-running it.
 *
 * Usage (from marketing-web/):
 *   npx tsx scripts/atlas/upload-media.ts
 */
import { readFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import {
  loadEnv,
  requireAtlasEnv,
  createScriptManagementClient,
  readMediaManifest,
  writeMediaManifest,
  MEDIA_FOLDER,
  MEDIA_MANIFEST_PATH,
  type MediaManifestEntry,
} from "./lib";

const IMAGES_DIR = resolve(__dirname, "..", "..", "public", "images");

/** Every image the site renders, keyed by its `public/images/` filename —
 * which is also the manifest key the seed scripts look up. `usedBy` is
 * documentation only; the authoritative wiring lives in the seed scripts. */
const ASSETS: { file: string; usedBy: string }[] = [
  { file: "hero.webp", usedBy: "home_hero.image" },
  { file: "logo.png", usedBy: "site_brand.logo (Navbar + Footer)" },
  { file: "mics-logo.png", usedBy: "home_contact.mics_logo" },
  { file: "iso27001-bsi.png", usedBy: "home_contact.iso_logo" },
  { file: "use-case-1.webp", usedBy: "use_case_item[0].image + home_care_course_card[0].image" },
  { file: "use-case-2.webp", usedBy: "use_case_item[1].image + home_care_course_card[1].image" },
  { file: "use-case-3.webp", usedBy: "use_case_item[2].image + home_care_course_card[2].image" },
  { file: "use-case-4.webp", usedBy: "use_case_item[3].image + home_care_course_card[3].image" },
  // The two share cards. Unlike every entry above they back no BLOCK field —
  // they are read by `seed-og-image.ts`, which writes their absolute url into
  // each page's `seo.og_image` / `seo_translations.en.seo.og_image`. They are
  // listed here anyway because this script is the only thing that records a
  // media url in the manifest, and the pruning loop at the bottom of `main`
  // deletes any manifest key NOT listed here.
  { file: "og-card.png", usedBy: "seo.og_image (ja) — via seed-og-image.ts" },
  { file: "og-card-en.png", usedBy: "seo_translations.en.seo.og_image — via seed-og-image.ts" },
  { file: "payment-visa.png", usedBy: "home_pricing_summary.payment_visa" },
  { file: "payment-mastercard.png", usedBy: "home_pricing_summary.payment_mastercard" },
  { file: "payment-jcb.png", usedBy: "home_pricing_summary.payment_jcb" },
  { file: "payment-amex.png", usedBy: "home_pricing_summary.payment_amex" },
  // TOP revision visual assets (AI-generated drafts under public/images/)
  { file: "about-family.png", usedBy: "home_about.illustration" },
  { file: "consult-family.png", usedBy: "home_apply.consult_illustration" },
  { file: "icon-about-qualified.png", usedBy: "home_about.card_image_1" },
  { file: "icon-about-flexible.png", usedBy: "home_about.card_image_2" },
  { file: "icon-about-private.png", usedBy: "home_about.card_image_3" },
  { file: "problem-discharge.png", usedBy: "home_problems.item_image_1" },
  { file: "problem-absence.png", usedBy: "home_problems.item_image_2" },
  { file: "problem-bathing.png", usedBy: "home_problems.item_image_3" },
  { file: "problem-hospital.png", usedBy: "home_problems.item_image_4" },
  { file: "problem-insurance.png", usedBy: "home_problems.item_image_5" },
  { file: "flow-01-apply.webp", usedBy: "home_flow_step[0].image" },
  { file: "flow-02-confirm.webp", usedBy: "home_flow_step[1].image" },
  { file: "flow-03-visit.webp", usedBy: "home_flow_step[2].image" },
  { file: "flow-04-report.webp", usedBy: "home_flow_step[3].image" },
];

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
};

interface UploadPayload {
  /** Filename Atlas records as `original_name` (and sanitizes into the S3 key). */
  name: string;
  mimeType: string;
  bytes: Uint8Array<ArrayBuffer>;
  /** `true` when the source was WebP and had to be transcoded — reported so a
   * reader of the log isn't surprised that `hero.webp` landed as `hero.png`. */
  converted: boolean;
}

/**
 * Reads one file from `public/images/`, transcoding WebP to JPEG because the
 * backend cannot decode WebP and nginx rejects the lossless-PNG alternative
 * at 413 — see the file header for both measurements. Everything else is
 * uploaded byte-for-byte as it sits in the repo.
 */
async function loadForUpload(file: string): Promise<UploadPayload> {
  const bytes = await readFile(resolve(IMAGES_DIR, file));
  const ext = extname(file).toLowerCase();

  if (ext !== ".webp") {
    const mimeType = MIME_BY_EXT[ext];
    if (!mimeType) {
      throw new Error(`Unsupported source extension "${ext}" for ${file} — add it to MIME_BY_EXT.`);
    }
    return { name: file, mimeType, bytes: Uint8Array.from(bytes), converted: false };
  }

  let sharp: (typeof import("sharp"))["default"];
  try {
    sharp = (await import("sharp")).default;
  } catch (error) {
    throw new Error(
      `${file} is WebP and this backend rejects WebP uploads (it decodes with gif/jpeg/png only), ` +
        "so it has to be converted to PNG first — but `sharp` could not be loaded. " +
        "It normally comes in with next's own dependencies; run `npm install` in marketing-web/. " +
        `Underlying error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const jpeg = await sharp(bytes).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  return {
    name: `${basename(file, ext)}.jpg`,
    mimeType: "image/jpeg",
    bytes: Uint8Array.from(jpeg),
    converted: true,
  };
}

function toNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Normalizes either plane's media record (management upload response or
 * delivery `GET /public/media/:id`) into a manifest entry. Both carry
 * `id`/`url`/`width`/`height`/`mime_type`; only the management one carries
 * `original_name`, so a fallback is passed in for the delivery path. */
function toManifestEntry(record: Record<string, unknown>, uploadedAs: string): MediaManifestEntry {
  const url = record.url;
  if (typeof url !== "string" || url === "") {
    throw new Error(
      `Media record ${String(record.id)} came back without a url: ${JSON.stringify(record)}`,
    );
  }
  return {
    id: String(record.id),
    url,
    width: toNumberOrNull(record.width),
    height: toNumberOrNull(record.height),
    mime_type: typeof record.mime_type === "string" ? record.mime_type : "",
    uploaded_as: typeof record.original_name === "string" ? record.original_name : uploadedAs,
  };
}

type DeliveryClient = { media: { get(id: string): Promise<unknown> } };

let deliveryClient: DeliveryClient | null | undefined;

/** Delivery (read-only, `atlas_live_`) client, built lazily and once. An
 * absent key is not fatal — it only means existing manifest entries are
 * trusted as written instead of re-verified, which is still idempotent, just
 * blind to a media asset someone deleted by hand. */
async function getDeliveryClient(): Promise<DeliveryClient | null> {
  if (deliveryClient !== undefined) return deliveryClient;

  const url = process.env.ATLAS_BASE_URL ?? "";
  const apiKey = process.env.ATLAS_API_KEY ?? "";
  if (!url || !apiKey) {
    console.warn(
      "! ATLAS_API_KEY is not set — existing manifest entries will be trusted without re-checking " +
        "that the media still exists in Atlas. Set it in marketing-web/.env for the full check.",
    );
    deliveryClient = null;
    return deliveryClient;
  }

  const { createClient } = await import("@latellu/atlas-sdk");
  deliveryClient = createClient({ url, apiKey }) as unknown as DeliveryClient;
  return deliveryClient;
}

type VerifyResult =
  | { state: "live"; record: Record<string, unknown> }
  | { state: "gone" }
  | { state: "unchecked" };

/** Delivery-side existence check for an id already in the manifest. */
async function verifyExisting(id: string): Promise<VerifyResult> {
  const client = await getDeliveryClient();
  if (!client) return { state: "unchecked" };
  const asset = (await client.media.get(id)) as Record<string, unknown> | null;
  return asset ? { state: "live", record: asset } : { state: "gone" };
}

async function main(): Promise<void> {
  loadEnv();
  requireAtlasEnv();
  const client = await createScriptManagementClient();

  const previous = readMediaManifest();
  const assets: Record<string, MediaManifestEntry> = { ...previous?.assets };

  let uploaded = 0;
  let reused = 0;

  /** Persist after every upload, so a run that dies partway (a 413, a dropped
   * connection) still leaves every id it did obtain recorded — there is no
   * list endpoint to recover them from afterwards. Cheap: eight small writes
   * to a local file. */
  const persist = (): void => {
    writeMediaManifest({
      generated_at: new Date().toISOString(),
      folder: MEDIA_FOLDER,
      assets,
    });
  };

  for (const { file, usedBy } of ASSETS) {
    const known = previous?.assets[file];

    if (known?.id) {
      const verdict = await verifyExisting(known.id);

      if (verdict.state === "live") {
        // Refresh from the live record: alt/focal edits in the dashboard
        // don't move the url (it is immutable — UpdateMediaRequest accepts
        // only alt_text/folder/focal_x/focal_y), but re-reading keeps the
        // manifest honest about width/height too.
        assets[file] = toManifestEntry(verdict.record, known.uploaded_as);
        reused += 1;
        console.log(`= ${file.padEnd(20)} ${assets[file].id}  (already uploaded)`);
        continue;
      }

      if (verdict.state === "unchecked") {
        assets[file] = known;
        reused += 1;
        console.log(`= ${file.padEnd(20)} ${known.id}  (manifest, unverified)`);
        continue;
      }

      console.log(`! ${file.padEnd(20)} ${known.id} no longer exists in Atlas — re-uploading`);
    }

    const payload = await loadForUpload(file);
    const record = (await client.media.upload(
      new File([payload.bytes], payload.name, { type: payload.mimeType }),
      { folder: MEDIA_FOLDER },
    )) as unknown as Record<string, unknown>;

    assets[file] = toManifestEntry(record, payload.name);
    persist();
    uploaded += 1;
    console.log(
      `+ ${file.padEnd(20)} ${assets[file].id}  (uploaded as ${payload.name}` +
        `${payload.converted ? ", converted from webp" : ""}) -> ${usedBy}`,
    );
  }

  // Final write only: drop any key no longer listed in ASSETS (an image the
  // site stopped using). The per-upload writes above deliberately keep
  // everything — pruning mid-run would defeat their crash safety.
  for (const key of Object.keys(assets)) {
    if (!ASSETS.some((asset) => asset.file === key)) delete assets[key];
  }
  persist();

  console.log("");
  console.log("file                 media id                              w x h        url");
  for (const { file } of ASSETS) {
    const entry = assets[file];
    const size = `${entry.width ?? "?"}x${entry.height ?? "?"}`;
    console.log(`${file.padEnd(20)} ${entry.id}  ${size.padEnd(11)}  ${entry.url}`);
  }

  console.log("");
  console.log("Summary");
  console.log(`  media:    ${uploaded} uploaded, ${reused} reused (${ASSETS.length} total)`);
  console.log(`  manifest: ${MEDIA_MANIFEST_PATH}`);
}

main().catch((error) => {
  console.error("[atlas:upload-media] failed:", error);
  process.exitCode = 1;
});
