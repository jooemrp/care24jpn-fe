import { Fragment, type CSSProperties, type ReactNode } from "react";
import { PhraseText } from "@/components/PhraseText";
import Link from "next/link";
import type { LegalAlign, LegalBlock } from "@/constants/legal";
import { cellSegments } from "@/features/cms/cell-lines";
import { localizeHref, type Lang } from "@/features/lang/i18n";

/** Characters kept together at the end of a text run so a block never ends on a stray 1-2 (CARE-505). */
const TAIL = 3;

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
      parts.push(<PhraseText key={`${keyPrefix}-t${n}`} text={text.slice(last, match.index)} keepTail={TAIL} />);
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
    parts.push(<PhraseText key={`${keyPrefix}-t${n}`} text={text.slice(last)} keepTail={TAIL} />);
  }
  return parts;
}

/** A table cell's text, with a bulleted list typed inside the cell drawn as a real `<ul>` (ClickUp #5). */
function renderCell(text: string, keyPrefix: string, lang: Lang): ReactNode {
  return cellSegments(text).map((segment, s) =>
    segment.type === "ul" ? (
      <ul key={`${keyPrefix}-u${s}`}>
        {segment.items.map((item, n) => (
          <li key={n}>{renderInline(item, `${keyPrefix}-u${s}-${n}`, lang)}</li>
        ))}
      </ul>
    ) : (
      <Fragment key={`${keyPrefix}-s${s}`}>{renderInline(segment.text, `${keyPrefix}-s${s}`, lang)}</Fragment>
    ),
  );
}

/** Alignment chosen in the CMS editor; undefined keeps the stylesheet default. */
const alignStyle = (align: LegalAlign | undefined): CSSProperties | undefined =>
  align ? { textAlign: align } : undefined;
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
      const items: { text: string; align?: LegalAlign }[] = [];
      while (i < blocks.length) {
        const next = blocks[i];
        if (next.type !== "li" || next.list !== kind) break;
        items.push({ text: next.text, align: next.align });
        i++;
      }
      const ListTag = kind;
      out.push(
        <ListTag key={`l-${i}`}>
          {items.map(({ text, align }, n) => (
            <li key={n} data-reader-block data-align={align} style={alignStyle(align)}>
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
                      {renderCell(cellText(cell), `td-${i}-${ri}-${ci}`, lang)}
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
        <Heading
          key={`h-${i}`}
          id={`${idPrefix}-${i}`}
          data-reader-block
          data-align={block.align}
          style={alignStyle(block.align)}
        >
          <PhraseText text={block.text.replace(/\*\*/g, "")} keepTail={TAIL} />
        </Heading>,
      );
      i++;
      continue;
    }

    out.push(
      <p key={`p-${i}`} data-reader-block data-align={block.align} style={alignStyle(block.align)}>
        {renderInline(block.text, `p-${i}`, lang)}
      </p>,
    );
    i++;
  }

  return out;
}
