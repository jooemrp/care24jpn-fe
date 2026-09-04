"use client";

import { QueryEmptyState } from "@/components/cms/QueryEmptyState";
import { QueryErrorState } from "@/components/cms/QueryErrorState";
import { QueryLoadingState, Skeleton } from "@/components/cms/QueryLoadingState";
import { queryStates } from "@/constants/copy";
import { t, type Lang } from "@/features/lang/i18n";
import { CompanyContentView } from "./company-content";
import { useCompanyQuery } from "../hooks";

export default function CompanyView({ lang }: { lang: Lang }) {
  const query = useCompanyQuery();

  if (query.isPending) {
    return <CompanyLoadingState label={t(queryStates.loading, lang)} />;
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

  if (query.data.rows.length === 0) {
    return <QueryEmptyState title={t(queryStates.empty, lang)} />;
  }

  return <CompanyContentView content={query.data} lang={lang} />;
}

export function CompanyLoadingState({ label }: { label: string }) {
  return (
    <QueryLoadingState
      label={label}
      className="rounded-none border-0 bg-transparent px-0 py-8 shadow-none sm:px-0 md:py-12"
    >
      <section className="w-full py-8 md:py-12">
        <div className="mx-auto max-w-5xl px-6">
          <Skeleton className="h-10 w-48 md:h-12 md:w-64" />
          <dl className="mt-8 max-w-3xl">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="grid grid-cols-[minmax(5.5rem,6.5rem)_minmax(0,1fr)] gap-x-4 border-b border-border/60 py-5 first:border-t sm:gap-x-6 md:grid-cols-[9rem_1fr]"
              >
                <Skeleton className="h-5 w-16" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full max-w-xl" />
                  {index % 3 === 0 ? <Skeleton className="h-5 w-4/5 max-w-lg" /> : null}
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </QueryLoadingState>
  );
}
