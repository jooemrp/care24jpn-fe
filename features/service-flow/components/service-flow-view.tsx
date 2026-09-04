"use client";

import { QueryEmptyState } from "@/components/cms/QueryEmptyState";
import { QueryErrorState } from "@/components/cms/QueryErrorState";
import { QueryLoadingState, Skeleton } from "@/components/cms/QueryLoadingState";
import { useSitePrimaryCta } from "@/components/site-cta-provider";
import { queryStates } from "@/constants/copy";
import { t, type Lang } from "@/features/lang/i18n";
import { ServiceFlowContentView } from "./service-flow-content";
import { useServiceFlowQuery } from "../hooks";

export default function ServiceFlowView({ lang }: { lang: Lang }) {
  const primaryCta = useSitePrimaryCta();
  const query = useServiceFlowQuery();

  if (query.isPending) {
    return <ServiceFlowLoadingState label={t(queryStates.loading, lang)} />;
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

  if (query.data.steps.length === 0) {
    return <QueryEmptyState title={t(queryStates.empty, lang)} />;
  }

  return (
    <ServiceFlowContentView
      content={query.data}
      lang={lang}
      primaryCta={primaryCta}
    />
  );
}

export function ServiceFlowLoadingState({ label }: { label: string }) {
  return (
    <QueryLoadingState
      label={label}
      className="rounded-none border-0 bg-transparent px-0 py-8 shadow-none sm:px-0 md:py-12"
    >
      <div className="w-full">
        <div className="mx-auto max-w-5xl px-6">
          <Skeleton className="h-10 w-52 md:h-12 md:w-72" />
          <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
        </div>

        <div className="mt-8 bg-surface py-8 md:py-12">
          <div className="mx-auto max-w-5xl px-6">
            <ol className="max-w-3xl">
              {Array.from({ length: 4 }, (_, index) => (
                <li
                  key={index}
                  className="relative flex gap-6 pb-12 last:pb-0"
                >
                  {index < 3 ? (
                    <span
                      className="absolute bottom-0 left-7 top-14 border-l-2 border-dashed border-primary/20"
                      aria-hidden="true"
                    />
                  ) : null}
                  <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-3 pt-2">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-5/6" />
                  </div>
                </li>
              ))}
            </ol>
            <Skeleton className="mt-12 h-14 w-56 rounded-full" />
          </div>
        </div>
      </div>
    </QueryLoadingState>
  );
}
