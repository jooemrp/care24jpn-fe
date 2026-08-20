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
 * tags this format ever produces (h1-h6, p, ul, ol, li, table, thead,
 * tbody, tr, th, td). Lists CAN nest a tag inside itself — Tiptap allows a
 * `<ul>`/`<ol>` inside a `<li>` inside the same list — so list scanning uses
 * a depth-counting matcher ({@link findMatchingClose}) rather than a single
 * non-greedy regex; every other top-level tag never nests inside itself in
 * practice, so the same matcher degenerates to a single top-level pass for
 * them. `LegalBlock` has no nesting-level field, so a nested `<li>` is
 * flattened into its own block rather than represented as indented — see
 * {@link parseListItems}.
 */

import type { LegalBlock, LegalTableCell } from "@/constants/legal";

/** Escapes text for use as HTML element content (not attribute content). */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Escapes text for use inside a double-quoted HTML attribute value (only
 * used for the `href` this module itself emits on a serialized link). */
function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, "&quot;");
}

/**
 * Named entities Tiptap's HTML serializer is known to emit beyond the five
 * XML-style ones (`&lt;&gt;&quot;&#39;&amp;`, still handled separately so
 * `&amp;` can be decoded LAST — see {@link unescapeHtml}). Keys are
 * lowercase; matching against the source is case-sensitive per the HTML
 * spec, but the decode side is deliberately lenient (`&NBSP;` decodes the
 * same as `&nbsp;`) since a stray case mismatch degrading to visible
 * mojibake is worse than being slightly too permissive.
 */
const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ", // NO-BREAK SPACE (U+00A0) -- deliberately not a plain ASCII space
  mdash: "—",
  ndash: "–",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  copy: "©",
  reg: "®",
  trade: "™",
  times: "×",
  divide: "÷",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/**
 * Inverse of {@link escapeHtml}, extended to a full decoder: numeric
 * (`&#NNN;` / `&#xHH;`) entities first, then the named entities in
 * {@link NAMED_ENTITIES}, with `&amp;` decoded LAST and skipped by the named
 * pass — otherwise `&amp;lt;` (a literal, escaped `&lt;` that an editor
 * typed, or that survived a double round-trip) would decode to `<` instead
 * of the literal three characters `&lt;`.
 */
function unescapeHtml(html: string): string {
  const withNumeric = html
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, dec: string) => String.fromCodePoint(parseInt(dec, 10)));

  const withNamed = withNumeric.replace(/&([a-zA-Z]+);/g, (match, name: string) => {
    if (name.toLowerCase() === "amp") return match; // decoded last, below
    const replacement = NAMED_ENTITIES[name.toLowerCase()];
    return replacement !== undefined ? replacement : match;
  });

  return withNamed.replace(/&amp;/g, "&");
}

/**
 * Serializes `LegalBlock.text` (a plain string that may contain the inline
 * markers documented at the top of this file — `**bold**`, `_italic_`) into
 * HTML: plain runs are entity-escaped via {@link escapeHtml}; a marker
 * becomes its `<strong>`/`<em>` element, with its own inner text serialized
 * the same way (so a bold span containing an italic span round-trips too).
 * The exact inverse of the `<strong>`/`<em>` half of
 * {@link normalizeForeignHtml}. `[label](href)` link syntax becomes a real
 * `<a href="...">` element — the exact inverse of the `<a href>` half of
 * {@link normalizeForeignHtml} — with `href` passed through
 * {@link isSafeHref} first: an unsafe scheme (`javascript:`, `data:`, ...)
 * serializes as plain label text with no `<a>` and no brackets, the same
 * outcome `normalizeForeignHtml` already produces for an unsafe `<a href>`
 * coming the other way. LegalDocPage.tsx's `renderInlineText` already
 * understands this syntax; this only removes the asymmetry where the parse
 * direction (HTML -> blocks) recognized `<a href>` but the serialize
 * direction (blocks -> HTML) left the markdown as literal characters.
 */
function serializeInlineText(text: string): string {
  // Declared locally (not module-level) so a recursive call for a marker's
  // inner text gets its own regex object — a shared, module-level `g`
  // regex here would corrupt the outer call's `lastIndex` mid-recursion.
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([\s\S]+?)\*\*|_([^_]+?)_/g;
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    result += escapeHtml(text.slice(lastIndex, match.index));
    const [, linkLabel, linkHref, bold, em] = match;
    if (linkLabel !== undefined) {
      if (isSafeHref(linkHref)) {
        result += `<a href="${escapeAttr(linkHref)}">${serializeInlineText(linkLabel)}</a>`;
      } else {
        result += serializeInlineText(linkLabel);
      }
    } else if (bold !== undefined) {
      result += `<strong>${serializeInlineText(bold)}</strong>`;
    } else {
      result += `<em>${serializeInlineText(em as string)}</em>`;
    }
    lastIndex = pattern.lastIndex;
  }
  result += escapeHtml(text.slice(lastIndex));
  return result;
}

