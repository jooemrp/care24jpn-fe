"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { AccordionItem } from "@/components/ui/Accordion";
import { InlineCmsText } from "@/components/cms/InlineCmsText";
import { t, type Lang } from "@/features/lang/i18n";

export type FaqItem = {
  id: string;
  category: string;
  question: { ja: string; en: string };
  answer: { ja: string; en: string };
};

export type FaqCategory = {
  id: string;
  label: { ja: string; en: string };
};

type FaqListProps = {
  lang: Lang;
  items: FaqItem[];
  categories: FaqCategory[];
  scenariosHeading: { ja: string; en: string };
  viewMoreLabel: { ja: string; en: string };
  collapseLabel: { ja: string; en: string };
  defaultVisible?: number;
};

/**
 * Presentational FAQ accordion. All questions, answers, categories, and
 * controls are supplied by the caller; this component does not import or
 * invent bundled FAQ copy. Answer `[label](/path)` markers from CMS are
 * resolved through InlineCmsText + localizeHref — never hardcoded hrefs.
 */
export default function FaqList({
  lang,
  items,
  categories,
  scenariosHeading,
  viewMoreLabel,
  collapseLabel,
  defaultVisible = 5,
}: FaqListProps) {
  const [expanded, setExpanded] = useState(false);
  const grouped = categories.map((category) => ({
    category,
    items: items.filter((item) => item.category === category.id),
  }));

  return (
    <div className="flex flex-col gap-6">
      {!expanded ? (
        <div className="flex flex-col gap-3">
          {items.slice(0, defaultVisible).map((item) => (
            <AccordionItem
              key={item.id}
              question={t(item.question, lang)}
              answer={
                <InlineCmsText
                  text={t(item.answer, lang)}
                  lang={lang}
                  keyPrefix={item.id}
                />
              }
              defaultOpen={false}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {grouped.map(({ category, items: categoryItems }) => {
            if (categoryItems.length === 0) return null;
            const isScenarios = category.id === "scenarios";

            return (
              <section key={category.id} aria-labelledby={`faq-cat-heading-${category.id}`}>
                <h3
                  id={`faq-cat-heading-${category.id}`}
                  className={[
                    "mb-4 text-lg font-bold md:text-xl",
                    isScenarios ? "text-accent" : "text-primary",
                  ].join(" ")}
                >
                  {isScenarios ? t(scenariosHeading, lang) : t(category.label, lang)}
                </h3>
                <div className="flex flex-col gap-3">
                  {categoryItems.map((item) => (
                    <AccordionItem
                      key={item.id}
                      question={t(item.question, lang)}
                      answer={
                        <InlineCmsText
                          text={t(item.answer, lang)}
                          lang={lang}
                          keyPrefix={item.id}
                        />
                      }
                      defaultOpen={false}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => setExpanded((previous) => !previous)}
          className={[
            "inline-flex items-center gap-2 rounded-full px-8 py-3",
            "border-2 border-primary bg-transparent font-medium text-primary transition-colors",
            "hover:bg-primary hover:text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "focus-visible:ring-offset-2",
          ].join(" ")}
        >
          {expanded ? t(collapseLabel, lang) : t(viewMoreLabel, lang)}
          <span
            aria-hidden="true"
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <IconChevronDown size={16} stroke={1.5} />
          </span>
        </button>
      </div>
    </div>
  );
}
