"use client";

import { QueryEmptyState } from "@/components/cms/QueryEmptyState";
import { QueryErrorState } from "@/components/cms/QueryErrorState";
import { QueryLoadingState, Skeleton } from "@/components/cms/QueryLoadingState";
import { useSitePrimaryCta } from "@/components/site-cta-provider";
import { queryStates } from "@/constants/copy";
import { t, type Lang } from "@/features/lang/i18n";
import { UseCaseContentView } from "./use-case-content";
import { useUseCaseQuery } from "../hooks";

export default function UseCaseView({ lang }: { lang: Lang }) {
  const primaryCta = useSitePrimaryCta();
  const query = useUseCaseQuery();

  if (query.isPending) {
    return <UseCaseLoadingState label={t(queryStates.loading, lang)} />;
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

  if (query.data.cases.length === 0) {
    return (
      <QueryEmptyState
        title={t(queryStates.empty, lang)}
      />
    );
  }

  return (
    <UseCaseContentView
      content={query.data}
      lang={lang}
      primaryCta={primaryCta}
    />
  );
}

export function UseCaseLoadingState({ label }: { label: string }) {
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
          <div className="mx-auto flex max-w-5xl flex-col gap-16 px-6">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="grid gap-8 md:grid-cols-2 md:items-start"
              >
                <Skeleton
                  className={`aspect-16/10 w-full rounded-2xl ${
                    index % 2 === 1 ? "md:order-2" : ""
                  }`}
                />
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-24 w-full" />
                  <div className="space-y-2 pt-2">
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-6 py-8 md:py-12">
          <Skeleton className="h-12 w-52 rounded-full" />
        </div>
      </div>
    </QueryLoadingState>
  );
}
