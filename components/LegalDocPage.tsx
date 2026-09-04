import type { ReactNode } from "react";
import Link from "next/link";
import Section from "@/components/ui/Section";
import TableOfContents, { type TocItem } from "@/components/TableOfContents";
import type { LegalBlock, LegalDoc, LegalTableCell } from "@/constants/legal";
import { localizeHref, type Lang } from "@/features/lang/i18n";
import { CmsContentError } from "@/features/cms/errors";

/**
 * Renders a legal block's text, turning the small set of inline markers
 * `features/cms/legal-html.ts` produces into real elements:
 *
 *   `[label](/path)`  -> a Next.js `<Link>`, its href always resolved
 *                        through `localizeHref()` so a link that came from
 *                        the CMS remains language-aware (an `/en/...`
 *                        page must never point a reader at the `ja` URL).
 *   `**bold**`         -> `<strong>`
 *   `_italic_`          -> `<em>`
 *
 * All three are recognized in one pass; a marker's own inner text is
 * rendered recursively (so `**[label](/path)**` — a bolded link — still
 * resolves the link). This is what makes the page WYSIWYG with the Tiptap
 * dashboard: whatever bold/italic/link marks an editor applies survive
 * `legal-html.ts#htmlToBlocks` as these markers and come back out here as
 * the same marks — never via `dangerouslySetInnerHTML`, so there is no
 * markup-injection surface: everything not one of these three patterns is
 * plain text, escaped by React like any other string. Plain text is returned
 * as-is with no wrapper allocated.
 *
 * The regex is declared locally, not at module scope: a recursive call for
 * a marker's inner text needs its own `lastIndex` state, and a shared `g`
 * regex object here would corrupt the outer call's iteration mid-recursion.
 */
