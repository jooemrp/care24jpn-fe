import type { ReactNode } from "react";
import Link from "next/link";
import { localizeHref, type Lang } from "@/features/lang/i18n";

/**
 * Renders CMS plain text with the same small inline-marker set LegalDocPage
 * understands for FAQ answers and similar short fields:
 *
 *   `[label](/path)`  -> Next.js `<Link>` via `localizeHref`
 *   `**bold**`         -> `<strong>`
 *   `_italic_`          -> `<em>`
 *
 * Markers nest (so `**[label](/path)**` still resolves the link). Anything
 * else is plain React text — never `dangerouslySetInnerHTML`.
 */
export function InlineCmsText({
  text,
  lang,
  keyPrefix = "cms",
}: {
  text: string;
  lang: Lang;
  keyPrefix?: string;
}): ReactNode {
  return renderInlineText(text, keyPrefix, lang);
}

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
