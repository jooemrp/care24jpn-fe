/**
 * Removes the inline markers `legal-html.ts#htmlToBlocks` produces
 * (`**bold**`, `_italic_`, `[label](href)`), keeping only the visible text.
 *
 * Used where a block's text is shown as PLAIN text: section headings (h2) and
 * the table-of-contents labels derived from them. Without it, a heading the
 * editor made bold (`<h2><strong>…`) leaks literal `**` onto the page.
 * Mirrors the patterns of `renderInlineText` in components/LegalDocPage.tsx
 * so both stay consistent; nested markers (a bolded link) are unwrapped in turn.
 */
export function stripInlineMarks(text: string): string {
  let previous: string;
  let current = text;
  do {
    previous = current;
    current = current
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
      .replace(/_([^_]+?)_/g, "$1");
  } while (current !== previous);
  return current;
}
