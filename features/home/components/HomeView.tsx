"use client";

import { QueryEmptyState } from "@/components/cms/QueryEmptyState";
import { QueryErrorState } from "@/components/cms/QueryErrorState";
import { QueryLoadingState, Skeleton } from "@/components/cms/QueryLoadingState";
import { queryStates, type Bilingual } from "@/constants/copy";
import { t, type Lang } from "@/features/lang/i18n";
import type { ReactNode } from "react";
import { useHomeQuery } from "../hooks";
import { HomeContentView } from "./HomeContent";

export { HomeContentView } from "./HomeContent";

type HomeViewProps = {
  lang: Lang;
  contactCta: Bilingual;
};

/**
 * Query boundary for the single `/pages/home` response. All sections receive
 * the same snapshot; none of them starts an independent CMS request.
 */
export default function HomeView({ lang, contactCta }: HomeViewProps) {
  const query = useHomeQuery();

  if (query.isPending) {
    return <HomeLoadingState lang={lang} />;
  }

  if (query.isError) {
    return <HomeErrorState lang={lang} onRetry={() => void query.refetch()} />;
  }

  if (!query.data) {
    return <QueryEmptyState title={t(queryStates.empty, lang)} />;
  }

  return <HomeContentView content={query.data} lang={lang} contactCta={contactCta} />;
}

