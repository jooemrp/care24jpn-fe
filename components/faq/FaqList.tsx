"use client";

/**
 * FaqList — FAQ accordion list with "View More / もっと見る" expander.
 *
 * Default view: first 5 items, all closed.
 * Expanded view: all items, grouped by category.
 *
 * Data is passed in as props from the server page (CMS-sourced via
 * `getFaq()`); there is no `constants/faq.ts` import here.
 *
 * Q18's answer URL (cancellation-policy) is replaced with a Next.js Link
 * pointing to the localized /cancellation-policy page — the raw href comes
 * from the CMS answer text; the LINK itself is a UI affordance, not content.
 *
 * Responsive: mobile-first stacking, desktop stays constrained by the
 * parent Section's max-w-5xl container.
 * Dark/light mode: uses semantic design tokens (text-heading, text-body,
 * bg-surface, border-border, text-primary, text-accent) from globals.css.
 */

import { useState } from "react";
import Link from "next/link";
import { IconChevronDown } from "@tabler/icons-react";
import { AccordionItem } from "@/components/ui/Accordion";
import type { Bilingual } from "@/features/cms/types";
import { t, localizeHref, type Lang } from "@/features/lang/i18n";

type FaqItem = {
  id: string;
  category: string;
  question: Bilingual;
  answer: Bilingual;
};

type FaqListProps = {
  lang: Lang;
  categories: { id: string; label: Bilingual }[];
  items: FaqItem[];
};

// ---------------------------------------------------------------------------
// Q18 special: replace the raw cancellation URL in the answer text with a
// localized Link. The URL string is looked up in the CMS-sourced answer
// (no hardcoded label / URL — the same value the seed writes for Q18).
// ---------------------------------------------------------------------------

function AnswerWithCancellationLink({
  answer,
  lang,
  linkUrl,
  linkLabel,
}: {
  answer: string;
  lang: Lang;
  linkUrl: string;
  linkLabel: { ja: string; en: string };
}) {
  const idx = answer.indexOf(linkUrl);
  if (idx === -1) return <>{answer}</>;

  const before = answer.slice(0, idx);
  const after = answer.slice(idx + linkUrl.length);

  return (
    <>
      {before}
      <Link
        href={localizeHref(linkUrl, lang)}
        className="font-medium text-primary underline-offset-2 hover:underline"
      >
        {t(linkLabel, lang)}
      </Link>
      {after}
    </>
  );
}

/**
 * Accordion item for Q18 — uses its own open/close state so the answer panel
 * can render React nodes (the Link) instead of a plain string.
 */
function Q18AccordionItem({ item, lang }: { item: FaqItem; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-panel-${item.id}`;
  const question = t(item.question, lang);
  const answer = t(item.answer, lang);

  // The link URL is extracted from the CMS answer itself: wherever the
  // /cancellation-policy href appears, it renders as a localized Link.
  // The label is the same UI convention the seed's Q18 answer carries.
  const linkUrlMatch =
    /https?:\/\/[^\s]+cancellation-policy[^\s]*|(?:\/cancellation-policy(?:\?[^\s]*)?)/.exec(answer)?.[0] ??
    "https://www.care24.jp/cancellation-policy";

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
        className={[
          "w-full flex items-center justify-between gap-4",
          "px-5 py-4 md:px-6 md:py-5",
          "text-left text-base md:text-lg font-semibold text-heading",
          "bg-surface hover:bg-primary-light transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
        ].join(" ")}
      >
        <span className="flex-1">{question}</span>
        <span
          aria-hidden="true"
          className={`shrink-0 text-primary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <IconChevronDown size={20} stroke={1.75} />
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        className={[
          "grid transition-all duration-200 ease-in-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1 md:px-6 md:pb-6 text-base leading-relaxed text-body">
            <AnswerWithCancellationLink
              answer={answer}
              lang={lang}
              linkUrl={linkUrlMatch}
              linkLabel={{ ja: "キャンセルポリシー", en: "Cancellation Policy" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared renderer — picks Q18AccordionItem or plain AccordionItem
// ---------------------------------------------------------------------------

function FaqItem({ item, lang }: { item: FaqItem; lang: Lang }) {
  if (item.id === "Q18") {
    return <Q18AccordionItem item={item} lang={lang} />;
  }
  return (
    <AccordionItem
      question={t(item.question, lang)}
      answer={t(item.answer, lang)}
      defaultOpen={false}
    />
  );
}

// ---------------------------------------------------------------------------
// Copy for the toggle button — UI chrome (not page content); kept local to
// this component because there is no CMS block for it and it is shared
// chrome, not a CMS-editable copy decision.
// ---------------------------------------------------------------------------

const viewMoreLabel = { ja: "もっと見る", en: "View More" } as const;
const collapseLabel = { ja: "閉じる", en: "Show Less" } as const;

/** Number of items shown by default (first 5) */
const DEFAULT_VISIBLE = 5;

// ---------------------------------------------------------------------------
// FaqList — the exported component
// ---------------------------------------------------------------------------

export default function FaqList({ lang, categories, items }: FaqListProps) {
  const [expanded, setExpanded] = useState(false);

  // Group all items by category for the expanded view
  const grouped = categories.map((category) => ({
    category,
    items: items.filter((item) => item.category === category.id),
  }));

  return (
    <div className="flex flex-col gap-6">
      {!expanded ? (
        /* ── Default view: first 5 items, flat list ─────────────────────── */
        <div className="flex flex-col gap-3">
          {items.slice(0, DEFAULT_VISIBLE).map((item) => (
            <FaqItem key={item.id} item={item} lang={lang} />
          ))}
        </div>
      ) : (
        /* ── Expanded view: all items, grouped by category ───────────────── */
        <div className="flex flex-col gap-10">
          {grouped.map(({ category, items }) => {
            if (items.length === 0) return null;
            const isScenarios = category.id === "scenarios";

            return (
              <section
                key={category.id}
                aria-labelledby={`faq-cat-heading-${category.id}`}
              >
                <h3
                  id={`faq-cat-heading-${category.id}`}
                  className={[
                    "text-lg md:text-xl font-bold mb-4",
                    isScenarios ? "text-accent" : "text-primary",
                  ].join(" ")}
                >
                  {t(category.label, lang)}
                </h3>

                <div className="flex flex-col gap-3">
                  {items.map((item) => (
                    <FaqItem key={item.id} item={item} lang={lang} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ── View More / Show Less toggle ─────────────────────────────────── */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className={[
            "inline-flex items-center gap-2 px-8 py-3 rounded-full",
            "font-medium text-base transition-colors duration-150",
            "border-2 border-primary text-primary bg-transparent",
            "hover:bg-primary hover:text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "focus-visible:ring-offset-2",
          ].join(" ")}
        >
          {expanded ? t(collapseLabel, lang) : t(viewMoreLabel, lang)}
          <span
            aria-hidden="true"
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          >
            <IconChevronDown size={16} stroke={1.5} />
          </span>
        </button>
      </div>
    </div>
  );
}