"use client";

import { QueryErrorState } from "@/components/cms/QueryErrorState";
import { QueryLoadingState, Skeleton } from "@/components/cms/QueryLoadingState";
import { queryStates, type Bilingual } from "@/constants/copy";
import { t, type Lang } from "@/features/lang/i18n";
import { useRatesQuery } from "../hooks";
import { FeesRatesContent, PricingRatesContent } from "./RatesContent";
import type { RatesContent } from "../types";

export { FeesRatesContent, PricingRatesContent } from "./RatesContent";

type RatesViewProps =
  | {
      lang: Lang;
      mode: "pricing";
    }
  | {
      lang: Lang;
      mode: "fees";
      contactCta: Bilingual;
    };

/**
 * Client-owned query state for both rates routes. The query itself is
 * deliberately shared; only the projection and copy section differ by
 * `mode`.
 */
export default function RatesView(props: RatesViewProps) {
  const { lang, mode } = props;
  const query = useRatesQuery();

  if (query.isPending) {
    return <RatesLoadingState label={t(queryStates.loading, lang)} mode={mode} />;
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

  const rates = query.data as RatesContent;
  return mode === "pricing" ? (
    <PricingRatesContent rates={rates} lang={lang} />
  ) : (
    <FeesRatesContent rates={rates} lang={lang} contactCta={props.contactCta} />
  );
}

export function RatesLoadingState({
  label,
  mode,
}: {
  label: string;
  mode: RatesViewProps["mode"];
}) {
  return (
    <QueryLoadingState
      label={label}
      className="rounded-none border-0 bg-transparent px-0 py-8 shadow-none sm:px-0 md:py-12"
    >
      <div className="mx-auto w-full max-w-5xl px-6">
        <Skeleton className="h-10 w-56 md:h-12 md:w-72" />
        <Skeleton className="mt-4 h-6 w-full max-w-2xl" />

        {mode === "pricing" ? <PricingRatesSkeleton /> : <FeesRatesSkeleton />}
      </div>
    </QueryLoadingState>
  );
}

function PricingRatesSkeleton() {
  return (
    <>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>

      <div className="mt-8 bg-surface py-8 md:py-12">
        <div className="grid gap-6 lg:grid-cols-2">
          <RateCardSkeleton />
          <RateCardSkeleton accent />
        </div>
        <Skeleton className="mt-8 h-6 w-3/4" />
        <Skeleton className="mt-4 h-5 w-56" />
      </div>
    </>
  );
}

function RateCardSkeleton({ accent = false }: { accent?: boolean }) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border-2 bg-surface ${
        accent ? "border-accent" : "border-primary"
      }`}
    >
      <Skeleton className={`h-16 rounded-none ${accent ? "bg-accent-light" : ""}`} />
      <div className="p-7">
        <Skeleton className="h-6 w-48" />
        <div className="mt-3 grid gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-2">
          <div className="bg-surface px-5 py-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-3 h-10 w-36" />
          </div>
          <div className="bg-surface px-5 py-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-3 h-10 w-36" />
          </div>
        </div>
        <div className="mt-6 divide-y divide-border border-t border-border">
          <Skeleton className="my-4 h-6 w-full" />
          <Skeleton className="my-4 h-6 w-5/6" />
        </div>
      </div>
    </section>
  );
}

function FeesRatesSkeleton() {
  return (
    <div className="mt-8 bg-surface py-8 md:py-12">
      <div className="flex flex-col gap-6">
        {Array.from({ length: 2 }, (_, index) => (
          <section
            key={index}
            className="overflow-hidden rounded-2xl border border-border bg-surface"
          >
            <Skeleton className="h-16 rounded-none" />
            <div className="overflow-hidden px-7 pb-6">
              <div className="border-b border-border py-4">
                <div className="flex justify-between gap-4">
                  <Skeleton className="h-5 w-2/5" />
                  <Skeleton className="h-5 w-1/5" />
                  <Skeleton className="h-5 w-1/5" />
                </div>
              </div>
              {Array.from({ length: 4 }, (_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex items-center justify-between gap-4 border-b border-border/60 py-4 last:border-0"
                >
                  <Skeleton className="h-6 w-2/5" />
                  <Skeleton className="h-6 w-1/5" />
                  <Skeleton className="h-6 w-1/5" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <Skeleton className="mt-8 h-6 w-3/4" />
      <Skeleton className="mt-10 h-14 w-56 rounded-full" />
    </div>
  );
}
