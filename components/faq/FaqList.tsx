"use client";

/**
 * FaqList — FAQ accordion list with "View More / もっと見る" expander.
 *
 * Default view: Q1–Q5 (first 5 items), all closed.
 * Expanded view: All 29 items (Q1–Q24 + S1–S5), grouped by category.
 *
 * When expanded, items are grouped under their category heading.
 * Scenarios (S1–S5) render with scenariosHeading as the section label.
 *
 * Q18's answer URL (cancellation-policy) is replaced with a Next.js Link
 * pointing to the localized /cancellation-policy page.
 *
 * Responsive: mobile-first stacking, desktop stays constrained by the
 * parent Section's max-w-5xl container.
 * Dark/light mode: uses semantic design tokens (text-heading, text-body,
 * bg-surface, border-border, text-primary, text-accent) from globals.css.
 */

import { useState } from "react";
import Link from "next/link";
import { AccordionItem } from "@/components/ui/Accordion";
import {
  faqItems,
  faqCategories,
  scenariosHeading,
  type FaqItem,
} from "@/constants/faq";
import { t, localizeHref, type Lang } from "@/features/lang/i18n";

type FaqListProps = {
  lang: Lang;
};

// ---------------------------------------------------------------------------
// Q18 special: replace raw cancellation URL with a localized Link
// ---------------------------------------------------------------------------

const CANCELLATION_URL = "https://www.care24.jp/cancellation-policy";

function AnswerWithCancellationLink({
  answer,
  lang,
}: {
  answer: string;
  lang: Lang;
}) {
  const idx = answer.indexOf(CANCELLATION_URL);
  if (idx === -1) return <>{answer}</>;

  const before = answer.slice(0, idx);
  const after = answer.slice(idx + CANCELLATION_URL.length);

  return (
    <>
      {before}
      <Link
        href={localizeHref("/cancellation-policy", lang)}
        className="font-medium text-primary underline-offset-2 hover:underline"
      >
        {lang === "ja" ? "キャンセルポリシー" : "Cancellation Policy"}
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
  const panelId = "faq-panel-Q18";
  const question = t(item.question, lang);
  const answer = t(item.answer, lang);

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
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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
            <AnswerWithCancellationLink answer={answer} lang={lang} />
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
// Copy for the toggle button
// ---------------------------------------------------------------------------

const viewMoreLabel = { ja: "もっと見る", en: "View More" } as const;
const collapseLabel = { ja: "閉じる", en: "Show Less" } as const;

/** Number of items shown by default (Q1–Q5) */
const DEFAULT_VISIBLE = 5;

// ---------------------------------------------------------------------------
// FaqList — the exported component
// ---------------------------------------------------------------------------

export default function FaqList({ lang }: FaqListProps) {
  const [expanded, setExpanded] = useState(false);

  // Group all items by category for the expanded view
  const grouped = faqCategories.map((cat) => ({
    category: cat,
    items: faqItems.filter((item) => item.category === cat.id),
  }));

  return (
    <div className="flex flex-col gap-6">
      {!expanded ? (
        /* ── Default view: Q1–Q5, flat list ─────────────────────────────── */
        <div className="flex flex-col gap-3">
          {faqItems.slice(0, DEFAULT_VISIBLE).map((item) => (
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
                  {isScenarios
                    ? t(scenariosHeading, lang)
                    : t(category.label, lang)}
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}