function HomeLoadingState({ lang }: { lang: Lang }) {
  const label = t(queryStates.loading, lang);

  return (
    <QueryLoadingState
      label={label}
      className="rounded-none border-0 bg-transparent px-0 py-0 shadow-none sm:px-0"
    >
      <div className="w-full" aria-hidden="true">
        <section className="min-h-[calc(100dvh-81px)] bg-primary-light md:min-h-[calc(100dvh-130px)]">
          <div className="mx-auto flex min-h-[inherit] max-w-6xl flex-col justify-center px-6 py-20 md:py-24">
            <div className="max-w-xl space-y-5">
              <Skeleton className="h-6 w-44 rounded-full bg-border/70" />
              <Skeleton className="h-12 w-full max-w-md bg-border/70 md:h-16" />
              <Skeleton className="h-12 w-4/5 max-w-sm bg-border/70 md:h-16" />
              <Skeleton className="h-12 w-52 rounded-full bg-border/70" />
              <Skeleton className="h-11 w-56 rounded-full bg-border/70" />
            </div>
          </div>
        </section>

        <HomeSkeletonSection>
          <Skeleton className="h-9 w-56" />
          <Skeleton className="mt-6 h-8 w-full max-w-3xl" />
          <Skeleton className="mt-4 h-20 w-full max-w-3xl" />
          <ul className="mt-12 grid gap-8 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <li key={index} className="flex flex-col items-center">
                <Skeleton className="h-24 w-24 rounded-full sm:h-28 sm:w-28" />
                <Skeleton className="mt-5 h-6 w-32" />
                <Skeleton className="mt-3 h-12 w-48 max-w-full" />
              </li>
            ))}
          </ul>
          <Skeleton className="mx-auto mt-12 h-40 w-full max-w-xl rounded-2xl" />
        </HomeSkeletonSection>

        <HomeSkeletonSection surface>
          <Skeleton className="h-9 w-full max-w-md" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="flex flex-col items-center rounded-2xl border border-border bg-surface px-4 py-6"
              >
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="mt-4 h-6 w-28" />
                <Skeleton className="mt-3 h-12 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="mx-auto mt-10 h-7 w-3/4 max-w-xl" />
        </HomeSkeletonSection>

        <HomeSkeletonSection>
          <div className="grid items-stretch gap-6 lg:grid-cols-2">
            <HomePanelSkeleton />
            <HomePanelSkeleton />
          </div>
        </HomeSkeletonSection>

        <section className="flex flex-col items-center bg-surface px-6 pb-8 pt-2 md:pb-10">
          <Skeleton className="h-44 w-72 rounded-[50%] bg-accent-light" />
          <Skeleton className="mt-8 h-12 w-full max-w-2xl" />
        </section>

        <HomeSkeletonSection surface>
          <Skeleton className="mx-auto h-12 w-full max-w-2xl" />
          <Skeleton className="mx-auto mt-5 h-12 w-full max-w-3xl" />
          <div className="mt-10 rounded-2xl border border-primary/25 bg-primary-light/50 p-6 sm:p-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-10">
              <div className="space-y-4 lg:w-[38%] lg:shrink-0">
                <Skeleton className="h-9 w-36 rounded-full" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-12 w-56" />
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-5 w-48" />
              </div>
              <div className="grid flex-1 gap-px overflow-hidden rounded-xl bg-primary/20 sm:grid-cols-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-28 rounded-none bg-surface" />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index}>
                <Skeleton className="aspect-16/10 w-full rounded-2xl" />
                <Skeleton className="mt-5 h-7 w-2/3" />
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Skeleton className="h-5" />
                  <Skeleton className="h-5" />
                  <Skeleton className="h-5" />
                  <Skeleton className="h-5" />
                </div>
              </div>
            ))}
          </div>
        </HomeSkeletonSection>

        <HomeSkeletonSection>
          <Skeleton className="mx-auto h-12 w-full max-w-2xl" />
          <Skeleton className="mx-auto mt-5 h-12 w-full max-w-3xl" />
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-accent/25 bg-accent-light/60 p-8">
              <Skeleton className="h-9 w-36 rounded-full" />
              <Skeleton className="mt-6 h-6 w-48" />
              <Skeleton className="mt-2 h-12 w-56" />
              <Skeleton className="mt-2 h-6 w-44" />
              <Skeleton className="mt-6 h-5 w-56" />
            </div>
            <div>
              <Skeleton className="h-16 w-full" />
              <ul className="mt-6 flex flex-col gap-5">
                {Array.from({ length: 6 }, (_, index) => (
                  <li key={index} className="flex items-center gap-3.5">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-6 w-full max-w-sm" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </HomeSkeletonSection>

        <HomeSkeletonSection>
          <div className="flex flex-col items-center">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="mt-2 h-9 w-48" />
          </div>
          <div className="mt-4 flex flex-col">
            {Array.from({ length: 3 }, (_, index) => (
              <article
                key={index}
                className="grid gap-10 border-t border-border py-12 lg:grid-cols-2 lg:gap-16"
              >
                <div className="space-y-4">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-7 w-4/5" />
                  <Skeleton className="mt-7 h-6 w-40" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-28 rounded-full" />
                    <Skeleton className="h-9 w-28 rounded-full" />
                  </div>
                </div>
                <div>
                  <Skeleton className="h-8 w-full" />
                  {Array.from({ length: 4 }, (_, rowIndex) => (
                    <Skeleton key={rowIndex} className="mt-2 h-12 w-full rounded-r-xl" />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </HomeSkeletonSection>

        <HomeSkeletonSection surface>
          <Skeleton className="h-9 w-48" />
          <ol className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <li key={index} className="flex flex-col items-center text-center">
                <Skeleton className="h-28 w-28 rounded-full md:h-32 md:w-32" />
                <Skeleton className="mt-5 h-6 w-32" />
                <Skeleton className="mt-2 h-12 w-48 max-w-full" />
              </li>
            ))}
          </ol>
        </HomeSkeletonSection>

        <HomeSkeletonSection surface>
          <div className="rounded-2xl border border-accent/20 bg-accent-light/70 px-5 py-8 sm:px-8 md:px-10 md:py-10">
            <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
              <Skeleton className="h-16 w-full max-w-sm" />
              <Skeleton className="h-12 w-52 rounded-full" />
            </div>
          </div>
          <Skeleton className="mx-auto mt-4 h-20 w-full max-w-xl rounded-xl" />
        </HomeSkeletonSection>

        <HomeSkeletonSection surface>
          <div className="rounded-2xl bg-primary-light px-6 py-8 md:py-12">
            <Skeleton className="mx-auto h-5 w-40" />
            <Skeleton className="mx-auto mt-3 h-9 w-full max-w-md" />
            <div className="mt-8 flex flex-col items-center justify-center gap-6 sm:flex-row">
              <Skeleton className="h-10 w-56" />
              <Skeleton className="h-12 w-48 rounded-full" />
            </div>
            <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-4 sm:flex-row">
              <Skeleton className="h-20 w-48 rounded-lg bg-surface" />
              <Skeleton className="h-20 w-28 rounded-lg bg-surface" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </HomeSkeletonSection>
      </div>
    </QueryLoadingState>
  );
}

function HomeSkeletonSection({
  children,
  surface = false,
}: {
  children: ReactNode;
  surface?: boolean;
}) {
  return (
    <section className={`${surface ? "bg-surface" : ""} py-8 md:py-12`}>
      <div className="mx-auto max-w-5xl px-6">{children}</div>
    </section>
  );
}

function HomePanelSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <Skeleton className="h-8 w-48" />
      <div className="mt-6 grid flex-1 gap-5 sm:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <Skeleton className="mt-5 h-5 w-3/4" />
    </div>
  );
}

function HomeErrorState({
  lang,
  onRetry,
}: {
  lang: Lang;
  onRetry: () => void;
}) {
  const message = t(queryStates.error, lang);
  const retryLabel = t(queryStates.retry, lang);

  return (
    <div className="flex flex-col gap-4">
      <section aria-label={message}>
        <QueryErrorState message={message} retryLabel={retryLabel} onRetry={onRetry} />
      </section>
      <section aria-label={message}>
        <QueryErrorState message={message} retryLabel={retryLabel} onRetry={onRetry} />
      </section>
      <section aria-label={message}>
        <QueryErrorState message={message} retryLabel={retryLabel} onRetry={onRetry} />
      </section>
    </div>
  );
}
