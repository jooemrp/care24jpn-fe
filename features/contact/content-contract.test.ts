/**
 * Contract coverage for the FAQ/contact content boundary.
 *
 * Run: `node --test features/contact/content-contract.test.ts`
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import type * as ContentContractModule from "./content-contract.ts";

const contentContractPath = "./content-contract" + ".ts";

function readOwned(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("FAQ and contact routes use strict CMS query boundaries", () => {
  const faqPage = readOwned("app/[lang]/faq/page.tsx");
  const contactPage = readOwned("app/[lang]/contact/page.tsx");

  for (const [page, view, loader] of [
    [faqPage, "FaqView", "getFaqContent"],
    [contactPage, "ContactView", "getContactContent"],
  ] as const) {
    assert.match(page, /CmsQueryBoundary/);
    assert.match(page, new RegExp(view));
    assert.match(page, new RegExp(loader));
    assert.match(page, /queryKeys\./);
    assert.doesNotMatch(page, /CmsContractNotice|missingBackendContentNotice/);
    assert.doesNotMatch(page, /@\/constants\/faq|@\/constants\/contact/);
  }
});

test("ContactForm receives its placeholder from CMS content", () => {
  const form = readOwned("components/contact/ContactForm.tsx");

  assert.match(form, /content\.categoryPlaceholder/);
  assert.doesNotMatch(form, /選択してください|Please select/);
  assert.doesNotMatch(form, /from ["']@\/constants\/contact/);
});

test("FAQ and contact components stay responsive and light-only", () => {
  const faqList = readOwned("components/faq/FaqList.tsx");
  const contactForm = readOwned("components/contact/ContactForm.tsx");

  for (const component of [faqList, contactForm]) {
    assert.doesNotMatch(component, /\bdark:/);
    assert.match(component, /\bmd:/);
  }
});

test("CMS contracts name the published FAQ and contact block types", async () => {
  const { faqContentContract, contactContentContract } =
    (await import(contentContractPath)) as typeof ContentContractModule;

  assert.deepEqual(
    faqContentContract.contentTypes.map(({ slug }) => slug),
    ["page-hero", "faq-page", "faq-category", "faq-item"],
  );
  assert.deepEqual(
    contactContentContract.contentTypes.map(({ slug }) => slug),
    [
      "page-hero",
      "contact-phone-card",
      "contact-form-card",
      "contact-form-fields",
      "contact-category",
      "contact-page",
    ],
  );
});
