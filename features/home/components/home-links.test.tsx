import assert from "node:assert/strict";
import { test } from "node:test";
import type * as HomeLinksModule from "./HomeLinks.tsx";

const homeLinksPath = "./HomeLinks" + ".tsx";

async function main(): Promise<void> {
  const { isSafeExternalHref, safeLocalizedHref } = (await import(
    homeLinksPath
  )) as typeof HomeLinksModule;

  test("only http(s) CMS URLs are treated as external CTAs", () => {
    assert.equal(isSafeExternalHref("https://portal.care24.jp/register"), true);
    assert.equal(isSafeExternalHref("http://localhost:3000/register"), true);
    assert.equal(isSafeExternalHref("javascript:alert(1)"), false);
    assert.equal(isSafeExternalHref("data:text/html,unsafe"), false);
  });

  test("internal CTA paths localize while fragments stay same-page links", () => {
    assert.equal(safeLocalizedHref("/pricing", "en"), "/en/pricing");
    assert.equal(safeLocalizedHref("/pricing", "ja"), "/pricing");
    assert.equal(safeLocalizedHref("#contact", "en"), "#contact");
  });

  test("invalid CTA schemes fail closed with a typed CMS error", () => {
    for (const href of ["javascript:alert(1)", "not-a-route", "//unsafe.example.test/path"]) {
      assert.throws(
        () => safeLocalizedHref(href, "en"),
        (error: unknown) =>
          error instanceof Error &&
          error.name === "CmsContentError" &&
          error.message.includes("not a valid"),
      );
    }
  });
}

void main();
