import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ARTICLE_LABEL_KEYS, articleToc, estimateReadingMinutes,
  mapArticle, mapArticlesHub, orderedArticleEntries, findArticleEntry,
} from "./articles-map";
import type { CmsBlock, RawEntry } from "./types";

const bi = (ja: string, en = ja) => ({ ja, en });
const data = () => ({
  title: "題名", category: "基礎知識", summary: "要約", lead: "導入1\n\n導入2",
  body: "<h2>見出し</h2><p>本文</p><h3>小見出し</h3><ul><li>a</li></ul>",
  cta_body: "<p>相談</p>", cta_label: "相談する", cta_href: "/contact",
});
function entry(slug = "demo", position = 0, fields: unknown = data()): RawEntry {
  return { id: slug, slug, status: "published", position, data: fields, updated_at: "2026-10-01T00:00:00Z" };
}

test("maps a locale-resolved entry, mirroring Japanese into the bilingual view model", () => {
  const article = mapArticle(entry());
  assert.equal(article.slug, "demo");
  assert.deepEqual(article.title, bi("題名"));
  assert.deepEqual(article.lead, { ja: ["導入1", "導入2"], en: ["導入1", "導入2"] });
  assert.deepEqual(article.body.ja, article.body.en);
  assert.equal(article.cta.href, "/contact");
  assert.equal(article.updatedAt, "2026-10-01T00:00:00Z");
});

test("also accepts the JSON-encoded resolved data delivered by Atlas", () => {
  assert.equal(mapArticle(entry("demo", 0, JSON.stringify(data()))).title.en, "題名");
});

test("article SEO fields are optional and publication comes from published_at", () => {
  const article = mapArticle({ ...entry(), published_at: "2026-09-01T00:00:00Z", data: {
    ...data(), seo_title: "検索用題名", seo_description: "検索用説明", og_image: "https://cms.test/social.jpg",
  } });
  assert.equal(article.publishedAt, "2026-09-01T00:00:00Z");
  assert.equal(article.seo.title?.ja, "検索用題名");
  assert.equal(article.seo.description?.ja, "検索用説明");
  assert.equal(article.seo.ogImage?.ja, "https://cms.test/social.jpg");
  assert.equal(mapArticle(entry()).seo.title, undefined);
  assert.equal(mapArticle({ ...entry(), published_at: "invalid" }).publishedAt, undefined);
});

const english = () => ({ ...data(), title: "Title", summary: "Summary", lead: "Introduction", body: "<h2>Heading</h2><p>English body</p>", category: "Basics", cta_body: "<p>Contact us</p>", cta_label: "Contact" });

test("resolved English is rendered and becomes indexable without changing code", () => {
  const article = mapArticle(entry(), { ...entry(), is_fallback: false, data: JSON.stringify(english()) });
  assert.deepEqual(article.indexableLanguages, ["ja", "en"]);
  assert.equal(article.title.en, "Title");
  assert.equal(article.title.ja, "題名");
  const paragraph = article.body.en[1];
  assert.ok(paragraph.type === "p");
  assert.equal(paragraph.text, "English body");
  assert.equal(article.lead.en[0], "Introduction");
});

test("fallback, base-only, partial and malformed translations cannot be indexed as English", () => {
  for (const localized of [
    undefined,
    { ...entry(), is_fallback: true, data: english() },
    { ...entry(), is_fallback: false }, // Atlas reports false with zero translations.
    { ...entry(), is_fallback: false, data: { ...data(), seo_title: "SEO only" } },
    { ...entry(), is_fallback: false, data: { ...english(), body: data().body } },
    { ...entry(), is_fallback: false, data: null },
    { ...entry(), is_fallback: false, data: { ...english(), body: "<script>bad()</script>" } },
  ]) {
    const article = mapArticle(entry(), localized);
    assert.deepEqual(article.indexableLanguages, ["ja"]);
  }
});

test("malformed English fields remain visible diagnostics while Japanese content stays usable", () => {
  for (const [field, value] of [["body", "<script>bad()</script>"], ["title", 42], ["lead", null]] as const) {
    const article = mapArticle(entry(), { ...entry(), is_fallback: false, data: { ...english(), [field]: value } });
    assert.deepEqual(article.indexableLanguages, ["ja"]);
    assert.equal(article.title.ja, "題名");
    assert.match(article.translationDiagnostics?.join(" ") ?? "", new RegExp(`article/demo.en.${field}`));
  }
  const malformed = mapArticle(entry(), { ...entry(), is_fallback: false, data: "{invalid" });
  assert.match(malformed.translationDiagnostics?.join(" ") ?? "", /article\/demo.en.data/);
});

test("English inherits no Japanese SEO title or description when its optional SEO overlays are empty", () => {
  const ja = entry("demo", 0, { ...data(), seo_title: "検索題名", seo_description: "検索説明", og_image: "https://cms.test/social.jpg" });
  const article = mapArticle(ja, { ...ja, is_fallback: false, data: { ...english(), seo_title: "検索題名", seo_description: "検索説明", og_image: "https://cms.test/social.jpg" } });
  assert.equal(article.seo.title?.en, undefined);
  assert.equal(article.seo.description?.en, undefined);
  assert.equal(article.seo.title?.ja, "検索題名");
  assert.equal(article.seo.ogImage?.en, "https://cms.test/social.jpg");
});

