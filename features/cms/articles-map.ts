/** Pure Atlas entry/hub transforms; no server runtime dependencies. */
import type { LegalBlock } from "@/constants/legal";
import { CmsContentError } from "./errors";
import {
  mapBlocksByType,
  requiredBi,
  cmsFieldErrorMarker,
  isCmsFieldErrorMarker,
  requiredUrlOrFieldError,
  type BlockTypeList,
} from "./fields";
import { htmlToBlocks } from "./legal-html";
import type { Bilingual, CmsBlock, RawEntry } from "./types";
import type { Lang } from "../lang/i18n";

export const ARTICLE_LABEL_KEYS = [
  "all_categories",
  "search_label",
  "search_placeholder",
  "result_count",
  "no_results",
  "reset_filters",
  "featured_badge",
  "read_more",
  "reading_time",
  "outline_heading",
  "toc_title",
  "toc_open",
  "toc_close",
  "progress_label",
  "time_left",
  "finished",
  "reader_tools",
  "text_size",
  "size_small",
  "size_medium",
  "size_large",
  "listen_start",
  "listen_pause",
  "listen_resume",
  "listen_stop",
  "listen_speed",
  "listen_unsupported",
  "copy_link",
  "link_copied",
  "published_on",
  "back_to_list",
  "prev_article",
  "next_article",
  "related_heading",
  "breadcrumb_home",
] as const;

export type ArticleLabelKey = (typeof ARTICLE_LABEL_KEYS)[number];
export type ArticleLabels = Record<ArticleLabelKey, Bilingual>;

export type ArticlesHub = {
  hero: { heading: Bilingual; body: Bilingual };
  labels: ArticleLabels;
};

export type ArticleTocItem = { id: string; label: string; level: 2 | 3 };

export type Article = {
  /** Compatibility identity for existing components; this is now the entry slug. */
  pageSlug: string;
  /** URL segment, e.g. `what-is-non-insured-care`. */
  slug: string;
  updatedAt?: string;
  publishedAt?: string;
  indexableLanguages: Lang[];
  /** English delivery errors stay visible even when the JA article is served. */
  translationDiagnostics?: string[];
  seo: { title?: Partial<Bilingual>; description?: Partial<Bilingual>; ogImage?: Partial<Bilingual> };
  title: Bilingual;
  category: Bilingual;
  summary: Bilingual;
  lead: { ja: string[]; en: string[] };
  body: { ja: LegalBlock[]; en: LegalBlock[] };
  cta: {
    body: { ja: LegalBlock[]; en: LegalBlock[] };
    label: Bilingual;
    href: string;
  };
  readingMinutes: { ja: number; en: number };
};

const HUB_TYPES = ["page-hero", "article-ui-labels"] as const satisfies BlockTypeList;

/** Return a sorted copy without mutating the delivery response. */
export function orderedArticleEntries(entries: readonly RawEntry[]): RawEntry[] {
  return [...entries].sort((a, b) => a.position - b.position);
}

/** Match only within the typed published collection; entry slugs are URL slugs. */
export function findArticleEntry(entries: readonly RawEntry[], slug: string): RawEntry | null {
  return entries.find((entry) => entry.slug === slug) ?? null;
}

function hubText(data: CmsBlock["data"], key: string, context: string): Bilingual {
  try { return requiredBi(data, key, context); }
  catch (error) {
    if (!(error instanceof CmsContentError)) throw error;
    const marker = cmsFieldErrorMarker(`${context}.${key}`);
    return { ja: marker, en: marker };
  }
}

export function mapArticlesHub(blocks: CmsBlock[]): ArticlesHub {
  const groups = mapBlocksByType("articles", blocks, HUB_TYPES);
  const [hero] = groups["page-hero"];
  const [labelBlock] = groups["article-ui-labels"];

  const labels = Object.fromEntries(
    ARTICLE_LABEL_KEYS.map((key) => [
      key,
      hubText(labelBlock.data, key, "articles/article-ui-labels"),
    ]),
  ) as ArticleLabels;

  return {
    hero: {
      heading: hubText(hero.data, "heading", "articles/page-hero"),
      body: hubText(hero.data, "body", "articles/page-hero"),
    },
    labels,
  };
}

/** Japanese reads at roughly 500 characters a minute; English at ~200 words. */
const JA_CHARS_PER_MINUTE = 500;
const EN_WORDS_PER_MINUTE = 200;

export function plainText(blocks: readonly LegalBlock[]): string {
  return blocks
    .map((block) =>
      block.type === "table"
        ? block.rows.flat().map((cell) => (typeof cell === "string" ? cell : cell.text)).join(" ")
        : block.text,
    )
    .join("\n")
    .replace(/\*\*|_(?=\S)|\[([^\]]+)\]\([^)]+\)/g, "$1");
}

export function estimateReadingMinutes(text: string, lang: "ja" | "en"): number {
  const units =
    lang === "ja"
      ? text.replace(/\s/g, "").length / JA_CHARS_PER_MINUTE
      : text.split(/\s+/).filter(Boolean).length / EN_WORDS_PER_MINUTE;
  return Math.max(1, Math.round(units));
}

function parseBody(value: string, path: string): LegalBlock[] {
  if (isCmsFieldErrorMarker(value)) return [{ type: "p", text: value }];
  try {
    const blocks = htmlToBlocks(value);
    if (blocks.length) return blocks;
  } catch { /* Malformed richtext is isolated to this field. */ }
  return [{ type: "p", text: cmsFieldErrorMarker(path) }];
}

function entryData(entry: RawEntry): Record<string, unknown> {
  let data = entry.data;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { data = null; }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const path = `article/${entry.slug}.data`;
    throw new CmsContentError("CMS_INVALID_CONTENT", `CMS entry "${path}" is not a field object.`, [path], entry.slug);
  }
  return data as Record<string, unknown>;
}

