import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { PhraseText } from "@/components/PhraseText";
import { CmsContractNotice } from "@/components/cms/CmsContractNotice";
import type { LegalBlock } from "@/constants/legal";
import { isCmsFieldErrorMarker } from "@/features/cms/fields";
import { localizeHref, type Lang } from "@/features/lang/i18n";
import { ArticleBlocks } from "./article-body";

const isExternal = (href: string) => /^https?:\/\//.test(href);

/** Closing call to action such as 「詳細はこちら」; it must never split across lines. */
const CTA_TAIL = /(?:詳細・料金は|詳細は|詳しくは)?こちら$/;

/** CTA button label. On phones the brand lead-in ("Care24Japanの") sits on its own
 * line and the rest follows on the next; the closing 「…こちら」 stays whole. */
const CTA_LEAD = /^(.+?の)(「.+)$/;

export function CtaLabel({ text, lang }: { text: string; lang: string }) {
  const split = CTA_LEAD.exec(text);
  const lead = split?.[1];
  const rest = split ? split[2] : text;
  const tail = CTA_TAIL.exec(rest)?.[0];
  const head = tail ? rest.slice(0, rest.length - tail.length) : rest;
  return (
    <span lang={lang}>
      {lead && <span className="block whitespace-nowrap sm:inline">{lead}</span>}
      {/* 「 is a full-width glyph whose ink sits in its right half; pull the first
          line of this block back by half an em so the centred line looks centred. */}
      <span className={lead ? "block [text-indent:-0.5em] [&_span]:[text-indent:0] sm:[text-indent:0] sm:inline" : undefined}>
        {head && <PhraseText text={head} />}
        {tail && <span className="inline-block whitespace-nowrap">{tail}</span>}
      </span>
    </span>
  );
}

/**
 * Button styling (client request, ClickUp #2). Phones: full width, centred
 * text, `px-3`, and a softer `rounded-xl` corner, which suits a two-line
 * label better than a pill. From `sm` up: the original centred pill.
 */
export const CTA_BUTTON_CLASS =
  "inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary-deep px-3 py-3 text-center text-[0.875rem] font-bold leading-snug text-white shadow-sm transition max-[359px]:text-[0.8125rem] sm:w-auto sm:rounded-full sm:px-8 sm:text-base hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";

/**
 * The closing CTA box of an article: CMS body copy and one button.
 * `labelShort` (CMS `cta_label_short`, optional) replaces the label on phones
 * only; without it the full `label` shows everywhere, split as in {@link CtaLabel}.
 */
export function ArticleCta({
  body,
  label,
  labelShort,
  href,
  lang,
  contentLang,
}: {
  body: readonly LegalBlock[];
  label: string;
  labelShort?: string;
  href: string;
  lang: Lang;
  contentLang: string;
}) {
  const short = labelShort?.trim();
  const content = (
    <>
      {short ? (
        <>
          <span className="sm:hidden">
            <CtaLabel text={short} lang={contentLang} />
          </span>
          <span className="hidden sm:inline">
            <CtaLabel text={label} lang={contentLang} />
          </span>
        </>
      ) : (
        <CtaLabel text={label} lang={contentLang} />
      )}
      <IconArrowRight size={20} aria-hidden="true" className="shrink-0" />
    </>
  );

  return (
    <aside className="mx-auto mt-8 max-w-[40rem] overflow-hidden rounded-3xl border border-border bg-surface md:mt-14">
      <div lang={contentLang} className="article-prose p-5 pb-4 text-base md:p-9 md:pb-6 md:text-[1.0625rem] [&>:last-child]:mb-0">
        {ArticleBlocks({ blocks: body, lang, idPrefix: "cta" })}
      </div>
      <div className="px-5 pb-6 md:px-9 md:pb-10">
        {isCmsFieldErrorMarker(href) ? (
          <CmsContractNotice details={href} />
        ) : isExternal(href) ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className={CTA_BUTTON_CLASS}>
            {content}
          </a>
        ) : (
          <Link href={localizeHref(href, lang)} className={CTA_BUTTON_CLASS}>
            {content}
          </Link>
        )}
      </div>
    </aside>
  );
}
