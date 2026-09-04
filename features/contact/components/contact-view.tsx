"use client";

import { QueryEmptyState } from "@/components/cms/QueryEmptyState";
import { QueryErrorState } from "@/components/cms/QueryErrorState";
import { QueryLoadingState, Skeleton } from "@/components/cms/QueryLoadingState";
import ContactForm from "@/components/contact/ContactForm";
import Section from "@/components/ui/Section";
import { queryStates } from "@/constants/copy";
import { t, type Lang } from "@/features/lang/i18n";
import { useContactQuery } from "../hooks";

export default function ContactView({ lang }: { lang: Lang }) {
  const query = useContactQuery();

  if (query.isPending) {
    return <ContactLoadingState label={t(queryStates.loading, lang)} />;
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

  if (query.data.categories.length === 0) {
    return <QueryEmptyState title={t(queryStates.empty, lang)} />;
  }

  const phoneTel = query.data.phone.number.replace(/-/g, "");

  return (
    <>
      <Section heading={query.data.heading} level="h1" lang={lang}>
        <p className="max-w-3xl text-base leading-relaxed text-body md:text-lg">
          {t(query.data.intro, lang)}
        </p>
      </Section>

      <Section surface lang={lang}>
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="rounded-2xl bg-primary px-6 py-8 text-white sm:px-8">
            <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
              {t(query.data.phone.badge, lang)}
            </span>
            <h2 className="mt-4 text-2xl font-bold">{t(query.data.phone.title, lang)}</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/90 md:text-base">
              {t(query.data.phone.body, lang)}
            </p>
            <a
              href={`tel:${phoneTel}`}
              className="mt-6 block rounded-xl bg-primary-deep/40 px-5 py-4 transition hover:bg-primary-deep/55"
            >
              <p className="text-xs font-semibold tracking-[0.2em] text-white/80">
                {t(query.data.phone.telLabel, lang)}
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums md:text-4xl">
                {query.data.phone.number}
              </p>
              <p className="mt-2 text-sm text-white/85">
                {t(query.data.phone.hours, lang)}
              </p>
            </a>
            <ul className="mt-6 space-y-2 text-sm text-white/90">
              {query.data.phone.bullets.map((bullet) => (
                <li key={bullet.ja} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/80"
                  />
                  <span>{t(bullet, lang)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-surface px-5 py-7 sm:px-7 sm:py-8">
            <span className="inline-flex rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary">
              {t(query.data.form.badge, lang)}
            </span>
            <h2 className="mt-4 text-2xl font-bold text-heading">
              {t(query.data.form.title, lang)}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-body md:text-base">
              {t(query.data.form.body, lang)}
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-body">
              {query.data.form.bullets.map((bullet) => (
                <li key={bullet.ja} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  />
                  <span>{t(bullet, lang)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <ContactForm lang={lang} content={query.data} />
            </div>
            <p className="mt-5 rounded-xl bg-primary-light px-4 py-3 text-sm leading-relaxed text-body">
              {t(query.data.form.followUp, lang)}
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}

function ContactLoadingState({ label }: { label: string }) {
  return (
    <QueryLoadingState
      label={label}
      className="rounded-none border-0 bg-transparent px-0 py-8 shadow-none sm:px-0 md:py-12"
    >
      <div className="w-full">
        <div className="mx-auto max-w-5xl px-6">
          <Skeleton className="h-10 w-48 md:h-12 md:w-64" />
          <Skeleton className="mt-4 h-5 w-full max-w-3xl" />
        </div>
        <div className="mt-8 bg-surface py-8 md:py-12">
          <div className="mx-auto grid max-w-5xl gap-6 px-6 lg:grid-cols-2">
            <Skeleton className="min-h-96 rounded-2xl" />
            <Skeleton className="min-h-[42rem] rounded-2xl" />
          </div>
        </div>
      </div>
    </QueryLoadingState>
  );
}
