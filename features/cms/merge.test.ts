/**
 * Tests for features/cms/merge.ts — the raw `GET /pages/<slug>` body ->
 * `CmsBlock[]` transform.
 *
 * Run (from marketing-web/):
 *   node --test features/cms/merge.test.ts
 *
 * WHY THIS FILE MATTERS MORE THAN ITS SIZE SUGGESTS. `mergeBlockData`'s
 * empty-in-both-locales rule is the behaviour this migration flagged as its
 * #1 risk: an empty-but-present `{ ja: "", en: "" }` is TRUTHY, and three
 * call sites (`careCourse.fees[].note`, `rate_row.detail`, `hero.body`)
 * render conditionally on a field's mere presence. Get it wrong and the site
 * grows a stray empty `<dd>`, or a rate row silently moves from the "extras"
 * column to the "timed" column — with no error anywhere. Until this file
 * existed the rule lived only inside `client.ts`, which cannot be imported
 * outside the Next bundler (`server-only` is not a real installed package),
 * so nothing had ever executed it.
 *
 * Same bootstrapping constraints as fields.test.ts / legal-html.test.ts:
 * relative specifiers need a literal `.ts` extension for Node's loader,
 * tsc's `bundler` moduleResolution rejects that in a STATIC import (TS5097),
 * so the specifier is built at runtime and imported dynamically inside
 * `main()`.
 *
 * The page fixture at the bottom is not invented: its nesting, key names and
 * the fact that block `data` is a JSON STRING while `page.seo` is a real
 * object were all read off the live workspace
 * (`GET /api/v1/public/pages/company`).
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import type { RawPageResponse } from "./types";
import type * as MergeModule from "./merge.ts";

/** Built at runtime so the literal `.ts` specifier stays out of tsc's static
 * resolution (TS5097) while Node's loader still gets the extension it needs. */
const mergePath = "./merge" + ".ts";

