/** Seed regular article entries and the static articles hub.
 * Japanese content is mirrored to EN by the delivery mapper. Run manually only:
 * node --import tsx scripts/atlas/seed-articles.ts
 * On creation, only what-insurance-cannot-cover is published; the other ten
 * entries remain drafts. Reruns refresh data while preserving existing entries'
 * publication state. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { blocksToHtml } from "../../features/cms/legal-html";
import { ogImagePair } from "./og-image";
import type { ManagementClient } from "@latellu/atlas-sdk/management";
import type { LegalBlock } from "../../constants/legal";
import {
  createScriptManagementClient,
  ensurePublishedPage,
  ensureArticleEntry,
  reorderArticleEntries,
  getContentType,
  loadEnv,
  requireAtlasEnv,
} from "./lib";

type SeedArticle = {
  slug: string;
  category: string;
  title: string;
  summary: string;
  lead: string[];
  body: LegalBlock[];
  cta: { body: LegalBlock[]; label: string; href: string };
};

const articles = JSON.parse(
  readFileSync(resolve(__dirname, "articles.seed.json"), "utf8"),
) as SeedArticle[];

type Bi = { ja: string; en: string };

const HUB = {
  heading: { ja: "お役立ち情報", en: "Helpful Information" },
  body: {
    ja: "介護保険外サービスの基礎知識から、費用・選び方・ご利用の流れまで。ご家族の「困った」に寄り添う情報をお届けします。",
    en: "From the basics of out-of-pocket care to costs, choosing a provider and getting started — practical guidance for families.",
  },
  seoTitle: { ja: "お役立ち情報", en: "Helpful Information" },
  seoDescription: {
    ja: "介護保険外（自費）サービスの基礎知識、費用相場、サービスの選び方、ご利用の流れまで、ご家族の疑問に答えるCare24Japanの記事一覧です。",
    en: "Care24Japan articles on out-of-pocket care: the basics, typical costs, how to choose a provider and how to get started.",
  },
} satisfies Record<string, Bi>;

const LABELS: Record<string, Bi> = {
  all_categories: { ja: "すべて", en: "All" },
  search_label: { ja: "記事を検索", en: "Search articles" },
  search_placeholder: { ja: "キーワードで探す", en: "Search by keyword" },
  result_count: { ja: "{count}件の記事", en: "{count} articles" },
  no_results: {
    ja: "条件に合う記事が見つかりませんでした。キーワードやカテゴリを変えてお試しください。",
    en: "No articles match. Try a different keyword or category.",
  },
  reset_filters: { ja: "絞り込みをリセット", en: "Clear filters" },
  featured_badge: { ja: "注目の記事", en: "Featured" },
  read_more: { ja: "記事を読む", en: "Read article" },
  reading_time: { ja: "約{minutes}分で読めます", en: "About {minutes} min read" },
  outline_heading: { ja: "この記事でわかること", en: "In this article" },
  toc_title: { ja: "目次", en: "Contents" },
  toc_open: { ja: "目次を開く", en: "Open contents" },
  toc_close: { ja: "閉じる", en: "Close" },
  progress_label: { ja: "読了の進み具合", en: "Reading progress" },
  time_left: { ja: "あと約{minutes}分", en: "About {minutes} min left" },
  finished: { ja: "読了", en: "Finished" },
  reader_tools: { ja: "読みやすさの設定", en: "Reading settings" },
  text_size: { ja: "文字の大きさ", en: "Text size" },
  size_small: { ja: "小", en: "S" },
  size_medium: { ja: "標準", en: "M" },
  size_large: { ja: "大", en: "L" },
  listen_start: { ja: "音声で聞く", en: "Listen" },
  listen_pause: { ja: "一時停止", en: "Pause" },
  listen_resume: { ja: "再開", en: "Resume" },
  listen_stop: { ja: "停止", en: "Stop" },
  listen_speed: { ja: "速度", en: "Speed" },
  listen_unsupported: {
    ja: "お使いのブラウザは音声の読み上げに対応していません。",
    en: "Your browser does not support read-aloud.",
  },
  copy_link: { ja: "リンクをコピー", en: "Copy link" },
  link_copied: { ja: "コピーしました", en: "Copied" },
  published_on: { ja: "更新日", en: "Updated" },
  back_to_list: { ja: "記事一覧へ戻る", en: "Back to articles" },
  prev_article: { ja: "前の記事", en: "Previous" },
  next_article: { ja: "次の記事", en: "Next" },
  related_heading: { ja: "あわせて読みたい", en: "Keep reading" },
  breadcrumb_home: { ja: "ホーム", en: "Home" },
};

const split = (bi: Record<string, Bi>) => ({
  ja: Object.fromEntries(Object.entries(bi).map(([k, v]) => [k, v.ja])),
  en: Object.fromEntries(Object.entries(bi).map(([k, v]) => [k, v.en])),
});

/** Exported for offline tests; importing this module never writes to Atlas. */
export async function seedArticleEntries(
  client: ManagementClient<Record<string, unknown>>,
  reorder: (ids: string[]) => Promise<void>,
): Promise<void> {
  const ids: string[] = [];
  for (const article of articles) {
    const result = await ensureArticleEntry(client, {
      slug: article.slug,
      data: {
        title: article.title,
        category: article.category,
        summary: article.summary,
        lead: article.lead.join("\n\n"),
        body: blocksToHtml(article.body),
        cta_body: blocksToHtml(article.cta.body),
        cta_label: article.cta.label,
        cta_href: article.cta.href,
      },
    }, article.slug === "what-insurance-cannot-cover");
    ids.push(result.id);
    console.log(`${result.created ? "+" : "="} entry ${article.slug}`);
  }
  await reorder(ids);
}

