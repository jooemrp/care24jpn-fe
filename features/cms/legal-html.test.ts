/**
 * Round-trip proof for blocksToHtml/htmlToBlocks: every body in
 * constants/legal.ts (7 documents x ja/en = 14 bodies) must survive
 * `htmlToBlocks(blocksToHtml(body))` as a deep-equal copy of itself. This is
 * the pass/fail bar for st-04a — see the header comment in legal-html.ts for
 * why (index-based TOC anchors break on any drift).
 *
 * st-14 added the render-proof block at the bottom (WYSIWYG marks, sanitizing
 * dangerous markup, language-aware links), which dynamically imports
 * LegalDocPage.tsx — a JSX file — through `react-dom/server`. Node's native
 * TS "type stripping" loader (what makes `node --test` work directly on this
 * file with zero build step) does not transform JSX, only TS types, so:
 *
 *   node --test features/cms/legal-html.test.ts   -> parser-level tests only
 *   npx tsx features/cms/legal-html.test.ts        -> full file, incl. render proof
 *
 * Both must be run; see dev-st-14.md for why two commands instead of one.
 * (relative imports only in this file so it also runs without a bundler.)
 *
 * All dynamic-import bootstrapping below lives inside `main()`, awaited via
 * `main().catch(...)` rather than a bare top-level `await`. Two constraints
 * forced this: Node's ESM loader requires the literal `.ts`/`.tsx` extension
 * to resolve a relative specifier at all, but tsc's `bundler`
 * moduleResolution (this project's tsconfig — not this sub-task's file to
 * change) rejects a *static* import whose specifier ends in `.ts`/`.tsx`
 * (TS5097) unless `allowImportingTsExtensions` is on — so every value import
 * below is dynamic, with the extension built into the specifier string at
 * runtime, out of tsc's static-resolution check. Separately, `tsx`'s
 * standalone (non-bundler) transform of a plain `.ts` file targets CommonJS
 * output when the package has no `"type": "module"`, and CommonJS output
 * cannot contain a top-level `await` — so the dynamic imports are awaited
 * inside an `async function main()` instead of at module scope. Node's own
 * loader does not care either way (it authored `main()`'s promise chain as
 * ordinary pending work, same as any other async function). Type-only
 * imports are unaffected by any of this, so `LegalBlock`/`LegalDoc` are
 * imported statically.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import type { LegalBlock, LegalDoc } from "../../constants/legal.ts";
import type { blocksToHtml as BlocksToHtml, htmlToBlocks as HtmlToBlocks } from "./legal-html.ts";
import type LegalDocPageComponent from "../../components/LegalDocPage.tsx";

const constantsPath = "../../constants/legal" + ".ts";
const legalHtmlPath = "./legal-html" + ".ts";
const legalDocPagePath = "../../components/LegalDocPage" + ".tsx";

async function main(): Promise<void> {
  const { legalDocs } = (await import(constantsPath)) as { legalDocs: Record<string, LegalDoc> };
  const { blocksToHtml, htmlToBlocks } = (await import(legalHtmlPath)) as {
    blocksToHtml: typeof BlocksToHtml;
    htmlToBlocks: typeof HtmlToBlocks;
  };

  const LANGS = ["ja", "en"] as const;

  for (const [docKey, doc] of Object.entries(legalDocs)) {
    for (const lang of LANGS) {
      test(`${docKey}.${lang} round-trips exactly through blocksToHtml/htmlToBlocks`, () => {
        const original = doc.body[lang];
        const html = blocksToHtml(original);
        const roundTripped = htmlToBlocks(html);

        assert.deepEqual(roundTripped, original);
        assert.equal(roundTripped.length, original.length, "block count must not drift");

        // The TOC/anchor risk called out by the architect: every h2's INDEX
        // in the array must be identical pre/post round-trip, not just its
        // presence somewhere in the list.
        const h2IndexesBefore = original.flatMap((b, i) => (b.type === "h2" ? [i] : []));
        const h2IndexesAfter = roundTripped.flatMap((b, i) => (b.type === "h2" ? [i] : []));
        assert.deepEqual(h2IndexesAfter, h2IndexesBefore, "h2 indexes must not shift");
      });
    }
  }

  // --- Resilience against foreign (Tiptap-authored) markup ---------------
  //
  // htmlToBlocks must not just be the inverse of blocksToHtml: it is fed
  // markup written by Tiptap in the dashboard, which routinely adds
  // attributes and inline marks blocksToHtml never emits. Losing a block (or
  // leaking a tag into its text) here means a clause silently disappears
  // from a legal page. See the "st-12" root-cause note in legal-html.ts for
  // the incident these tests lock in a fix for.

  test("htmlToBlocks: attribute on a <p> does not drop the paragraph", () => {
    assert.deepEqual(htmlToBlocks('<p class="x">Halo dunia</p>'), [
      { type: "p", text: "Halo dunia" },
    ]);
  });

  test("htmlToBlocks: attribute on a <h2> does not drop the heading", () => {
    assert.deepEqual(htmlToBlocks('<h2 id="a">Judul</h2>'), [{ type: "h2", text: "Judul" }]);
  });

  test("htmlToBlocks: inline <strong> survives as the **bold** marker (st-14 WYSIWYG)", () => {
    // Was: bold stripped to plain text, because LegalDocPage rendered `text`
    // as a plain string. st-14 changed both sides together — LegalDocPage now
    // turns `**...**` back into a real <strong> (see the render-proof block
    // below and LegalDocPage.tsx#renderInlineText) — so an editor who bolds a
    // word in the dashboard now SEES it bold on the site, matching what they
    // typed.
    assert.deepEqual(htmlToBlocks("<p>Halo <strong>tebal</strong></p>"), [
      { type: "p", text: "Halo **tebal**" },
    ]);
  });

  test("htmlToBlocks: <em> survives as the _italic_ marker (st-14 WYSIWYG)", () => {
    assert.deepEqual(htmlToBlocks("<p>Halo <em>miring</em></p>"), [
      { type: "p", text: "Halo _miring_" },
    ]);
  });

  test("htmlToBlocks: <a href> becomes the markdown link syntax LegalDocPage understands", () => {
    assert.deepEqual(htmlToBlocks('<p>Lihat <a href="/fees">biaya</a> kami.</p>'), [
      { type: "p", text: "Lihat [biaya](/fees) kami." },
    ]);
  });

  test("htmlToBlocks: <li><p> wrapping does not leak <p> into the bullet text", () => {
    assert.deepEqual(htmlToBlocks("<ul><li><p>Butir</p></li></ul>"), [
      { type: "li", list: "ul", text: "Butir" },
    ]);
  });

  test("htmlToBlocks: attributes + inline marks combined in one block", () => {
    assert.deepEqual(
      htmlToBlocks(
        '<p class="foo" data-x="1"><em>emph</em> and <a href="/x" class="y">link</a></p>',
      ),
      [{ type: "p", text: "_emph_ and [link](/x)" }],
    );
  });

  test("htmlToBlocks: attributes on list/table wrapper tags do not drop items/rows", () => {
    assert.deepEqual(
      htmlToBlocks(
        '<ul class="tight"><li data-id="1">one</li><li data-id="2">two</li></ul>' +
          '<table class="grid"><thead><tr><th id="h1">H1</th></tr></thead>' +
          "<tbody><tr><td><p>a</p></td></tr></tbody></table>",
      ),
      [
        { type: "li", list: "ul", text: "one" },
        { type: "li", list: "ul", text: "two" },
        { type: "table", rows: [["H1"], ["a"]] },
      ],
    );
  });

  test("htmlToBlocks: unrecognized markup is kept as a paragraph, not silently dropped", () => {
    const originalWarn = console.warn;
    let warned = false;
    console.warn = () => {
      warned = true;
    };
    try {
      assert.deepEqual(htmlToBlocks("<blockquote>orphaned text</blockquote>"), [
        { type: "p", text: "orphaned text" },
      ]);
    } finally {
      console.warn = originalWarn;
    }
    assert.equal(warned, true, "unmapped markup must be logged, not silently dropped");
  });

  test("htmlToBlocks: a realistic Tiptap-edited legal document loses zero blocks", () => {
    // Take one real legal document, serialize it, then simulate what Tiptap's
    // editor does on every save: attributes appear on block tags (class on
    // paragraphs/headings, id on headings for its own anchor plugin) without
    // changing the document's actual structure. This is the exact production
    // scenario st-12 was filed for: a content editor saves an unrelated
    // paragraph edit and other clauses vanish because the parser only
    // accepted its own, attribute-free output.
    const original = legalDocs.privacy.body.ja as LegalBlock[];
    const html = blocksToHtml(original);

    const tiptapStyled = html
      .replace(/<p>/g, '<p class="tiptap-paragraph">')
      .replace(/<h2>/g, '<h2 id="auto-heading">')
      .replace(/<h3>/g, '<h3 class="tiptap-h3" data-level="3">')
      .replace(/<li>/g, '<li data-list-item="true">');

    const before = htmlToBlocks(html);
    const after = htmlToBlocks(tiptapStyled);

    assert.equal(before.length, original.length);
    assert.equal(
      after.length,
      before.length,
      `block count must not drop: before=${before.length} after=${after.length}`,
    );
    assert.deepEqual(
      after.map((b) => b.type),
      before.map((b) => b.type),
      "block type sequence (and therefore h2 TOC anchor order) must be identical",
    );
  });

  test("blocksToHtml emits well-formed nesting for a mixed sample", () => {
    const sample: Parameters<typeof blocksToHtml>[0] = [
      { type: "h2", text: "Heading" },
      { type: "p", text: "Paragraph with & < > chars" },
      { type: "li", list: "ul", text: "one" },
      { type: "li", list: "ul", text: "two" },
      { type: "li", list: "ol", text: "three" },
      { type: "table", rows: [["H1", "H2"], ["", "b"]] },
    ];

    const html = blocksToHtml(sample);
    assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
    assert.match(html, /<ol><li>three<\/li><\/ol>/);
    assert.match(html, /Paragraph with &amp; &lt; &gt; chars/);
    assert.deepEqual(htmlToBlocks(html), sample);
  });

  test("htmlToBlocks: <script>/<style> blocks and unsafe hrefs are neutralized", () => {
    // Parser-level half of the sanitization proof (runs under plain
    // `node --test` too, no JSX needed) — the render-proof block below re-runs
    // the same hazards through the real page to prove nothing survives to the
    // rendered HTML either.
    assert.deepEqual(
      htmlToBlocks('<p>Halo<script>alert(1)</script> dunia<style>p{color:red}</style></p>'),
      [{ type: "p", text: "Halo dunia" }],
    );
    assert.deepEqual(htmlToBlocks('<p><a href="javascript:alert(1)">tautan</a></p>'), [
      { type: "p", text: "tautan" },
    ]);
    assert.deepEqual(htmlToBlocks('<p><a href="  Java\tScript:alert(1)">tautan</a></p>'), [
      { type: "p", text: "tautan" },
    ]);
    assert.deepEqual(htmlToBlocks('<p><a href="data:text/html,evil">tautan</a></p>'), [
      { type: "p", text: "tautan" },
    ]);
    // A stray on*="" attribute never gets a chance to survive: the tag it's
    // on is always rebuilt from its bare name (or dropped), never with its
    // original attributes copied through — see normalizeForeignHtml's pass 5.
    assert.deepEqual(htmlToBlocks('<p onclick="evil()">Klik</p>'), [
      { type: "p", text: "Klik" },
    ]);
  });

  // --- ST-L1: six fidelity gaps between htmlToBlocks/blocksToHtml and -----
  // --- real Tiptap-authored HTML. Each fixture below was run against the --
  // --- pre-fix parser and confirmed RED (assertion failure) before the ----
  // --- parser fix landed — these are regression tests, not new coverage --
  // --- for behaviour that already worked. -----------------------------

  test("gap 1: <th> inside <tbody> with no <thead> is recovered as the header row, not lost", () => {
    const html =
      '<table><tbody><tr><th colspan="1" rowspan="1" colwidth="83">H1</th>' +
      '<th colspan="1" rowspan="1">H2</th></tr><tr><td>a</td><td>b</td></tr></tbody></table>';
    assert.deepEqual(htmlToBlocks(html), [{ type: "table", rows: [["H1", "H2"], ["a", "b"]] }]);
  });

  test("gap 2: nested <ul>/<ol> inside <li> flattens to one li block per <li>, using the PARENT's list kind, no leaked markup", () => {
    const html =
      "<ul><li><p>Parent</p><ol><li><p>Child 1</p></li><li><p>Child 2</p></li></ol></li>" +
      "<li><p>Second top item</p></li></ul>";
    const blocks = htmlToBlocks(html);
    assert.deepEqual(blocks, [
      { type: "li", list: "ul", text: "Parent" },
      { type: "li", list: "ul", text: "Child 1" },
      { type: "li", list: "ul", text: "Child 2" },
      { type: "li", list: "ul", text: "Second top item" },
    ]);
    for (const block of blocks) {
      assert.doesNotMatch(
        (block as { text: string }).text,
        /[<>]/,
        "no raw markup may leak into a flattened li's text",
      );
    }
  });

  test("gap 3: &nbsp;/&mdash;/numeric entities decode; &amp;lt; decodes to the literal &lt;, not <", () => {
    assert.deepEqual(
      htmlToBlocks("<p>Rp&nbsp;1.000 &mdash; ok &amp;lt; &#65; &#x42;</p>"),
      [{ type: "p", text: "Rp 1.000 — ok &lt; A B" }],
    );
  });

  test("gap 4: colspan/rowspan >= 2 become object cells; colspan=\"1\"/colwidth stay a plain string cell", () => {
    const withSpan =
      '<table><thead><tr><th colspan="2">Merged Header</th></tr></thead>' +
      '<tbody><tr><td rowspan="2">A</td><td>B</td></tr><tr><td>C</td></tr></tbody></table>';
    assert.deepEqual(htmlToBlocks(withSpan), [
      {
        type: "table",
        rows: [
          [{ text: "Merged Header", colspan: 2 }],
          [{ text: "A", rowspan: 2 }, "B"],
          ["C"],
        ],
      },
    ]);

    const noOpSpan =
      '<table><tbody><tr><td colspan="1" rowspan="1" colwidth="120">plain</td></tr></tbody></table>';
    assert.deepEqual(htmlToBlocks(noOpSpan), [{ type: "table", rows: [["plain"]] }]);
  });

  test("gap 4b: an object table cell round-trips through blocksToHtml with its colspan/rowspan attribute", () => {
    const sample: LegalBlock[] = [
      {
        type: "table",
        rows: [
          [{ text: "Merged", colspan: 2 }],
          [{ text: "A", rowspan: 2 }, "B"],
          ["C"],
        ],
      },
    ];
    const html = blocksToHtml(sample);
    assert.match(html, /<th colspan="2">Merged<\/th>/);
    assert.match(html, /<td rowspan="2">A<\/td>/);
    assert.deepEqual(htmlToBlocks(html), sample);
  });

  test("gap 5: <h1> and <h4>-<h6> are recognized as their own heading type, not degraded to <p>", () => {
    assert.deepEqual(
      htmlToBlocks("<h1>Top Title</h1><p>intro</p><h4>Sub</h4><h5>SubSub</h5><h6>Deepest</h6>"),
      [
        { type: "h1", text: "Top Title" },
        { type: "p", text: "intro" },
        { type: "h4", text: "Sub" },
        { type: "h5", text: "SubSub" },
        { type: "h6", text: "Deepest" },
      ],
    );
  });

  test("gap 5b: h1/h4/h5/h6 blocks round-trip through blocksToHtml", () => {
    const sample: LegalBlock[] = [
      { type: "h1", text: "Title" },
      { type: "h4", text: "Four" },
      { type: "h5", text: "Five" },
      { type: "h6", text: "Six" },
    ];
    assert.deepEqual(htmlToBlocks(blocksToHtml(sample)), sample);
  });

  test("gap 6: blocksToHtml serializes [label](href) markdown link syntax to a real <a href> element", () => {
    const html = blocksToHtml([{ type: "p", text: "Lihat [halaman harga](/pricing) kami." }]);
    assert.match(html, /<p>Lihat <a href="\/pricing">halaman harga<\/a> kami\.<\/p>/);
    assert.deepEqual(htmlToBlocks(html), [
      { type: "p", text: "Lihat [halaman harga](/pricing) kami." },
    ]);
  });

  test("gap 6b: an unsafe href inside [label](href) serializes as plain label text, never a link", () => {
    const html = blocksToHtml([{ type: "p", text: "Klik [ini](data:text/html,evil) sekarang." }]);
    assert.doesNotMatch(html, /<a /);
    assert.match(html, /Klik ini sekarang\./);
  });

  // --- Render proof: LegalDocPage.tsx, not just the parser -----------------
  //
  // Everything above proves legal-html.ts's string transform. These tests
  // additionally server-render the real LegalDocPage component (via
  // react-dom/server, the same renderer Next.js's SSR is built on) so a
  // regression in LegalDocPage.tsx itself — e.g. a mark rendered as escaped
  // text instead of a real element, or a link built without localizeHref —
  // fails here even if legal-html.ts's own output looks correct in isolation.

  const { default: LegalDocPage } = (await import(legalDocPagePath)) as {
    default: typeof LegalDocPageComponent;
  };
  const { createElement } = (await import("react")) as typeof import("react");
  const { renderToStaticMarkup } = (await import("react-dom/server")) as
    typeof import("react-dom/server");

  function renderDoc(doc: LegalDoc, lang: "ja" | "en"): string {
    return renderToStaticMarkup(
      createElement(LegalDocPage, {
        doc,
        lang,
        tocLabel: lang === "ja" ? "目次" : "Table of Contents",
      }),
    );
  }

  test("render proof: **bold**/_italic_/[link] marks become real <strong>/<em>/<a> in the rendered HTML", () => {
    const doc: LegalDoc = {
      heading: { ja: "Judul", en: "Title" },
      body: {
        ja: [
          { type: "h2", text: "S1" },
          { type: "h2", text: "S2" },
          { type: "h2", text: "S3" },
          { type: "p", text: "Halo **tebal** dan _miring_ dan [tautan](/pricing)." },
        ],
        en: [
          { type: "h2", text: "S1" },
          { type: "h2", text: "S2" },
          { type: "h2", text: "S3" },
          { type: "p", text: "Hello **bold** and _italic_ and [link](/pricing)." },
        ],
      },
    };

    const html = renderDoc(doc, "en");
    assert.match(html, /<strong>bold<\/strong>/, "bold marker must render as a real <strong>");
    assert.match(html, /<em>italic<\/em>/, "italic marker must render as a real <em>");
    assert.match(html, /<a[^>]*href="\/en\/pricing"[^>]*>link<\/a>/, "link marker must render as a real <a>");
  });

  test("render proof: an internal link from the CMS stays language-aware (EN page -> /en/..., JA page -> no prefix)", () => {
    const doc: LegalDoc = {
      heading: { ja: "Judul", en: "Title" },
      body: {
        ja: [
          { type: "h2", text: "S1" },
          { type: "h2", text: "S2" },
          { type: "h2", text: "S3" },
          { type: "p", text: "Lihat [kebijakan pembatalan](/cancellation-policy)." },
        ],
        en: [
          { type: "h2", text: "S1" },
          { type: "h2", text: "S2" },
          { type: "h2", text: "S3" },
          { type: "p", text: "See [cancellation policy](/cancellation-policy)." },
        ],
      },
    };

    const enHtml = renderDoc(doc, "en");
    const jaHtml = renderDoc(doc, "ja");
    assert.match(
      enHtml,
      /href="\/en\/cancellation-policy"/,
      "EN page must localize the internal href to /en/...",
    );
    assert.doesNotMatch(
      enHtml,
      /href="\/cancellation-policy"/,
      "EN page must NOT keep the bare (JA) href — that would send an EN reader to the JA page",
    );
    assert.match(
      jaHtml,
      /href="\/cancellation-policy"/,
      "JA (default language) page keeps the bare, prefix-less href",
    );
  });

  test("render proof: an empty CMS table-of-contents label throws a typed content error", () => {
    const doc: LegalDoc = {
      heading: { ja: "Judul", en: "Title" },
      body: {
        ja: [
          { type: "h2", text: "S1" },
          { type: "h2", text: "S2" },
          { type: "h2", text: "S3" },
        ],
        en: [
          { type: "h2", text: "S1" },
          { type: "h2", text: "S2" },
          { type: "h2", text: "S3" },
        ],
      },
    };

    assert.throws(
      () =>
        renderToStaticMarkup(
          createElement(LegalDocPage, { doc, lang: "en", tocLabel: "" }),
        ),
      (error: unknown) => {
        const candidate = error as { name?: string; code?: string };
        return (
          candidate.name === "CmsContentError" &&
          candidate.code === "CMS_INVALID_REQUIRED_FIELD"
        );
      },
    );
  });

  test("render proof: <script>, onclick, and javascript: hrefs never reach the rendered HTML", () => {
    const maliciousHtml =
      '<p>Halo<script>document.write("pwned")</script> dunia</p>' +
      '<p onclick="alert(1)">Klik di sini</p>' +
      '<p><a href="javascript:alert(document.cookie)">tautan jahat</a></p>';
    const blocks = htmlToBlocks(maliciousHtml);

    const doc: LegalDoc = {
      heading: { ja: "Judul", en: "Title" },
      body: { ja: blocks, en: blocks },
    };

    const html = renderDoc(doc, "en");
    assert.doesNotMatch(html, /<script/i, "a <script> tag must never reach the rendered HTML");
    assert.doesNotMatch(html, /onclick=/i, "an on* handler must never reach the rendered HTML");
    assert.doesNotMatch(html, /javascript:/i, "a javascript: href must never reach the rendered HTML");
    // The text content is not lost — only made inert.
    assert.match(html, /dunia/);
    assert.match(html, /Klik di sini/);
    assert.match(html, /tautan jahat/);
  });

  test("render proof: CMS-style markdown links stay language-aware without going through htmlToBlocks", () => {
    // This fixture exercises the same parsed block shape that the CMS loader
    // passes to LegalDocPage; it deliberately does not model a fallback path.
    const doc: LegalDoc = {
      heading: { ja: "Judul", en: "Title" },
      body: {
        ja: [
          { type: "h2", text: "S1" },
          { type: "h2", text: "S2" },
          { type: "h2", text: "S3" },
          { type: "p", text: "Lihat [halaman harga](/pricing) kami." },
        ],
        en: [
          { type: "h2", text: "S1" },
          { type: "h2", text: "S2" },
          { type: "h2", text: "S3" },
          { type: "p", text: "See our [pricing page](/pricing)." },
        ],
      },
    };

    const enHtml = renderDoc(doc, "en");
    const jaHtml = renderDoc(doc, "ja");
    assert.match(enHtml, /href="\/en\/pricing"/, "EN CMS link must be localized");
    assert.match(jaHtml, /href="\/pricing"/, "JA CMS link keeps its bare href");
    assert.doesNotMatch(jaHtml, /href="\/ja\/pricing"/, "ja is the default language: no /ja prefix");
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
