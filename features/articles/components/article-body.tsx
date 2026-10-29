import type { ReactNode } from "react";
import { PhraseText } from "@/components/PhraseText";
import Link from "next/link";
import type { LegalBlock } from "@/constants/legal";
import { localizeHref, type Lang } from "@/features/lang/i18n";

function cellText(cell: string | { text: string }): string {
  return typeof cell === "string" ? cell : cell.text;
}

/**
 * Inline marks (`**bold**`, `_italic_`, `[label](/path)`) — the same closed
 * syntax `legal-html.ts` produces — rendered as real elements. Every text run
 * goes through `PhraseText` so Japanese wraps between phrases, never inside
 * one, including inside bold and link text.
 */
function renderInline(text: string, keyPrefix: string, lang: Lang): ReactNode {
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([\s\S]+?)\*\*|_([^_]+?)_/g;
  const parts: ReactNode[] = [];
  let last = 0;
  let n = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(<PhraseText key={`${keyPrefix}-t${n}`} text={text.slice(last, match.index)} />);
    }
    const [, label, href, bold, italic] = match;
    const key = `${keyPrefix}-${n++}`;
    if (label !== undefined) {
      parts.push(
        <Link
          key={key}
          href={localizeHref(href, lang)}
          className="font-medium text-primary underline underline-offset-2 hover:no-underline"
        >
          {renderInline(label, `${key}-in`, lang)}
        </Link>,
      );
    } else if (bold !== undefined) {
      parts.push(<strong key={key}>{renderInline(bold, `${key}-in`, lang)}</strong>);
    } else {
      parts.push(<em key={key}>{renderInline(italic as string, `${key}-in`, lang)}</em>);
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) {
    parts.push(<PhraseText key={`${keyPrefix}-t${n}`} text={text.slice(last)} />);
  }
  return parts;
}

/**
 * Renders article blocks. Heading ids use the block index (`sec-<i>`) so the
 * table of contents from `articleToc` always points at the right section.
 * Every readable block carries `data-reader-block`, the hook the reader's
 * read-aloud mode walks.
 */
export function ArticleBlocks({
  blocks,
  lang,
  idPrefix = "sec",
}: {
  blocks: readonly LegalBlock[];
  lang: Lang;
  idPrefix?: string;
}): ReactNode[] {
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
        <ListTag key={`l-${i}`}>
          {items.map((text, n) => (
            <li key={n} data-reader-block>
              {renderInline(text, `li-${i}-${n}`, lang)}
            </li>
          ))}
        </ListTag>,
      );
      continue;
    }

    if (block.type === "table") {
      const [headerRow, ...bodyRows] = block.rows;
      const headers = (headerRow ?? []).map(cellText);
      out.push(
        <div key={`t-${i}`} className="table-wrap" tabIndex={0}>
          <table>
            {headerRow && (
              <thead>
                <tr>
                  {headers.map((text, ci) => (
                    <th key={ci} scope="col">
                      {text}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} data-reader-block>
                  {row.map((cell, ci) => (
                    <td key={ci} data-label={headers[ci]}>
                      {renderInline(cellText(cell), `td-${i}-${ri}-${ci}`, lang)}
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

    if (block.type === "h2" || block.type === "h3") {
      const Heading = block.type;
      out.push(
        <Heading key={`h-${i}`} id={`${idPrefix}-${i}`} data-reader-block>
          <PhraseText text={block.text.replace(/\*\*/g, "")} />
        </Heading>,
      );
      i++;
      continue;
    }

    out.push(
      <p key={`p-${i}`} data-reader-block>
        {renderInline(block.text, `p-${i}`, lang)}
      </p>,
    );
    i++;
  }

  return out;
}
