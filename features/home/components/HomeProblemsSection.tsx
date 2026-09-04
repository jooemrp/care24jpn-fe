"use client";

import Image from "next/image";
import Section from "@/components/ui/Section";
import { QueryEmptyState } from "@/components/cms/QueryEmptyState";
import { queryStates } from "@/constants/copy";
import { t, type Lang } from "@/features/lang/i18n";
import type { HomeContent } from "../types";

export function HomeProblemsSection({
  content,
  lang,
}: {
  content: HomeContent["problems"];
  lang: Lang;
}) {
  return (
    <Section surface heading={content.heading} lang={lang}>
      {content.items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {content.items.map((item, index) => (
            <div
              key={index}
              className="flex animate-fade-up flex-col items-center rounded-2xl border border-border bg-surface px-4 py-6 text-center"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light p-2.5 text-primary">
                <Image
                  src={item.image}
                  alt=""
                  width={48}
                  height={48}
                  className="h-full w-full object-contain"
                />
              </span>
              <h3 className="mt-4 text-base font-bold leading-snug text-heading">
                {t(item.title, lang)}
              </h3>
            </div>
          ))}
        </div>
      ) : (
        <QueryEmptyState title={t(queryStates.empty, lang)} />
      )}

      {content.items.length > 0 ? (
        <p className="mt-10 text-center text-lg font-semibold text-heading md:text-xl">
          {t(content.closing, lang)}
        </p>
      ) : null}
    </Section>
  );
}
