/**
 * Tests for `features/cms/legal-select.ts#selectLegalFields` — the pure tail
 * of `legal.ts#readLegalFields`.
 *
 * Run (from marketing-web/):
 *   npx tsx features/cms/legal-select.test.ts
 *
 * WHY THIS FILE IMPORTS `./legal-select`, NOT `./legal`. `legal.ts` opens
 * with `import "server-only"`, which — same as `client.ts` (see
 * `merge.test.ts`'s header) and `site.ts` (see `site.test.ts`'s header) — is
 * not a real installed package outside Next's own bundler.
 * `node --test`/`npx tsx` on `features/cms/legal.ts` fails immediately with
 * `Cannot find module 'server-only'`. `legal-select.ts` is the pure,
 * dependency-free half `merge.ts`/`site-map.ts`/`pages-map.ts` established
 * the pattern for — this file imports `selectLegalFields` from it FOR REAL,
 * nothing below is a copy of production logic.
 *
 * WHY `npx tsx`, NOT PLAIN `node --test` (unlike fields.test.ts/
 * merge.test.ts). `legal-select.ts` genuinely needs `./fields`'s
 * `mapBlocksByType`/`pick` AT RUNTIME, and that stays an ordinary
 * extensionless relative specifier so Next's bundler and `tsc`
 * (`moduleResolution: "bundler"`, no `allowImportingTsExtensions`) keep
 * resolving it normally. Node's native ESM loader has no
 * extensionless-relative-specifier resolution — verified directly against
 * this checkout:
 *
 *   $ node --test features/cms/legal-select.test.ts
 *   Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../features/cms/fields'
 *
 * `tsx` resolves it (extensions via esbuild), so this file runs correctly
 * only under `tsx` — same split `site.test.ts`/`pages-map.test.ts` already
 * document. `package.json#test` must run this file via `npx tsx`, after the
 * other tsx-tail files.
 *
 * ---------------------------------------------------------------------------
 * PROVEN RED — captured 2026-08-21 by temporarily editing
 * `legal-select.ts#selectLegalFields`, running
 * `npx tsx features/cms/legal-select.test.ts`, then reverting the file back
 * (no `git apply -R` — this checkout has no `.git`; the revert was a second,
 * manual `Edit` immediately undone):
 *
 * (tc-9) removed the `heading.ja.trim() === "" || heading.en.trim() === ""`
 * half of the guard, keeping only `!heading || !body`:
 *
 *   ✖ empty JA heading is rejected, exactly like an empty body already is
 *     AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
 *
 *     null !== { heading: { ja: '', en: 'Privacy Policy' }, body: { ja: 'body-ja', en: 'body-en' } }
 *
 *   ✖ empty EN heading is rejected, exactly like an empty body already is
 *     AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
 *
 *     null !== { heading: { ja: 'プライバシーポリシー', en: '' }, body: { ja: 'body-ja', en: 'body-en' } }
 *
 *   ✖ whitespace-only JA heading is rejected the same way an empty one is
 *     AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
 *
 *     null !== { heading: { ja: '   ', en: 'Privacy Policy' }, body: { ja: 'body-ja', en: 'body-en' } }
 *
 * (tc-10) changed `mapBlocksByType(...)`/`groups?.["legal-doc"][0]` back to
 * `blocks[0]` (the pre-run code, D-4):
 *
 *   ✖ the legal-doc block is selected by content-type slug, never by array position
 *     AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
 *     + actual - expected
 *
 *     + null
 *     - {
 *     -   body: {
 *     -     en: 'real-body-en',
 *     -     ja: 'real-body-ja'
 *     -   },
 *     -   heading: {
 *     -     en: 'real-heading-en',
 *     -     ja: 'real-heading-ja'
 *     -   }
 *     - }
 *
 *   ✖ no legal-doc block at all -> null (constants fallback), with a fallback report
 *     AssertionError [ERR_ASSERTION]: mapBlocksByType must report the missing legal-doc block type
 *     false !== true
 * ---------------------------------------------------------------------------
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import type { Bilingual, CmsBlock } from "./types";
import type * as LegalSelectModule from "./legal-select.ts";

/** Built at runtime so the literal `.ts` specifier stays out of tsc's static
 * resolution (TS5097) while Node's loader still gets the extension it
 * needs — same trick as site.test.ts / pages-map.test.ts. */