async function main() {
  const { parseData, mergeBlockData, findEnTranslationData, shapePageBlocks } = (await import(
    mergePath
  )) as typeof MergeModule;

  // -------------------------------------------------------------------------
  // parseData — one corrupt block must never take down a whole page.
  // -------------------------------------------------------------------------

  test("parseData: absent input yields an empty object, not a throw", () => {
    assert.deepEqual(parseData(undefined), {});
    assert.deepEqual(parseData(null), {});
    assert.deepEqual(parseData(""), {});
  });

  test("parseData: a well-formed JSON object round-trips", () => {
    assert.deepEqual(parseData('{"heading":"運営会社","order":2}'), {
      heading: "運営会社",
      order: 2,
    });
  });

  test("parseData: malformed JSON degrades to {} instead of throwing", () => {
    assert.deepEqual(parseData("{not json"), {});
    assert.deepEqual(parseData('{"unterminated": "'), {});
  });

  test("parseData: valid JSON that is not an object degrades to {}", () => {
    // An array would satisfy `typeof x === "object"` and then break every
    // `Object.keys` consumer downstream in a much less obvious place.
    assert.deepEqual(parseData("[1,2,3]"), {});
    assert.deepEqual(parseData('"a string"'), {});
    assert.deepEqual(parseData("42"), {});
    assert.deepEqual(parseData("null"), {});
  });

  // -------------------------------------------------------------------------
  // mergeBlockData — THE #1 RISK. All four ja/en emptiness combinations.
  // -------------------------------------------------------------------------

  test("mergeBlockData: empty in BOTH locales becomes undefined, never {ja:'',en:''}", () => {
    const merged = mergeBlockData({ note: "" }, { note: "" });
    assert.equal(merged.note, undefined);
    // The point of the rule: the result must be FALSY, because call sites
    // render on presence alone. `{}` would pass `!!merged.note`.
    assert.equal(Boolean(merged.note), false);
    // The key still exists — only its value is undefined. Loaders read by
    // key, so dropping the key entirely is a different (also acceptable)
    // shape; this pins the one we actually produce.
    assert.equal("note" in merged, true);
  });

  test("mergeBlockData: empty ja + non-empty en stays present", () => {
    assert.deepEqual(mergeBlockData({ note: "" }, { note: "Cleaning only" }), {
      note: { ja: "", en: "Cleaning only" },
    });
  });

  test("mergeBlockData: non-empty ja + empty en stays present", () => {
    assert.deepEqual(mergeBlockData({ note: "掃除のみ" }, { note: "" }), {
      note: { ja: "掃除のみ", en: "" },
    });
  });

  test("mergeBlockData: non-empty in both is the ordinary localizable case", () => {
    assert.deepEqual(mergeBlockData({ heading: "運営会社" }, { heading: "Company" }), {
      heading: { ja: "運営会社", en: "Company" },
    });
  });

  test("mergeBlockData: a missing EN overlay mirrors ja into en", () => {
    // This is how NON-localizable strings (href, course_key, icon, tone, tel)
    // arrive — there is no EN row for them at all. Callers read `.ja`.
    assert.deepEqual(mergeBlockData({ href: "/pricing" }, {}), {
      href: { ja: "/pricing", en: "/pricing" },
    });
  });

  test("mergeBlockData: a non-string EN value is ignored, ja is mirrored", () => {
    // Defensive: an EN overlay is supposed to carry only strings. If it ever
    // carries something else, mirroring ja beats emitting `{ja:"x",en:5}`
    // into a `Bilingual`-typed slot.
    assert.deepEqual(mergeBlockData({ label: "料金" }, { label: 5 }), {
      label: { ja: "料金", en: "料金" },
    });
  });

  test("mergeBlockData: non-string fields pass through completely untouched", () => {
    // Wrapping a yen figure in {ja,en} would break formatYen()'s
    // toLocaleString — this is the reason for the typeof check.
    const nested = { a: 1 };
    const list = [1, 2];
    const merged = mergeBlockData(
      {
        customer_price: 3740,
        featured: true,
        cleared: null,
        list,
        nested,
      },
      {},
    );
    assert.equal(merged.customer_price, 3740);
    assert.equal(merged.featured, true);
    assert.equal(merged.cleared, null);
    // Same reference, not a copy — nothing rewrites non-strings.
    assert.equal(merged.list, list);
    assert.equal(merged.nested, nested);
  });

  test("mergeBlockData: a zero price survives (0 is not 'empty')", () => {
    // The emptiness rule is for STRINGS only. A guard written as `if (!value)`
    // instead of a typeof check would erase a legitimately free line item.
    const merged = mergeBlockData({ supporter_pay: 0 }, {});
    assert.equal(merged.supporter_pay, 0);
  });

  test("mergeBlockData: a translation-only field is not dropped", () => {
    assert.deepEqual(mergeBlockData({}, { subtitle: "Since 2024" }), {
      subtitle: { ja: "", en: "Since 2024" },
    });
  });

  test("mergeBlockData: a translation-only field empty in en is undefined too", () => {
    const merged = mergeBlockData({}, { subtitle: "" });
    assert.equal(merged.subtitle, undefined);
    assert.equal("subtitle" in merged, true);
  });

  test("mergeBlockData: a non-string translation-only field is skipped entirely", () => {
    const merged = mergeBlockData({}, { count: 3 });
    assert.equal("count" in merged, false);
  });

  test("mergeBlockData: an EN overlay never adds a key twice", () => {
    // `href` exists in both; the second loop must not overwrite the merged
    // value with the ja:"" translation-only shape.
    assert.deepEqual(mergeBlockData({ href: "/fees" }, { href: "/fees" }), {
      href: { ja: "/fees", en: "/fees" },
    });
  });

  test("mergeBlockData: inputs are not mutated", () => {
    const base = { heading: "運営会社" };
    const en = { heading: "Company" };
    mergeBlockData(base, en);
    assert.deepEqual(base, { heading: "運営会社" });
    assert.deepEqual(en, { heading: "Company" });
  });

  // -------------------------------------------------------------------------
  // findEnTranslationData — must match on BOTH block_id and locale.
  // -------------------------------------------------------------------------

  const translations = [
    { id: "t1", block_id: "b1", locale: "en", data: '{"heading":"Company"}' },
    { id: "t2", block_id: "b2", locale: "en", data: '{"heading":"Pricing"}' },
    { id: "t3", block_id: "b1", locale: "id", data: '{"heading":"Perusahaan"}' },
  ];

  test("findEnTranslationData: picks the row for this block in EN", () => {
    assert.deepEqual(findEnTranslationData("b1", translations), { heading: "Company" });
    assert.deepEqual(findEnTranslationData("b2", translations), { heading: "Pricing" });
  });

  test("findEnTranslationData: a non-EN locale for the same block is not used", () => {
    // Matching on block_id alone would return the "id" row for b1 here.
    const idOnly = [translations[2]];
    assert.deepEqual(findEnTranslationData("b1", idOnly), {});
  });

  test("findEnTranslationData: unknown block / absent list yields {}", () => {
    assert.deepEqual(findEnTranslationData("b9", translations), {});
    assert.deepEqual(findEnTranslationData("b1", undefined), {});
    assert.deepEqual(findEnTranslationData("b1", []), {});
  });

  // -------------------------------------------------------------------------
  // shapePageBlocks — the whole-response transform.
  // -------------------------------------------------------------------------

  /**
   * Shaped after the LIVE `GET /api/v1/public/pages/company` payload: `page`
   * is a sibling of `blocks` (not its parent), block `data` is a JSON string,
   * and `page.seo` is a real object.
   *
   * Blocks are deliberately out of `position` order in the array so the sort
   * is actually exercised rather than accidentally satisfied.
   */
  const livePage: RawPageResponse = {
    page: {
      id: "01a01d80-16ce-78b7-8191-f34e9d0e370d",
      slug: "company",
      status: "published",
      seo: { title: "運営会社", description: "", keywords: null },
    },
    blocks: [
      {
        id: "b2",
        block_type_id: "01a01d67-77d2-7bb7-a6d5-4491c100ca8f",
        type: "company-row",
        parent_id: null,
        position: 1,
        data: '{"label":"所在地","value":"東京都","order":1}',
      },
      {
        id: "b1",
        block_type_id: "01a01d67-70aa-7b22-b390-901cbd31aa64",
        type: "page-hero",
        parent_id: null,
        position: 0,
        data: '{"heading":"運営会社","body":""}',
      },
    ],
    block_translations: [
      { id: "t1", block_id: "b1", locale: "en", data: '{"heading":"Company","body":""}' },
      {
        id: "t2",
        block_id: "b2",
        locale: "en",
        data: '{"label":"Address","value":"Tokyo"}',
      },
    ],
  };

  test("shapePageBlocks: sorts by position, not array order", () => {
    const blocks = shapePageBlocks(livePage);
    assert.ok(blocks);
    assert.deepEqual(
      blocks.map((b) => b.id),
      ["b1", "b2"],
    );
  });

  test("shapePageBlocks: carries the readable type slug — the block's identity", () => {
    const blocks = shapePageBlocks(livePage);
    assert.ok(blocks);
    assert.deepEqual(
      blocks.map((b) => b.type),
      ["page-hero", "company-row"],
    );
    // The UUID is still forwarded, but nothing matches on it any more.
    assert.equal(blocks[0].blockTypeId, "01a01d67-70aa-7b22-b390-901cbd31aa64");
  });

  test("shapePageBlocks: parses stringified data and overlays the EN translation", () => {
    const blocks = shapePageBlocks(livePage);
    assert.ok(blocks);
    assert.deepEqual(blocks[0].data.heading, { ja: "運営会社", en: "Company" });
    assert.deepEqual(blocks[1].data.label, { ja: "所在地", en: "Address" });
    // `order` is a number in the source JSON and must stay one.
    assert.equal(blocks[1].data.order, 1);
  });

  test("shapePageBlocks: an empty-in-both field survives the full path as undefined", () => {
    // End-to-end version of the #1 risk: `page-hero.body` is empty in ja AND
    // en on the live page, and `PageHero` renders `{body && <p>}`.
    const blocks = shapePageBlocks(livePage);
    assert.ok(blocks);
    assert.equal(blocks[0].data.body, undefined);
  });

  test("shapePageBlocks: a block with no type slug becomes '' and matches nothing", () => {
    const blocks = shapePageBlocks({
      blocks: [
        {
          id: "b1",
          block_type_id: "uuid",
          parent_id: null,
          position: 0,
          data: "{}",
        },
      ],
    });
    assert.ok(blocks);
    assert.equal(blocks[0].type, "");
  });

  test("shapePageBlocks: an unparseable block data string yields {} not a crash", () => {
    const blocks = shapePageBlocks({
      blocks: [
        { id: "b1", block_type_id: "u", type: "page-hero", parent_id: null, position: 0, data: "{" },
      ],
    });
    assert.ok(blocks);
    assert.deepEqual(blocks[0].data, {});
  });

  test("shapePageBlocks: a page with zero blocks is [] — a fetch that worked", () => {
    // Distinct from `null`. An empty array means Atlas answered with a page
    // that has no blocks, which loaders report as unexpected CONTENT; `null`
    // means the fetch itself failed. Collapsing the two would mislabel the log.
    assert.deepEqual(shapePageBlocks({ blocks: [] }), []);
  });

  test("shapePageBlocks: an unusable body is null, so the caller falls back", () => {
    assert.equal(shapePageBlocks(null), null);
    assert.equal(shapePageBlocks(undefined), null);
    assert.equal(
      shapePageBlocks({ blocks: undefined as unknown as RawPageResponse["blocks"] }),
      null,
    );
    assert.equal(
      shapePageBlocks({ blocks: "nope" as unknown as RawPageResponse["blocks"] }),
      null,
    );
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
