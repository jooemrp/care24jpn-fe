import "server-only";

import { cache } from "react";
import { getPageBlocks, reportUnexpectedContent } from "./client";
import {
  mapBlocksByType,
  pickBi,
  pickJa,
  type BlockTypeList,
} from "./fields";
import type { Bilingual, CmsBlock } from "./types";

/**
 * The FAQ page content, CMS-sourced (no `constants/faq.ts` fallback).
 *
 * Every category and Q/A below comes straight from Atlas — the
 * `faq_category` / `faq_item` blocks the "faq" page carries (see
 * scripts/atlas/schema.ts + seed-faq.ts). `id`/`category` are
 * non-localizable identifiers read via `pickJa`; `label`/`question`/`answer`
 * are the rendered copy.
 */
export type FaqCategory = {
  id: string;
  label: Bilingual;
};

export type FaqItem = {
  id: string;
  category: string;
  question: Bilingual;
  answer: Bilingual;
};

export type FaqContent = {
  hero: { heading: Bilingual; body: Bilingual };
  categories: FaqCategory[];
  items: FaqItem[];
};

const FAQ_TYPES = ["page-hero", "faq-category", "faq-item"] as const satisfies BlockTypeList;

function mapFaq(blocks: CmsBlock[]): FaqContent | null {
  const groups = mapBlocksByType("faq", blocks, FAQ_TYPES, reportUnexpectedContent);
  if (!groups) return null;

  const [heroBlock] = groups["page-hero"];
  const categoryBlocks = groups["faq-category"];
  const itemBlocks = groups["faq-item"];

  return {
    hero: {
      heading: pickBi(heroBlock.data, "heading"),
      body: pickBi(heroBlock.data, "body"),
    },
    categories: categoryBlocks.map((block) => ({
      id: pickJa(block.data, "id"),
      label: pickBi(block.data, "label"),
    })),
    items: itemBlocks.map((block) => ({
      id: pickJa(block.data, "id"),
      category: pickJa(block.data, "category"),
      question: pickBi(block.data, "question"),
      answer: pickBi(block.data, "answer"),
    })),
  };
}

async function fetchFaq(): Promise<FaqContent> {
  const blocks = await getPageBlocks("faq");
  if (!blocks) {
    throw new Error(
      '[cms] getFaq("faq"): page data unavailable (Atlas unreachable, not configured, or page missing) — no fallback content exists; the FAQ page is unavailable.',
    );
  }
  const content = mapFaq(blocks);
  if (!content) {
    throw new Error(
      '[cms] getFaq("faq"): page data did not match the expected block shape — no fallback content exists; the FAQ page is unavailable.',
    );
  }
  return content;
}

/** Deduped per-render (React `cache()`). */
export const getFaq = cache(fetchFaq);