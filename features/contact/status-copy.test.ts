/**
 * Tests for features/contact/status-copy.ts.
 *
 * Run (from marketing-web/): `node --test features/contact/status-copy.test.ts`
 * — the suite also runs inside `npm test` (the find glob picks up any
 * `*.test.ts` under features/).
 *
 * status-copy.ts is deliberately import-free, so this test can run under
 * plain `node` without the `@/` path aliases only Next's bundler resolves.
 *
 * Same bootstrapping constraints as i18n.test.ts / fields.test.ts: relative
 * specifiers need a literal `.ts` extension for Node's loader, and tsc's
 * `bundler` moduleResolution rejects that in a STATIC value import (TS5097),
 * so the value import is resolved dynamically inside `main()` (type-only
 * imports above are erased and therefore allowed to keep the `.ts`).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import type * as StatusCopyModule from "./status-copy.ts";

const modulePath = "./status-copy" + ".ts";

async function main() {
  const m = (await import(modulePath)) as typeof StatusCopyModule;
  const { statusCopyFor } = m;
  type ContactStatusTable = StatusCopyModule.ContactStatusTable;

  const table: ContactStatusTable = {
    sending: { ja: "送信中…", en: "Sending…" },
    success: { ja: "ok", en: "ok" },
    error: { ja: "err", en: "err" },
    rateLimited: { ja: "rate", en: "rate" },
  };

  test("sending status returns localized copy", () => {
    assert.equal(statusCopyFor("sending", "ja", table), table.sending.ja);
    assert.equal(statusCopyFor("sending", "en", table), table.sending.en);
  });

  test("success status returns localized copy", () => {
    assert.equal(statusCopyFor("success", "ja", table), table.success.ja);
    assert.equal(statusCopyFor("success", "en", table), table.success.en);
  });

  test("error status returns localized copy", () => {
    assert.equal(statusCopyFor("error", "ja", table), table.error.ja);
    assert.equal(statusCopyFor("error", "en", table), table.error.en);
  });

  test("rate_limited status returns localized copy", () => {
    assert.equal(statusCopyFor("rate_limited", "ja", table), table.rateLimited.ja);
    assert.equal(statusCopyFor("rate_limited", "en", table), table.rateLimited.en);
  });
}

void main();
