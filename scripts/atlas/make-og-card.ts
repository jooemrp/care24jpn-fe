/**
 * Generates `public/images/og-card.png` (ja) and `public/images/og-card-en.png`
 * (en) — the site's `og:image` / Twitter card images (ST-05 wires them into
 * metadata; this script only produces the files). The site currently ships
 * no `og:image` at all, which is the top finding in SEO-AEO-AUDIT.md: every
 * share to LINE, X, or Facebook renders without a preview image. LINE
 * matters most here — it's the dominant share channel in the JP market this
 * site serves. The site is bilingual (`/en/*` too), so both locales need
 * their own card — Atlas supports this per-locale via
 * `seo_translations[].seo.og_image`, separate from `page.seo.og_image`.
 *
 * ## Why generated, not hand-designed
 *
 * There is no existing 1200x630 asset in the repo to reuse. Rather than ship
 * an opaque binary blob nobody can diff or regenerate, this script builds
 * each card deterministically from assets already in the repo (`logo.png`)
 * plus one string pulled live from Atlas per locale (`site-brand.tagline`) —
 * never typed from memory, never translated by hand. Re-running it produces
 * byte-identical PNGs.
 *
 * ## Layout decisions
 *
 * - Background: `--color-primary-light` (#eaf3fb), the site's pale blue
 *   tint (styles/globals.css). `logo.png` is a full-color mark (blue badge,
 *   blue/navy wordmark, magenta accent) — it has strong contrast against a
 *   light background but would wash out against `--color-primary` or
 *   `--color-primary-deep`, which sit in the same blue family as the
 *   wordmark itself. A light backdrop with the logo's own colors intact
 *   reads better at small sizes than white-knocked-out-on-blue would.
 * - A thin `--color-primary-deep` bar along the bottom edge is the only
 *   other mark on the canvas — a brand cue for anyone who sees the card
 *   cropped or thumbnailed, without adding a second color that competes
 *   with the logo.
 * - Tagline: `--color-primary-deep` (#206ba4) on `--color-primary-light`
 *   (#eaf3fb) is 4.9:1 (checked below, not assumed) — comfortably above the
 *   3:1 large-text floor. Single line, large, bold: LINE/X/FB previews
 *   render this card small, so anything less than "readable as a thumbnail"
 *   is wasted.
 * - No invented copy: only the logo and the tagline already stored in Atlas
 *   are used.
 *
 * ## Font
 *
 * The tagline is Japanese, rendered through sharp's librsvg backend, which
 * resolves fonts via fontconfig. This is a manual, locally-run generation
 * script (same category as upload-media.ts's WebP transcode) — not runtime
 * app code — so relying on the machine's installed CJK font is acceptable
 * here. `FONT_STACK` lists what macOS ships (Hiragino Sans) first, with
 * generic fallbacks; if a run on a different machine renders tofu boxes
 * instead of glyphs, install a CJK sans font (e.g. Noto Sans JP) and re-run.
 *
 * Usage (from marketing-web/):
 *   npx tsx scripts/atlas/make-og-card.ts        # ja -> public/images/og-card.png
 *   npx tsx scripts/atlas/make-og-card.ts en     # en -> public/images/og-card-en.png
 *   npx tsx scripts/atlas/make-og-card.ts all    # both
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnv } from "./lib";

type Locale = "ja" | "en";

const WIDTH = 1200;
const HEIGHT = 630;

const COLOR_PRIMARY_LIGHT = "#eaf3fb";
const COLOR_PRIMARY_DEEP = "#206ba4";

const LOGO_PATH = resolve(__dirname, "..", "..", "public", "images", "logo.png");

/** `ja` keeps the original filename (`og-card.png`) so ST-05's default
 * `og:image` doesn't need a rename; `en` gets a `-en` suffix for the
 * locale-specific `seo_translations[].seo.og_image` slot. */
const OUTPUT_PATH: Record<Locale, string> = {
  ja: resolve(__dirname, "..", "..", "public", "images", "og-card.png"),
  en: resolve(__dirname, "..", "..", "public", "images", "og-card-en.png"),
};

