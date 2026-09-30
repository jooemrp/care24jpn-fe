"use client";

import Link from "next/link";
import { localizeHref, type Lang } from "@/features/lang/i18n";
import { parseInternalMarkdownLinks } from "@/features/cms/inline-links";
import { PhraseText } from "@/components/PhraseText";

export function CmsInlineText({ text, lang }: { text: string; lang: Lang }) {
  const parts = parseInternalMarkdownLinks(text);
  return (
    <>
      {parts.map((part, index) =>
        part.type === "link" ? (
          <Link
            key={`${part.href}-${index}`}
            href={localizeHref(part.href, lang)}
            className="font-medium text-primary underline underline-offset-2 hover:no-underline"
          >
            <PhraseText text={part.label} />
          </Link>
        ) : (
          <PhraseText key={`text-${index}`} text={part.value} className="inline" />
        ),
      )}
    </>
  );
}
