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
 *
 * NO-FALLBACK CONTRACT (the no-fallback sweep): the pickers take NO fallback
 * argument. An empty/absent field renders as empty ("" / [] / NaN for
 * numbers / "" for images), never as stale constants text — see
 * features/cms/fields.ts header.
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
  "home-flow": "01a01d67-755c-769c-a7e6-05b10dde9eae",
  "page-hero": "01a01d67-7025-7f26-ba49-91ded4bb332b",
  "rate-course": "01a01d67-76d1-714c-8f2f-01dc3dda9311",
  "rate-row": "01a01d67-78a7-7df8-a6e3-ec09f2bd1284",
};

function bi(value: string): { ja: string; en: string } {
  return { ja: value, en: `${value}-en` };
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
 * every warning it printed. */
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

/** Captures `console.warn` for the duration of `run`. */
async function captureWarnings(run: () => void | Promise<void>): Promise<string[]> {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(" "));
  };
  try {
    await run();
  } finally {
    console.warn = original;
  }
  return warnings;
}

async function main(): Promise<void> {
  const fields = (await import(fieldsPath)) as typeof FieldsModule;
  const { mapBlocksByType, pick, pickBi, pickImage, pickJa, pickLines, pickNumber } = fields;
  const noop = () => {};

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

    const groups = mapBlocksByType("site", blocks, SITE_TYPES, noop);
    assert.ok(groups, "site page must map");

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

    const fromOrdered = mapBlocksByType("site-a", ordered, SITE_TYPES, noop);
    const fromShuffled = mapBlocksByType("site-b", shuffled, SITE_TYPES, noop);

    assert.ok(fromOrdered && fromShuffled);
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

    const groups = mapBlocksByType("site-drag", blocks, SITE_TYPES, noop);
    assert.ok(groups);
    assert.equal(groups["nav-item"].length, 4);
    assert.equal(groups["footer-legal-link"].length, 5);
    for (const navBlock of groups["nav-item"]) {
      assert.equal(navBlock.type, "nav-item");
    }
    // The moved link is now first in its own group, not first in the navbar.
    assert.equal(groups["footer-legal-link"][0].position, 3.5);
  });

  // -------------------------------------------------------------------------
  // (b) pick / pickJa / pickBi — no fallback, empty renders empty
  // -------------------------------------------------------------------------

  test("pick narrows a merged Bilingual field and rejects non-object junk", () => {
    assert.deepEqual(pick({ a: { ja: "x", en: "y" } }, "a"), { ja: "x", en: "y" });
    assert.equal(pick({ a: undefined }, "a"), undefined);
    assert.equal(pick({}, "a"), undefined);
    assert.equal(pick({ a: "plain" }, "a"), undefined);
    // Keys present, values not strings -> not a usable Bilingual.
    assert.equal(pick({ a: { ja: { deep: 1 }, en: { deep: 2 } } }, "a"), undefined);
    assert.equal(pick({ a: { ja: 1, en: 2 } }, "a"), undefined);
    assert.equal(pick({ a: { ja: "x" } }, "a"), undefined);
  });

  test("pickJa returns the value or '' — never a fallback", () => {
    assert.equal(pickJa({ href: { ja: "/x", en: "/x" } }, "href"), "/x");
    assert.equal(pickJa({}, "href"), "");
    assert.equal(pickJa({ href: { ja: "", en: "" } }, "href"), "");
  });

  test("pickBi returns the field or an empty Bilingual — never a fallback", () => {
    assert.deepEqual(pickBi({ label: { ja: "a", en: "b" } }, "label"), { ja: "a", en: "b" });
    assert.deepEqual(pickBi({}, "label"), { ja: "", en: "" });
    assert.deepEqual(pickBi({ label: { ja: "", en: "" } }, "label"), { ja: "", en: "" });
  });

  test("pickLines splits textarea content; absent/empty is []", () => {
    const data = { items: { ja: "1\n2\n3", en: "one\ntwo\nthree\nfour" } };
    assert.deepEqual(pickLines(data, "items"), [
      { ja: "1", en: "one" },
      { ja: "2", en: "two" },
      { ja: "3", en: "three" },
      { ja: "four", en: "four" },
    ]);
    assert.deepEqual(pickLines({}, "items"), []);
  });

  test("pickLines fills a missing JA line from EN, and a missing EN line from JA", () => {
    assert.deepEqual(pickLines({ x: { ja: "a\nb", en: "A" } }, "x"), [
      { ja: "a", en: "A" },
      { ja: "b", en: "b" },
    ]);
  });

  test("pickLines is unchanged when the two sides have equal line counts", () => {
    const data = { items: { ja: "1\n2\n3", en: "one\ntwo\nthree" } };
    assert.deepEqual(pickLines(data, "items"), [
      { ja: "1", en: "one" },
      { ja: "2", en: "two" },
      { ja: "3", en: "three" },
    ]);
  });

  // -------------------------------------------------------------------------
  // (c) pickNumber — accepts numbers/numeric strings; junk is NaN + warning
  // -------------------------------------------------------------------------

  test("pickNumber accepts a real number unchanged", async () => {
    const warnings = await captureWarnings(() => {
      assert.equal(pickNumber({ customer_price: 3740 }, "customer_price", "t1"), 3740);
      assert.equal(pickNumber({ customer_price: 0 }, "customer_price", "t1b"), 0);
    });
    assert.deepEqual(warnings, []);
  });

  test('pickNumber accepts a numeric string ("3500")', async () => {
    const warnings = await captureWarnings(() => {
      assert.equal(pickNumber({ customer_price: "3500" }, "customer_price", "t2"), 3500);
      assert.equal(pickNumber({ customer_price: " 3500 " }, "customer_price", "t2b"), 3500);
    });
    assert.deepEqual(warnings, [], "a usable price must not warn");
  });

  test("pickNumber renders NaN (never a constants fallback) and warns once when the value is unusable", async () => {
    let value = 0;
    const warnings = await captureWarnings(() => {
      value = pickNumber({ customer_price: "free" }, "customer_price", "rates/care/x");
      // Same field+context again -> still one warning.
      pickNumber({ customer_price: "free" }, "customer_price", "rates/care/x");
    });

    assert.ok(Number.isNaN(value), "unusable number renders NaN, not a stale amount");
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /\[cms:unexpected-content\]/);
    assert.match(warnings[0], /customer_price/);
    assert.match(warnings[0], /rates\/care\/x/);
  });

  test("pickNumber rejects NaN/Infinity and a Bilingual-wrapped value with NaN", async () => {
    await captureWarnings(() => {
      assert.ok(Number.isNaN(pickNumber({ p: Number.NaN }, "p", "t3")));
      assert.ok(Number.isNaN(pickNumber({ p: Number.POSITIVE_INFINITY }, "p", "t4")));
      assert.ok(Number.isNaN(pickNumber({ p: { ja: "3500", en: "3500" } }, "p", "t5")));
      assert.ok(Number.isNaN(pickNumber({}, "p", "t6")));
      assert.ok(Number.isNaN(pickNumber({ p: "" }, "p", "t7")));
    });
  });

  // -------------------------------------------------------------------------
  // (d) pickImage — the media URL vs the raw UUID the backend leaks when its
  //     best-effort expansion fails
  // -------------------------------------------------------------------------

  /** A real expanded URL from the live workspace — the shape a healthy
   * delivery response carries, wrapped as `mergeBlockData` wraps every string
   * field (non-localizable, so ja === en). */
  const S3_URL =
    "https://horizoon.s3.ap-southeast-1.amazonaws.com/care-24/media/2026/08/01a01e63-67db-78cd-8e8b-6cabe598c3fe-hero.jpg";

  test("pickImage returns the expanded S3 URL and does not warn", async () => {
    const warnings = await captureWarnings(() => {
      assert.equal(pickImage({ image: { ja: S3_URL, en: S3_URL } }, "image", "img/ok"), S3_URL);
      // http is accepted too (a self-hosted/dev media origin).
      assert.equal(
        pickImage(
          { image: { ja: "http://localhost:9000/care-24/media/x.png", en: "" } },
          "image",
          "img/ok2",
        ),
        "http://localhost:9000/care-24/media/x.png",
      );
    });
    assert.deepEqual(warnings, [], "a usable URL must not warn");
  });

  test("pickImage REJECTS a raw media UUID — renders no image (never a bundled file)", async () => {
    // `public_get_page.go#expandBlockMedia` is documented "best-effort: on
    // error the stored data is returned unchanged", i.e. the media id reaches
    // the loader verbatim. Handing that to next/image is a hard error, and the
    // no-fallback sweep removed the bundled-file substitution — the field
    // renders "" (no image) with a warning.
    const uuid = "01a01e63-687a-79bd-a631-c689d4d63355";
    let value = "x";
    const warnings = await captureWarnings(() => {
      value = pickImage({ image: { ja: uuid, en: uuid } }, "image", "home/hero");
      // Same field+context again -> still one warning.
      pickImage({ image: { ja: uuid, en: uuid } }, "image", "home/hero");
    });

    assert.equal(value, "", "a raw UUID is not an image URL; no bundled fallback");
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /\[cms:unexpected-content\]/);
    assert.match(warnings[0], /"image"/);
    assert.match(warnings[0], /home\/hero/);
  });

  test("pickImage rejects an empty string, a non-string and any non-http scheme with \"\"", async () => {
    await captureWarnings(() => {
      assert.equal(pickImage({ image: "" }, "image", "e1"), "");
      assert.equal(pickImage({ image: 42 }, "image", "e2"), "");
      assert.equal(pickImage({ image: true }, "image", "e3"), "");
      assert.equal(pickImage({ image: { ja: { url: S3_URL } } }, "image", "e4"), "");
      // A relative path is not a URL either: only absolute http(s) passes.
      assert.equal(pickImage({ image: { ja: "care-24/media/x.jpg", en: "" } }, "image", "e5"), "");
      assert.equal(
        pickImage({ image: { ja: "javascript:alert(1)", en: "" } }, "image", "e6"),
        "",
      );
      assert.equal(
        pickImage({ image: { ja: `data:image/png;base64,AAA`, en: "" } }, "image", "e7"),
        "",
      );
    });
  });

  test("pickImage stays silent when the optional field is simply absent", async () => {
    const warnings = await captureWarnings(() => {
      // An unset image field, and a field both locales cleared (which
      // `mergeBlockData` collapses to `undefined`) — content, not corruption.
      assert.equal(pickImage({}, "image", "a1"), "");
      assert.equal(pickImage({ image: undefined }, "image", "a2"), "");
      assert.equal(pickImage({ image: null }, "image", "a3"), "");
    });
    assert.deepEqual(warnings, [], "an absent optional image must not warn");
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

    const { result: groups } = await capturing(() =>
      mapBlocksByType("home-stray", [stray, flow], types, () => {}),
    );
    assert.ok(groups);
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

    const groups = mapBlocksByType("rates-x", blocks, types, () => {});
    assert.ok(groups);
    assert.equal(groups["rate-course"].length, 2);
    assert.equal(groups["rate-row"].length, 2);

    const careRows = groups["rate-row"].filter(
      (b) => pickJa(b.data, "course_key") === "care",
    );
    const nursingRows = groups["rate-row"].filter(
      (b) => pickJa(b.data, "course_key") === "nursing",
    );
    assert.equal(careRows.length, 1);
    assert.equal(nursingRows.length, 1);
  });

  test("mapBlocksByType returns null and calls reportFallback when a declared type is completely missing", () => {
    const blocks = [
      block("site-brand", 0, { name: bi("Care 24") }),
      block("site-contact-phone", 1, { display: bi("0120"), tel: bi("0120"), note: bi("note") }),
    ];
    let reported = "";
    const result = mapBlocksByType("site", blocks, SITE_TYPES, (slug, detail) => {
      reported = `${slug}: ${detail}`;
    });
    assert.equal(result, null);
    assert.match(reported, /^site: /);
    assert.match(reported, /missing required block type/);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});