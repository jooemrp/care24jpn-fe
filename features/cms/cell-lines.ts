/**
 * Table cells are single strings (`LegalTableCell`), so a bulleted list typed
 * inside a cell in the CMS reaches the renderer as lines that start with
 * {@link CELL_BULLET} (features/cms/legal-html.ts#cellContentToText). This
 * splits a cell back into plain text runs and real bullet lists, so the
 * article and legal renderers can draw a `<ul>` instead of showing the
 * bullets, or the raw `<ul><li>`, as text (ClickUp #5).
 */

/** Start of a bulleted list item inside table-cell text. */
export const CELL_BULLET = "• ";

export type CellSegment = { type: "text"; text: string } | { type: "ul"; items: string[] };

/** Consecutive bullet lines become one `ul`; every other run of lines stays
 * text (its own `\n`s are shown by `white-space: pre-line` on the cell). */
export function cellSegments(text: string): CellSegment[] {
  if (!text.includes(CELL_BULLET)) return [{ type: "text", text }];

  const segments: CellSegment[] = [];
  for (const line of text.split("\n")) {
    const last = segments[segments.length - 1];
    if (line.startsWith(CELL_BULLET)) {
      const item = line.slice(CELL_BULLET.length);
      if (last?.type === "ul") last.items.push(item);
      else segments.push({ type: "ul", items: [item] });
    } else if (last?.type === "text") {
      last.text += `\n${line}`;
    } else {
      segments.push({ type: "text", text: line });
    }
  }
  return segments;
}
