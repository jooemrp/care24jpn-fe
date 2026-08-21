/**
 * Locks the rule `lib.ts#mergePageSeo` exists to enforce: a seed script wins
 * for every seo key it names, and the page keeps every key the script says
 * nothing about.
 *
 * Why this is worth a test of its own: every `seed-*.ts` declares
 * `seo: { title }` and nothing more, while the live pages carry `title`,
 * `description`, `canonical`, `keywords` and `og_image`. Before this merge,
 * `npm run atlas:seed` would have replaced that whole object — taking 13 meta
 * descriptions that exist nowhere else with it. A regression here is silent
 * at runtime and only visible as missing metadata days later, so it needs to
 * be loud at test time.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mergePageSeo, type LiveSeo } from "./lib";

const live: LiveSeo = {
  base: {
    title: "旧タイトル",
    description: "編集者が書いた説明文",
    canonical: "https://example.test/x",
    keywords: "a,b",
  },
  byLocale: {
    en: { title: "Old title", description: "Editor-written description" },
  },
};

test("a seed's `seo` wins for the keys it names", () => {
  const out = mergePageSeo("x", live, { seo: { title: "新タイトル" } });
  assert.equal((out.seo as Record<string, unknown>).title, "新タイトル");
});

test("keys the seed does not name survive — this is the atlas:seed data loss", () => {
  const out = mergePageSeo("x", live, { seo: { title: "新タイトル" } });
  const seo = out.seo as Record<string, unknown>;
  assert.equal(seo.description, "編集者が書いた説明文");
  assert.equal(seo.canonical, "https://example.test/x");
  assert.equal(seo.keywords, "a,b");
});

test("the same rule applies per locale in seo_translations", () => {
  const out = mergePageSeo("x", live, {
    seo: { title: "新" },
    seo_translations: { en: { title: "New title" } },
  });
  const en = (out.seo_translations as Record<string, Record<string, unknown>>).en;
  assert.equal(en.title, "New title");
  assert.equal(en.description, "Editor-written description");
});

test("a locale the page has no row for still seeds cleanly", () => {
  const out = mergePageSeo("x", live, { seo_translations: { fr: { title: "Titre" } } });
  const fr = (out.seo_translations as Record<string, Record<string, unknown>>).fr;
  assert.deepEqual(fr, { title: "Titre" });
});

test("blocks are untouched — only seo is merged", () => {
  const blocks = [{ position: 0 }];
  const out = mergePageSeo("x", live, { seo: { title: "t" }, blocks });
  assert.equal(out.blocks, blocks);
});

test("an input that declares no seo at all is returned unchanged", () => {
  const input = { blocks: [] };
  assert.equal(mergePageSeo("x", live, input), input);
});

test("a page with nothing live yet (new or unpublished) is passed through", () => {
  const input = { seo: { title: "t" } };
  assert.equal(mergePageSeo("x", null, input), input);
});
