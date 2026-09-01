/**
 * Generate TOP-page revision image assets via OpenAI Images API.
 *
 * Reads `OPENAI_API_KEY` from marketing-web/.env (never commit keys).
 * Writes under `public/images/revision/` — review before promoting to
 * production filenames / Atlas upload.
 *
 * Usage (from marketing-web/):
 *   npx tsx scripts/generate-revision-assets.ts
 *   npx tsx scripts/generate-revision-assets.ts --only=hero,flow
 *   npx tsx scripts/generate-revision-assets.ts --force
 *
 * Groups: hero | flow | consult | about | problems | all (default)
 */

import { mkdir, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import OpenAI from "openai";
import sharp from "sharp";
import { loadEnv } from "./atlas/lib";

loadEnv();

const OUT_DIR = resolve(__dirname, "..", "public", "images", "revision");
const MODEL = "gpt-image-1";

type AssetKind = "photo" | "lineart";

type Asset = {
  id: string;
  group: "hero" | "flow" | "consult" | "about" | "problems";
  file: string;
  kind: AssetKind;
  /** OpenAI size string */
  size: "1536x1024" | "1024x1024" | "1024x1536";
  /** Final web width (sharp resize) */
  outWidth: number;
  prompt: string;
};

const BRAND =
  "Care24 Japan home-care brand. Bright, airy, FRESH Japanese in-home nursing aesthetic. " +
  "Cool-neutral daylight (cool white / soft blue sky light — NOT yellow, NOT amber, NOT sepia, NOT golden-hour). " +
  "Clean modern Tokyo apartment, white and light-gray walls, crisp whites, high-key, cheerful. " +
  "STRICTLY NO text, NO letters, NO kanji, NO hiragana, NO katakana, NO numbers, NO logos, NO watermarks, NO typography in the image.";

const LINEART =
  "Minimal flat line-art illustration, thin light strokes only, bright brand primary blue outlines (#4A9AD4) on pure WHITE background, " +
  "absolutely no black background, no green, no teal, no heavy filled silhouettes, no gradients, no photorealism, " +
  "airy Japanese brochure style matching Care24 Japan, generous white padding, centered, cheerful and clean.";


const ASSETS: Asset[] = [
  {
    id: "hero",
    group: "hero",
    file: "hero-home.webp",
    kind: "photo",
    size: "1536x1024",
    outWidth: 2400,
    prompt:
      `${BRAND} Ultra-wide full-bleed website hero photograph, 3:2, edge-to-edge scene with NO blank white void. ` +
      `Continuous bright modern living room across the FULL frame (sofa, soft curtains, daylight). ` +
      `Subjects (Japanese female caregiver in soft navy scrubs + elderly Japanese woman) sit toward the RIGHT half, ` +
      `smiling. LEFT third stays soft and uncluttered (out-of-focus room / curtain texture) but MUST still show ` +
      `photographic content — never a hard cut to empty white, never a vertical crop edge. ` +
      `Cool fresh daylight, natural exposure (not overexposed). Absolutely no written characters.`,
  },
  {
    id: "flow-01",
    group: "flow",
    file: "flow-01-apply.webp",
    kind: "photo",
    size: "1024x1024",
    outWidth: 800,
    prompt:
      `${BRAND} NATURAL color documentary photo — square, for circular crop. Japanese woman 30s in soft navy care scrubs ` +
      `smiling while using a smartphone at a bright kitchen table. Realistic natural skin tones, true fabric colors. ` +
      `NO blue color overlay, NO cyan wash, NO monochrome tint, NO faded filter, NO desaturation. Centered. No text.`,
  },
  {
    id: "flow-02",
    group: "flow",
    file: "flow-02-confirm.webp",
    kind: "photo",
    size: "1024x1024",
    outWidth: 800,
    prompt:
      `${BRAND} NATURAL color documentary photo — square, for circular crop. Japanese care coordinator with headset ` +
      `at a clean desk, smiling toward camera. Realistic skin tones and clothing colors. ` +
      `NO blue overlay, NO cyan wash, NO faded filter, NO desaturation. Centered. No text.`,
  },
  {
    id: "flow-03",
    group: "flow",
    file: "flow-03-visit.webp",
    kind: "photo",
    size: "1024x1024",
    outWidth: 800,
    prompt:
      `${BRAND} NATURAL color documentary photo — square, for circular crop. Young Japanese caregiver in soft navy scrubs ` +
      `talking warmly with elderly Japanese woman at home on a sofa. Realistic natural colors. ` +
      `NO blue overlay, NO cyan wash, NO faded filter, NO desaturation. Centered. No text.`,
  },
  {
    id: "flow-04",
    group: "flow",
    file: "flow-04-report.webp",
    kind: "photo",
    size: "1024x1024",
    outWidth: 800,
    prompt:
      `${BRAND} NATURAL color documentary photo — square, for circular crop. Japanese caregiver writing a care report ` +
      `at a bright desk (blank paper, no readable writing). Realistic natural colors. ` +
      `NO blue overlay, NO cyan wash, NO faded filter, NO desaturation. Centered. No text.`,
  },
  {
    id: "consult-family",
    group: "consult",
    file: "consult-family.png",
    kind: "lineart",
    size: "1024x1024",
    outWidth: 640,
    prompt:
      `${LINEART} Simple line drawing of a small family group (two adults, one child, one elderly person) standing ` +
      `together with a caregiver, for a consultation banner. Horizontal-friendly grouping, lots of white space.`,
  },
  {
    id: "about-family",
    group: "about",
    file: "about-family.png",
    kind: "lineart",
    size: "1536x1024",
    outWidth: 960,
    prompt:
      `${LINEART} Wide simple line drawing of multi-generational family with two care staff standing side by side, ` +
      `friendly silhouettes, for a "What is Care24Japan" section footer illustration.`,
  },
  {
    id: "about-qualified",
    group: "about",
    file: "icon-about-qualified.png",
    kind: "lineart",
    size: "1024x1024",
    outWidth: 256,
    prompt:
      `${LINEART} Icon only: person bust silhouette with a small checkmark badge at bottom-right. No circle frame. ` +
      `Centered, very simple.`,
  },
  {
    id: "about-flexible",
    group: "about",
    file: "icon-about-flexible.png",
    kind: "lineart",
    size: "1024x1024",
    outWidth: 256,
    prompt:
      `${LINEART} Icon only: calendar page with two rings at top and a small checkmark. No circle frame. Centered.`,
  },
  {
    id: "about-private",
    group: "about",
    file: "icon-about-private.png",
    kind: "lineart",
    size: "1024x1024",
    outWidth: 256,
    prompt:
      `${LINEART} Icon only: simple heart outline. No plus sign, no circle frame. Centered.`,
  },
  {
    id: "problem-discharge",
    group: "problems",
    file: "problem-discharge.png",
    kind: "lineart",
    size: "1024x1024",
    outWidth: 256,
    prompt:
      `${LINEART} Icon only: worried elderly person sitting, subtle sad expression, post-hospital discharge mood. Centered.`,
  },
  {
    id: "problem-absence",
    group: "problems",
    file: "problem-absence.png",
    kind: "lineart",
    size: "1024x1024",
    outWidth: 256,
    prompt:
      `${LINEART} Icon only: single elderly person alone with a small question mark nearby (family absence). Centered.`,
  },
  {
    id: "problem-bathing",
    group: "problems",
    file: "problem-bathing.png",
    kind: "lineart",
    size: "1024x1024",
    outWidth: 256,
    prompt:
      `${LINEART} Icon only: bathtub with faucet, simple bathing-assistance symbol. Centered.`,
  },
  {
    id: "problem-hospital",
    group: "problems",
    file: "problem-hospital.png",
    kind: "lineart",
    size: "1024x1024",
    outWidth: 256,
    prompt:
      `${LINEART} Icon only: simple car / escort-to-hospital symbol. Centered.`,
  },
  {
    id: "problem-insurance",
    group: "problems",
    file: "problem-insurance.png",
    kind: "lineart",
    size: "1024x1024",
    outWidth: 256,
    prompt:
      `${LINEART} Icon only: clipboard or document with checklist lines (insurance limits). Centered.`,
  },
];

function parseArgs(argv: string[]) {
  const only = new Set<string>();
  let force = false;
  for (const arg of argv) {
    if (arg === "--force") force = true;
    if (arg.startsWith("--only=")) {
      for (const part of arg.slice("--only=".length).split(",")) {
        const p = part.trim();
        if (p) only.add(p);
      }
    }
  }
  return { only, force };
}

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function generatePng(client: OpenAI, asset: Asset): Promise<Buffer> {
  const result = await client.images.generate({
    model: MODEL,
    prompt: asset.prompt,
    size: asset.size,
    quality: "high",
  });

  const images = "data" in result ? result.data : undefined;
  const b64 = images?.[0]?.b64_json;
  if (!b64) {
    throw new Error(`No image data returned for ${asset.id}`);
  }
  return Buffer.from(b64, "base64");
}

/** Knock near-white or near-black background toward transparency for line-art. */
async function toTransparentLineart(png: Buffer, outWidth: number): Promise<Buffer> {
  const resized = await sharp(png)
    .ensureAlpha()
    .resize(outWidth, Math.round(outWidth * 0.75), {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = resized;
  // Sample four corners to decide whether bg is light or dark.
  const corners = [
    0,
    (info.width - 1) * 4,
    (info.height - 1) * info.width * 4,
    ((info.height - 1) * info.width + (info.width - 1)) * 4,
  ];
  let lumaSum = 0;
  for (const i of corners) {
    lumaSum += 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
  }
  const avgLuma = lumaSum / corners.length;
  const knockDark = avgLuma < 40;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    if (knockDark) {
      if (r < 35 && g < 35 && b < 35) data[i + 3] = 0;
    } else if (r > 245 && g > 245 && b > 245) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
}


async function writeAsset(raw: Buffer, asset: Asset) {
  const dest = resolve(OUT_DIR, asset.file);
  if (asset.kind === "photo") {
    const webp = await sharp(raw)
      .resize(asset.outWidth, null, { withoutEnlargement: false })
      .webp({ quality: 82 })
      .toBuffer();
    await writeFile(dest, webp);
  } else {
    const png = await toTransparentLineart(raw, asset.outWidth);
    await writeFile(dest, png);
  }
  return dest;
}

async function main() {
  const { only, force } = parseArgs(process.argv.slice(2));
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to marketing-web/.env then re-run.",
    );
  }

  await mkdir(OUT_DIR, { recursive: true });

  const selected = ASSETS.filter((a) => {
    if (only.size === 0) return true;
    return only.has(a.id) || only.has(a.group) || only.has("all");
  });

  if (selected.length === 0) {
    throw new Error(
      `No assets matched --only. Known ids: ${ASSETS.map((a) => a.id).join(", ")}`,
    );
  }

  const client = new OpenAI({ apiKey });
  console.log(`Generating ${selected.length} asset(s) with ${MODEL} → ${OUT_DIR}`);

  for (const asset of selected) {
    const dest = resolve(OUT_DIR, asset.file);
    if (!force && (await exists(dest))) {
      console.log(`skip  ${asset.file} (exists, pass --force to overwrite)`);
      continue;
    }
    process.stdout.write(`gen   ${asset.file} … `);
    try {
      const raw = await generatePng(client, asset);
      await writeAsset(raw, asset);
      console.log("ok");
    } catch (err) {
      console.log("FAIL");
      throw err;
    }
  }

  console.log("Done. Review public/images/revision/ before wiring into the UI.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
