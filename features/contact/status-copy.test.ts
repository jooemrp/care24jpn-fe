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
  const { contactResultFromUpstream, statusCopyFor } = m;
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
    assert.equal(
      statusCopyFor({ status: "success" }, "ja", table),
      table.success.ja,
    );
    assert.equal(
      statusCopyFor({ status: "success" }, "en", table),
      table.success.en,
    );
  });

  test("too_fast uses detail copy instead of opaque CMS error", () => {
    const result = {
      status: "error" as const,
      code: "too_fast" as const,
      message: "please wait",
    };
    assert.match(statusCopyFor(result, "en", table), /too fast/i);
    assert.match(statusCopyFor(result, "ja", table), /早すぎ/);
  });

  test("rate_limited status returns detail copy", () => {
    const result = {
      status: "rate_limited" as const,
      code: "rate_limited" as const,
      message: "too many",
    };
    assert.match(statusCopyFor(result, "en", table), /Too many/i);
  });

  test("classifies upstream timing reject", () => {
    const result = contactResultFromUpstream(
      400,
      JSON.stringify({
        success: false,
        message: "invalid input provided: please wait a few seconds before submitting",
      }),
    );
    assert.deepEqual(result, {
      status: "error",
      code: "too_fast",
      message: "That was too fast. Please wait a few seconds and try again.",
    });
  });

  test("classifies upstream origin reject", () => {
    const result = contactResultFromUpstream(
      400,
      JSON.stringify({
        success: false,
        message: "invalid input provided: request origin is not allowed",
      }),
    );
    assert.equal(result.status, "error");
    if (result.status === "error") assert.equal(result.code, "origin");
  });

  test("classifies 429 as rate_limited", () => {
    const result = contactResultFromUpstream(
      429,
      JSON.stringify({ success: false, message: "too many submissions" }),
    );
    assert.equal(result.status, "rate_limited");
  });
}

void main();
