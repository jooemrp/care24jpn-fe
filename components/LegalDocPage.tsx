import type { ReactNode } from "react";
import Link from "next/link";
import Section from "@/components/ui/Section";
import TableOfContents, { type TocItem } from "@/components/TableOfContents";
import type { LegalBlock, LegalDoc } from "@/constants/legal";
import { localizeHref, type Lang } from "@/features/lang/i18n";

/**
 * Renders a legal block's text, turning the small set of inline markers
 * `features/cms/legal-html.ts` produces into real elements:
 *
 *   `[label](/path)`  -> a Next.js `<Link>`, its href always resolved
 *                        through `localizeHref()` so a link that came from
 *                        the CMS is just as language-aware as a fallback
 *                        link authored in constants/legal.ts (an `/en/...`
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
 * plain text, escaped by React like any other string. Plain text (the
 * common case, and the entirety of constants/legal.ts today) is returned
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
                    <th key={ci} scope="col">
                      {renderInlineText(cell, `th-${out.length}-${ci}`, lang)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{renderInlineText(cell, `td-${out.length}-${ri}-${ci}`, lang)}</td>
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
    } else {
      out.push(<p key={out.length}>{renderInlineText(block.text, `p-${out.length}`, lang)}</p>);
    }
    i++;
  }

  return out;
}

/**
 * Renders a client-provided legal document (privacy policy, terms, etc.) in a
 * long-form reading layout: pure typography (no boxes around the text) with a
 * table-of-contents card — above the document on mobile, sticky beside it on
 * desktop. Body styles live in `.legal-body` (globals.css) because they are
 * relational (heading after paragraph, first child, ...).
 *
 * The JA and EN bodies are separate full texts, so the active language picks
 * the whole block list rather than translating block by block.
 */
export default function LegalDocPage({ doc, lang }: { doc: LegalDoc; lang: Lang }) {
  const blocks = doc.body[lang];

  const tocItems: TocItem[] = blocks.flatMap((block, i) =>
    block.type === "h2" ? [{ id: `sec-${i}`, text: block.text }] : [],
  );
  const tocLabel = lang === "ja" ? "目次" : "Table of Contents";
  const showToc = tocItems.length > 2;

  return (
    <Section heading={doc.heading} level="h1" lang={lang}>
      {/* No items-start here: the aside must stretch to the article's full
          height, or the sticky TOC inside it has no room to travel. */}
      <div className="lg:flex lg:gap-12">
        <div className="max-w-[42rem] lg:flex-1">
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