/** Entries are already resolved to the requested locale. Mirror values, never invent copy.
 * A bad field can be isolated here instead of rejecting a whole article. */
function entryText(data: Record<string, unknown>, key: string, context: string): Bilingual {
  const raw = data[key];
  const text = typeof raw === "string" && raw.trim() ? raw : cmsFieldErrorMarker(`${context}.${key}`);
  return { ja: text, en: text };
}

function paragraphs(value: string): string[] {
  return value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function optionalEntryText(data: Record<string, unknown>, key: string, context: string): string | undefined {
  const value = data[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  return cmsFieldErrorMarker(`${context}.${key}`);
}

function timestamp(value: string | null | undefined): string | undefined {
  return value && !Number.isNaN(Date.parse(value)) ? value : undefined;
}

function mapResolvedArticle(entry: RawEntry): Article {
  const data = entryData(entry);
  const context = `article/${entry.slug}`;
  const text = (key: string) => entryText(data, key, context);
  const lead = text("lead");
  const body = parseBody(text("body").ja, `${context}.body`);
  const ctaBody = parseBody(text("cta_body").ja, `${context}.cta_body`);
  const parsedLead = { ja: paragraphs(lead.ja), en: paragraphs(lead.en) };
  const optionalBi = (key: string) => {
    const value = optionalEntryText(data, key, context);
    return value === undefined ? undefined : { ja: value, en: value };
  };

  return {
    pageSlug: entry.slug,
    slug: entry.slug,
    updatedAt: timestamp(entry.updated_at),
    publishedAt: timestamp(entry.published_at),
    indexableLanguages: ["ja"],
    seo: { title: optionalBi("seo_title"), description: optionalBi("seo_description"), ogImage: optionalBi("og_image") },
    title: text("title"),
    category: text("category"),
    summary: text("summary"),
    lead: parsedLead,
    body: { ja: body, en: body },
    cta: {
      body: { ja: ctaBody, en: ctaBody },
      label: text("cta_label"),
      href: requiredUrlOrFieldError({ cta_href: typeof data.cta_href === "string" ? data.cta_href : undefined }, "cta_href", context, "article.cta.href"),
    },
    readingMinutes: {
      ja: estimateReadingMinutes(`${parsedLead.ja.join("\n")}\n${plainText(body)}`, "ja"),
      en: estimateReadingMinutes(`${parsedLead.en.join("\n")}\n${plainText(body)}`, "en"),
    },
  };
}

/** Atlas's flag alone is insufficient: with zero translation rows it is false.
 * Public delivery also overlays partial rows onto base data. Require distinct,
 * usable title, summary, lead and body before advertising an English article.
 * This checks delivery provenance/content, never guesses language by script. */
export function mapArticle(entry: RawEntry, englishEntry?: RawEntry): Article {
  const ja = mapResolvedArticle(entry);
  if (!englishEntry || englishEntry.id !== entry.id || englishEntry.slug !== entry.slug || englishEntry.is_fallback !== false) return ja;
  let en: Article;
  try { en = mapResolvedArticle(englishEntry); }
  catch (error) {
    if (!(error instanceof CmsContentError)) throw error;
    return { ...ja, translationDiagnostics: [cmsFieldErrorMarker(`article/${entry.slug}.en.data`)] };
  }
  const core = (article: Article) => [article.title.ja, article.summary.ja, article.lead.ja.join("\n"), plainText(article.body.ja)];
  const keys = ["title", "summary", "lead", "body"];
  const translated = core(en);
  const translationDiagnostics = translated.flatMap((value, index) =>
    !value.trim() || value.includes("[cms-field-error:") ? [cmsFieldErrorMarker(`article/${entry.slug}.en.${keys[index]}`)] : [],
  );
  if (translationDiagnostics.length) return { ...ja, translationDiagnostics };
  const japanese = core(ja);
  if (!translated.every((value, index) => value.trim() !== japanese[index].trim())) return ja;

  const seoText = (key: "title" | "description") => {
    const localized = en.seo[key]?.ja;
    // A missing SEO overlay retains JA base data in Atlas; use derived EN copy.
    return ja.seo[key] || localized ? { ja: ja.seo[key]?.ja, en: localized !== ja.seo[key]?.ja ? localized : undefined } : undefined;
  };
  return {
    ...ja,
    indexableLanguages: ["ja", "en"],
    title: { ja: ja.title.ja, en: en.title.ja },
    category: { ja: ja.category.ja, en: en.category.ja },
    summary: { ja: ja.summary.ja, en: en.summary.ja },
    lead: { ja: ja.lead.ja, en: en.lead.ja },
    body: { ja: ja.body.ja, en: en.body.ja },
    cta: { ...ja.cta, label: { ja: ja.cta.label.ja, en: en.cta.label.ja }, body: { ja: ja.cta.body.ja, en: en.cta.body.ja } },
    readingMinutes: { ja: ja.readingMinutes.ja, en: en.readingMinutes.en },
    seo: { title: seoText("title"), description: seoText("description"), ogImage: ja.seo.ogImage ?? en.seo.ogImage },
  };
}

/** Section anchors, in the same `sec-<block index>` form the legal pages use. */
export function articleToc(body: readonly LegalBlock[]): ArticleTocItem[] {
  const items: ArticleTocItem[] = [];
  body.forEach((block, index) => {
    if (block.type === "h2" || block.type === "h3") {
      items.push({
        id: `sec-${index}`,
        label: block.text.replace(/\*\*/g, ""),
        level: block.type === "h2" ? 2 : 3,
      });
    }
  });
  return items;
}
