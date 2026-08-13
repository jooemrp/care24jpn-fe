import type { ReactNode } from "react";
import Link from "next/link";
import Section from "@/components/ui/Section";
import TableOfContents, { type TocItem } from "@/components/TableOfContents";
import type { LegalBlock, LegalDoc } from "@/constants/legal";
import { localizeHref, type Lang } from "@/features/lang/i18n";

const INLINE_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Renders a legal block's text, turning any `[label](/path)` markdown-style
 * link into a real Next.js `<Link>`. Plain text (the common case) is
 * returned as-is; this is the only inline markup legal.ts block text
 * supports.
 */
function renderInlineText(text: string, keyPrefix: string, lang: Lang): ReactNode {
  INLINE_LINK_PATTERN.lastIndex = 0;
  if (!INLINE_LINK_PATTERN.test(text)) return text;
  INLINE_LINK_PATTERN.lastIndex = 0;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let n = 0;
  while ((match = INLINE_LINK_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const [, label, href] = match;
    parts.push(
      <Link
        key={`${keyPrefix}-link-${n++}`}
        href={localizeHref(href, lang)}
        className="font-medium text-primary underline underline-offset-2 hover:no-underline"
      >
        {label}
      </Link>,
    );
    lastIndex = INLINE_LINK_PATTERN.lastIndex;
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
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{cell}</td>
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
      out.push(
        <h2 key={out.length} id={`sec-${i}`}>
          {block.text}
        </h2>,
      );
    } else if (block.type === "h3") {
      out.push(<h3 key={out.length}>{block.text}</h3>);
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
