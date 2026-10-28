import { PhraseText } from "@/components/PhraseText";
import JsonLd from "@/components/JsonLd";
import { buildArticlesHubJsonLd } from "../structured-data";
import { CmsContractNotice } from "@/components/cms/CmsContractNotice";
import { isCmsFieldErrorMarker } from "@/features/cms/fields";
import { readArticleContent } from "../diagnostics";
import { articleOgImage } from "../metadata-fields";
import { getArticleEntries, getArticlesHub, getArticlesHubMeta } from "@/features/cms/articles";
import { isJapanese } from "@/lib/phrase";
import { localizeHref, t, type Lang } from "@/features/lang/i18n";
import ArticlesBrowser, { type ArticleCard, type BrowserLabels } from "./articles-browser";

/** The `/helpful-information` list: hero, search + category filters, featured card, grid. */
export default async function ArticlesView({
  lang,
  initialCategory,
}: {
  lang: Lang;
  initialCategory: string | null;
}) {
  const result = await readArticleContent("articles", () => Promise.all([getArticlesHub(), getArticleEntries(), getArticlesHubMeta()]));
  if (!result.ok) return <CmsContractNotice details={result.diagnostic} />;
  const [hub, entries, meta] = result.data;
  const image = articleOgImage(meta.ogImage?.[lang], lang);

  const articles = entries.flatMap((entry) => (entry.ok ? [entry.article] : []));
  const diagnostics = entries.flatMap((entry) =>
    entry.ok ? (lang === "en" ? entry.article.translationDiagnostics ?? [] : []) : [`[cms-field-error: articles.${entry.pageSlug}] ${entry.message}`],
  );

  const categories = [...new Set(articles.map((article) => t(article.category, lang)))];
  const cards: ArticleCard[] = articles.map((article) => ({
    slug: article.slug,
    href: localizeHref(`/helpful-information/${article.slug}`, lang),
    title: t(article.title, lang),
    category: t(article.category, lang),
    summary: t(article.summary, lang),
    minutes: article.readingMinutes[lang],
  }));

  const l = hub.labels;
  const labels: BrowserLabels = {
    allCategories: t(l.all_categories, lang),
    searchLabel: t(l.search_label, lang),
    searchPlaceholder: t(l.search_placeholder, lang),
    resultCount: t(l.result_count, lang),
    noResults: t(l.no_results, lang),
    resetFilters: t(l.reset_filters, lang),
    featured: t(l.featured_badge, lang),
    readMore: t(l.read_more, lang),
    readingTime: t(l.reading_time, lang),
  };
  const contentLang = cards[0] && isJapanese(cards[0].title) ? "ja" : lang;
  const jsonLd = buildArticlesHubJsonLd(hub, articles, lang);

  return (
    <>
      <JsonLd data={jsonLd[0]} />
      <JsonLd data={jsonLd[1]} />
      {isCmsFieldErrorMarker(image) && <CmsContractNotice details={image} />}
      <section className="relative isolate bg-linear-to-b from-primary-light via-bg to-bg">
        {/* Clipped sideways only, and faded out at the bottom, so the glow
            melts into the page instead of ending on a hard edge. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_45%,transparent)]"
        >
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent-light blur-3xl" />
          <div className="absolute -left-20 top-16 h-64 w-64 rounded-full bg-primary-light blur-3xl" />
        </div>
        <div className="mx-auto max-w-5xl px-6 pb-10 pt-12 md:pb-14 md:pt-20">
          <h1 className="animate-fade-up text-4xl font-bold leading-tight text-heading md:text-5xl">
            <PhraseText text={t(hub.hero.heading, lang)} />
          </h1>
          <p className="mt-5 max-w-2xl animate-fade-up text-base leading-relaxed text-body md:text-lg">
            <PhraseText text={t(hub.hero.body, lang)} />
          </p>
        </div>
      </section>

      <section className="pb-20 pt-4 md:pb-28">
        <div className="mx-auto max-w-5xl px-6">
          <ArticlesBrowser
            cards={cards}
            categories={categories}
            labels={labels}
            diagnostics={diagnostics}
            contentLang={contentLang}
            initialCategory={initialCategory}
          />
        </div>
      </section>
    </>
  );
}