async function main(): Promise<void> {
  loadEnv();
  const env = requireAtlasEnv();
  const types = Object.fromEntries(
    await Promise.all(
      ["article", "article_ui_labels", "page_hero"].map(
        async (slug) => {
          const type = await getContentType(env, slug);
          if (!type) throw new Error(`Content type ${slug} not found — run \`npm run atlas:schema\` first.`);
          if (slug === "article" && (type.is_block || !type.orderable)) {
            throw new Error("article must be a regular, orderable entry type — run atlas:schema first.");
          }
          return [slug, type.id] as const;
        },
      ),
    ),
  );
  const client = await createScriptManagementClient(120_000);
  // Same shared social card every other page carries (see og-image.ts).
  const og = ogImagePair();

  // The management API has no entry list reader. These eleven upsert IDs are
  // the complete intended collection; Atlas rejects reorder if extra entries
  // exist, rather than silently moving or deleting editor-created content.
  await seedArticleEntries(client, (ids) => reorderArticleEntries(env, ids));

  const labels = split(LABELS);
  const hubSeo = (lang: "ja" | "en") => ({
    title: HUB.seoTitle[lang],
    description: HUB.seoDescription[lang],
    og_image: og[lang],
  });
  const hub = await ensurePublishedPage(client, {
    slug: "articles",
    seo: hubSeo("ja"),
    seo_translations: { en: hubSeo("en") },
    blocks: [
      {
        block_type_id: types.page_hero,
        parent_id: null,
        position: 0,
        data: { heading: HUB.heading.ja, body: HUB.body.ja },
        translations: { en: { data: { heading: HUB.heading.en, body: HUB.body.en } } },
      },
      {
        block_type_id: types.article_ui_labels,
        parent_id: null,
        position: 1,
        data: labels.ja,
        translations: { en: { data: labels.en } },
      },
    ],
  });
  console.log(`${hub.created ? "+" : "="} page articles${hub.published ? " (published)" : ""}`);
}

if (require.main === module) main().catch((error) => {
  console.error("[atlas:seed-articles] failed:", error);
  process.exitCode = 1;
});
