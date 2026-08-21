/**
 * Tests for features/lang/i18n.ts.
 *
 * Run (from marketing-web/):
 *   node --test features/lang/i18n.test.ts
 *
 * Covers `langFromPathname` (ST-F1's pure helper, so app/[lang]/error.tsx —
 * which the error.js contract gives no `params` prop at all — can derive
 * the active language from `usePathname()` the same way proxy.ts and
 * localizeHref already do) and `localizeHref` itself: the sole enforcer of
 * "ja has no URL prefix, en does" for every internal href in the app. It
 * had no direct test before this file was extended, despite four separate
 * call sites relying on its exact contract (locale-prefixing, external/
 * anchor pass-through, root-path shape).
 *
 * Same bootstrapping constraints as fields.test.ts / merge.test.ts /
 * organization.test.ts: relative specifiers need a literal `.ts`
 * extension for Node's loader, tsc's `bundler` moduleResolution rejects
 * that in a STATIC import (TS5097), so the specifier is built at runtime
 * and imported dynamically inside `main()`.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import type * as I18nModule from "./i18n.ts";

const i18nPath = "./i18n" + ".ts";

async function main() {
  const { langFromPathname, localizeHref } =
    (await import(i18nPath)) as typeof I18nModule;

  test("bare root path is ja (the default, prefix-less locale)", () => {
    assert.equal(langFromPathname("/"), "ja");
  });

  test("empty string is ja", () => {
    assert.equal(langFromPathname(""), "ja");
  });

  test("/en is en", () => {
    assert.equal(langFromPathname("/en"), "en");
  });

  test("/en/ (trailing slash) is en", () => {
    assert.equal(langFromPathname("/en/"), "en");
  });

  test("/pricing (no prefix) is ja", () => {
    assert.equal(langFromPathname("/pricing"), "ja");
  });

  test("/en/pricing is en", () => {
    assert.equal(langFromPathname("/en/pricing"), "en");
  });

  test("/english-something is ja, NOT en — the first path segment must match 'en' exactly", () => {
    assert.equal(langFromPathname("/english-something"), "ja");
  });

  // --- localizeHref ---------------------------------------------------

  test("ja (default) leaves an internal path prefix-less", () => {
    assert.equal(localizeHref("/service-flow", "ja"), "/service-flow");
  });

  test("en prefixes an internal path with /en", () => {
    assert.equal(localizeHref("/service-flow", "en"), "/en/service-flow");
  });

  test("root path for ja stays '/'", () => {
    assert.equal(localizeHref("/", "ja"), "/");
  });

  test("root path for en becomes '/en' (no trailing slash)", () => {
    assert.equal(localizeHref("/", "en"), "/en");
  });

  test("an already-/ja-prefixed path is normalized, not double-prefixed", () => {
    assert.equal(localizeHref("/ja/pricing", "en"), "/en/pricing");
    assert.equal(localizeHref("/ja/pricing", "ja"), "/pricing");
  });

  test("an already-/en-prefixed path is normalized, not double-prefixed", () => {
    assert.equal(localizeHref("/en/pricing", "en"), "/en/pricing");
    assert.equal(localizeHref("/en/pricing", "ja"), "/pricing");
  });

  test("bare '/ja' and '/en' roots both collapse to the bare root", () => {
    assert.equal(localizeHref("/ja", "ja"), "/");
    assert.equal(localizeHref("/ja", "en"), "/en");
    assert.equal(localizeHref("/en", "ja"), "/");
    assert.equal(localizeHref("/en", "en"), "/en");
  });

  test("a path+hash keeps its hash and localizes only the path", () => {
    assert.equal(localizeHref("/pricing#plans", "en"), "/en/pricing#plans");
    assert.equal(localizeHref("/pricing#plans", "ja"), "/pricing#plans");
  });

  test("a hash on the root path is appended directly, without a slash before it", () => {
    assert.equal(localizeHref("/#contact", "en"), "/en#contact");
    assert.equal(localizeHref("/#contact", "ja"), "/#contact");
  });

  test("a pure fragment ('#contact') is returned untouched for either lang", () => {
    assert.equal(localizeHref("#contact", "en"), "#contact");
    assert.equal(localizeHref("#contact", "ja"), "#contact");
  });

  test("an external https:// URL is returned untouched for either lang", () => {
    assert.equal(
      localizeHref("https://portal.care24.jp/register", "en"),
      "https://portal.care24.jp/register",
    );
    assert.equal(
      localizeHref("https://portal.care24.jp/register", "ja"),
      "https://portal.care24.jp/register",
    );
  });

  test("tel:, mailto:, and protocol-relative (//) hrefs are returned untouched", () => {
    assert.equal(localizeHref("tel:0120000000", "en"), "tel:0120000000");
    assert.equal(localizeHref("mailto:info@care24.jp", "en"), "mailto:info@care24.jp");
    assert.equal(localizeHref("//cdn.example.com/asset", "en"), "//cdn.example.com/asset");
  });

  // N3 regression: this is exactly what made the raw `home.apply.*.href`
  // passed straight to ApplyBanner dangerous once that href became
  // CMS-editable. If an editor points it at an internal route like
  // "/service-flow" (today it happens to be an external portal URL, so the
  // bug was silent), an /en visitor must NOT be sent to the ja page.
  test("an editor-supplied internal href is NOT left bare for a non-default lang", () => {
    const cmsHref = "/service-flow";
    const localized = localizeHref(cmsHref, "en");
    assert.notEqual(
      localized,
      cmsHref,
      "internal href must gain the /en prefix, not stay bare, for lang=en",
    );
    assert.equal(localized, "/en/service-flow");
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