const FONT_STACK = "Hiragino Sans, Hiragino Kaku Gothic Pro, Noto Sans JP, sans-serif";

/** Relative luminance + contrast ratio (WCAG formula), used to verify the
 * tagline color choice against the background rather than eyeballing it. */
function relativeLuminance(hex: string): number {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string): number {
  const [l1, l2] = [relativeLuminance(hexA), relativeLuminance(hexB)]
    .sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

interface SitePageBlock {
  id: string;
  type: string;
  data: string;
}

interface SitePageBlockTranslation {
  block_id: string;
  locale: string;
  data: string;
}

/** Fetches `site-brand.tagline` straight from Atlas — never typed from
 * memory, never hand-translated, per the sub-task's instruction. `ja` is the
 * default locale and lives directly on the `site-brand` block's `data`; any
 * other locale (`en`) is an override recorded in `block_translations` for
 * that same block id, which is where the dashboard's translation UI writes
 * it. Throws if the requested locale has no translation, or if it's blank —
 * inventing copy is out of scope here. */
async function fetchTagline(locale: Locale): Promise<string> {
  const baseUrl = process.env.ATLAS_BASE_URL;
  const apiKey = process.env.ATLAS_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "ATLAS_BASE_URL / ATLAS_API_KEY not set. Add them to marketing-web/.env before running this script.",
    );
  }

  const res = await fetch(`${baseUrl}/api/v1/public/pages/site`, {
    headers: { "X-API-Key": apiKey },
  });
  if (!res.ok) {
    throw new Error(`GET /api/v1/public/pages/site failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as {
    data: { blocks: SitePageBlock[]; block_translations: SitePageBlockTranslation[] };
  };

  const brandBlock = body.data.blocks.find((b) => b.type === "site-brand");
  if (!brandBlock) throw new Error('No "site-brand" block found on the "site" page.');

  const taglineJa = (JSON.parse(brandBlock.data) as { tagline?: string }).tagline;
  if (!taglineJa) throw new Error('"site-brand" block has no "tagline" field.');
  if (locale === "ja") return taglineJa;

  const translation = body.data.block_translations.find(
    (t) => t.block_id === brandBlock.id && t.locale === locale,
  );
  const taglineTranslated = translation
    ? (JSON.parse(translation.data) as { tagline?: string }).tagline
    : undefined;

  if (!taglineTranslated) {
    throw new Error(
      `"site-brand" block has no "${locale}" tagline translation in Atlas. Not inventing one — ` +
        "add it in the dashboard first, then re-run.",
    );
  }
  if (taglineTranslated === taglineJa) {
    throw new Error(
      `"site-brand" tagline for locale "${locale}" is identical to the ja tagline ("${taglineJa}") — ` +
        "looks untranslated. Not shipping that as a locale-specific card; fix the translation in Atlas first.",
    );
  }
  return taglineTranslated;
}

/** Escapes the handful of characters that break inline SVG `<text>`. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Available width for the tagline, with generous side margins so nothing
 * ever touches the card's edge. */
const TAGLINE_MAX_WIDTH = WIDTH - 200;

/** Very rough average glyph-width-to-font-size ratios for a bold sans, used
 * only to pick a font size that keeps the tagline on one line without
 * overflowing — not a real text-measurement (sharp/librsvg expose none).
 * CJK glyphs in a bold gothic are close to full-width (~1em); Latin bold
 * averages narrower. Deliberately conservative (overestimates width) so the
 * chosen size errs small rather than clipping — verified against the
 * rendered PNG afterward regardless. */
const AVG_GLYPH_WIDTH_EM: Record<Locale, number> = { ja: 1.0, en: 0.62 };

/** Picks the largest font size in `candidates` (must be descending) whose
 * estimated tagline width fits `TAGLINE_MAX_WIDTH`, falling back to the
 * smallest candidate if none fit. */
function fitFontSize(tagline: string, locale: Locale, candidates: number[]): number {
  const widthAt = (fontSize: number) => tagline.length * AVG_GLYPH_WIDTH_EM[locale] * fontSize;
  for (const size of candidates) {
    if (widthAt(size) <= TAGLINE_MAX_WIDTH) return size;
  }
  return candidates[candidates.length - 1];
}

async function generateCard(locale: Locale): Promise<void> {
  const sharp = (await import("sharp")).default;

  const tagline = await fetchTagline(locale);
  console.log(`[${locale}] tagline: ${tagline}`);

  const contrast = contrastRatio(COLOR_PRIMARY_DEEP, COLOR_PRIMARY_LIGHT);
  if (contrast < 3) {
    throw new Error(`Tagline contrast ${contrast.toFixed(2)}:1 is below the 3:1 large-text floor.`);
  }

  const fontSize = fitFontSize(tagline, locale, [54, 46, 40, 34]);
  console.log(`[${locale}] tagline color contrast: ${contrast.toFixed(2)}:1, font-size: ${fontSize}`);

  // Logo: resize to a width that reads clearly in a small preview but
  // leaves generous margin on a 1200-wide canvas.
  const logoWidth = 620;
  const logoBuffer = await sharp(LOGO_PATH)
    .resize({ width: logoWidth })
    .png()
    .toBuffer();
  const logoMeta = await sharp(logoBuffer).metadata();
  const logoHeight = logoMeta.height ?? Math.round((logoWidth * 2101) / 5600);
  const logoX = Math.round((WIDTH - logoWidth) / 2);
  const logoY = 150;

  const taglineY = logoY + logoHeight + 90;
  const bottomBarHeight = 14;

  const backgroundSvg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="${COLOR_PRIMARY_LIGHT}" />
      <rect x="0" y="${HEIGHT - bottomBarHeight}" width="${WIDTH}" height="${bottomBarHeight}" fill="${COLOR_PRIMARY_DEEP}" />
      <text
        x="${WIDTH / 2}"
        y="${taglineY}"
        text-anchor="middle"
        font-family="${FONT_STACK}"
        font-size="${fontSize}"
        font-weight="700"
        fill="${COLOR_PRIMARY_DEEP}"
      >${escapeXml(tagline)}</text>
    </svg>
  `;

  const backgroundBuffer = await sharp(Buffer.from(backgroundSvg)).png().toBuffer();

  const composed = await sharp(backgroundBuffer)
    .composite([{ input: logoBuffer, left: logoX, top: logoY }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  const outputPath = OUTPUT_PATH[locale];
  await writeFile(outputPath, composed);

  const finalMeta = await sharp(composed).metadata();
  const sizeKb = (await readFile(outputPath)).length / 1024;
  console.log(`[${locale}] wrote ${outputPath}`);
  console.log(`[${locale}] dimensions: ${finalMeta.width}x${finalMeta.height}`);
  console.log(`[${locale}] size: ${sizeKb.toFixed(1)} KB`);

  if (finalMeta.width !== WIDTH || finalMeta.height !== HEIGHT) {
    throw new Error(`Expected ${WIDTH}x${HEIGHT}, got ${finalMeta.width}x${finalMeta.height}`);
  }
  if (sizeKb >= 300) {
    throw new Error(`Output is ${sizeKb.toFixed(1)} KB, must be under 300 KB.`);
  }
}

function parseLocales(argv: string[]): Locale[] {
  const arg = argv[2] ?? "ja";
  if (arg === "all") return ["ja", "en"];
  if (arg === "ja" || arg === "en") return [arg];
  throw new Error(`Unknown locale argument "${arg}" — expected "ja", "en", or "all".`);
}

async function main(): Promise<void> {
  loadEnv();
  for (const locale of parseLocales(process.argv)) {
    await generateCard(locale);
  }
}

main().catch((error) => {
  console.error("[atlas:make-og-card] failed:", error);
  process.exitCode = 1;
});
