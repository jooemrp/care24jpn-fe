/**
 * Serializer/parser between `LegalBlock[]` (constants/legal.ts) and the
 * Tiptap-flavoured HTML string Atlas stores in a richtext field.
 *
 * `blocksToHtml` and `htmlToBlocks` are exact inverses of each other for
 * every body in constants/legal.ts:
 *
 *   htmlToBlocks(blocksToHtml(blocks)) deepEqual blocks
 *
 * This matters because TableOfContents.tsx / LegalDocPage.tsx derive anchor
 * ids from the block's INDEX in the array (`sec-${i}`, scanning for
 * `type === "h2"`). If a round-trip drops, merges or reorders a single
 * block, every anchor after it points at the wrong section. Consecutive
 * `li` blocks of the same `list` kind are folded into one `<ul>`/`<ol>`
 * on the way out and split back into individual blocks — one per `<li>` —
 * on the way in, so the block count and order survive unchanged.
 *
 * WYSIWYG inline marks: `LegalBlock.text` can carry a small, closed set of
 * inline markers so that bold/italic/link formatting typed in the Tiptap
 * dashboard survives to the rendered page (LegalDocPage.tsx#renderInlineText
 * turns these into real `<strong>`/`<em>`/`<Link>` elements — never via
 * `dangerouslySetInnerHTML`, so there is no HTML-injection surface at all):
 *
 *   `**bold**`        <-  <strong>/<b>
 *   `_italic_`         <-  <em>/<i>
 *   `[label](href)`    <-  <a href="...">label</a>  (pre-existing syntax)
 *
 * These are plain characters, not real HTML, so `text` stays a safe string
 * end-to-end — no sanitizer/dependency needed for the render path. Any
 * `<script>`/`<style>` block is dropped (tag AND content) before parsing;
 * any other unrecognized tag (`<span>`, `<u>`, `<blockquote>`, ...) has its
 * tag stripped but its text kept, same as before this change. `<a href>`
 * whose scheme is not http(s)/mailto/tel/relative (e.g. `javascript:`,
 * `data:`) is neutralized to plain text instead of becoming a link — see
 * {@link isSafeHref}. `on*` attributes never survive regardless of value:
 * every tag this parser keeps is rebuilt from its bare name (structural
 * tags) or as `<a href="...">` with ONLY the sanitized `href` (links) —
 * no other attribute is ever copied through.
 *
 * Deliberately DOM-free: this runs in Node during Atlas seeding and on the
 * server during SSR, neither of which has `DOMParser`/`document`. Parsing
 * is done with a small hand-rolled scanner over the known, closed set of
 * tags this format ever produces (h2, h3, p, ul, ol, li, table, thead,
 * tbody, tr, th, td) — no nesting of a tag inside itself occurs, so a
 * single top-level pass is sufficient.
 */

import type { LegalBlock } from "@/constants/legal";

/** Escapes text for use as HTML element content (not attribute content). */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Inverse of {@link escapeHtml}. */
function unescapeHtml(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Serializes `LegalBlock.text` (a plain string that may contain the inline
 * markers documented at the top of this file — `**bold**`, `_italic_`) into
 * HTML: plain runs are entity-escaped via {@link escapeHtml}; a marker
 * becomes its `<strong>`/`<em>` element, with its own inner text serialized
 * the same way (so a bold span containing an italic span round-trips too).
 * The exact inverse of the `<strong>`/`<em>` half of
 * {@link normalizeForeignHtml}. `[label](href)` link syntax is left as
 * literal characters — unchanged from this module's original behaviour,
 * and still understood by LegalDocPage.tsx's `renderInlineText`.
 */
function serializeInlineText(text: string): string {
  // Declared locally (not module-level) so a recursive call for a marker's
  // inner text gets its own regex object — a shared, module-level `g`
  // regex here would corrupt the outer call's `lastIndex` mid-recursion.
  const pattern = /\*\*([\s\S]+?)\*\*|_([^_]+?)_/g;
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    result += escapeHtml(text.slice(lastIndex, match.index));
    const [, bold, em] = match;
    if (bold !== undefined) {
      result += `<strong>${serializeInlineText(bold)}</strong>`;
    } else {
      result += `<em>${serializeInlineText(em as string)}</em>`;
    }
    lastIndex = pattern.lastIndex;
  }
  result += escapeHtml(text.slice(lastIndex));
  return result;
}

/** Serializes one row of table cells as `<th>`/`<td>` elements. */
function rowToHtml(cells: string[], cellTag: "th" | "td"): string {
  return cells.map((cell) => `<${cellTag}>${serializeInlineText(cell)}</${cellTag}>`).join("");
}

