import Link from "next/link";
import {
  IconArrowLeft,
  IconArrowRight,
  IconChevronRight,
  IconClock,
  IconRefresh,
} from "@tabler/icons-react";
import { CmsContractNotice } from "@/components/cms/CmsContractNotice";
import { isCmsFieldErrorMarker } from "@/features/cms/fields";
import { readArticleContent } from "../diagnostics";
import { articleSeoFields } from "../metadata-fields";
import { buildArticleJsonLd } from "../structured-data";
import JsonLd from "@/components/JsonLd";
import { PhraseText } from "@/components/PhraseText";
import { SITE_URL } from "@/constants/site";
import { getArticleEntries, getArticlePageMeta, getArticlesHub } from "@/features/cms/articles";
import { articleToc, type Article } from "@/features/cms/articles-map";
import { getSite } from "@/features/cms/site";
import { localizeHref, t, type Lang } from "@/features/lang/i18n";
import { fillTemplate } from "@/lib/fill-template";
import { formatDate } from "../format";
import { ArticleBlocks } from "./article-body";
import ArticleReader from "./article-reader";
import CopyLinkButton from "./copy-link-button";

const isExternal = (href: string) => /^https?:\/\//.test(href);

/** One article: hero, outline, reading column with reader tools, CTA, and onward links. */
export default async function ArticleView({ article, lang }: { article: Article; lang: Lang }) {
  const result = await readArticleContent(`article.${article.slug}`, () => Promise.all([
    getArticlesHub(),
    getArticleEntries(),
    getArticlePageMeta(article.pageSlug),
    getSite(),
  ]));
  if (!result.ok) return <CmsContractNotice details={result.diagnostic} />;
  const [hub, entries, meta, site] = result.data;

  const l = hub.labels;
  const title = t(article.title, lang);
  const category = t(article.category, lang);
  const body = article.body[lang];
  const toc = articleToc(body);
  const outline = toc.filter((item) => item.level === 2);
  const minutes = article.readingMinutes[lang];
  const contentLang = article.indexableLanguages.includes(lang) ? lang : "ja";
  const updated = formatDate(meta.updatedAt, lang);
  const listPath = localizeHref("/helpful-information", lang);
  const articlePath = localizeHref(`/helpful-information/${article.slug}`, lang);

  const ok = entries.flatMap((entry) => (entry.ok ? [entry.article] : []));
  const position = ok.findIndex((a) => a.slug === article.slug);
  const prev = position > 0 ? ok[position - 1] : undefined;
  const next = position >= 0 && position < ok.length - 1 ? ok[position + 1] : undefined;
  const related = [
    ...ok.filter((a) => a.slug !== article.slug && t(a.category, lang) === category),
    ...ok.filter((a) => a.slug !== article.slug && t(a.category, lang) !== category),
  ].slice(0, 3);

  const seo = articleSeoFields(article, meta, lang);
  const seoDiagnostics = [
    ...[seo.title, seo.description, seo.image].filter(isCmsFieldErrorMarker),
    ...(lang === "en" ? article.translationDiagnostics ?? [] : []),
  ];
  const ctaHref = article.cta.href;
  const ctaLabel = t(article.cta.label, lang);
  const ctaClass =
    "inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-primary-deep px-8 py-3 text-base font-bold text-white shadow-sm transition hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";

  const url = `${SITE_URL}${articlePath}`;
  const jsonLd = [
    buildArticleJsonLd(article, meta, site.brand.name, lang),
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: t(l.breadcrumb_home, lang),
          item: `${SITE_URL}${localizeHref("/", lang)}`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: t(hub.hero.heading, lang),
          item: `${SITE_URL}${listPath}`,
        },
        { "@type": "ListItem", position: 3, name: title, item: url },
      ],
    },
  ];

  return (
    <>
      {seoDiagnostics.map((diagnostic) => <CmsContractNotice key={diagnostic} details={diagnostic} />)}
      <JsonLd data={jsonLd[0]} />
      <JsonLd data={jsonLd[1]} />

      <header className="relative isolate bg-linear-to-b from-primary-light via-bg to-bg">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_45%,transparent)]"
        >
          <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-accent-light blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl px-6 pb-10 pt-8 md:pb-14 md:pt-12">
          <nav aria-label="breadcrumb" className="mb-6 text-sm text-muted">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <li>
                <Link href={localizeHref("/", lang)} className="hover:text-primary hover:underline">
                  {t(l.breadcrumb_home, lang)}
                </Link>
              </li>
              <IconChevronRight size={14} aria-hidden="true" />
              <li>
                <Link href={listPath} className="hover:text-primary hover:underline">
                  {t(hub.hero.heading, lang)}
                </Link>
              </li>
            </ol>
          </nav>

          <Link
            href={`${listPath}?category=${encodeURIComponent(category)}`}
            lang={contentLang}
            className="inline-flex items-center rounded-full bg-accent-light px-4 py-1.5 text-sm font-bold text-accent-deep transition hover:bg-accent hover:text-white"
          >
            {category}
          </Link>

          <h1
            lang={contentLang}
            className="mt-5 animate-fade-up text-[clamp(1.2rem,6.4vw,1.75rem)] font-bold leading-[1.45] text-heading md:text-4xl md:leading-[1.4]"
          >
            <PhraseText text={title} />
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <IconClock size={17} aria-hidden="true" />
              {fillTemplate(t(l.reading_time, lang), { minutes })}
            </span>
            {updated && (
              <span className="inline-flex items-center gap-1.5">
                <IconRefresh size={17} aria-hidden="true" />
                {t(l.published_on, lang)}{" "}
                <time dateTime={meta.updatedAt}>{updated}</time>
              </span>
            )}
            <CopyLinkButton
              path={articlePath}
              label={t(l.copy_link, lang)}
              copiedLabel={t(l.link_copied, lang)}
            />
          </div>

          <div lang={contentLang} className="mt-9 space-y-5">
            {article.lead[lang].map((paragraph, index) => (
              // The lead is plain text with no CMS alignment, so it follows the
              // justified article body.
              <p
                key={index}
                data-align="justify"
                className="text-justify text-[1.0625rem] leading-[1.95] text-heading/85 md:text-lg"
              >
                <PhraseText text={paragraph} />
              </p>
            ))}
          </div>

          {outline.length > 0 && (
            <nav
              aria-label={t(l.outline_heading, lang)}
              className="mt-10 rounded-3xl border border-border bg-surface p-5 md:p-7"
            >
              <p className="mb-4 text-sm font-bold text-heading">{t(l.outline_heading, lang)}</p>
              <ol className="grid gap-2">
                {outline.map((item, index) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      lang={contentLang}
                      className="group flex min-h-11 items-start gap-3 rounded-2xl px-3 py-2 transition hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-light text-xs font-bold tabular-nums text-primary-deep transition group-hover:bg-primary group-hover:text-white">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium leading-snug text-heading">
                        <PhraseText text={item.label} />
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </div>
      </header>

      <ArticleReader progressLabel={t(l.progress_label, lang)}>
        <div
          id="article-body"
          lang={contentLang}
          className="article-prose mx-auto max-w-[40rem] pb-4 pt-6"
        >
          {ArticleBlocks({ blocks: body, lang })}
        </div>

        <aside className="mx-auto mt-14 max-w-[40rem] overflow-hidden rounded-3xl border border-border bg-surface">
          <div lang={contentLang} className="article-prose p-6 text-base md:p-9 md:text-[1.0625rem]">
            {ArticleBlocks({ blocks: article.cta.body[lang], lang, idPrefix: "cta" })}
          </div>
          <div className="px-6 pb-8 md:px-9 md:pb-10">
            {isCmsFieldErrorMarker(ctaHref) ? (
              <CmsContractNotice details={ctaHref} />
            ) : isExternal(ctaHref) ? (
              <a href={ctaHref} target="_blank" rel="noopener noreferrer" className={ctaClass}>
                {ctaLabel}
                <IconArrowRight size={20} aria-hidden="true" />
              </a>
            ) : (
              <Link href={localizeHref(ctaHref, lang)} className={ctaClass}>
                {ctaLabel}
                <IconArrowRight size={20} aria-hidden="true" />
              </Link>
            )}
          </div>
        </aside>

        {(prev || next) && (
          <nav className="mx-auto mt-12 grid max-w-[40rem] gap-4 sm:grid-cols-2">
            {prev ? (
              <Link
                href={localizeHref(`/helpful-information/${prev.slug}`, lang)}
                className="group rounded-2xl border border-border bg-surface p-5 transition hover:border-primary"
              >
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                  <IconArrowLeft size={15} aria-hidden="true" />
                  {t(l.prev_article, lang)}
                </span>
                <span lang={contentLang} className="mt-2 block text-sm font-bold leading-snug text-heading group-hover:text-primary">
                  <PhraseText text={t(prev.title, lang)} />
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={localizeHref(`/helpful-information/${next.slug}`, lang)}
                className="group rounded-2xl border border-border bg-surface p-5 text-right transition hover:border-primary"
              >
                <span className="flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                  {t(l.next_article, lang)}
                  <IconArrowRight size={15} aria-hidden="true" />
                </span>
                <span lang={contentLang} className="mt-2 block text-sm font-bold leading-snug text-heading group-hover:text-primary">
                  <PhraseText text={t(next.title, lang)} />
                </span>
              </Link>
            )}
          </nav>
        )}
      </ArticleReader>

      {related.length > 0 && (
        <section className="mt-20 border-t border-border bg-surface py-14 md:py-20">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="mb-8 text-2xl font-bold text-heading">{t(l.related_heading, lang)}</h2>
            <ul className="grid gap-6 md:grid-cols-3">
              {related.map((item) => (
                <li key={item.slug} className="flex">
                  <article className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition duration-200 hover:-translate-y-0.5 hover:border-primary motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                    <span lang={contentLang} className="mx-6 mt-6 text-sm font-bold text-primary-deep">
                      {t(item.category, lang)}
                    </span>
                    <h3 lang={contentLang} className="p-6 pt-3 text-base font-bold leading-snug text-heading">
                      <Link
                        href={localizeHref(`/helpful-information/${item.slug}`, lang)}
                        className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                      >
                        <PhraseText text={t(item.title, lang)} />
                      </Link>
                    </h3>
                  </article>
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <Link
                href={listPath}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-primary px-6 text-sm font-bold text-primary transition hover:bg-primary-light"
              >
                <IconArrowLeft size={18} aria-hidden="true" />
                {t(l.back_to_list, lang)}
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