/** Serializes one table cell: a plain string becomes a bare `<th>`/`<td>`
 * (byte-identical to this module's pre-gap-4 output); the `{text, colspan,
 * rowspan}` object form additionally emits `colspan`/`rowspan` attributes,
 * but only when the value is >= 2 — `1` is Tiptap's own no-op default and
 * must never round-trip back out as an attribute. */
function cellToHtml(cell: LegalTableCell, cellTag: "th" | "td"): string {
  if (typeof cell === "string") {
    return `<${cellTag}>${serializeInlineText(cell)}</${cellTag}>`;
  }
  let attrs = "";
  if (cell.colspan !== undefined && cell.colspan >= 2) attrs += ` colspan="${cell.colspan}"`;
  if (cell.rowspan !== undefined && cell.rowspan >= 2) attrs += ` rowspan="${cell.rowspan}"`;
  return `<${cellTag}${attrs}>${serializeInlineText(cell.text)}</${cellTag}>`;
}

/** Serializes one row of table cells as `<th>`/`<td>` elements. */
function rowToHtml(cells: LegalTableCell[], cellTag: "th" | "td"): string {
  return cells.map((cell) => cellToHtml(cell, cellTag)).join("");
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

/** Top-level block tags {@link htmlToBlocks} recognizes, checked in this
 * order at each scan position (order doesn't affect matching — a given
 * character position can only start one of these — but keeps the list
 * declaration and the scan loop's `indexOf` search visibly in sync). */
const TOP_LEVEL_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "table"] as const;
type TopLevelTag = (typeof TOP_LEVEL_TAGS)[number];
const HEADING_OR_P_TAGS = new Set<TopLevelTag>(["h1", "h2", "h3", "h4", "h5", "h6", "p"]);

const TR_PATTERN = /<tr>([\s\S]*?)<\/tr>/g;
/** Matches one `<th>`/`<td>` cell, capturing its (already-normalized —
 * see {@link normalizeForeignHtml} pass 5) `colspan`/`rowspan` attributes
 * separately from its content. Cell tag name itself (`th` vs `td`) does not
 * matter for parsing: whichever row a cell lands in becomes `rows[0]`
 * (header) or a later row (body) purely by its position, matching how
 * {@link blocksToHtml} always treats `rows[0]` as the header regardless of
 * whether the source used `<th>` or `<td>` there. */
const CELL_PATTERN =
  /<(?:th|td)((?:\s+(?:colspan|rowspan)="\d+")*)>([\s\S]*?)<\/(?:th|td)>/g;

/**
 * Tag names {@link TOP_LEVEL_TAGS}/`CELL_PATTERN`/`TR_PATTERN`/etc. below
 * recognize. Anything else — Tiptap's `<a>`/`<br>`/`<strong>`/`<span>`/...,
 * or any attribute on these tags besides the `colspan`/`rowspan` exception
 * documented on {@link normalizeForeignHtml} — is normalized/stripped by
 * {@link normalizeForeignHtml} before the scanner ever runs.
 */
const STRUCTURAL_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
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
 *     ONE narrow exception: on `<th>`/`<td>` only, a `colspan`/`rowspan`
 *     attribute is kept (re-emitted in that fixed order, matching
 *     {@link cellToHtml}) when its value parses as an integer >= 2 — a
 *     merged cell {@link parseTableRows} turns into the `{text, colspan,
 *     rowspan}` object cell form. `colspan="1"`/`rowspan="1"` (Tiptap
 *     stamps these on every cell by default; they are no-ops) and
 *     `colwidth` (a pixel list, never meaningful to this format) are always
 *     dropped, so a plain cell with no real span stays a plain string cell
 *     through the round trip — see {@link LegalTableCell}.
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
    /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g,
    (_match, slash: string, tagName: string, attrs: string) => {
      const lower = tagName.toLowerCase();
      if (!STRUCTURAL_TAGS.has(lower)) return "";
      if (slash === "" && (lower === "th" || lower === "td")) {
        return `<${lower}${cellSpanAttrs(attrs)}>`;
      }
      return `<${slash}${lower}>`;
    },
  );
}

/** Rebuilds a `colspan`/`rowspan` attribute string (fixed order: colspan
 * then rowspan) for {@link normalizeForeignHtml} pass 5, dropping any value
 * that parses to less than 2 (Tiptap's no-op default) and ignoring every
 * other attribute (`colwidth`, `class`, ...) entirely. */
