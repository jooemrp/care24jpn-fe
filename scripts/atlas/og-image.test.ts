/**
 * Locks the two rules `og-image.ts` exists to enforce.
 *
 * The first is a routing rule: only pages that back a public URL get an
 * `og:image`. `site` is page chrome and `rates` is internal price data; a card
 * on either would be a field in the dashboard that nothing ever reads.
 *
 * The second is a drift rule: the card filenames come from
 * `constants/seo.ts#fallbackOgImage`, so the picture Atlas serves is by
 * construction the picture the local fallback serves. A rename on one side
 * without the other must fail loudly here rather than quietly seed the old
 * card forever.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { ogImageForSlug, ogImageUrl } from "./og-image";
import { fallbackOgImage } from "../../constants/seo";
import type { MediaManifest } from "./lib";

const manifest = {
  generated_at: "2026-01-01T00:00:00.000Z",
  folder: "/marketing-web/",
  assets: {
    "og-card.png": { id: "a", url: "https://cdn.test/ja.png" },
    "og-card-en.png": { id: "b", url: "https://cdn.test/en.png" },
  },
} as unknown as MediaManifest;

test("a routed page gets both locales' cards", () => {
  assert.deepEqual(ogImageForSlug("home", manifest), {
    ja: "https://cdn.test/ja.png",
    en: "https://cdn.test/en.png",
  });
});

test("every legal route is routed too — they are shared like any other page", () => {
  for (const slug of ["legal-privacy", "legal-tokushoho", "legal-quasi-mandate"]) {
    assert.ok(ogImageForSlug(slug, manifest), `${slug} must get a card`);
  }
});

test("`site` and `rates` back no public route and get nothing", () => {
  assert.equal(ogImageForSlug("site", manifest), null);
  assert.equal(ogImageForSlug("rates", manifest), null);
});

test("an unknown slug gets nothing rather than a card by default", () => {
  assert.equal(ogImageForSlug("not-a-page", manifest), null);
});

test("the card filenames are the ones constants/seo.ts points at", () => {
  assert.ok(fallbackOgImage.ja.endsWith("/og-card.png"));
  assert.ok(fallbackOgImage.en.endsWith("/og-card-en.png"));
});

test("a card missing from the manifest fails loudly, with the fix in the message", () => {
  const empty = { assets: {} } as unknown as MediaManifest;
  assert.throws(() => ogImageUrl(empty, "ja"), /upload-media\.ts#ASSETS/);
});
