import assert from "node:assert/strict";
import { test } from "node:test";
import { mapArticle } from "../cms/articles-map";
async function main() {
  process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
  const { articleOgImage, articleSeoFields, buildArticleMetadata } = await import("./metadata-fields");
  const article = mapArticle({ id: "demo", slug: "demo", status: "published", position: 0, data: { title: "題名", summary: "要約" } });
  test("entry title and summary drive metadata; hub supplies the OG image", () => {
    const meta = buildArticleMetadata(article, { ogImage: { ja: "https://example.com/ja.png", en: "https://example.com/en.png" } }, "Care", "en");
    assert.equal(meta.title, "題名");
    assert.equal(meta.description, "要約");
    assert.equal(meta.openGraph?.images, "https://example.com/en.png");
    assert.match(JSON.stringify(meta.alternates), /helpful-information\/demo/);
  });
  test("missing/malformed hub images have a field diagnostic and emit no guessed image URL", () => {
    for (const image of [undefined, "", "/image.png", "javascript:alert(1)"]) {
      assert.match(articleOgImage(image, "ja"), /cms-field-error: articles.seo.og_image.ja/);
      const meta = buildArticleMetadata(article, { ogImage: { ja: image ?? "", en: "" } }, "Care", "ja");
      assert.deepEqual(meta.openGraph?.images, []);
      assert.equal(meta.title, "題名");
    }
  });

  test("untranslated English has Japanese canonical, no English alternates, Japanese OG locale and noindex", () => {
    for (const lang of ["ja", "en"] as const) {
      const meta = buildArticleMetadata(article, {}, "Care", lang);
      assert.equal(meta.alternates?.canonical, "/helpful-information/demo");
      assert.deepEqual(meta.alternates?.languages, { ja: "/helpful-information/demo", "x-default": "/helpful-information/demo" });
      assert.equal(meta.openGraph?.locale, "ja_JP");
      assert.deepEqual(meta.openGraph?.alternateLocale, []);
      assert.deepEqual(meta.robots, { index: lang === "ja", follow: true });
    }
  });

  test("translated English restores self canonical, hreflang and article metadata with CMS overrides", () => {
    const ja = { id: "demo", slug: "demo", status: "published", position: 0, published_at: "2026-01-01T00:00:00Z", updated_at: "2026-02-01T00:00:00Z", data: { title: "題名", summary: "要約", lead: "導入", body: "<p>本文</p>" } };
    const translated = mapArticle(ja, { ...ja, is_fallback: false, data: { title: "Title", summary: "Summary", lead: "Intro", body: "<p>Body</p>", seo_title: "Search title", seo_description: "Search description", og_image: "https://cms.test/article.jpg" } });
    const meta = buildArticleMetadata(translated, {}, "Care", "en");
    assert.equal(meta.title, "Search title");
    assert.equal(meta.description, "Search description");
    assert.equal(meta.openGraph?.images, "https://cms.test/article.jpg");
    const og = meta.openGraph;
    assert.ok(og && "type" in og && og.type === "article");
    assert.equal(og.publishedTime, ja.published_at);
    assert.equal(og.modifiedTime, ja.updated_at);
    assert.equal(meta.openGraph?.locale, "en_US");
    assert.equal(meta.alternates?.canonical, "/en/helpful-information/demo");
    assert.equal(meta.alternates?.languages?.en, "/en/helpful-information/demo");
    assert.deepEqual(meta.robots, { index: true, follow: true });
  });

  test("Article structured data includes the same CMS SEO fields, image and genuine publication date", async () => {
    const { buildArticleJsonLd } = await import("./structured-data");
    const item = mapArticle({ id: "demo", slug: "demo", status: "published", position: 0, published_at: "2026-01-01T00:00:00Z", updated_at: "2026-02-01T00:00:00Z", data: { title: "題名", summary: "要約", seo_title: "検索題名", seo_description: "検索説明", og_image: "https://cms.test/article.jpg" } });
    const ld = buildArticleJsonLd(item, {}, "Care", "en");
    assert.equal(ld["@type"], "Article");
    assert.equal(ld.headline, "検索題名");
    assert.equal(ld.description, "検索説明");
    assert.equal(ld.image, "https://cms.test/article.jpg");
    assert.equal(ld.datePublished, item.publishedAt);
    assert.equal(ld.dateModified, item.updatedAt);
    assert.equal(ld.inLanguage, "ja");
    assert.equal(ld.mainEntityOfPage, "https://example.com/helpful-information/demo");
    const missing = buildArticleJsonLd(article, {}, "Care", "ja");
    assert.equal("datePublished" in missing, false);
    assert.equal("image" in missing, false);
    const fallback = buildArticleJsonLd(article, { ogImage: { ja: "https://cms.test/hub.jpg", en: "https://cms.test/hub-en.jpg" } }, "Care", "ja");
    assert.equal(fallback.image, "https://cms.test/hub.jpg");
  });

  test("optional empty SEO falls back; malformed image stays isolated with its article field diagnostic", () => {
    const make = (fields: Record<string, unknown>) => mapArticle({ id: "demo", slug: "demo", status: "published", position: 0, data: { title: "題名", summary: "要約", ...fields } });
    const hub = { ogImage: { ja: "https://cms.test/hub.jpg", en: "https://cms.test/hub.jpg" } };
    const empty = buildArticleMetadata(make({ seo_title: "  ", seo_description: "", og_image: null }), hub, "Care", "ja");
    assert.equal(empty.title, "題名");
    assert.equal(empty.description, "要約");
    assert.equal(empty.openGraph?.images, hub.ogImage.ja);
    const bad = make({ og_image: "unexpanded-media-id" });
    const { image } = articleSeoFields(bad, hub, "ja");
    assert.match(image, /article\/demo.og_image/);
    assert.deepEqual(buildArticleMetadata(bad, hub, "Care", "ja").openGraph?.images, []);
  });

  test("hub structured data describes a localized collection and breadcrumb with canonical article URLs", async () => {
    const { buildArticlesHubJsonLd } = await import("./structured-data");
    const { ARTICLE_LABEL_KEYS, mapArticlesHub } = await import("../cms/articles-map");
    const hub = mapArticlesHub([
      { id: "hero", type: "page-hero", blockTypeId: "hero", parentId: null, position: 0, data: { heading: { ja: "記事", en: "Articles" }, body: { ja: "導入", en: "Introduction" } } },
      { id: "labels", type: "article-ui-labels", blockTypeId: "labels", parentId: null, position: 1, data: Object.fromEntries(ARTICLE_LABEL_KEYS.map((key) => [key, { ja: key, en: key }])) },
    ]);
    for (const lang of ["ja", "en"] as const) {
      const [collection, breadcrumb] = buildArticlesHubJsonLd(hub, [article], lang);
      assert.equal(collection["@type"], "CollectionPage");
      assert.equal(collection.name, hub.hero.heading[lang]);
      assert.equal(collection.inLanguage, lang);
      assert.equal(collection.mainEntity.itemListElement[0].item.url, "https://example.com/helpful-information/demo");
      assert.equal(breadcrumb["@type"], "BreadcrumbList");
      assert.equal(breadcrumb.itemListElement[1].item, collection.url);
      assert.equal(breadcrumb.itemListElement[0].position, 1);
      assert.equal(collection.breadcrumb["@id"], breadcrumb["@id"]);
    }
  });

  test("sitemap excludes untranslated English and restores both locales and reciprocal alternates after translation", async () => {
    const { buildArticleSitemapEntries } = await import("./sitemap-fields");
    const ja = { id: "demo", slug: "demo", status: "published", position: 0, updated_at: "2026-02-01T00:00:00Z", data: { title: "題名", summary: "要約", lead: "導入", body: "<p>本文</p>" } };
    const untranslated = buildArticleSitemapEntries(mapArticle(ja));
    assert.equal(untranslated.length, 1);
    assert.equal(untranslated[0].url, "https://example.com/helpful-information/demo");
    assert.equal(untranslated[0].alternates?.languages?.en, undefined);
    const translated = buildArticleSitemapEntries(mapArticle(ja, { ...ja, is_fallback: false, data: { title: "Title", summary: "Summary", lead: "Intro", body: "<p>Body</p>" } }));
    assert.equal(translated.length, 2);
    assert.equal(translated[1].url, "https://example.com/en/helpful-information/demo");
    assert.deepEqual(translated[0].alternates, translated[1].alternates);
    assert.equal(translated[0].alternates?.languages?.en, translated[1].url);
    assert.equal(translated[0].lastModified, ja.updated_at);
    assert.equal(buildArticleSitemapEntries(article)[0].lastModified, undefined);
  });

}
void main();
