/**
 * Tests for features/cms/fields.ts — the shared field pickers and the
 * block-type mapping that replaced every loader's positional destructuring.
 *
 * Run (from marketing-web/):
 *   node --test features/cms/fields.test.ts
 *
 * `fields.ts` is deliberately free of `server-only`, `react`, `@/...` path
 * aliases and `./client`, so Node's native TS type-stripping runs this file
 * with no bundler, no build step and no Atlas connection. Same bootstrapping
 * constraints as features/cms/legal-html.test.ts: relative specifiers must
 * carry a literal `.ts` extension for Node's loader, tsc's `bundler`
 * moduleResolution rejects that in a STATIC import (TS5097), and tsx's
 * CommonJS output cannot hold a top-level `await` — hence dynamic imports
 * awaited inside `main()`.
 *
 * The fixtures below are not invented: every type slug, content-type UUID,
 * position and field-name set was read off the LIVE workspace
 * (`GET /api/v1/public/pages/<slug>`), so "the mapping is unchanged for the
 * data that exists today" is a claim about real data.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import type { CmsBlock } from "./types";
import type * as FieldsModule from "./fields.ts";

/** Built at runtime so the literal `.ts` specifier stays out of tsc's static
 * resolution (TS5097) while Node's loader still gets the extension it needs —
 * same trick as features/cms/legal-html.test.ts. */
const fieldsPath = "./fields" + ".ts";

// ---------------------------------------------------------------------------
// Fixtures — the live "site" page (14 blocks, 7 block types).
// ---------------------------------------------------------------------------

/** Real content-type UUIDs from the live workspace, keyed by the type SLUG
 * the same response carries in `type`. Blocks are matched on the slug;
 * `blockTypeId` is carried along only to prove nothing depends on it. */
const TYPE_UUID: Record<string, string> = {
  "site-brand": "01a01d67-70aa-7b22-b390-901cbd31aa64",
  "site-contact-phone": "01a01d67-7326-7e42-ba0d-77496f1765cf",
  "site-cta": "01a01d67-74eb-7998-a801-a83cffadd4fa",
  "site-ui-labels": "01a01d67-768b-7d85-bc44-23204a65c908",
  "nav-item": "01a01d67-77d2-7bb7-a6d5-4491c100ca8f",
  "site-footer": "01a01d67-795a-7cfd-a69c-10390183ddef",
  "footer-legal-link": "01a01d67-7a9b-70c1-a4fc-a595d3a577a0",
};

function bi(value: string, en = `${value}-en`): { ja: string; en: string } {
  return { ja: value, en };
}

function block(type: string, position: number, data: Record<string, unknown>): CmsBlock {
  return {
    id: `b${position}`,
    type,
    blockTypeId: TYPE_UUID[type] ?? `uuid-of-${type}`,
    parentId: null,
    position,
    data,
  };
}

/** The "site" page exactly as the live workspace returns it: positions 0..13,
 * 4 nav items at 4..7, 5 footer legal links at 9..13. */
function siteBlocks(): CmsBlock[] {
  return [
    block("site-brand", 0, { name: bi("Care 24"), logo_alt: bi("logo"), tagline: bi("tag") }),
    block("site-contact-phone", 1, { display: bi("0120"), tel: bi("0120"), note: bi("note") }),
    block("site-cta", 2, { primary: bi("p"), secondary: bi("s"), contact: bi("c") }),
    block("site-ui-labels", 3, { menu_toggle_label: bi("m"), tab_switch_label: bi("t") }),
    block("nav-item", 4, { href: bi("/"), label: bi("Home") }),
    block("nav-item", 5, { href: bi("/#service-details"), label: bi("Service") }),
    block("nav-item", 6, { href: bi("/service-flow"), label: bi("Flow") }),
    block("nav-item", 7, { href: bi("/pricing"), label: bi("Pricing") }),
    block("site-footer", 8, { description: bi("d"), legal: bi("c 2026") }),
    block("footer-legal-link", 9, { href: bi("/company"), label: bi("Company"), use_legal_heading: undefined }),
    block("footer-legal-link", 10, { href: bi("/privacy"), label: bi("Privacy"), use_legal_heading: undefined }),
    block("footer-legal-link", 11, { href: bi("/tokushoho"), label: undefined, use_legal_heading: bi("tokushoho") }),
    block("footer-legal-link", 12, { href: bi("/terms-for-users"), label: bi("Terms"), use_legal_heading: undefined }),
    block("footer-legal-link", 13, { href: bi("/terms"), label: bi("Terms CS"), use_legal_heading: undefined }),
  ];
}