/**
 * Converts a document's block list into Tiptap-flavoured HTML. Consecutive
 * `li` blocks that share the same `list` kind are folded into a single
 * `<ul>`/`<ol>`; every other block maps to one top-level element. The first
 * row of a `table` block is always the header row (mirrors how
 * LegalDocPage.tsx destructures `[headerRow, ...bodyRows]`).
 */
export function blocksToHtml(blocks: LegalBlock[]): string {
  const parts: string[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    if (block.type === "li") {
      const kind = block.list;
      const items: string[] = [];
      while (i < blocks.length) {
        const next = blocks[i];
        if (next.type !== "li" || next.list !== kind) break;
        items.push(next.text);
        i++;
      }
      const itemsHtml = items.map((text) => `<li>${serializeInlineText(text)}</li>`).join("");
      parts.push(`<${kind}>${itemsHtml}</${kind}>`);
      continue;
    }

    if (block.type === "table") {
      const [headerRow, ...bodyRows] = block.rows;
      const thead = headerRow ? `<thead><tr>${rowToHtml(headerRow, "th")}</tr></thead>` : "";
      const tbody = `<tbody>${bodyRows
        .map((row) => `<tr>${rowToHtml(row, "td")}</tr>`)
        .join("")}</tbody>`;
      parts.push(`<table>${thead}${tbody}</table>`);
      i++;
      continue;
    }

    // h2 | h3 | p share the same { type, text } shape.
    parts.push(`<${block.type}>${serializeInlineText(block.text)}</${block.type}>`);
    i++;
  }

  return parts.join("\n");
}

const TOP_LEVEL_PATTERN =
  /<(h2|h3|p)>([\s\S]*?)<\/\1>|<(ul|ol)>([\s\S]*?)<\/\3>|<table>([\s\S]*?)<\/table>/g;
const LI_PATTERN = /<li>([\s\S]*?)<\/li>/g;
const TR_PATTERN = /<tr>([\s\S]*?)<\/tr>/g;
const TH_PATTERN = /<th>([\s\S]*?)<\/th>/g;
const TD_PATTERN = /<td>([\s\S]*?)<\/td>/g;

/**
 * Tag names {@link TOP_LEVEL_PATTERN}/`LI_PATTERN`/`TR_PATTERN`/etc. below
 * recognize. Anything else — Tiptap's `<a>`/`<br>`/`<strong>`/`<span>`/...,
 * or any attribute on these tags — is normalized/stripped by
 * {@link normalizeForeignHtml} before the scanner ever runs.
 */
const STRUCTURAL_TAGS = new Set([
  "h2",
  "h3",
  "p",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]);

/** Removes every tag from `html`, keeping only the text between them. Used
 * for content that has no structural role left to play — an `<a>` link's
 * label, or a stretch of markup {@link htmlToBlocks} could not place. */
function stripTags(html: string): string {
  return html.replace(/<\/?[a-zA-Z][a-zA-Z0-9]*\b[^>]*>/g, "");
}

/**
 * Schemes {@link isSafeHref} accepts on a Tiptap `<a href>` before turning it
 * into a real link. Anything else — `javascript:`, `data:`, `vbscript:`, an
 * unrecognized scheme, ... — is rejected: the link is neutralized (kept as
 * plain, unclickable text; see the `<a>` pass in {@link normalizeForeignHtml})
 * rather than becoming a clickable `[label](href)`.
 */
const SAFE_HREF_SCHEME_PATTERN = /^(https?:|mailto:|tel:)/i;

/**
 * Whether `href` is safe to turn into a real link: an explicit http(s)/
 * mailto/tel URL, or a same-app relative reference (`/path`, `./path`,
 * `../path`, `#hash`, `?query`, or a bare path with no scheme at all — the
 * common case for an internal link like `/pricing`). Strips whitespace and
 * ASCII control characters before checking, since browsers ignore those
 * inside a scheme too (`java\tscript:` is a well-known bypass of a naive
 * `startsWith("javascript:")` check).
 */
function isSafeHref(href: string): boolean {
  const collapsed = href.trim().replace(/[\s\x00-\x1f]/g, "");
  if (collapsed === "") return false;
  if (SAFE_HREF_SCHEME_PATTERN.test(collapsed)) return true;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(collapsed)) return false; // any other scheme
  return true; // relative: "/x", "./x", "../x", "#x", "?x", "x"
}