function renderInlineText(text: string, keyPrefix: string, lang: Lang): ReactNode {
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([\s\S]+?)\*\*|_([^_]+?)_/g;
  pattern.lastIndex = 0;
  if (!pattern.test(text)) return text;
  pattern.lastIndex = 0;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let n = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const [, linkLabel, linkHref, bold, italic] = match;
    const childKey = `${keyPrefix}-${n++}`;
    if (linkLabel !== undefined) {
      parts.push(
        <Link
          key={childKey}
          href={localizeHref(linkHref, lang)}
          className="font-medium text-primary underline underline-offset-2 hover:no-underline"
        >
          {renderInlineText(linkLabel, `${childKey}-in`, lang)}
        </Link>,
      );
    } else if (bold !== undefined) {
      parts.push(<strong key={childKey}>{renderInlineText(bold, `${childKey}-in`, lang)}</strong>);
    } else {
      parts.push(
        <em key={childKey}>{renderInlineText(italic as string, `${childKey}-in`, lang)}</em>,
      );
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

/** Text content of a table cell, whether it's a plain string or the
 * `{text, colspan?, rowspan?}` object form (see {@link LegalTableCell}). */
function cellText(cell: LegalTableCell): string {
  return typeof cell === "string" ? cell : cell.text;
}

/** `colSpan`/`rowSpan` React props for a cell — empty for a plain string
 * cell, so it renders byte-identical to before this ever existed. */
function cellSpanProps(cell: LegalTableCell): { colSpan?: number; rowSpan?: number } {
  if (typeof cell === "string") return {};
  const props: { colSpan?: number; rowSpan?: number } = {};
  if (cell.colspan !== undefined) props.colSpan = cell.colspan;
  if (cell.rowspan !== undefined) props.rowSpan = cell.rowspan;
  return props;
}

/**
 * Renders the block list, folding consecutive `li` blocks of the same kind
 * into a single <ul>/<ol> and wrapping tables for horizontal overflow.
 * Anchors use the block's index within the list so the TOC stays in sync.
 */
function renderBlocks(blocks: LegalBlock[], lang: Lang): ReactNode[] {
  const out: ReactNode[] = [];
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
      const ListTag = kind;
      out.push(
        <ListTag key={out.length}>
          {items.map((text, n) => (
            <li key={n}>{renderInlineText(text, `li-${out.length}-${n}`, lang)}</li>
          ))}
        </ListTag>,
      );
      continue;
    }

    if (block.type === "table") {
      const [headerRow, ...bodyRows] = block.rows;
      out.push(
        <div key={out.length} className="table-wrap" tabIndex={0}>
          <table>
            {headerRow && (
              <thead>
                <tr>
                  {headerRow.map((cell, ci) => (
                    <th key={ci} scope="col" {...cellSpanProps(cell)}>
                      {renderInlineText(cellText(cell), `th-${out.length}-${ci}`, lang)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} {...cellSpanProps(cell)}>
                      {renderInlineText(cellText(cell), `td-${out.length}-${ri}-${ci}`, lang)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      i++;
      continue;
    }

    if (block.type === "h2") {
      // Deliberately rendered as plain text, not renderInlineText(): its
      // raw block.text also feeds TableOfContents.tsx's sidebar label
      // (tocItems below), which is out of this component's scope and shows
      // whatever string it's given as-is. A bold/link mark inside a section
      // title would then desync from its TOC entry, so section headings
      // don't carry inline marks in this format — only body text does.
      out.push(
        <h2 key={out.length} id={`sec-${i}`}>
          {block.text}
        </h2>,
      );
    } else if (block.type === "h3") {
      out.push(<h3 key={out.length}>{renderInlineText(block.text, `h3-${out.length}`, lang)}</h3>);
    } else if (block.type === "h1") {
      // Additive fidelity fix (see legal-html.ts gap 5): no live document
      // uses `h1` in body content today (the page's own `<h1>` is
      // `doc.heading`, rendered by `Section` above), so this branch is
      // exercised only if/when one appears from the CMS. Rendered like h3
      // — via renderInlineText, no TOC id — for the same reason h3 is: only
      // h2 feeds TableOfContents.tsx's anchors.
      out.push(<h1 key={out.length}>{renderInlineText(block.text, `h1-${out.length}`, lang)}</h1>);
    } else if (block.type === "h4") {
      out.push(<h4 key={out.length}>{renderInlineText(block.text, `h4-${out.length}`, lang)}</h4>);
    } else if (block.type === "h5") {
      out.push(<h5 key={out.length}>{renderInlineText(block.text, `h5-${out.length}`, lang)}</h5>);
    } else if (block.type === "h6") {
      out.push(<h6 key={out.length}>{renderInlineText(block.text, `h6-${out.length}`, lang)}</h6>);
    } else {
      out.push(<p key={out.length}>{renderInlineText(block.text, `p-${out.length}`, lang)}</p>);
    }
    i++;
  }

  return out;
}

/**
 * Renders a CMS-provided legal document (privacy policy, terms, etc.) in a
 * long-form reading layout: pure typography (no boxes around the text) with a
 * table-of-contents card — above the document on mobile, sticky beside it on
 * desktop. Body styles live in `.legal-body` (globals.css) because they are
 * relational (heading after paragraph, first child, ...).
 *
 * The JA and EN bodies are separate full texts, so the active language picks
 * the whole block list rather than translating block by block.
 *
 * `tocLabel` is passed in as a PROP, not fetched here with `getSite()`:
 * `site_ui_labels.toc_label` (`SiteContent.ui.tocLabel`, `features/cms/site.ts`)
 * is a `server-only` module, and making this component `async` to call it
 * directly breaks `features/cms/legal-html.test.ts`'s render-proof, which
 * server-renders this component synchronously via
 * `react-dom/server#renderToStaticMarkup` — a renderer that cannot resolve
 * an async Server Component. Every one of the seven caller pages (privacy,
 * tokushoho, the two terms-for-... pages, compensation, quasi-mandate,
 * cancellation-policy) already awaits `getSite()` for its own `brand`
 * metadata, so each now also resolves `t(site.ui.tocLabel, lang)` and hands
 * it down here — this component stays a plain sync function, and the CMS
 * field actually reaches the page. An empty label is rejected here as a
 * defense-in-depth check so malformed backend content cannot silently render
 * an unlabeled navigation landmark.
 */
export default function LegalDocPage({
  doc,
  lang,
  tocLabel,
}: {
  doc: LegalDoc;
  lang: Lang;
  tocLabel: string;
}) {
  if (typeof tocLabel !== "string") {
    throw new CmsContentError(
      "CMS_MISSING_REQUIRED_FIELD",
      'Required CMS field "site/site-ui-labels.toc_label" is missing.',
      ["site/site-ui-labels.toc_label"],
      "site",
    );
  }
  if (tocLabel.trim() === "") {
    throw new CmsContentError(
      "CMS_INVALID_REQUIRED_FIELD",
      'Required CMS field "site/site-ui-labels.toc_label" is malformed.',
      ["site/site-ui-labels.toc_label"],
      "site",
    );
  }

  const blocks = doc.body[lang];

  const tocItems: TocItem[] = blocks.flatMap((block, i) =>
    block.type === "h2" ? [{ id: `sec-${i}`, text: block.text }] : [],
  );
  const showToc = tocItems.length > 2;

  return (
    <Section heading={doc.heading} level="h1" lang={lang}>
      {/* No items-start here: the aside must stretch to the article's full
          height, or the sticky TOC inside it has no room to travel. */}
      <div className="lg:flex lg:gap-12">
        <div className="max-w-2xl lg:flex-1">
          {showToc && (
            <div className="mb-10 animate-fade-up lg:hidden">
              <TableOfContents items={tocItems} label={tocLabel} />
            </div>
          )}

          <div className="legal-body animate-fade-up">{renderBlocks(blocks, lang)}</div>
        </div>

        {showToc && (
          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="sticky top-40 max-h-[calc(100vh-12rem)] overflow-y-auto">
              <TableOfContents items={tocItems} label={tocLabel} />
            </div>
          </aside>
        )}
      </div>
    </Section>
  );
}