function cellSpanAttrs(attrs: string): string {
  let result = "";
  const colspan = /\bcolspan\s*=\s*"(\d+)"/.exec(attrs);
  if (colspan && Number(colspan[1]) >= 2) result += ` colspan="${Number(colspan[1])}"`;
  const rowspan = /\browspan\s*=\s*"(\d+)"/.exec(attrs);
  if (rowspan && Number(rowspan[1]) >= 2) result += ` rowspan="${Number(rowspan[1])}"`;
  return result;
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

/** Extracts every `<th>`/`<td>` cell within one `<tr>`'s inner HTML, as a
 * plain string (no `colspan`/`rowspan`) or `{text, colspan, rowspan}`
 * object per {@link LegalTableCell} — see {@link CELL_PATTERN}. */
function extractCells(rowHtml: string): LegalTableCell[] {
  const cells: LegalTableCell[] = [];
  CELL_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CELL_PATTERN.exec(rowHtml)) !== null) {
    const [, attrs, content] = match;
    const text = unescapeHtml(unwrapParagraphs(content));
    const colspanMatch = /colspan="(\d+)"/.exec(attrs);
    const rowspanMatch = /rowspan="(\d+)"/.exec(attrs);
    if (colspanMatch || rowspanMatch) {
      const cell: { text: string; colspan?: number; rowspan?: number } = { text };
      if (colspanMatch) cell.colspan = Number(colspanMatch[1]);
      if (rowspanMatch) cell.rowspan = Number(rowspanMatch[1]);
      cells.push(cell);
    } else {
      cells.push(text);
    }
  }
  return cells;
}

/**
 * Parses a `<table>...</table>` inner HTML fragment back into `rows`.
 * Walks every `<tr>` in DOCUMENT ORDER regardless of whether it sits inside
 * `<thead>`, `<tbody>`, or neither — Tiptap's own table extension places
 * header `<th>` cells directly inside `<tbody>` with no `<thead>` wrapper at
 * all (confirmed default behaviour; see the header comment on
 * {@link htmlToBlocks}), so requiring a literal `<thead>` match (this
 * function's pre-gap-1 behaviour) silently lost the entire header row in
 * that shape. `rows[0]` — whichever `<tr>` appears first — is always the
 * header, exactly matching {@link blocksToHtml} and LegalDocPage.tsx's
 * `[headerRow, ...bodyRows]` destructure; the tag name used for a cell
 * (`<th>` vs `<td>`) has no bearing on parsing, only on position.
 */
function parseTableRows(tableInnerHtml: string): LegalTableCell[][] {
  const rows: LegalTableCell[][] = [];
  TR_PATTERN.lastIndex = 0;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = TR_PATTERN.exec(tableInnerHtml)) !== null) {
    rows.push(extractCells(trMatch[1]));
  }
  return rows;
}

/**
 * Finds the index of the `</tag>` that closes the `<tag>` opened just
 * before `contentStart`, counting nested same-name opens/closes so a
 * `<ul>` nested inside a `<li>` inside this same `<ul>` doesn't terminate
 * the scan at the FIRST `</ul>` it meets (gap 2's root cause: a naive
 * non-greedy regex match does exactly that). Works uniformly for tags that
 * never nest in practice (`h1`-`h6`, `p`, `table`) — depth returns to 0 at
 * the first close, identical to the old non-greedy behaviour — and for
 * `ul`/`ol`/`li`, which can. Assumes well-formed, already-normalized input
 * (every open tag has a matching close); a malformed table/list beyond that
 * assumption is not something this format's authors (Tiptap, or this
 * module's own `blocksToHtml`) can produce.
 */
function findMatchingClose(html: string, tag: string, contentStart: number): number {
  const openTag = `<${tag}>`;
  const closeTag = `</${tag}>`;
  let depth = 1;
  let i = contentStart;
  while (depth > 0) {
    const nextOpen = html.indexOf(openTag, i);
    const nextClose = html.indexOf(closeTag, i);
    if (nextClose === -1) return html.length; // unbalanced input: consume the rest
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + openTag.length;
    } else {
      depth--;
      if (depth === 0) return nextClose;
      i = nextClose + closeTag.length;
    }
  }
  return html.length;
}

/**
 * Splits one `<li>`'s inner HTML into its own direct text (with any nested
 * `<ul>`/`<ol>` blocks removed) and the list of nested lists found, each
 * scanned via {@link findMatchingClose} so a nested list's own nested list
 * (three levels deep) is handled the same way, recursively, by
 * {@link parseListItems}.
 */