const legalSelectPath = "./legal-select" + ".ts";

function bi(ja: string, en: string): Bilingual {
  return { ja, en };
}

function legalDocBlock(position: number, data: Record<string, unknown>): CmsBlock {
  return {
    id: `legal-doc-${position}`,
    type: "legal-doc",
    blockTypeId: "uuid-of-legal-doc",
    parentId: null,
    position,
    data,
  };
}

async function main(): Promise<void> {
  const legalSelect = (await import(legalSelectPath)) as typeof LegalSelectModule;
  const { selectLegalFields } = legalSelect;
  const wellFormedBody = () => bi("body-ja", "body-en");

  // ---------------------------------------------------------------------------
  // tc-9: an empty/whitespace-only heading must be rejected exactly like an
  // empty body already is (both fall back to constants/legal.ts).
  // ---------------------------------------------------------------------------

  test("both headings present -> a real object, not null", () => {
    const blocks = [
      legalDocBlock(0, {
        heading: bi("プライバシーポリシー", "Privacy Policy"),
        body: wellFormedBody(),
      }),
    ];
    const result = selectLegalFields("legal-privacy", blocks, "getLegalDoc");
    assert.deepEqual(result, {
      heading: bi("プライバシーポリシー", "Privacy Policy"),
      body: wellFormedBody(),
    });
  });

  test("empty JA heading is rejected, exactly like an empty body already is", () => {
    const blocks = [
      legalDocBlock(0, { heading: bi("", "Privacy Policy"), body: wellFormedBody() }),
    ];
    assert.throws(() => selectLegalFields("legal-privacy", blocks, "getLegalDoc"));
  });

  test("empty EN heading is rejected, exactly like an empty body already is", () => {
    const blocks = [
      legalDocBlock(0, { heading: bi("プライバシーポリシー", ""), body: wellFormedBody() }),
    ];
    assert.throws(() => selectLegalFields("legal-privacy", blocks, "getLegalDoc"));
  });

  test("whitespace-only JA heading is rejected the same way an empty one is", () => {
    const blocks = [
      legalDocBlock(0, { heading: bi("   ", "Privacy Policy"), body: wellFormedBody() }),
    ];
    assert.throws(() => selectLegalFields("legal-privacy", blocks, "getLegalDoc"));
  });

  // ---------------------------------------------------------------------------
  // tc-10: the `legal-doc` block is selected by content-type SLUG, never by
  // array position — a decoy block at index 0 must not be read as the
  // document.
  // ---------------------------------------------------------------------------

  test("the legal-doc block is selected by content-type slug, never by array position", () => {
    const decoy: CmsBlock = {
      id: "decoy-0",
      type: "page-hero", // some other block type this reader doesn't expect
      blockTypeId: "uuid-of-page-hero",
      parentId: null,
      position: 0,
      data: { heading: bi("decoy-ja", "decoy-en") },
    };
    const real = legalDocBlock(1, {
      heading: bi("real-heading-ja", "real-heading-en"),
      body: bi("real-body-ja", "real-body-en"),
    });

    const result = selectLegalFields("legal-privacy", [decoy, real], "getLegalDoc");
    assert.deepEqual(result, {
      heading: bi("real-heading-ja", "real-heading-en"),
      body: bi("real-body-ja", "real-body-en"),
    });
  });

  test("no legal-doc block at all is rejected", () => {
    const decoy: CmsBlock = {
      id: "decoy-0",
      type: "page-hero",
      blockTypeId: "uuid-of-page-hero",
      parentId: null,
      position: 0,
      data: { heading: bi("decoy-ja", "decoy-en") },
    };
    assert.throws(() => selectLegalFields("legal-privacy", [decoy], "getLegalDoc"));
  });
}

void main();
