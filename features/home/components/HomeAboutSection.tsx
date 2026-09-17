"use client";

import Image from "next/image";
import Section from "@/components/ui/Section";
import { QueryEmptyState } from "@/components/cms/QueryEmptyState";
import { t, type Lang } from "@/features/lang/i18n";
import type { HomeContent } from "../types";
import { ResponsiveCopy } from "@/components/ResponsiveCopy";

export function HomeAboutSection({
  content,
  lang,
  emptyLabel,
}: {
  content: HomeContent["about"];
  lang: Lang;
  emptyLabel: string;
}) {
  return (
    <Section lang={lang} className="pt-6! md:pt-8!">
      <header className="mb-5 animate-fade-up md:mb-8" data-about-intro>
        <span
          aria-hidden="true"
          className="mb-3 block h-1 w-10 rounded-full bg-primary md:hidden"
        />
        <h2 className="mb-1 text-[1.75rem] leading-tight tracking-[-0.025em] text-heading md:text-3xl md:tracking-normal">
          {t(content.heading, lang)}
        </h2>
      </header>
      <p className="max-w-3xl text-xl font-semibold leading-relaxed text-heading md:text-2xl">
        {t(content.catchphrase, lang)}
      </p>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-body">
        <ResponsiveCopy text={content.body} lang={lang} mode="desktop-only" />
      </p>

      {content.cards.length > 0 ? (
        <ul className="mt-12 grid gap-8 sm:grid-cols-3">
          {content.cards.map((card, index) => (
            <li
              key={index}
              className="flex animate-fade-up flex-col items-center text-center"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <span className="flex h-24 w-24 items-center justify-center rounded-full border border-border bg-surface p-4 shadow-sm sm:h-28 sm:w-28">
                {card.image ? (
                  <Image
                    src={card.image}
                    alt=""
                    width={96}
                    height={96}
                    className="h-full w-full object-contain"
                  />
                ) : null}
              </span>
              <h3 className="mt-5 text-lg font-bold text-heading">{t(card.title, lang)}</h3>
              <p className="mt-2 max-w-[16rem] whitespace-pre-line text-sm leading-relaxed text-body">
                {t(card.body, lang)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8">
          <QueryEmptyState title={emptyLabel} />
        </div>
      )}

      {content.illustration ? (
        <div className="mx-auto mt-12 max-w-xl animate-fade-up" aria-hidden="true">
          <Image
            src={content.illustration}
            alt=""
            width={960}
            height={480}
            className="mx-auto h-auto w-full max-w-md object-contain"
          />
        </div>
      ) : null}
    </Section>
  );
}
