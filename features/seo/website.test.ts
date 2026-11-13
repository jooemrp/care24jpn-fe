/**
 * Tests for features/seo/website.ts — the pure home-page WebSite JSON-LD
 * builder.
 *
 * Run (from marketing-web/):
 *   node --test features/seo/website.test.ts
 *
 * Same bootstrapping constraint as organization.test.ts: the relative specifier
 * needs a literal `.ts` extension for Node's loader, which tsc rejects in a
 * STATIC import, so the module is imported dynamically.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import type * as WebsiteModule from "./website.ts";

const websitePath = "./website" + ".ts";

async function load(): Promise<typeof WebsiteModule> {
  return (await import(websitePath)) as typeof WebsiteModule;
}

test("builds a WebSite object from the CMS brand name, in a fixed key order", async () => {
  const { buildWebSiteJsonLd } = await load();
  const out = buildWebSiteJsonLd({
    brandName: "Care24 Japan",
    siteUrl: "https://www.care24.jp",
    lang: "ja",
  });

  assert.deepEqual(out, {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Care24 Japan",
    url: "https://www.care24.jp",
    inLanguage: "ja",
  });
  assert.deepEqual(Object.keys(out), ["@context", "@type", "name", "url", "inLanguage"]);
});

test("the name follows the CMS value, not a hardcoded brand", async () => {
  const { buildWebSiteJsonLd } = await load();
  const a = buildWebSiteJsonLd({ brandName: "Alpha Care", siteUrl: "https://a.example", lang: "en" });
  const b = buildWebSiteJsonLd({ brandName: "Beta Care", siteUrl: "https://b.example", lang: "en" });
  assert.equal(a.name, "Alpha Care");
  assert.equal(b.name, "Beta Care");
  assert.notEqual(a.url, b.url);
});

test("url is the site origin even when the input carries a path or trailing slash", async () => {
  const { buildWebSiteJsonLd } = await load();
  const out = buildWebSiteJsonLd({
    brandName: "Care24 Japan",
    siteUrl: "https://www.care24.jp/",
    lang: "en",
  });
  assert.equal(out.url, "https://www.care24.jp");
});

test("a missing or blank brand name throws instead of falling back", async () => {
  const { buildWebSiteJsonLd } = await load();
  assert.throws(
    () => buildWebSiteJsonLd({ brandName: "", siteUrl: "https://www.care24.jp", lang: "ja" }),
    /brand name/,
  );
  assert.throws(
    () => buildWebSiteJsonLd({ brandName: "   ", siteUrl: "https://www.care24.jp", lang: "ja" }),
    /brand name/,
  );
});

test("a malformed or non-http site URL throws", async () => {
  const { buildWebSiteJsonLd } = await load();
  assert.throws(
    () => buildWebSiteJsonLd({ brandName: "Care24 Japan", siteUrl: "not a url", lang: "ja" }),
    /absolute site URL/,
  );
  assert.throws(
    () => buildWebSiteJsonLd({ brandName: "Care24 Japan", siteUrl: "javascript:alert(1)", lang: "ja" }),
    /http\(s\)/,
  );
});

test("a blank language code throws", async () => {
  const { buildWebSiteJsonLd } = await load();
  assert.throws(
    () => buildWebSiteJsonLd({ brandName: "Care24 Japan", siteUrl: "https://www.care24.jp", lang: " " }),
    /language/,
  );
});
