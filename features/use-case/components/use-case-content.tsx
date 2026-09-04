"use client";

import Image from "next/image";
import Link from "next/link";
import Section from "@/components/ui/Section";
import { localizeHref, t, type Lang } from "@/features/lang/i18n";
import type { UseCaseContent } from "@/features/cms/pages-map";

export function UseCaseContentView({
  content,
  lang,
  primaryCta,
}: {
  content: UseCaseContent;
  lang: Lang;
  primaryCta: { ja: string; en: string };
}) {
  return (
    <>
      <Section
        heading={content.hero.heading}
        level="h1"
        lang={lang}
      >
        <p className="max-w-2xl text-base leading-relaxed text-body">
          {t(content.hero.body, lang)}
        </p>
      </Section>

      <Section surface lang={lang}>
        <div className="flex flex-col gap-16">
          {content.cases.map((item, index) => (
            <article
              key={item.slug}
              id={item.slug}
              className="grid gap-8 md:grid-cols-2 md:items-start animate-fade-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {item.image ? (
                <div className="relative aspect-16/10 w-full overflow-hidden rounded-2xl border border-border">
                  <Image
                    src={item.image}
                    alt={t(item.imageAlt, lang)}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              ) : null}

              <div>
                <h2 className="text-2xl font-bold text-heading">
                  {t(item.title, lang)}
                </h2>
                <p className="mt-2 text-sm font-medium text-muted">
                  {t(item.body, lang)}
                </p>
                <p className="mt-4 text-base leading-relaxed text-body">
                  {t(item.detail, lang)}
                </p>
                <ul className="mt-6 flex flex-col gap-2">
                  {item.highlights.map((highlight, highlightIndex) => (
                    <li
                      key={highlightIndex}
                      className="flex items-start gap-2 text-sm text-body"
                    >
                      <span
                        className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                      {t(highlight, lang)}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section lang={lang}>
        <div className="animate-fade-up">
          <Link
            href={localizeHref(content.hero.ctaHref, lang)}
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-mid"
          >
            {t(primaryCta, lang)}
          </Link>
        </div>
      </Section>
    </>
  );
}