function splitOwnTextAndNestedLists(
  liContent: string,
): { ownText: string; nestedLists: { tag: "ul" | "ol"; content: string }[] } {
  let remaining = liContent;
  let ownText = "";
  const nestedLists: { tag: "ul" | "ol"; content: string }[] = [];

  while (true) {
    const ulIndex = remaining.indexOf("<ul>");
    const olIndex = remaining.indexOf("<ol>");
    let tag: "ul" | "ol" | null = null;
    let index = -1;
    if (ulIndex !== -1 && (olIndex === -1 || ulIndex < olIndex)) {
      tag = "ul";
      index = ulIndex;
    } else if (olIndex !== -1) {
      tag = "ol";
      index = olIndex;
    }
    if (tag === null || index === -1) {
      ownText += remaining;
      break;
    }
    ownText += remaining.slice(0, index);
    const contentStart = index + `<${tag}>`.length;
    const closeIndex = findMatchingClose(remaining, tag, contentStart);
    nestedLists.push({ tag, content: remaining.slice(contentStart, closeIndex) });
    remaining = remaining.slice(closeIndex + `</${tag}>`.length);
  }

  return { ownText, nestedLists };
}

/**
 * Flattens a `<ul>`/`<ol>` list's inner HTML into `li` blocks pushed onto
 * `blocks`, one per `<li>` found at ANY nesting depth, in source order — a
 * nested item is emitted immediately after its parent item, not grouped
 * separately. Every flattened block — parent and nested alike — carries
 * `kind`, the OUTERMOST list's kind, not the nested list's own tag: a
 * nested `<ol>` inside a top-level `<ul>` still produces `list: "ul"`
 * blocks. `LegalBlock` has no nesting-level field (adding one would change
 * the block count and shift every `sec-${i}` TOC anchor after it), so a
 * real nesting level cannot be reproduced; collapsing every level to the
 * top list's kind is the documented, deliberate trade-off — preserving the
 * flat one-block-per-`<li>` guarantee matters more than reproducing
 * indentation. See the gap-2 fixture in legal-html.test.ts.
 */
function parseListItems(listContent: string, kind: "ul" | "ol", blocks: LegalBlock[]): void {
  let cursor = 0;
  while (true) {
    const liStart = listContent.indexOf("<li>", cursor);
    if (liStart === -1) break;
    const contentStart = liStart + "<li>".length;
    const closeIndex = findMatchingClose(listContent, "li", contentStart);
    const rawLiContent = listContent.slice(contentStart, closeIndex);
    cursor = closeIndex + "</li>".length;

    const { ownText, nestedLists } = splitOwnTextAndNestedLists(rawLiContent);
    blocks.push({ type: "li", list: kind, text: unescapeHtml(unwrapParagraphs(ownText)) });
    for (const nested of nestedLists) {
      parseListItems(nested.content, kind, blocks);
    }
  }
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

  let cursor = 0;
  while (cursor < normalized.length) {
    // Find the next top-level tag from `cursor`, whichever of
    // TOP_LEVEL_TAGS' opening tags occurs first. Lists/tables are matched
    // via {@link findMatchingClose}'s depth counting rather than a
    // non-greedy regex, so a `<ul>` nested inside a `<li>` inside this same
    // `<ul>` doesn't truncate the match at the first `</ul>` (gap 2).
    let bestIndex = -1;
    let bestTag: TopLevelTag | null = null;
    for (const tag of TOP_LEVEL_TAGS) {
      const index = normalized.indexOf(`<${tag}>`, cursor);
      if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
        bestIndex = index;
        bestTag = tag;
      }
    }

    if (bestIndex === -1 || bestTag === null) {
      pushOrphanText(normalized.slice(cursor), blocks);
      break;
    }

    pushOrphanText(normalized.slice(cursor, bestIndex), blocks);
    const contentStart = bestIndex + `<${bestTag}>`.length;
    const closeIndex = findMatchingClose(normalized, bestTag, contentStart);
    const content = normalized.slice(contentStart, closeIndex);
    cursor = closeIndex + `</${bestTag}>`.length;

    if (HEADING_OR_P_TAGS.has(bestTag)) {
      blocks.push({ type: bestTag as "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p", text: unescapeHtml(content) });
    } else if (bestTag === "ul" || bestTag === "ol") {
      parseListItems(content, bestTag, blocks);
    } else {
      // bestTag === "table". Content can legitimately be "" (an empty
      // table), which parseTableRows handles as zero rows.
      blocks.push({ type: "table", rows: parseTableRows(content) });
    }
  }

  return blocks;
}