/**
 * Makes arbitrary HTML from Tiptap's serializer safe for the scanner below,
 * which only recognizes the exact, attribute-free tags `blocksToHtml`
 * itself produces. Tiptap routinely adds attributes (`class`, `id`,
 * `style`, `data-*`, marks) that `TOP_LEVEL_PATTERN` doesn't expect; without
 * this pass a single `class="..."` on a `<p>` makes the whole paragraph
 * invisible to the scanner (it looks for a literal `<p>`, not `<p ...>`)
 * and the block silently disappears — the exact failure this function
 * exists to close off.
 *
 * Five passes, order matters:
 *  1. `<script>...</script>` / `<style>...</style>` — tag AND content
 *     dropped entirely. Nothing in this format ever renders raw HTML
 *     (see the WYSIWYG note at the top of this file), so a `<script>`
 *     couldn't execute even if it survived as text, but a legal document
 *     has no legitimate reason to contain one either way.
 *  2. `<a href="...">label</a>` -> `[label](href)`, but only when
 *     {@link isSafeHref} accepts the href; otherwise the tag is dropped and
 *     only the (tag-stripped) label text is kept — a `javascript:`/`data:`
 *     link becomes inert text, not a clickable one. LegalDocPage.tsx's
 *     `renderInlineText` already understands `[label](href)` — it's the
 *     pre-existing inline markup `LegalBlock.text` supports for links —
 *     and always resolves `href` through `localizeHref()` before handing it
 *     to `<Link>`, so an internal href from Atlas stays language-aware the
 *     same way a fallback link from constants/legal.ts already does.
 *     Must run before pass 5, which would otherwise strip the `href` along
 *     with the tag.
 *  3. `<strong>`/`<b>` -> `**`, `<em>`/`<i>` -> `_`. These are the other two
 *     marks {@link serializeInlineText} understands, so a bold/italic word
 *     typed in the dashboard survives as a real `<strong>`/`<em>` element
 *     on the page (LegalDocPage.tsx#renderInlineText) instead of being
 *     stripped to plain text.
 *  4. `<br>` (any attributes/self-close spelling) -> `\n`. `text` still has
 *     no way to reproduce a forced line break visually (renderInlineText
 *     does not turn `\n` into a `<br>`), so a literal `\n` at least keeps
 *     the fact that a break existed instead of the two sides silently
 *     running together.
 *  5. Every remaining tag: if its name is a {@link STRUCTURAL_TAGS} member,
 *     keep it but drop its attributes (`<p class="x">` -> `<p>`) — this is
 *     also what strips a stray `on*` handler or any other attribute Tiptap
 *     added, since the tag is rebuilt from its bare name only; anything
 *     else (`<span>`, `<u>`, `<blockquote>`, ...) is removed outright,
 *     keeping its inner text in place. This is a deliberate choice, not
 *     data loss: this format has no equivalent for underline/span/etc., so
 *     the content survives, only that particular mark doesn't.
 *
 * Assumes (true of both Tiptap's serializer and this module's own
 * `escapeHtml`) that any literal `<`/`>` an editor typed into text is
 * entity-escaped in the source HTML, so a bare `<`/`>` always starts/ends a
 * real tag.
 */
function normalizeForeignHtml(html: string): string {
  const withoutDangerousBlocks = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "");

  const withLinks = withoutDangerousBlocks.replace(
    /<a\b[^>]*\bhref\s*=\s*(["'])([\s\S]*?)\1[^>]*>([\s\S]*?)<\/a>/gi,
    (_match, _quote: string, href: string, label: string) => {
      const strippedLabel = stripTags(label);
      return isSafeHref(href) ? `[${strippedLabel}](${href})` : strippedLabel;
    },
  );

  const withStrong = withLinks
    .replace(/<(?:strong|b)\b[^>]*>/gi, "**")
    .replace(/<\/(?:strong|b)>/gi, "**");

  const withEm = withStrong.replace(/<(?:em|i)\b[^>]*>/gi, "_").replace(/<\/(?:em|i)>/gi, "_");

  const withBreaks = withEm.replace(/<br\b[^>]*\/?>/gi, "\n");

  return withBreaks.replace(
    /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g,
    (_match, slash: string, tagName: string) => {
      const lower = tagName.toLowerCase();
      return STRUCTURAL_TAGS.has(lower) ? `<${slash}${lower}>` : "";
    },
  );
}

/**
 * Un-wraps `<li>`/table-cell content Tiptap wraps in a `<p>` (its default
 * block for "a paragraph inside this container") back to bare text —
 * otherwise the `<p>`/`</p>` leaks into the bullet/cell as literal
 * characters instead of being recognized as the wrapper it is. Multiple
 * paragraphs in one cell/item (unusual, but not impossible from a Tiptap
 * editor) are joined with `\n` rather than concatenated with no separator.
 */
function unwrapParagraphs(html: string): string {
  return html.replace(/<\/p>\s*<p>/g, "\n").replace(/^<p>|<\/p>$/g, "");
}

/**
 * Anything left between/after the top-level matches in {@link htmlToBlocks}
 * that isn't pure whitespace is markup the scanner couldn't place — an
 * unrecognized block tag (`<blockquote>`, ...), or a bare text node outside
 * any recognized element. Per this module's design rule, that content is
 * never dropped silently: it is kept as a best-effort plain-text paragraph
 * (same "text renders as plain text" reasoning as `normalizeForeignHtml`)
 * and logged, so an author/developer can see it happened instead of a
 * clause quietly vanishing from the page.
 */
function pushOrphanText(fragment: string, blocks: LegalBlock[]): void {
  const text = unescapeHtml(stripTags(fragment)).trim();
  if (!text) return;
  console.warn(
    `[legal-html] htmlToBlocks: unrecognized markup kept as a paragraph: ` +
      JSON.stringify(fragment.slice(0, 200)),
  );
  blocks.push({ type: "p", text });
}

/** Extracts every match of `cellPattern` within `rowHtml` as unescaped,
 * paragraph-unwrapped text (Tiptap wraps table-cell content in `<p>`). */
function extractCells(rowHtml: string, cellPattern: RegExp): string[] {
  const cells: string[] = [];
  cellPattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = cellPattern.exec(rowHtml)) !== null) {
    cells.push(unescapeHtml(unwrapParagraphs(match[1])));
  }
  return cells;
}

