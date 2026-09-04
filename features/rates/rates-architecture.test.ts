import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolve } from "node:path";

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("rates action stays on the strict CMS result path", () => {
  const action = source("features/rates/actions.ts");

  assert.match(action, /^"use server";/);
  assert.match(action, /getRatesStrict/);
  assert.doesNotMatch(action, /getCourseRates|getSupporterRates/);
});

test("pricing and fees use one shared client query key and hook", () => {
  const hooks = source("features/rates/hooks.ts");
  const view = source("features/rates/components/RatesView.tsx");

  assert.match(hooks, /queryKeys\.rates/);
  assert.match(hooks, /getRates/);
  assert.match(view, /useRatesQuery/);
  assert.match(view, /mode: "pricing"/);
  assert.match(view, /mode: "fees"/);
});

test("rates routes hydrate the same server snapshot used for pricing JSON-LD", () => {
  const pricing = source("app/[lang]/pricing/page.tsx");
  const fees = source("app/[lang]/fees/page.tsx");

  for (const route of [pricing, fees]) {
    assert.match(route, /CmsQueryBoundary/);
    assert.match(route, /queryKeys\.rates/);
    assert.doesNotMatch(route, /getCourseRates|getSupporterRates/);
  }

  assert.match(pricing, /buildPricingJsonLd/);
  assert.match(pricing, /rates\.courseRates/);
});
