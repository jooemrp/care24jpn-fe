/**
 * Tests for `features/cms/pages-map.ts` — the "company" and "service-flow"
 * loaders' block -> content mapping.
 *
 * Run (from marketing-web/):
 *   npx tsx features/cms/pages-map.test.ts
 *
 * WHY THIS FILE IMPORTS `./pages-map`, NOT `./pages`. `pages.ts` opens with
 * `import "server-only"`, which — same as `client.ts` (see `merge.test.ts`'s
 * header) and `site.ts` (see `site.test.ts`'s header) — is not a real
 * installed package outside Next's bundler.
 * `node --test`/`npx tsx` on `features/cms/pages.ts` fails immediately with
 * `Cannot find module 'server-only'`, before `@/constants/copy` or `react`'s
 * `cache()` even get a chance to resolve. `pages-map.ts` is the pure,
 * dependency-free half `merge.ts`/`site-map.ts` established the pattern
 * for — this file imports `mapCompany`/`mapServiceFlow` from it FOR REAL,
 * nothing below is a copy of production logic.
 *
 * WHY `npx tsx`, NOT PLAIN `node --test` (unlike fields.test.ts/
 * merge.test.ts). `pages-map.ts` genuinely needs `./fields`'s pickers and
 * `@/constants/copy`'s fallback data AT RUNTIME, and those stay ordinary
 * extensionless/`@/`-aliased specifiers so Next's bundler and `tsc`
 * (`moduleResolution: "bundler"`, no `allowImportingTsExtensions`) keep
 * resolving them normally. Node's native ESM loader has neither: no `@/`
 * path-alias support and no extensionless-relative-specifier resolution —
 * verified directly against this checkout:
 *
 *   $ node --test features/cms/pages-map.test.ts
 *   Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../features/cms/fields'
 *
 * `tsx` resolves both (path aliases via tsconfig, extensions via esbuild), so
 * this file runs correctly only under `tsx` — same split `site.test.ts`
 * already documents. `package.json#test` must run this file via `npx tsx`,
 * after the other tsx-tail files.
 *
 * ---------------------------------------------------------------------------
 * PROVEN RED — captured 2026-08-21 by temporarily reverting
 * `pages-map.ts#mapCompany`'s row mapping to the positional-fallback version
 * this test guards against (`label: pickBi(block.data, "label",
 * F.rows[i]?.label ?? EMPTY)`, `value` likewise), running
 * `npx tsx features/cms/pages-map.test.ts`, then reverting the file back
 * (no `git apply -R` — this checkout has no `.git`; the revert was a second,
 * manual `Edit` immediately undone):
 *
 *   ✖ fix: a row's own empty label never inherits a neighbour's constants label
 *     AssertionError [ERR_ASSERTION]: Expected "actual" not to be strictly deep-equal to:
 *
 *     {
 *       en: 'Head office',
 *       ja: '本社'
 *     }
 *
 *   ✖ fix: reordering company-row blocks never swaps which row's label/value appears where
 *     AssertionError [ERR_ASSERTION]: Expected "actual" not to be strictly deep-equal to:
 *
 *     {
 *       en: 'Trade name',
 *       ja: '商号'
 *     }
 *
 * (tc-8, `mapServiceFlow`) captured the same session by temporarily changing
 * `pages-map.ts#mapServiceFlow`'s `number` field to `String(i + 1)` (dropping
 * the `pickJa(block.data, "number", ...)` read entirely — the pre-G-5 code in
 * `StepFlow.tsx`):
 *
 *   ✖ step numbers come from each block's own `number` field, not from array/position order
 *     AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
 *     + actual - expected
 *
 *       [
 *     +   '1',
 *     +   '2',
 *     +   '3',
 *         '4',
 *     -   '3',
 *     -   '2',
 *     -   '1'
 *       ]
 * ---------------------------------------------------------------------------
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import type { Bilingual, CmsBlock } from "./types";
import type * as PagesMapModule from "./pages-map.ts";
import { company as fallbackCompany } from "@/constants/copy";

/** Built at runtime so the literal `.ts` specifier stays out of tsc's static
 * resolution (TS5097) while Node's loader still gets the extension it
 * needs — same trick as site.test.ts / merge.test.ts. */
const pagesMapPath = "./pages-map" + ".ts";

function bi(value: string): Bilingual {
  return { ja: value, en: `${value}-en` };
}

function block(type: string, position: number, data: Record<string, unknown>): CmsBlock {
  return {
    id: `${type}-${position}`,
    type,
    blockTypeId: `uuid-of-${type}`,
    parentId: null,
    position,
    data,
  };
}