/** Same list site.ts declares. Kept in sync by hand on purpose: importing
 * site.ts here would drag in `server-only` and the `@/` alias. */
const SITE_TYPES = [
  "site-brand",
  "site-contact-phone",
  "site-cta",
  "site-ui-labels",
  "nav-item",
  "site-footer",
  "footer-legal-link",
] as const;

/** Runs `run` with `console.warn` captured, returning both its result and
 * every warning it printed. Returning the result (rather than having the
 * caller assign to an outer `let`) keeps TypeScript's narrowing intact after
 * an `assert.ok(...)`. */
async function capturing<T>(run: () => T): Promise<{ result: T; warnings: string[] }> {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(" "));
  };
  try {
    return { result: run(), warnings };
  } finally {
    console.warn = original;
  }
}

async function main(): Promise<void> {
  const fields = (await import(fieldsPath)) as typeof FieldsModule;
  const {
    mapBlocksByType,
    pick,
    optionalBi,
    optionalJa,
    optionalLines,
    requiredBi,
    requiredEnum,
    requiredImageUrl,
    requiredJa,
    requiredNumber,
    requiredUrl,
  } = fields;

  // -------------------------------------------------------------------------
  // UI-PARITY PROOF: for the data that is in the CMS today, the slug-based
  // mapping selects exactly the blocks the old positional destructuring did —
  // same blocks, same order — so every loader downstream produces
  // byte-identical output and the rendered HTML cannot change.
  // -------------------------------------------------------------------------

  test("parity: site page maps to the same blocks the positional loader picked", () => {
    const blocks = siteBlocks();

    // Verbatim shape of the OLD positional array-destructuring that this
    // parity test replaces (site.ts, before mapBlocksByType existed — the
    // code itself is gone now, this literal array IS the historical record).
    const [
      oldBrand,
      oldPhone,
      oldCta,
      oldUi,
      oldNav0,
      oldNav1,
      oldNav2,
      oldNav3,
      oldFooter,
      oldLegal0,
      oldLegal1,
      oldLegal2,
      oldLegal3,
      oldLegal4,
    ] = blocks;

    const groups = mapBlocksByType("site", blocks, SITE_TYPES);

    assert.deepEqual(groups["site-brand"], [oldBrand]);
    assert.deepEqual(groups["site-contact-phone"], [oldPhone]);
    assert.deepEqual(groups["site-cta"], [oldCta]);
    assert.deepEqual(groups["site-ui-labels"], [oldUi]);
    assert.deepEqual(groups["site-footer"], [oldFooter]);
    assert.deepEqual(groups["nav-item"], [oldNav0, oldNav1, oldNav2, oldNav3]);
    assert.deepEqual(groups["footer-legal-link"], [
      oldLegal0,
      oldLegal1,
      oldLegal2,
      oldLegal3,
      oldLegal4,
    ]);
  });

  // -------------------------------------------------------------------------
  // (a) order-independence
  // -------------------------------------------------------------------------

  test("mapping is unaffected by the order blocks arrive in", () => {
    const ordered = siteBlocks();
    const shuffled = [...ordered].reverse();

    const fromOrdered = mapBlocksByType("site-a", ordered, SITE_TYPES);
    const fromShuffled = mapBlocksByType("site-b", shuffled, SITE_TYPES);

    assert.deepEqual(fromShuffled, fromOrdered);
  });

  test("a legal link dragged above a nav item stays a legal link", () => {
    // The exact H3/B regression: same 14 blocks, one legal link moved to
    // position 4 and the nav items pushed down. Counts still match, so the old
    // exact-count guard passed and the navbar rendered a legal link.
    const blocks = siteBlocks().map((b) => {
      if (b.position === 13) return { ...b, position: 3.5 };
      return b;
    });

    const groups = mapBlocksByType("site-drag", blocks, SITE_TYPES);
    assert.equal(groups["nav-item"].length, 4);
    assert.equal(groups["footer-legal-link"].length, 5);
    for (const navBlock of groups["nav-item"]) {
      assert.equal(navBlock.type, "nav-item");
    }
    // The moved link is now first in its own group, not first in the navbar.
    assert.equal(groups["footer-legal-link"][0].position, 3.5);
  });

  // -------------------------------------------------------------------------
  // The case field-signature inference could NOT decide: two types whose
  // fields are byte-for-byte identical, interleaved in arbitrary order.
  //
  // `nav-item` and `footer-legal-link` both declare exactly `href` + `label`
  // in scripts/atlas/schema.ts. The only thing that separates them is the
  // slug each block reports, which is what mapBlocksByType now reads. The
  // previous signature heuristic leaned on `use_legal_heading` being present
  // on legal links — a field an editor is free to leave blank, at which point
  // the tie was broken by declaration order and a privacy link could surface
  // in the navbar.
  // -------------------------------------------------------------------------

  test("nav items and legal links with IDENTICAL fields, interleaved, land in the right groups", () => {
    // No `use_legal_heading` anywhere: every block carries exactly href+label,
    // so the two types are indistinguishable by field signature.
    const blocks = [
      block("footer-legal-link", 0, { href: bi("/privacy"), label: bi("プライバシーポリシー") }),
      block("nav-item", 1, { href: bi("/"), label: bi("ホーム") }),
      block("footer-legal-link", 2, { href: bi("/terms"), label: bi("利用規約") }),
      block("nav-item", 3, { href: bi("/pricing"), label: bi("料金") }),
      block("nav-item", 4, { href: bi("/service-flow"), label: bi("ご利用の流れ") }),
      block("footer-legal-link", 5, { href: bi("/company"), label: bi("会社概要") }),
      // The rest of the site chrome, so the page maps at all.
      block("site-brand", 6, { name: bi("Care 24"), logo_alt: bi("logo"), tagline: bi("tag") }),
      block("site-contact-phone", 7, { display: bi("0120"), tel: bi("0120"), note: bi("note") }),
      block("site-cta", 8, { primary: bi("p"), secondary: bi("s"), contact: bi("c") }),
      block("site-ui-labels", 9, { menu_toggle_label: bi("m"), tab_switch_label: bi("t") }),
      block("site-footer", 10, { description: bi("d"), legal: bi("c 2026") }),
    ];

    const groups = mapBlocksByType("site-lookalike", blocks, SITE_TYPES);

    // Navbar: only the nav items, in dashboard (position) order.
    assert.deepEqual(
      groups["nav-item"].map((b) => pick(b.data, "href")?.ja),
      ["/", "/pricing", "/service-flow"],
    );
    // Footer: only the legal links, in dashboard order — no nav label leaks in.
    assert.deepEqual(
      groups["footer-legal-link"].map((b) => pick(b.data, "href")?.ja),
      ["/privacy", "/terms", "/company"],
    );
    for (const b of groups["nav-item"]) assert.equal(b.type, "nav-item");
    for (const b of groups["footer-legal-link"]) assert.equal(b.type, "footer-legal-link");
    // And specifically: the privacy link is NOT in the navbar.
    assert.equal(
      groups["nav-item"].some((b) => pick(b.data, "label")?.ja === "プライバシーポリシー"),
      false,
    );
  });

  test("reversing that same page changes nothing about which group a block lands in", () => {
    const blocks = [
      block("nav-item", 0, { href: bi("/"), label: bi("Home") }),
      block("footer-legal-link", 1, { href: bi("/privacy"), label: bi("Privacy") }),
      block("nav-item", 2, { href: bi("/pricing"), label: bi("Pricing") }),
      block("footer-legal-link", 3, { href: bi("/terms"), label: bi("Terms") }),
      block("site-brand", 4, { name: bi("Care 24"), logo_alt: bi("logo"), tagline: bi("tag") }),
      block("site-contact-phone", 5, { display: bi("0120"), tel: bi("0120"), note: bi("note") }),
      block("site-cta", 6, { primary: bi("p"), secondary: bi("s"), contact: bi("c") }),
      block("site-ui-labels", 7, { menu_toggle_label: bi("m"), tab_switch_label: bi("t") }),
      block("site-footer", 8, { description: bi("d"), legal: bi("c") }),
    ];

    const forward = mapBlocksByType("lookalike-fwd", blocks, SITE_TYPES);
    const reversed = mapBlocksByType("lookalike-rev", [...blocks].reverse(), SITE_TYPES);

    assert.deepEqual(reversed, forward);
  });

  // -------------------------------------------------------------------------
  // (b) extra blocks are tolerated
  // -------------------------------------------------------------------------

  test("a 5th nav item does not discard the CMS page", () => {
    const blocks = [
      ...siteBlocks(),
      block("nav-item", 14, { href: bi("/company"), label: bi("Company") }),
    ];

    const groups = mapBlocksByType("site-extra-nav", blocks, SITE_TYPES);
    assert.equal(groups["nav-item"].length, 5);
    assert.equal(groups["footer-legal-link"].length, 5);
    assert.deepEqual(pick(groups["nav-item"][4].data, "href"), bi("/company"));
  });

  test("a block of an unmapped type is ignored, warns once, and keeps the page", async () => {
    const stranger = block("home-hero", 14, { unknown_field: bi("x") });
    const blocks = [...siteBlocks(), stranger];

    const { warnings } = await capturing(() => {
      mapBlocksByType("site-stranger", blocks, SITE_TYPES);
      // Second call with the same slug must not log again.
      mapBlocksByType("site-stranger", blocks, SITE_TYPES);
    });

    assert.equal(warnings.length, 1, "one warning per page per process");
    assert.match(warnings[0], /\[cms:unexpected-content\]/);
    assert.match(warnings[0], /site-stranger/);
    // The ignored type is now named by its SLUG, not by an opaque UUID.
    assert.match(warnings[0], /home-hero/);
    assert.match(warnings[0], /unknown_field/);
  });

  test("a block whose type slug is missing entirely is ignored, not mis-assigned", async () => {
    // Defensive: `client.ts` maps an absent `type` to "". Such a block must
    // not be able to stand in for a declared type.
    const blocks = [...siteBlocks(), block("", 14, { href: bi("/x"), label: bi("X") })];

    const { result: groups, warnings } = await capturing(() =>
      mapBlocksByType("site-untyped", blocks, SITE_TYPES),
    );

    assert.equal(groups["nav-item"].length, 4, "the untyped block is not a nav item");
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /block with no type slug/);
  });

  // -------------------------------------------------------------------------
  // (c) a genuinely missing block type fails closed
  // -------------------------------------------------------------------------

  test("a missing required block type throws a typed content error", () => {
    const blocks = siteBlocks().filter((b) => b.type !== "site-footer");

    assert.throws(
      () => mapBlocksByType("site-no-footer", blocks, SITE_TYPES),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "CmsContentError" &&
        "CMS_MISSING_REQUIRED_BLOCK" === (error as { code?: string }).code &&
        (error as { fields?: string[] }).fields?.includes("site-no-footer.site-footer"),
    );
  });

  test("an empty page throws instead of rendering blank chrome", () => {
    assert.throws(() => mapBlocksByType("site-empty", [], SITE_TYPES), (error: unknown) =>
      error instanceof Error &&
      error.name === "CmsContentError" &&
      "CMS_MISSING_REQUIRED_BLOCK" === (error as { code?: string }).code,
    );
  });

  // -------------------------------------------------------------------------
  // pick() — type-checked, not key-presence-checked
  // -------------------------------------------------------------------------

  test("pick returns a Bilingual only when ja and en are both strings", () => {
    assert.deepEqual(pick({ a: { ja: "x", en: "y" } }, "a"), { ja: "x", en: "y" });
    assert.equal(pick({ a: undefined }, "a"), undefined);
    assert.equal(pick({}, "a"), undefined);
    assert.equal(pick({ a: "plain" }, "a"), undefined);
    // The M7 bug: keys present, values not strings -> used to be cast through
    // and rendered as "[object Object]".
    assert.equal(pick({ a: { ja: { deep: 1 }, en: { deep: 2 } } }, "a"), undefined);
    assert.equal(pick({ a: { ja: 1, en: 2 } }, "a"), undefined);
    assert.equal(pick({ a: { ja: "x" } }, "a"), undefined);
  });

  // -------------------------------------------------------------------------
  // Strict field pickers never borrow content from the application bundle.
  // -------------------------------------------------------------------------

  /** A real expanded URL from the live workspace — the shape a healthy
   * delivery response carries, wrapped as `mergeBlockData` wraps every string
   * field (non-localizable, so ja === en). */
  const S3_URL =
    "https://horizoon.s3.ap-southeast-1.amazonaws.com/care-24/media/2026/08/01a01e63-67db-78cd-8e8b-6cabe598c3fe-hero.jpg";

  test("required bilingual and plain-text fields reject missing CMS values", () => {
    assert.deepEqual(requiredBi({ title: { ja: "見出し", en: "Heading" } }, "title", "home/hero"), {
      ja: "見出し",
      en: "Heading",
    });
    assert.equal(requiredJa({ href: bi("/pricing", "/pricing") }, "href", "home/apply"), "/pricing");

    for (const data of [
      {},
      { title: { ja: "", en: "Heading" } },
      { title: { ja: "見出し", en: "   " } },
    ]) {
      assert.throws(
        () => requiredBi(data, "title", "home/hero"),
        (error: unknown) =>
          error instanceof Error &&
          error.name === "CmsContentError" &&
          (error as { code?: string }).code === "CMS_MISSING_REQUIRED_FIELD",
      );
    }
    assert.throws(() => requiredJa({}, "href", "home/apply"), (error: unknown) =>
      error instanceof Error &&
      error.name === "CmsContentError" &&
      (error as { code?: string }).code === "CMS_MISSING_REQUIRED_FIELD",
    );
  });

  test("optional fields preserve absence and reject malformed CMS values", () => {
    assert.equal(optionalJa({}, "detail", "rates/row"), undefined);
    assert.equal(optionalBi({ detail: { ja: "", en: "" } }, "detail", "rates/row"), undefined);
    assert.deepEqual(optionalBi({ detail: { ja: "補足", en: "Note" } }, "detail", "rates/row"), {
      ja: "補足",
      en: "Note",
    });
    assert.throws(
      () => optionalBi({ detail: { ja: "補足", en: "" } }, "detail", "rates/row"),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "CmsContentError" &&
        (error as { code?: string }).code === "CMS_INVALID_REQUIRED_FIELD",
    );
  });

  test("required URLs and images never substitute a bundled asset", () => {
    assert.equal(
      requiredUrl({ href: bi("https://example.com/app", "https://example.com/app") }, "href", "home/apply"),
      "https://example.com/app",
    );
    assert.equal(requiredImageUrl({ image: bi(S3_URL, S3_URL) }, "image", "home/hero"), S3_URL);
    for (const value of [undefined, bi("", ""), bi("portal/register", "portal/register")]) {
      assert.throws(
        () => requiredUrl({ href: value }, "href", "home/apply"),
        (error: unknown) =>
          error instanceof Error &&
          error.name === "CmsContentError" &&
          (error as { code?: string }).code === "CMS_INVALID_REQUIRED_FIELD",
      );
    }
    assert.throws(
      () => requiredImageUrl({ image: bi("01a01e63-raw-media-id", "01a01e63-raw-media-id") }, "image", "home/hero"),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "CmsContentError" &&
        (error as { code?: string }).code === "CMS_INVALID_REQUIRED_FIELD",
    );
  });

  test("required numbers and enums reject malformed CMS values", () => {
    assert.equal(requiredNumber({ price: 3740 }, "price", "rates/care/day"), 3740);
    assert.equal(requiredEnum({ kind: bi("care", "care") }, "kind", ["care", "nursing"], "rates/course"), "care");
    assert.throws(() => requiredNumber({ price: "3740" }, "price", "rates/care/day"), (error: unknown) =>
      error instanceof Error &&
      error.name === "CmsContentError" &&
      (error as { code?: string }).code === "CMS_INVALID_REQUIRED_FIELD",
    );
    assert.throws(
      () => requiredEnum({ kind: bi("other", "other") }, "kind", ["care", "nursing"], "rates/course"),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "CmsContentError" &&
        (error as { code?: string }).code === "CMS_INVALID_REQUIRED_FIELD",
    );
  });

  test("optional lines require paired, non-empty locale lines", () => {
    assert.deepEqual(
      optionalLines({ items: { ja: "1\n2", en: "one\ntwo" } }, "items", "home/about"),
      [
        { ja: "1", en: "one" },
        { ja: "2", en: "two" },
      ],
    );
    assert.deepEqual(optionalLines({}, "items", "home/about"), []);
    assert.throws(
      () => optionalLines({ items: { ja: "1", en: "one\ntwo" } }, "items", "home/about"),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "CmsContentError" &&
        (error as { code?: string }).code === "CMS_INVALID_REQUIRED_FIELD",
    );
  });

  // -------------------------------------------------------------------------
  // Discrimination between look-alike types
  // -------------------------------------------------------------------------

  test("a stray block that shares a declared type's fields cannot steal its group", async () => {
    // `home-flow` carries only `heading`; a `page-hero` dropped onto the home
    // page carries `heading` too. Under signature matching, which one won
    // depended on field counts and declaration order. Now the slug decides.
    const flow = block("home-flow", 22, { heading: bi("flow") });
    const stray = block("page-hero", 0, { heading: bi("hero"), body: bi("b") });
    const types = ["home-flow"] as const;

    const groups = mapBlocksByType("home-stray", [stray, flow], types);
    assert.deepEqual(groups["home-flow"], [flow]);
  });

  test("rate rows are attached to their course by course_key, not by position", () => {
    const types = ["rate-course", "rate-row"] as const;

    const blocks = [
      block("rate-course", 0, { course_key: bi("care"), name: bi("Care") }),
      block("rate-course", 1, { course_key: bi("nursing"), name: bi("Nursing") }),
      block("rate-row", 2, {
        course_key: bi("nursing"),
        row_key: bi("basic-day"),
        label: bi("Day"),
        customer_price: 6600,
        supporter_pay: 4000,
      }),
      block("rate-row", 3, {
        course_key: bi("care"),
        row_key: bi("basic-day"),
        label: bi("Day"),
        customer_price: 3740,
        supporter_pay: 2200,
      }),
    ];

    const groups = mapBlocksByType("rates-x", blocks, types);
    assert.equal(groups["rate-course"].length, 2);
    assert.equal(groups["rate-row"].length, 2);

    const careRows = groups["rate-row"].filter(
      (b) => requiredJa(b.data, "course_key", "rates-x/rate-row") === "care",
    );
    assert.equal(careRows.length, 1);
    assert.equal(careRows[0].data.customer_price, 3740);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