/** Parses a `<table>...</table>` inner HTML fragment back into `rows`. */
function parseTableRows(tableInnerHtml: string): string[][] {
  const rows: string[][] = [];

  const theadMatch = /<thead>([\s\S]*?)<\/thead>/.exec(tableInnerHtml);
  if (theadMatch) {
    const headerTr = /<tr>([\s\S]*?)<\/tr>/.exec(theadMatch[1]);
    if (headerTr) rows.push(extractCells(headerTr[1], TH_PATTERN));
  }

  const tbodyMatch = /<tbody>([\s\S]*?)<\/tbody>/.exec(tableInnerHtml);
  if (tbodyMatch) {
    TR_PATTERN.lastIndex = 0;
    let trMatch: RegExpExecArray | null;
    while ((trMatch = TR_PATTERN.exec(tbodyMatch[1])) !== null) {
      rows.push(extractCells(trMatch[1], TD_PATTERN));
    }
  }

  return rows;
}

/**
 * Converts Tiptap-flavoured HTML back into a `LegalBlock[]`. Accepts both
 * the exact markup {@link blocksToHtml} produces (its round-trip inverse)
 * and realistic HTML from the Tiptap editor Atlas' dashboard actually uses
 * — attributes on block tags, inline marks (`<strong>`, `<em>`, `<a>`,
 * `<br>`), and `<p>`-wrapped list/cell content are all normalized by
 * {@link normalizeForeignHtml}/{@link unwrapParagraphs} before the scanner
 * below runs; see their docs for what each does with content that has no
 * faithful equivalent in `LegalBlock`. Markup the scanner still can't place
 * is preserved as a paragraph, never dropped — see {@link pushOrphanText}.
 *
 * Every `<li>` inside a `<ul>`/`<ol>` becomes its own `li` block, in source
 * order, so the block count and index-based anchors (`sec-${i}` in
 * LegalDocPage.tsx) match the pre-serialization array exactly.
 */
export function htmlToBlocks(html: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  const normalized = normalizeForeignHtml(html);

  TOP_LEVEL_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  let cursor = 0;
  while ((match = TOP_LEVEL_PATTERN.exec(normalized)) !== null) {
    pushOrphanText(normalized.slice(cursor, match.index), blocks);
    cursor = TOP_LEVEL_PATTERN.lastIndex;

    const [, headingOrPTag, headingOrPContent, listTag, listContent, tableContent] = match;

    if (headingOrPTag) {
      blocks.push({
        type: headingOrPTag as "h2" | "h3" | "p",
        text: unescapeHtml(headingOrPContent),
      });
      continue;
    }

    if (listTag) {
      const kind = listTag as "ul" | "ol";
      LI_PATTERN.lastIndex = 0;
      let liMatch: RegExpExecArray | null;
      while ((liMatch = LI_PATTERN.exec(listContent)) !== null) {
        blocks.push({ type: "li", list: kind, text: unescapeHtml(unwrapParagraphs(liMatch[1])) });
      }
      continue;
    }

    // tableContent can legitimately be "" (a header-only or empty table),
    // so branch on which alternative matched rather than truthiness.
    blocks.push({ type: "table", rows: parseTableRows(tableContent ?? "") });
  }
  pushOrphanText(normalized.slice(cursor), blocks);

  return blocks;
}