for (const field of Object.keys(data())) {
  for (const value of [undefined, "", 42, { ja: "unexpected translation blob" }]) {
    test(`${field}=${JSON.stringify(value)} is isolated to a visible field diagnostic`, () => {
      const article = mapArticle(entry("demo", 0, { ...data(), [field]: value }));
      assert.match(JSON.stringify(article), new RegExp(`demo\\.${field}`));
      if (field !== "title") assert.equal(article.title.ja, "題名");
      if (field !== "body") assert.equal(article.body.ja[0].type, "h2");
    });
  }
}

test("malformed data is diagnosed without a generic production error", () => {
  for (const value of ["{bad json", [], null, 42]) {
    assert.throws(() => mapArticle(entry("demo", 0, value)), /article\/demo.data/);
  }
});

test("unrenderable richtext gets a diagnostic while other fields survive", () => {
  const article = mapArticle(entry("demo", 0, { ...data(), body: "<script>bad()</script>", cta_body: "<div></div>" }));
  assert.match(JSON.stringify(article.body), /demo\.body/);
  assert.match(JSON.stringify(article.cta.body), /demo\.cta_body/);
  assert.equal(article.title.ja, "題名");
});

test("CTA URLs are field diagnostics when invalid; HTTPS and local URLs remain usable", () => {
  for (const href of ["javascript:alert(1)", "//evil.test", "missing", ""]) {
    assert.match(mapArticle(entry("demo", 0, { ...data(), cta_href: href })).cta.href, /cms-field-error: article.cta.href/);
  }
  assert.equal(mapArticle(entry("demo", 0, { ...data(), cta_href: "https://example.com/form" })).cta.href, "https://example.com/form");
});

test("typed entry ordering uses position and exact slugs without stripping a prefix", () => {
  const entries = [entry("article-demo", 3), entry("b", 1), entry("demo", 2)];
  assert.deepEqual(orderedArticleEntries(entries).map((item) => item.slug), ["b", "demo", "article-demo"]);
  assert.equal(entries[0].slug, "article-demo");
  assert.equal(findArticleEntry(entries, "demo")?.position, 2);
  assert.equal(findArticleEntry(entries, "article-demo")?.position, 3);
  assert.equal(findArticleEntry(entries, "missing"), null);
});

test("toc and reading time preserve the existing body behavior", () => {
  assert.deepEqual(articleToc(mapArticle(entry()).body.ja), [
    { id: "sec-0", label: "見出し", level: 2 }, { id: "sec-2", label: "小見出し", level: 3 },
  ]);
  assert.equal(estimateReadingMinutes("あ".repeat(2000), "ja"), 4);
  assert.equal(estimateReadingMinutes("短い", "ja"), 1);
  assert.equal(estimateReadingMinutes("word ".repeat(400), "en"), 2);
});

function hubBlocks(): CmsBlock[] {
  return [
    { id: "hero", type: "page-hero", blockTypeId: "hero", parentId: null, position: 0, data: { heading: bi("記事", "Articles"), body: bi("導入", "Intro") } },
    { id: "labels", type: "article-ui-labels", blockTypeId: "labels", parentId: null, position: 1, data: Object.fromEntries(ARTICLE_LABEL_KEYS.map((key) => [key, bi(key)])) },
  ];
}

test("hub requires hero and labels without article refs", () => {
  const hub = mapArticlesHub(hubBlocks());
  assert.equal(hub.labels.read_more.ja, "read_more");
  assert.equal(hub.hero.heading.en, "Articles");
  assert.equal("refs" in hub, false);
  const blocks = hubBlocks();
  delete blocks[1].data.read_more;
  assert.match(mapArticlesHub(blocks).labels.read_more.ja, /missing/);
  assert.throws(() => mapArticlesHub([blocks[0]]), /missing required CMS block/);
});

test("malformed richtext numeric entities are isolated at their body field boundary", () => {
  for (const key of ["body", "cta_body"]) {
    const article = mapArticle(entry("demo", 0, { ...data(), [key]: "<p>&#99999999;</p>" }));
    assert.match(JSON.stringify(key === "body" ? article.body : article.cta.body), new RegExp(`demo\\.${key}`));
    assert.equal(article.title.ja, "題名");
  }
});

test("malformed hub text fields leave unrelated hero/labels usable", () => {
  const blocks = hubBlocks();
  blocks[0].data.body = 42;
  blocks[1].data.read_more = { ja: 42 };
  const hub = mapArticlesHub(blocks);
  assert.match(hub.hero.body.ja, /articles\/page-hero.body/);
  assert.match(hub.labels.read_more.ja, /articles\/article-ui-labels.read_more/);
  assert.equal(hub.hero.heading.ja, "記事");
  assert.equal(hub.labels.all_categories.ja, "all_categories");
});
