import assert from "node:assert/strict";
import { test } from "node:test";
import type * as QueryKeysModule from "./query-keys.ts";

const queryKeysPath = "./query-keys" + ".ts";

async function main(): Promise<void> {
  const { queryKeys } = (await import(queryKeysPath)) as typeof QueryKeysModule;

  test("query keys remain stable and distinct across supported resources", () => {
    assert.strictEqual(queryKeys.site, queryKeys.site);
    assert.strictEqual(queryKeys.home, queryKeys.home);
    assert.strictEqual(queryKeys.useCase, queryKeys.useCase);
    assert.strictEqual(queryKeys.serviceFlow, queryKeys.serviceFlow);
    assert.strictEqual(queryKeys.company, queryKeys.company);
    assert.strictEqual(queryKeys.rates, queryKeys.rates);
    assert.strictEqual(queryKeys.pricing, queryKeys.pricing);
    assert.strictEqual(queryKeys.fees, queryKeys.fees);
    assert.strictEqual(queryKeys.contact.submit, queryKeys.contact.submit);

    const keys = [
      queryKeys.site,
      queryKeys.home,
      queryKeys.useCase,
      queryKeys.serviceFlow,
      queryKeys.company,
      queryKeys.rates,
      queryKeys.pricing,
      queryKeys.fees,
      queryKeys.contact.submit,
    ];

    assert.equal(new Set(keys.map((key) => JSON.stringify(key))).size, keys.length);
  });

  test("legal heading keys include the requested page slug", () => {
    assert.deepEqual(queryKeys.legalHeading("legal-tokushoho"), [
      "legal-heading",
      "legal-tokushoho",
    ]);
    assert.notDeepEqual(
      queryKeys.legalHeading("legal-privacy"),
      queryKeys.legalHeading("legal-tokushoho"),
    );
  });
}

void main();
