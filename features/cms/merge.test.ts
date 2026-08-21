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

/** Captures `console.warn` for the duration of `run` — same helper shape as
 * `fields.test.ts#captureWarnings`, duplicated rather than imported so this
 * file keeps importing nothing but `./merge.ts` and `./types`. */
async function captureWarnings(run: () => void): Promise<string[]> {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(" "));
  };
  try {
    run();
  } finally {
    console.warn = original;
  }
  return warnings;
}

async function main() {
  const { parseData, mergeBlockData, findEnTranslationData, shapePageBlocks, shapePageMeta } =
    (await import(mergePath)) as typeof MergeModule;

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

  // -------------------------------------------------------------------------
  // J2: a block with NO EN translation row at all must warn once — this is
  // the exact shape of the legal-document regression flagged during review:
  // a whole page silently serving Japanese content on the English site,
  // with nothing in the logs to say so ("hardest to detect" because it
  // looks like a correctly-rendered page, not a missing one).
  // -------------------------------------------------------------------------

  test("mergeBlockData warns once when a whole block has no EN translation at all", async () => {
    let first: unknown;
    let second: unknown;
    const warnings = await captureWarnings(() => {
      first = mergeBlockData(
        { heading: "特定商取引法", body: "本文です" },
        {},
        "legal-tokushoho/legal-doc",
      );
      // Same context again -> still exactly one warning.
      second = mergeBlockData(
        { heading: "特定商取引法", body: "本文です" },
        {},
        "legal-tokushoho/legal-doc",
      );
    });

    assert.deepEqual(first, {
      heading: { ja: "特定商取引法", en: "特定商取引法" },
      body: { ja: "本文です", en: "本文です" },
    });
    assert.deepEqual(second, first);
    assert.equal(warnings.length, 1, "one warning per page+block-type per process");
    assert.match(warnings[0], /\[cms:unexpected-content\]/);
    assert.match(warnings[0], /legal-tokushoho\/legal-doc/);
    assert.match(warnings[0], /"heading"/);
    assert.match(warnings[0], /"body"/);
  });

  test("mergeBlockData stays silent without a context (backward compatible with scripts/atlas/drift-check.ts)", async () => {
    const warnings = await captureWarnings(() => {
      mergeBlockData({ heading: "運営会社" }, {});
    });
    assert.deepEqual(warnings, []);
  });

  test("mergeBlockData stays silent when the block has SOME EN data — a non-localizable field mirroring alongside a translated one must not warn", async () => {
    // `href` never gets a translation row by design; `label` does. If the
    // block-level "enData is entirely empty" guard were dropped for a
    // per-field check instead, this case would incorrectly warn on `href`.
    const warnings = await captureWarnings(() => {
      mergeBlockData(
        { href: "/pricing", label: "料金" },
        { label: "Pricing" },
        "site/nav-item",
      );
    });
    assert.deepEqual(warnings, []);
  });

  test("mergeBlockData stays silent when there is nothing meaningful to mirror (all ja fields empty)", async () => {
    const warnings = await captureWarnings(() => {
      mergeBlockData({ note: "" }, {}, "home/apply");
    });
    assert.deepEqual(warnings, []);
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

  test("shapePageBlocks: threads slug/block-type into mergeBlockData's J2 warning end-to-end", async () => {
    const warnings = await captureWarnings(() => {
      // livePage's page-hero block (b1) has an EN translation row with an
      // empty body, so it is NOT the untranslated case — build a page whose
      // block genuinely has zero translation rows instead.
      shapePageBlocks({
        page: { id: "p1", slug: "company", status: "published" },
        blocks: [
          {
            id: "b9",
            block_type_id: "u",
            type: "company-row",
            parent_id: null,
            position: 0,
            data: '{"label":"所在地","value":"東京都"}',
          },
        ],
        block_translations: [],
      });
    });

    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /company\/company-row/);
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

  // -------------------------------------------------------------------------
  // shapePageMeta — the parallel SEO read path. `page.seo` is a real OBJECT
  // (never JSON.parse it). `seo_translations[].seo` is handled for BOTH
  // shapes it can arrive in, per `RawSeoTranslation`'s doc comment
  // (types.ts:76-94, corrected after live verification for ST-03): the
  // VERIFIED LIVE wire shape is a real OBJECT (`home`, `company`,
  // `use-case` all returned it that way) — that is the branch every
  // production request actually runs, and the block below tests it
  // directly rather than only through a `JSON.stringify`'d proxy. A JSON
  // STRING is also accepted (documented, but never observed live) and
  // parsed inside a try/catch as a defensive fallback, not the primary
  // path. Do not collapse this back to "always a string" — that is the
  // exact assumption that shipped `getPageMeta("use-case").title.en`
  // silently mirroring `ja` before ST-03.
  // -------------------------------------------------------------------------

  test("shapePageMeta: no page (whole response missing) is null, so the caller falls back", () => {
    assert.equal(shapePageMeta(null), null);
    assert.equal(shapePageMeta(undefined), null);
    assert.equal(shapePageMeta({ blocks: [] }), null);
  });

  test("shapePageMeta: a page with no seo object yields all-undefined fields, not null", () => {
    const meta = shapePageMeta({
      page: { id: "p1", slug: "use-case", status: "published" },
      blocks: [],
    });
    assert.ok(meta);
    assert.equal(meta.title, undefined);
    assert.equal(meta.description, undefined);
    assert.equal(meta.ogImage, undefined);
    assert.equal(meta.updatedAt, undefined);
  });

  test("shapePageMeta: ja-only (no EN translation row at all) surfaces the CMS ja value; en still falls through, never mirrors ja", () => {
    // The pricing/fees/rates regression this guards against has two halves,
    // and they pull in opposite directions:
    //  1. Atlas has no `seo_translations` "en" row for these slugs at all.
    //     A missing EN row means EN is UNKNOWN, not "same as ja" — mirroring
    //     ja into en is what made `/en/pricing` render a Japanese `<title>`.
    //     So `meta.title.en` must be "" here, never the ja text, and
    //     `pageMetadata()`'s truthy check then falls through to
    //     `constants/seo.ts`'s real English copy.
    //  2. `pricing`/`fees`/`rates` DO have a real, CMS-authored ja title —
    //     dropping the WHOLE field to `undefined` whenever en is missing
    //     (the original fix for half 1) threw this away too, so an editor
    //     changing the ja title in the dashboard saw no effect on the
    //     rendered ja page. `pageMetadata()` resolves title/description PER
    //     LOCALE (`cmsMeta.title?.[lang]`), so the ja side must survive on
    //     its own.
    const meta = shapePageMeta({
      page: {
        id: "p1",
        slug: "pricing",
        status: "published",
        seo: { title: "ご利用者様向け料金" },
      },
      blocks: [],
    });
    assert.ok(meta);
    assert.deepEqual(meta.title, { ja: "ご利用者様向け料金", en: "" });
  });

  test("shapePageMeta: a page with no seo content at all (ja empty, no EN row) still collapses to undefined", () => {
    // The other half of the ja-only case: if ja is ALSO empty/absent, there
    // is nothing CMS-authored to surface, so the field collapses the same
    // way it always has rather than emitting a useless {ja:"",en:""}.
    const meta = shapePageMeta({
      page: { id: "p1", slug: "use-case", status: "published", seo: { title: "" } },
      blocks: [],
    });
    assert.ok(meta);
    assert.equal(meta.title, undefined);
  });

  test("shapePageMeta: ja + en overlay from seo_translations (STRING shape — documented but never observed live)", () => {
    const meta = shapePageMeta({
      page: {
        id: "p1",
        slug: "use-case",
        status: "published",
        seo: { title: "ご利用シーン", description: "介護サービスの利用シーン" },
      },
      blocks: [],
      seo_translations: [
        { locale: "en", seo: '{"title":"Use cases","description":"Care service use cases"}' },
      ],
    });
    assert.ok(meta);
    assert.deepEqual(meta.title, { ja: "ご利用シーン", en: "Use cases" });
    assert.deepEqual(meta.description, {
      ja: "介護サービスの利用シーン",
      en: "Care service use cases",
    });
  });

  test("shapePageMeta: ja + en overlay from seo_translations (OBJECT shape — the verified live wire shape)", () => {
    // Same scenario as the STRING-shape test above, but `seo` arrives as a
    // real object, exactly as `home`/`company`/`use-case` do on the live
    // workspace. This is the branch every production request actually
    // exercises, and until this test existed it had zero coverage.
    const meta = shapePageMeta({
      page: {
        id: "p1",
        slug: "use-case",
        status: "published",
        seo: { title: "ご利用シーン", description: "介護サービスの利用シーン" },
      },
      blocks: [],
      seo_translations: [
        {
          locale: "en",
          seo: { title: "Use cases", description: "Care service use cases" },
        },
      ],
    });
    assert.ok(meta);
    assert.deepEqual(meta.title, { ja: "ご利用シーン", en: "Use cases" });
    assert.deepEqual(meta.description, {
      ja: "介護サービスの利用シーン",
      en: "Care service use cases",
    });
  });

  test("shapePageMeta: an en-only field (empty ja) is not dropped (STRING shape)", () => {
    const meta = shapePageMeta({
      page: { id: "p1", slug: "use-case", status: "published", seo: { og_image: "" } },
      blocks: [],
      seo_translations: [
        { locale: "en", seo: '{"og_image":"https://example.com/og-en.png"}' },
      ],
    });
    assert.ok(meta);
    assert.deepEqual(meta.ogImage, { ja: "", en: "https://example.com/og-en.png" });
  });

  test("shapePageMeta: an en-only field (empty ja) is not dropped (OBJECT shape)", () => {
    const meta = shapePageMeta({
      page: { id: "p1", slug: "use-case", status: "published", seo: { og_image: "" } },
      blocks: [],
      seo_translations: [
        { locale: "en", seo: { og_image: "https://example.com/og-en.png" } },
      ],
    });
    assert.ok(meta);
    assert.deepEqual(meta.ogImage, { ja: "", en: "https://example.com/og-en.png" });
  });

  test("shapePageMeta: empty in BOTH locales collapses to undefined, never {ja:'',en:''} (STRING shape)", () => {
    const meta = shapePageMeta({
      page: { id: "p1", slug: "use-case", status: "published", seo: { og_image: "" } },
      blocks: [],
      seo_translations: [{ locale: "en", seo: '{"og_image":""}' }],
    });
    assert.ok(meta);
    assert.equal(meta.ogImage, undefined);
    assert.equal(Boolean(meta.ogImage), false);
  });

  test("shapePageMeta: empty in BOTH locales collapses to undefined, never {ja:'',en:''} (OBJECT shape)", () => {
    const meta = shapePageMeta({
      page: { id: "p1", slug: "use-case", status: "published", seo: { og_image: "" } },
      blocks: [],
      seo_translations: [{ locale: "en", seo: { og_image: "" } }],
    });
    assert.ok(meta);
    assert.equal(meta.ogImage, undefined);
    assert.equal(Boolean(meta.ogImage), false);
  });

  test("shapePageMeta: malformed seo_translations JSON does not throw, EN is unknown so it stays empty (ja still surfaces, per the per-locale rule above)", () => {
    // A row exists but can't be parsed — `findEnSeoTranslation` degrades to
    // `{}`, same as "no row at all". We genuinely don't know the EN value,
    // so this must NOT mirror ja into en; the caller falls back to
    // constants for en. ja is still CMS-authored and real, so it surfaces.
    const meta = shapePageMeta({
      page: {
        id: "p1",
        slug: "use-case",
        status: "published",
        seo: { title: "ご利用シーン" },
      },
      blocks: [],
      seo_translations: [{ locale: "en", seo: "{not json" }],
    });
    assert.ok(meta);
    assert.deepEqual(meta.title, { ja: "ご利用シーン", en: "" });
  });

  test("shapePageMeta: an ARRAY value for seo_translations[].seo (the one object-shaped edge case findEnSeoTranslation guards) degrades to {}, EN stays empty", () => {
    // findEnSeoTranslation: `Array.isArray(match.seo) ? {} : match.seo` —
    // never executed by any other test in this file until now.
    const meta = shapePageMeta({
      page: {
        id: "p1",
        slug: "use-case",
        status: "published",
        seo: { title: "ご利用シーン" },
      },
      blocks: [],
      seo_translations: [{ locale: "en", seo: [] as unknown as Record<string, unknown> }],
    });
    assert.ok(meta);
    assert.deepEqual(meta.title, { ja: "ご利用シーン", en: "" });
  });

  test("shapePageMeta: a non-en seo_translations locale is not used as the EN overlay (STRING shape)", () => {
    const meta = shapePageMeta({
      page: {
        id: "p1",
        slug: "use-case",
        status: "published",
        seo: { title: "ご利用シーン" },
      },
      blocks: [],
      seo_translations: [{ locale: "id", seo: '{"title":"Skenario penggunaan"}' }],
    });
    assert.ok(meta);
    assert.deepEqual(meta.title, { ja: "ご利用シーン", en: "" });
  });

  test("shapePageMeta: a non-en seo_translations locale is not used as the EN overlay (OBJECT shape)", () => {
    const meta = shapePageMeta({
      page: {
        id: "p1",
        slug: "use-case",
        status: "published",
        seo: { title: "ご利用シーン" },
      },
      blocks: [],
      seo_translations: [{ locale: "id", seo: { title: "Skenario penggunaan" } }],
    });
    assert.ok(meta);
    assert.deepEqual(meta.title, { ja: "ご利用シーン", en: "" });
  });

  test("shapePageMeta: og_image with no EN row surfaces the ja value, en stays empty; updatedAt is still forwarded", () => {
    const meta = shapePageMeta({
      page: {
        id: "p1",
        slug: "use-case",
        status: "published",
        seo: { og_image: "https://example.com/og.png" },
        updated_at: "2026-08-20T08:57:44Z",
      },
      blocks: [],
    });
    assert.ok(meta);
    assert.deepEqual(meta.ogImage, { ja: "https://example.com/og.png", en: "" });
    assert.equal(meta.updatedAt, "2026-08-20T08:57:44Z");
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
