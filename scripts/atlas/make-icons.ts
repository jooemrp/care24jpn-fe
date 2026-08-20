/**
 * Generates `public/apple-touch-icon.png` (180x180), `public/icon-192.png`
 * and `public/icon-512.png` — the assets the 2026-08-12 SEO/AEO audit
 * flagged as entirely missing (Area A: "metadata.robots, export const
 * viewport, themeColor, apple-touch-icon, manifest — none exist"). The
 * first pass on this finding (ST-FIX3) deliberately did NOT add
 * `icons.apple` / `manifest` to `app/[lang]/layout.tsx` because no such
 * asset existed in `public/` — adding a metadata field that points at a
 * file that doesn't exist would be the same ghost-file-reference mistake
 * already found elsewhere in this run. This script closes that gap by
 * generating the files, following the same pattern `make-og-card.ts`
 * (ST-OG) already established for `og-card.png`: build deterministically
 * from an asset already in the repo, never hand-design an opaque binary
 * blob nobody can regenerate or diff.
 *
 * ## Source and crop
 *
 * `public/images/logo.png` (5600x2101) is the full lockup: a square blue
 * "badge" mark on the left, the "care24 Japan" wordmark to its right. An
 * app icon needs just the square badge — the wordmark is illegible at
 * 180px and was never meant to run at icon sizes.
 *
 * The badge's bounding box is found with `sharp().trim()`, not a
 * hand-measured pixel guess: the script first extracts a generous
 * left/top region that contains only the badge and stops well clear of
 * the "c" in "care24" (`ROUGH_BADGE_REGION`, verified against the actual
 * pixel dimensions below), then trims that region down to the badge's
 * real opaque bounding box. That keeps the crop reproducible if the
 * source logo is ever re-exported at different padding.
 *
 * ## Background
 *
 * The badge is a rounded square already (see it rendered in
 * `make-og-card.ts`'s output) — its four corners are transparent PNG,
 * not part of the mark. iOS renders transparent pixels in an
 * apple-touch-icon as **black**, not "no background" (there is no
 * concept of a transparent home-screen icon on iOS). Rather than pick a
 * background color by eye, the script samples an actual interior pixel
 * of the badge's own blue fill at runtime (`sampleBadgeBlue`) and
 * flattens the transparent corners onto that exact color — the corners
 * disappear into a seamless solid square instead of introducing a second,
 * guessed color.
 *
 * ## Sizes
 *
 * - 180x180 (`apple-touch-icon.png`): Apple's current recommended
 *   default size (single-size touch icon), per
 *   node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
 *   01-metadata/app-icons.md's own `apple-icon` convention doc, which this
 *   file intentionally does NOT use (that convention lives under `app/`,
 *   not `public/`, and generates the icon at request time — this script
 *   instead produces a static file referenced from `metadata.icons.apple`
 *   in `app/[lang]/layout.tsx`, matching how `icons.icon` already points
 *   at `/care24jpn.ico`).
 * - 192x192 and 512x512 (`icon-192.png` / `icon-512.png`): the two sizes
 *   `app/manifest.ts`'s Web App Manifest lists, per
 *   node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
 *   01-metadata/manifest.md and the W3C Web App Manifest spec's own
 *   commonly-cited baseline sizes for home-screen/splash icons on Android.
 *
 * No extra safe-zone padding is added: the badge is already a
 * self-contained rounded-square mark (it is designed to be used exactly
 * like this — see the favicon `care24jpn.ico`, which is the same badge at
 * 256x256), so it is resized edge-to-edge into each target canvas rather
 * than inventing a padding percentage nobody asked for.
 *
 * Usage (from marketing-web/):
 *   npx tsx scripts/atlas/make-icons.ts
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const LOGO_PATH = resolve(__dirname, "..", "..", "public", "images", "logo.png");

/**
 * Generous region containing only the badge mark, well clear of the
 * "care24" wordmark that starts around x=1470 on the 5600x2101 source
 * (verified by inspecting the extracted region before trimming — the
 * trimmed result below stays comfortably inside these bounds at
 * 1284x1281, i.e. this region has margin to spare on all sides).
 */
const ROUGH_BADGE_REGION = { left: 0, top: 0, width: 1400, height: 1400 };

interface IconTarget {
  size: number;
  outputPath: string;
}

const ICON_TARGETS: IconTarget[] = [
  { size: 180, outputPath: resolve(__dirname, "..", "..", "public", "apple-touch-icon.png") },
  { size: 192, outputPath: resolve(__dirname, "..", "..", "public", "icon-192.png") },
  { size: 512, outputPath: resolve(__dirname, "..", "..", "public", "icon-512.png") },
];

/** Samples an interior pixel of the trimmed badge's blue fill — not a
 * hand-typed hex guess — so the corner-fill background matches the
 * badge's actual rendered color exactly, byte for byte. (60, 60) sits
 * inside the solid blue field on every export of this badge (well clear
 * of the white glyph strokes and the rounded corners); verified visually
 * against the extracted crop before this script was finalized. */
async function sampleBadgeBlue(
  sharp: (typeof import("sharp"))["default"],
  trimmedBuffer: Buffer,
): Promise<{ r: number; g: number; b: number }> {
  const { data, info } = await sharp(trimmedBuffer)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  const x = 60;
  const y = 60;
  const idx = (y * info.width + x) * info.channels;
  const [r, g, b, a] = [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
  if (a < 250) {
    throw new Error(
      `Sample pixel (${x},${y}) is not fully opaque (alpha=${a}) — the badge crop/region ` +
        "changed shape; update the sample coordinates after inspecting the new crop.",
    );
  }
  return { r, g, b };
}

async function main(): Promise<void> {
  const sharp = (await import("sharp")).default;

  const rough = await sharp(LOGO_PATH).extract(ROUGH_BADGE_REGION).png().toBuffer();
  const trimmed = await sharp(rough).trim({ threshold: 10 }).png().toBuffer();
  const trimmedMeta = await sharp(trimmed).metadata();
  console.log(`[make-icons] trimmed badge bbox: ${trimmedMeta.width}x${trimmedMeta.height}`);

  const { r, g, b } = await sampleBadgeBlue(sharp, trimmed);
  const backgroundHex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  console.log(`[make-icons] sampled badge blue: ${backgroundHex}`);

  const flattened = await sharp(trimmed)
    .flatten({ background: { r, g, b } })
    .png()
    .toBuffer();

  for (const target of ICON_TARGETS) {
    const resized = await sharp(flattened)
      .resize({ width: target.size, height: target.size, fit: "cover" })
      .png({ compressionLevel: 9 })
      .toBuffer();

    await writeFile(target.outputPath, resized);

    const finalMeta = await sharp(resized).metadata();
    const sizeKb = (await readFile(target.outputPath)).length / 1024;
    console.log(
      `[make-icons] wrote ${target.outputPath} — ${finalMeta.width}x${finalMeta.height}, ` +
        `${sizeKb.toFixed(1)} KB, alpha=${finalMeta.hasAlpha}`,
    );

    if (finalMeta.width !== target.size || finalMeta.height !== target.size) {
      throw new Error(
        `${target.outputPath}: expected ${target.size}x${target.size}, got ` +
          `${finalMeta.width}x${finalMeta.height}`,
      );
    }
    if (finalMeta.hasAlpha) {
      throw new Error(`${target.outputPath}: still has an alpha channel after flatten() — iOS will render it black.`);
    }
  }
}

main().catch((error) => {
  console.error("[atlas:make-icons] failed:", error);
  process.exitCode = 1;
});
