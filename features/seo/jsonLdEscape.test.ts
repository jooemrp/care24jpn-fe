/**
 * Tests for features/seo/jsonLdEscape.ts — the `<script
 * type="application/ld+json">` break-out fix for components/JsonLd.tsx.
 *
 * Run (from marketing-web/):
 *   node --test features/seo/jsonLdEscape.test.ts
 *
 * PROVEN TO FAIL BEFORE THE FIX. `escapeJsonForScript` first shipped in this
 * file as a straight pass-through (`return JSON.stringify(value);`) — the
 * exact behaviour `components/JsonLd.tsx` had before this sub-task. Run
 * against that version, "a </script><img onerror=...> payload ... never
 * appears literally in the output" failed with:
 *
 *   AssertionError [ERR_ASSERTION]: false !== true
 *   (out.includes("</script>") was true)
 *
 * Only after `escapeJsonForScript` was changed to escape `<`/`>`/`&` did
 * this file go green.
 *
 * Same bootstrapping constraints as organization.test.ts / merge.test.ts:
 * relative specifiers need a literal `.ts` extension for Node's loader,
 * tsc's `bundler` moduleResolution rejects that in a STATIC import (TS5097),
 * so the specifier is built at runtime and imported dynamically inside
 * `main()`.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import type * as JsonLdEscapeModule from "./jsonLdEscape.ts";

const jsonLdEscapePath = "./jsonLdEscape" + ".ts";

async function main() {
  const { escapeJsonForScript } = (await import(
    jsonLdEscapePath
  )) as typeof JsonLdEscapeModule;

  // ---------------------------------------------------------------------
  // The actual attack this migration woke up: legalName (a company_row
  // value, editable in the dashboard) breaks out of the JSON-LD <script>.
  // ---------------------------------------------------------------------

  test("a </script><img onerror=...> payload in a CMS field never appears literally in the output", () => {
    const payload = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      legalName: "</script><img src=x onerror=alert(1)>",
    };
    const out = escapeJsonForScript(payload);
    assert.equal(out.includes("</script>"), false);
    assert.equal(out.includes("<img"), false);
    assert.equal(out.includes("<"), false);
    assert.equal(out.includes(">"), false);
  });

  test("& is escaped so an HTML entity inside the JSON can't be decoded before JSON.parse runs", () => {
    const out = escapeJsonForScript({ note: "Q&A, <b>&lt;script&gt;</b>" });
    assert.equal(out.includes("&"), false);
    assert.equal(out.includes("<"), false);
    assert.equal(out.includes(">"), false);
  });

  // ---------------------------------------------------------------------
  // The escape must be reversible: an HTML parser sees safe bytes, but
  // JSON.parse on those same bytes must still yield the exact original
  // value — this is \uXXXX escaping, not corruption.
  // ---------------------------------------------------------------------

  test("the escaped output still JSON.parses back to the exact original value", () => {
    const payload = {
      legalName: "</script><img src=x onerror=alert(1)>&amp;co",
      note: "a & b < c > d",
      nested: { addressLocality: "Chiyoda-ku", tags: ["<x>", "y&z"] },
    };
    const out = escapeJsonForScript(payload);
    assert.deepEqual(JSON.parse(out), payload);
  });

  test("ordinary ASCII content with no special characters is unaffected", () => {
    const payload = {
      "@type": "LocalBusiness",
      name: "Care 24 Japan",
      telephone: "0120-000-000",
    };
    const out = escapeJsonForScript(payload);
    assert.deepEqual(JSON.parse(out), payload);
    assert.equal(out.includes("\\u003c"), false);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