async function main(): Promise<void> {
  const pagesMap = (await import(pagesMapPath)) as typeof PagesMapModule;
  const { mapCompany, mapServiceFlow } = pagesMap;
  const noop = () => {};

  // ---------------------------------------------------------------------------
  // tc-7: mapCompany — a row's own empty label/value must resolve to an
  // empty value, never to a DIFFERENT row's constants label/value borrowed by
  // array position.
  // ---------------------------------------------------------------------------

  const EMPTY: Bilingual = { ja: "", en: "" };
  const heroBlock = (heading: string) => block("page-hero", 0, { heading: bi(heading) });

  /** Three independent company rows, none of them matching
   * `constants/copy.ts#company.rows`' own content — the point is that a
   * dashboard editor's rows are free text, not required to line up with the
   * fallback array at all. Row B's `label` field is entirely absent
   * (an editor cleared it), everything else is present. */
  function liveOrderRows(): CmsBlock[] {
    return [
      block("company-row", 10, { label: bi("Row A Label"), value: bi("Row A Value") }),
      block("company-row", 11, { value: bi("Row B Value") }), // label cleared
      block("company-row", 12, { label: bi("Row C Label"), value: bi("Row C Value") }),
    ];
  }

  /** The SAME 3 row blocks, dragged into a different dashboard order — the
   * cleared-label row (Row B) now sorts to array index 0. `mapBlocksByType`
   * sorts each group by `position`, not by array-declaration order, so a
   * true dashboard reorder must swap `position` values (Atlas reassigns
   * `position` on every reorder) — swapping array order alone would never
   * exercise `mapCompany`'s own index (`rowBlocks.map((block, i) => ...)`),
   * which is computed AFTER the sort either way. */
  function reorderedRows(): CmsBlock[] {
    const [a, b, c] = liveOrderRows();
    return [
      { ...b, position: 10 },
      { ...a, position: 11 },
      { ...c, position: 12 },
    ];
  }

  function companyOf(rows: CmsBlock[]) {
    const result = mapCompany([heroBlock("Company"), ...rows], noop);
    assert.ok(result, "mapCompany must succeed for a full set of company blocks");
    return result;
  }

  test("fix: a row's own empty label never inherits a neighbour's constants label", () => {
    const result = companyOf(liveOrderRows());
    // Row B sorts to index 1. The pre-fix code read
    // `F.rows[1]?.label ?? EMPTY`, i.e. `fallbackCompany.rows[1].label`
    // ("Head office") — a completely unrelated row's constants text.
    assert.notDeepEqual(result.rows[1]?.label, fallbackCompany.rows[1]?.label);
    assert.deepEqual(result.rows[1]?.label, EMPTY);
    assert.deepEqual(result.rows[1]?.value, bi("Row B Value"));
  });

  test("fix: reordering company-row blocks never swaps which row's label/value appears where", () => {
    const reordered = companyOf(reorderedRows());
    const original = companyOf(liveOrderRows());

    // Row B (cleared label) now sorts to index 0. The pre-fix code read
    // `F.rows[0]?.label ?? EMPTY`, i.e. `fallbackCompany.rows[0].label`
    // ("Trade name") — the company's actual LEGAL trade name label, borrowed
    // by an unrelated row purely because of where it landed after a
    // dashboard drag.
    assert.notDeepEqual(reordered.rows[0]?.label, fallbackCompany.rows[0]?.label);
    assert.deepEqual(reordered.rows[0]?.label, EMPTY);
    assert.deepEqual(reordered.rows[0]?.value, bi("Row B Value"));

    // Every row's own content travels WITH it, keyed by its own `value`
    // (unaffected by the label bug, so a safe join key): reordering changes
    // array position only, never which label/value pair belongs to which row.
    const byValue = <T extends { value: Bilingual }>(rows: T[]) =>
      Object.fromEntries(rows.map((r) => [r.value.en, r]));
    assert.deepEqual(byValue(reordered.rows), byValue(original.rows));
  });

  // ---------------------------------------------------------------------------
  // tc-8: mapServiceFlow — a step's displayed `number` comes from the
  // block's own `number` field, never from its array/position index.
  // ---------------------------------------------------------------------------

  function serviceFlowHero(): CmsBlock {
    return block("page-hero", 0, { heading: bi("Flow"), body: bi("body"), cta_href: bi("/apply") });
  }

  test("step numbers come from each block's own `number` field, not from array/position order", () => {
    // Positions 1..4 (dashboard/array order), but each block's own `number`
    // field disagrees with that order on purpose — an in-order fixture would
    // pass against BOTH the fixed code and the pre-G-5 `i + 1` code, which is
    // exactly the trap this run's own accident report warns about.
    const stepBlocks = [
      block("service-flow-step", 1, { title: bi("t1"), body: bi("b1"), number: bi("4") }),
      block("service-flow-step", 2, { title: bi("t2"), body: bi("b2"), number: bi("3") }),
      block("service-flow-step", 3, { title: bi("t3"), body: bi("b3"), number: bi("2") }),
      block("service-flow-step", 4, { title: bi("t4"), body: bi("b4"), number: bi("1") }),
    ];

    const result = mapServiceFlow([serviceFlowHero(), ...stepBlocks], noop);
    assert.ok(result, "mapServiceFlow must succeed for a full set of service-flow blocks");
    assert.deepEqual(
      result.steps.map((s) => s.number),
      ["4", "3", "2", "1"],
    );
  });
}

void main();
