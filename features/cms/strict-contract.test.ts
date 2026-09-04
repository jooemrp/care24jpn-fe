import assert from "node:assert/strict";
import { test } from "node:test";
import type * as FieldsModule from "./fields.ts";
import type * as ErrorsModule from "./errors.ts";
import type * as SiteMapModule from "./site-map.ts";

const fieldsPath = "./fields" + ".ts";
const errorsPath = "./errors" + ".ts";
const siteMapPath = "./site-map" + ".ts";

function bi(ja: string, en: string) {
  return { ja, en };
}

async function main(): Promise<void> {
  const fields = (await import(fieldsPath)) as typeof FieldsModule;
  const errors = (await import(errorsPath)) as typeof ErrorsModule;

  test("field module exposes no constant or public-asset fallback pickers", () => {
    for (const legacyPicker of [
      "pickJa",
      "pickBi",
      "pickBiOptional",
      "pickLines",
      "pickJaLines",
      "pickNumber",
      "pickImage",
    ]) {
      assert.equal(
        legacyPicker in fields,
        false,
        `${legacyPicker} must not remain a runtime fallback API`,
      );
    }
  });

  test("required bilingual fields reject missing and incomplete CMS values", () => {
    assert.deepEqual(fields.requiredBi({ title: bi("見出し", "Heading") }, "title", "home/hero"), {
      ja: "見出し",
      en: "Heading",
    });

    for (const data of [
      {},
      { title: undefined },
      { title: bi("", "Heading") },
      { title: bi("見出し", "   ") },
      { title: { ja: "見出し" } },
    ]) {
      assert.throws(
        () => fields.requiredBi(data, "title", "home/hero"),
        (error: unknown) =>
          error instanceof errors.CmsContentError &&
          error.code === "CMS_MISSING_REQUIRED_FIELD" &&
          error.fields.includes("home/hero.title"),
      );
    }
  });

  test("required URLs reject absent, relative, and raw media-id values", () => {
    assert.equal(
      fields.requiredUrl(
        { href: bi("https://example.com/app", "https://example.com/app") },
        "href",
        "home/apply",
      ),
      "https://example.com/app",
    );

    for (const value of [undefined, bi("", ""), bi("portal/register", "portal/register")]) {
      assert.throws(
        () => fields.requiredUrl({ href: value }, "href", "home/apply"),
        (error: unknown) =>
          error instanceof errors.CmsContentError &&
          error.code === "CMS_INVALID_REQUIRED_FIELD",
      );
    }
  });

  test("required images never substitute a bundled asset", () => {
    assert.equal(
      fields.requiredImageUrl(
        { image: bi("https://cdn.example.com/hero.webp", "https://cdn.example.com/hero.webp") },
        "image",
        "home/hero",
      ),
      "https://cdn.example.com/hero.webp",
    );

    assert.throws(
      () =>
        fields.requiredImageUrl(
          { image: bi("01a01e63-raw-media-id", "01a01e63-raw-media-id") },
          "image",
          "home/hero",
        ),
      (error: unknown) =>
        error instanceof errors.CmsContentError &&
        error.code === "CMS_INVALID_REQUIRED_FIELD",
    );
  });

  test("required numbers reject malformed CMS values instead of using an old rate", () => {
    assert.equal(fields.requiredNumber({ price: 3740 }, "price", "rates/care/day"), 3740);
    assert.throws(
      () => fields.requiredNumber({ price: "old constant" }, "price", "rates/care/day"),
      (error: unknown) =>
        error instanceof errors.CmsContentError &&
        error.code === "CMS_INVALID_REQUIRED_FIELD" &&
        error.fields.includes("rates/care/day.price"),
    );
  });

  test("required block groups reject an empty page and missing declared types", () => {
    const block = {
      id: "hero",
      type: "page-hero",
      blockTypeId: "hero-type",
      parentId: null,
      position: 0,
      data: {},
    };

    assert.throws(
      () => fields.mapBlocksByType("company", [], ["page-hero"] as const),
      (error: unknown) =>
        error instanceof errors.CmsContentError &&
        error.code === "CMS_MISSING_REQUIRED_BLOCK",
    );
    assert.throws(
      () => fields.mapBlocksByType("company", [block], ["page-hero", "company-row"] as const),
      (error: unknown) =>
        error instanceof errors.CmsContentError &&
        error.fields.includes("company.company-row"),
    );
  });

  test("site mapping rejects a missing CMS field instead of using constants", async () => {
    const siteMap = (await import(siteMapPath)) as typeof SiteMapModule;
    const blocks = [
      {
        id: "brand",
        type: "site-brand",
        blockTypeId: "brand-type",
        parentId: null,
        position: 0,
        data: {
          name: bi("Care 24", "Care 24"),
          logo: bi("https://cdn.example.com/logo.png", "https://cdn.example.com/logo.png"),
          logo_alt: bi("Logo", "Logo"),
          tagline: bi("Tagline", "Tagline"),
        },
      },
    ];

    assert.throws(
      () => (siteMap.mapSite as unknown as (value: typeof blocks) => unknown)(blocks),
      (error: unknown) =>
        error instanceof errors.CmsContentError &&
        error.code === "CMS_MISSING_REQUIRED_BLOCK",
    );
  });
}

void main();
