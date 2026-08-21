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

    let fellBack = false;
    const groups = mapBlocksByType("site-lookalike", blocks, SITE_TYPES, () => {
      fellBack = true;
    });

    assert.equal(fellBack, false);
    assert.ok(groups);

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

    const forward = mapBlocksByType("lookalike-fwd", blocks, SITE_TYPES, noop);
    const reversed = mapBlocksByType("lookalike-rev", [...blocks].reverse(), SITE_TYPES, noop);

    assert.ok(forward && reversed);
    assert.deepEqual(reversed, forward);
  });

  // -------------------------------------------------------------------------
  // (b) extra blocks are tolerated
  // -------------------------------------------------------------------------

  test("a 5th nav item does not trigger the wholesale fallback", async () => {
    const blocks = [
      ...siteBlocks(),
      block("nav-item", 14, { href: bi("/company"), label: bi("Company") }),
    ];

    let fellBack = false;
    const groups = mapBlocksByType("site-extra-nav", blocks, SITE_TYPES, () => {
      fellBack = true;
    });

    assert.equal(fellBack, false, "adding a nav item must not discard the page");
    assert.ok(groups);
    assert.equal(groups["nav-item"].length, 5);
    assert.equal(groups["footer-legal-link"].length, 5);
    assert.deepEqual(pick(groups["nav-item"][4].data, "href"), bi("/company"));
  });

  test("a block of an unmapped type is ignored, warns once, and keeps the page", async () => {
    const stranger = block("home-hero", 14, { unknown_field: bi("x") });
    const blocks = [...siteBlocks(), stranger];

    let fellBack = false;

    const { result: groups, warnings } = await capturing(() => {
      const mapped = mapBlocksByType("site-stranger", blocks, SITE_TYPES, () => {
        fellBack = true;
      });
      // Second call with the same slug must not log again.
      mapBlocksByType("site-stranger", blocks, SITE_TYPES, () => {});
      return mapped;
    });

    assert.equal(fellBack, false);
    assert.ok(groups);
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

    let fellBack = false;
    const { result: groups, warnings } = await capturing(() =>
      mapBlocksByType("site-untyped", blocks, SITE_TYPES, () => {
        fellBack = true;
      }),
    );

    assert.equal(fellBack, false);
    assert.ok(groups);
    assert.equal(groups["nav-item"].length, 4, "the untyped block is not a nav item");
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /block with no type slug/);
  });

  // -------------------------------------------------------------------------
  // (c) a genuinely missing block type falls back AND warns
  // -------------------------------------------------------------------------

  test("a missing required block type falls back and reports slug, count and types", async () => {
    const blocks = siteBlocks().filter((b) => b.type !== "site-footer");

    let detail = "";
    let slug = "";
    const groups = mapBlocksByType("site-no-footer", blocks, SITE_TYPES, (s, d) => {
      slug = s;
      detail = d;
    });

    assert.equal(groups, null, "the loader must fall back to constants");
    assert.equal(slug, "site-no-footer");
    assert.match(detail, /missing required block type\(s\) \[site-footer\]/);
    assert.match(detail, /received 13 block\(s\)/);
    // Received types are listed by slug — readable without a UUID lookup.
    assert.match(detail, /nav-item \(x4, fields: href\/label\)/);
    assert.match(detail, /footer-legal-link \(x5/);
  });

  test("an empty page falls back rather than rendering a blank chrome", () => {
    let called = 0;
    const groups = mapBlocksByType("site-empty", [], SITE_TYPES, () => {
      called++;
    });
    assert.equal(groups, null);
    assert.equal(called, 1);
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

  test("pickJa and pickBi fall back only when the field is empty or absent", () => {
    assert.equal(pickJa({ href: { ja: "/x", en: "/x" } }, "href", "/fallback"), "/x");
    assert.equal(pickJa({}, "href", "/fallback"), "/fallback");
    assert.equal(pickJa({ href: { ja: "", en: "" } }, "href", "/fallback"), "/fallback");

    const fb = { ja: "fb", en: "fb" };
    assert.deepEqual(pickBi({ label: { ja: "a", en: "b" } }, "label", fb), { ja: "a", en: "b" });
    assert.deepEqual(pickBi({}, "label", fb), fb);
  });

  // -------------------------------------------------------------------------
  // J1: pickJa/pickBi must WARN, not stay silent, when they resurrect the
  // constants text — this is the case
  // indistinguishable from an editor clearing the field in the dashboard.
  // -------------------------------------------------------------------------

  test("pickJa warns once when it falls back to a non-empty constants value", async () => {
    let first = "";
    let second = "";
    const warnings = await captureWarnings(() => {
      first = pickJa({}, "heading", "運営会社", "company/page-hero");
      // Same field+context again -> still exactly one warning.
      second = pickJa({ heading: { ja: "", en: "" } }, "heading", "運営会社", "company/page-hero");
    });

    assert.equal(first, "運営会社");
    assert.equal(second, "運営会社");
    assert.equal(warnings.length, 1, "one warning per field+context per process");
    assert.match(warnings[0], /\[cms:unexpected-content\]/);
    assert.match(warnings[0], /company\/page-hero/);
    assert.match(warnings[0], /"heading"/);
    assert.match(warnings[0], /運営会社/);
  });

  test("pickBi warns once when it falls back to a non-empty constants Bilingual", async () => {
    const fb = { ja: "お申込みはこちら", en: "Apply now" };
    let value: unknown;
    const warnings = await captureWarnings(() => {
      value = pickBi({}, "cta_primary", fb, "home/hero");
    });

    assert.deepEqual(value, fb);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /\[cms:unexpected-content\]/);
    assert.match(warnings[0], /home\/hero/);
    assert.match(warnings[0], /"cta_primary"/);
  });

  test("pickJa/pickBi stay silent when the fallback itself is empty — nothing would visibly change", async () => {
    const warnings = await captureWarnings(() => {
      assert.equal(pickJa({}, "number", "", "home/flow-step[0]"), "");
      assert.deepEqual(pickBi({}, "note", { ja: "", en: "" }, "home/apply"), { ja: "", en: "" });
    });
    assert.deepEqual(warnings, [], "a same-as-empty fallback has nothing to resurrect");
  });

  test("pickJa/pickBi do NOT warn when a real CMS value is present", async () => {
    const warnings = await captureWarnings(() => {
      pickJa({ heading: { ja: "本文", en: "Body" } }, "heading", "fallback");
      pickBi({ heading: { ja: "本文", en: "Body" } }, "heading", { ja: "fb", en: "fb" });
    });
    assert.deepEqual(warnings, []);
  });

  test("pickJa/pickBi still warn (deduped by key alone) when context is omitted", async () => {
    const warnings = await captureWarnings(() => {
      pickJa({}, "tagline", "見守り、寄り添う。");
      pickJa({}, "tagline", "見守り、寄り添う。");
    });
    assert.equal(warnings.length, 1, "context-less calls still dedupe, just more coarsely");
    assert.match(warnings[0], /"tagline"/);
  });

  // -------------------------------------------------------------------------
  // (d) pickLines — EN longer than JA
  // -------------------------------------------------------------------------

  test("pickLines keeps EN lines that run past the JA line count", () => {
    const data = { items: { ja: "1\n2\n3", en: "one\ntwo\nthree\nfour" } };
    assert.deepEqual(pickLines(data, "items", []), [
      { ja: "1", en: "one" },
      { ja: "2", en: "two" },
      { ja: "3", en: "three" },
      { ja: "four", en: "four" },
    ]);
  });

  test("pickLines does not collapse a multi-line EN value when JA is empty", () => {
    const data = { items: { ja: "", en: "a\nb\nc" } };
    assert.deepEqual(pickLines(data, "items", []), [
      { ja: "a", en: "a" },
      { ja: "b", en: "b" },
      { ja: "c", en: "c" },
    ]);
  });

  test("pickLines is unchanged when the two sides have equal line counts", () => {
    // This is the shape of every pickLines field in the live workspace today,
    // so this case is the one that guarantees the rendered HTML is identical.
    const data = { items: { ja: "1\n2\n3", en: "one\ntwo\nthree" } };
    assert.deepEqual(pickLines(data, "items", []), [
      { ja: "1", en: "one" },
      { ja: "2", en: "two" },
      { ja: "3", en: "three" },
    ]);
    assert.deepEqual(pickLines({}, "items", [{ ja: "fb", en: "fb" }]), [{ ja: "fb", en: "fb" }]);
  });

  test("pickLines fills a missing JA line from EN, and a missing EN line from JA", () => {
    assert.deepEqual(pickLines({ x: { ja: "a\nb", en: "A" } }, "x", []), [
      { ja: "a", en: "A" },
      { ja: "b", en: "b" },
    ]);
  });

  // -------------------------------------------------------------------------
  // (e) pickNumber — numeric strings and the warning path
  // -------------------------------------------------------------------------

  test("pickNumber accepts a real number unchanged", async () => {
    const warnings = await captureWarnings(() => {
      assert.equal(pickNumber({ customer_price: 3740 }, "customer_price", 1, "t1"), 3740);
      assert.equal(pickNumber({ customer_price: 0 }, "customer_price", 1, "t1b"), 0);
    });
    assert.deepEqual(warnings, []);
  });

  test('pickNumber accepts a numeric string ("3500") instead of showing the old price', async () => {
    const warnings = await captureWarnings(() => {
      assert.equal(pickNumber({ customer_price: "3500" }, "customer_price", 3740, "t2"), 3500);
      assert.equal(pickNumber({ customer_price: " 3500 " }, "customer_price", 3740, "t2b"), 3500);
    });
    assert.deepEqual(warnings, [], "a usable price must not warn");
  });

  test("pickNumber falls back with a warning when the value is unusable", async () => {
    let value = 0;
    const warnings = await captureWarnings(() => {
      value = pickNumber({ customer_price: "free" }, "customer_price", 3740, "rates/care/x");
      // Same field again -> still one warning.
      pickNumber({ customer_price: "free" }, "customer_price", 3740, "rates/care/x");
    });

    assert.equal(value, 3740);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /\[cms:unexpected-content\]/);
    assert.match(warnings[0], /customer_price/);
    assert.match(warnings[0], /rates\/care\/x/);
  });

  test("pickNumber rejects NaN/Infinity and a Bilingual-wrapped value", async () => {
    await captureWarnings(() => {
      assert.equal(pickNumber({ p: Number.NaN }, "p", 100, "t3"), 100);
      assert.equal(pickNumber({ p: Number.POSITIVE_INFINITY }, "p", 100, "t4"), 100);
      assert.equal(pickNumber({ p: { ja: "3500", en: "3500" } }, "p", 100, "t5"), 100);
      assert.equal(pickNumber({}, "p", 100, "t6"), 100);
      assert.equal(pickNumber({ p: "" }, "p", 100, "t7"), 100);
    });
  });

  // -------------------------------------------------------------------------
  // (f) pickImage — the media URL vs the raw UUID the backend leaks when its
  //     best-effort expansion fails
  // -------------------------------------------------------------------------

  /** A real expanded URL from the live workspace — the shape a healthy
   * delivery response carries, wrapped as `mergeBlockData` wraps every string
   * field (non-localizable, so ja === en). */
  const S3_URL =
    "https://horizoon.s3.ap-southeast-1.amazonaws.com/care-24/media/2026/08/01a01e63-67db-78cd-8e8b-6cabe598c3fe-hero.jpg";

  test("pickImage returns the expanded S3 URL and does not warn", async () => {
    const warnings = await captureWarnings(() => {
      assert.equal(
        pickImage({ image: { ja: S3_URL, en: S3_URL } }, "image", "/images/hero.webp", "img/ok"),
        S3_URL,
      );
      // http is accepted too (a self-hosted/dev media origin).
      assert.equal(
        pickImage(
          { image: { ja: "http://localhost:9000/care-24/media/x.png", en: "" } },
          "image",
          "/images/hero.webp",
          "img/ok2",
        ),
        "http://localhost:9000/care-24/media/x.png",
      );
    });
    assert.deepEqual(warnings, [], "a usable URL must not warn");
  });

  test("pickImage REJECTS a raw media UUID — the backend's best-effort expansion failing", async () => {
    // `public_get_page.go#expandBlockMedia` is documented "best-effort: on
    // error the stored data is returned unchanged", i.e. the media id reaches
    // the loader verbatim. Handing that to next/image is a hard error, so it
    // must degrade to the bundled file instead.
    const uuid = "01a01e63-687a-79bd-a631-c689d4d63355";
    let value = "";
    const warnings = await captureWarnings(() => {
      value = pickImage({ image: { ja: uuid, en: uuid } }, "image", "/images/hero.webp", "home/hero");
      // Same field again -> still one warning.
      pickImage({ image: { ja: uuid, en: uuid } }, "image", "/images/hero.webp", "home/hero");
    });

    assert.equal(value, "/images/hero.webp");
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /\[cms:unexpected-content\]/);
    assert.match(warnings[0], /"image"/);
    assert.match(warnings[0], /home\/hero/);
  });

  test("pickImage rejects an empty string, a non-string and any non-http scheme", async () => {
    await captureWarnings(() => {
      assert.equal(pickImage({ image: "" }, "image", "/images/logo.png", "e1"), "/images/logo.png");
      assert.equal(pickImage({ image: 42 }, "image", "/images/logo.png", "e2"), "/images/logo.png");
      assert.equal(pickImage({ image: true }, "image", "/images/logo.png", "e3"), "/images/logo.png");
      assert.equal(
        pickImage({ image: { ja: { url: S3_URL } } }, "image", "/images/logo.png", "e4"),
        "/images/logo.png",
      );
      // A relative path is not a URL either: only absolute http(s) passes.
      assert.equal(
        pickImage({ image: { ja: "care-24/media/x.jpg", en: "" } }, "image", "/images/logo.png", "e5"),
        "/images/logo.png",
      );
      assert.equal(
        pickImage({ image: { ja: "javascript:alert(1)", en: "" } }, "image", "/images/logo.png", "e6"),
        "/images/logo.png",
      );
      assert.equal(
        pickImage({ image: { ja: `data:image/png;base64,AAA`, en: "" } }, "image", "/images/logo.png", "e7"),
        "/images/logo.png",
      );
    });
  });

  test("pickImage stays silent when the optional field is simply absent", async () => {
    const warnings = await captureWarnings(() => {
      // An unset image field, and a field both locales cleared (which
      // `mergeBlockData` collapses to `undefined`) — content, not corruption.
      assert.equal(pickImage({}, "image", "/images/hero.webp", "a1"), "/images/hero.webp");
      assert.equal(
        pickImage({ image: undefined }, "image", "/images/hero.webp", "a2"),
        "/images/hero.webp",
      );
      assert.equal(pickImage({ image: null }, "image", "", "a3"), "");
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
      (b) => pickJa(b.data, "course_key", "") === "care",
    );
    assert.equal(careRows.length, 1);
    assert.equal(careRows[0].data.customer_price, 3740);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
