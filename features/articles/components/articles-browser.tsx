"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IconArrowRight, IconClock, IconSearch, IconX } from "@tabler/icons-react";
import { PhraseText } from "@/components/PhraseText";
import { fillTemplate } from "@/lib/fill-template";

export type ArticleCard = {
  slug: string;
  href: string;
  title: string;
  category: string;
  summary: string;
  minutes: number;
};

export type BrowserLabels = {
  allCategories: string;
  searchLabel: string;
  searchPlaceholder: string;
  resultCount: string;
  noResults: string;
  resetFilters: string;
  featured: string;
  readMore: string;
  readingTime: string;
};

const CATEGORY_PARAM = "category";

const normalize = (value: string) => value.normalize("NFKC").toLowerCase();

export default function ArticlesBrowser({
  cards,
  categories,
  labels,
  diagnostics,
  contentLang,
  initialCategory,
}: {
  cards: ArticleCard[];
  categories: string[];
  labels: BrowserLabels;
  diagnostics: string[];
  contentLang: string;
  initialCategory: string | null;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(
    initialCategory && categories.includes(initialCategory) ? initialCategory : null,
  );

  const chooseCategory = (next: string | null) => {
    setCategory(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set(CATEGORY_PARAM, next);
    else url.searchParams.delete(CATEGORY_PARAM);
    window.history.replaceState(null, "", url);
  };

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return cards.filter((card) => {
      if (category && card.category !== category) return false;
      if (!needle) return true;
      return normalize(`${card.title} ${card.summary} ${card.category}`).includes(needle);
    });
  }, [cards, category, query]);

  const filtering = Boolean(category) || query.trim() !== "";

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 md:mb-10">
        <div className="relative">
          <label htmlFor="article-search" className="sr-only">
            {labels.searchLabel}
          </label>
          <IconSearch
            size={20}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id="article-search"
            type="search"
            lang={contentLang}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.searchPlaceholder}
            className="h-13 w-full rounded-full border border-border bg-surface pl-12 pr-12 text-base text-heading shadow-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={labels.resetFilters}
              className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-primary-light hover:text-heading"
            >
              <IconX size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        <div
          role="group"
          aria-label={labels.searchLabel}
          className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {[null, ...categories].map((name) => {
            const active = category === name;
            return (
              <button
                key={name ?? "__all"}
                type="button"
                aria-pressed={active}
                onClick={() => chooseCategory(name)}
                lang={name ? contentLang : undefined}
                className={`min-h-11 shrink-0 rounded-full border px-5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface text-heading hover:border-primary hover:text-primary"
                }`}
              >
                {name ?? labels.allCategories}
              </button>
            );
          })}
        </div>

        <p className="text-sm text-muted" aria-live="polite">
          {fillTemplate(labels.resultCount, { count: filtered.length })}
        </p>
      </div>

      {diagnostics.length > 0 && (
        <ul className="mb-8 space-y-2">
          {diagnostics.map((message) => (
            <li
              key={message}
              className="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-text"
            >
              {message}
            </li>
          ))}
        </ul>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <p className="mx-auto max-w-md text-base text-body">
            <PhraseText text={labels.noResults} />
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              chooseCategory(null);
            }}
            className="mt-6 inline-flex min-h-11 items-center rounded-full border-2 border-primary px-6 text-sm font-bold text-primary transition hover:bg-primary-light"
          >
            {labels.resetFilters}
          </button>
        </div>
      ) : (
        <ul className="border-t border-border">
          {filtered.map((card, position) => {
            const lead = !filtering && position === 0;
            const Heading = lead ? "h2" : "h3";
            return (
              <li key={card.slug} className="border-b border-border">
                <article className="group relative grid gap-x-10 gap-y-3 py-8 md:grid-cols-[11rem_1fr] md:py-11">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm md:flex-col md:items-start md:gap-y-2">
                    {lead && (
                      <span className="text-xs font-bold tracking-[0.14em] text-accent-deep">
                        {labels.featured}
                      </span>
                    )}
                    <span lang={contentLang} className="font-bold text-primary-deep">
                      {card.category}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <IconClock size={15} aria-hidden="true" />
                      {fillTemplate(labels.readingTime, { minutes: card.minutes })}
                    </span>
                  </div>
                  <div className="max-w-2xl">
                    <Heading
                      lang={contentLang}
                      className={`font-bold leading-snug text-heading ${
                        lead ? "text-2xl md:text-[1.75rem]" : "text-xl md:text-2xl"
                      }`}
                    >
                      <Link
                        href={card.href}
                        className="decoration-2 underline-offset-[6px] after:absolute after:inset-0 group-hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                      >
                        <PhraseText text={card.title} />
                      </Link>
                    </Heading>
                    <p lang={contentLang} className="mt-3 line-clamp-3 text-base leading-relaxed text-body">
                      {card.summary}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-transform group-hover:translate-x-0.5">
                      {labels.readMore}
                      <IconArrowRight size={17} aria-hidden="true" />
                    </span>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
