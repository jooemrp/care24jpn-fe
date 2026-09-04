"use client";

import { QueryEmptyState } from "@/components/cms/QueryEmptyState";
import { QueryErrorState } from "@/components/cms/QueryErrorState";
import { QueryLoadingState, Skeleton } from "@/components/cms/QueryLoadingState";
import Section from "@/components/ui/Section";
import FaqList from "@/components/faq/FaqList";
import { queryStates } from "@/constants/copy";
import { t, type Lang } from "@/features/lang/i18n";
import { useFaqQuery } from "../hooks";

export default function FaqView({ lang }: { lang: Lang }) {
  const query = useFaqQuery();

  if (query.isPending) {
    return <FaqLoadingState label={t(queryStates.loading, lang)} />;
  }

  if (query.isError) {
    return (
      <QueryErrorState
        message={t(queryStates.error, lang)}
        retryLabel={t(queryStates.retry, lang)}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (query.data.categories.length === 0 || query.data.items.length === 0) {
    return <QueryEmptyState title={t(queryStates.empty, lang)} />;
  }

  return (
    <>
      <Section heading={query.data.hero.heading} level="h1" lang={lang}>
        <p className="max-w-2xl text-base leading-relaxed text-body">
          {t(query.data.hero.body, lang)}
        </p>
      </Section>

      <Section surface lang={lang}>
        <FaqList
          lang={lang}
          items={query.data.items}
          categories={query.data.categories}
          scenariosHeading={query.data.scenariosHeading}
          viewMoreLabel={query.data.viewMoreLabel}
          collapseLabel={query.data.collapseLabel}
        />
      </Section>
    </>
  );
}

function FaqLoadingState({ label }: { label: string }) {
  return (
    <QueryLoadingState
      label={label}
      className="rounded-none border-0 bg-transparent px-0 py-8 shadow-none sm:px-0 md:py-12"
    >
      <div className="w-full">
        <div className="mx-auto max-w-5xl px-6">
          <Skeleton className="h-10 w-48 md:h-12 md:w-64" />
          <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
        </div>
        <div className="mt-8 bg-surface py-8 md:py-12">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl md:h-20" />
            ))}
            <Skeleton className="mx-auto mt-5 h-12 w-36 rounded-full" />
          </div>
        </div>
      </div>
    </QueryLoadingState>
  );
}
