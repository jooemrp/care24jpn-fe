/**
 * Parses CMS markdown links of the form `[label](/path)` for FAQ answers
 * and similar bilingual fields. Only same-app relative paths are treated
 * as links; everything else stays plain text so the view never hardcodes a
 * destination.
 */
export type CmsInlinePart =
  | { type: "text"; value: string }
  | { type: "link"; label: string; href: string };

function isInternalPath(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !/[\u0000-\u001f\u007f]/.test(href);
}

export function parseInternalMarkdownLinks(text: string): CmsInlinePart[] {
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: CmsInlinePart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    const label = match[1]!;
    const href = match[2]!;
    if (isInternalPath(href)) {
      parts.push({ type: "link", label, href });
    } else {
      parts.push({ type: "text", value: match[0] });
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) parts.push({ type: "text", value: text.slice(lastIndex) });
  if (parts.length === 0) parts.push({ type: "text", value: text });
  return parts;
}
