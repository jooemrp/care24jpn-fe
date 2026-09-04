/**
 * Pure Atlas blocks -> FAQ content mapping.
 *
 * The route receives a generic `page-hero`, a page-specific `faq-page`
 * configuration block, and repeated category/item blocks. The page-specific
 * block repeats the hero copy in the current workspace; the shared
 * `page-hero` remains the canonical visual hero so FAQ follows the same
 * contract as the other content pages.
 */

import {
  mapBlocksByType,
  requiredBi,
  requiredJa,
  type BlockTypeList,
} from "./fields";
import { CmsContentError } from "./errors";
import type { Bilingual, CmsBlock } from "./types";

export type FaqCategoryContent = {
  id: string;
  label: Bilingual;
};

export type FaqItemContent = {
  id: string;
  category: string;
  question: Bilingual;
  answer: Bilingual;
};

export type FaqContent = {
  hero: {
    heading: Bilingual;
    body: Bilingual;
  };
  categories: FaqCategoryContent[];
  items: FaqItemContent[];
  scenariosHeading: Bilingual;
  viewMoreLabel: Bilingual;
  collapseLabel: Bilingual;
};

const FAQ_TYPES = [
  "page-hero",
  "faq-category",
  "faq-item",
] as const satisfies BlockTypeList;

function requiredPageBlock(
  blocks: readonly CmsBlock[],
  type: string,
  context: string,
): CmsBlock {
  const block = blocks.find((candidate) => candidate.type === type);
  if (block) return block;

  throw new CmsContentError(
    "CMS_MISSING_REQUIRED_BLOCK",
    `Page "${context}" is missing required CMS block type "${type}".`,
    [`${context}.${type}`],
    context,
  );
}

export function mapFaq(blocks: CmsBlock[]): FaqContent {
  const pageConfig = requiredPageBlock(blocks, "faq-page", "faq");
  const groups = mapBlocksByType(
    "faq",
    blocks.filter((block) => block.type !== "faq-page"),
    FAQ_TYPES,
  );
  const [heroBlock] = groups["page-hero"];

  // `faq-page.heading` and `.intro` duplicate the shared hero in the live
  // payload. Validate them as part of the published page contract without
  // replacing the shared page-hero projection used by sibling routes.
  requiredBi(pageConfig.data, "heading", "faq/faq-page");
  requiredBi(pageConfig.data, "intro", "faq/faq-page");

  return {
    hero: {
      heading: requiredBi(heroBlock.data, "heading", "faq/page-hero"),
      body: requiredBi(heroBlock.data, "body", "faq/page-hero"),
    },
    categories: groups["faq-category"].map((block, index) => ({
      id: requiredJa(block.data, "category_key", `faq/faq-category[${index}]`),
      label: requiredBi(block.data, "label", `faq/faq-category[${index}]`),
    })),
    items: groups["faq-item"].map((block, index) => ({
      id: requiredJa(block.data, "item_key", `faq/faq-item[${index}]`),
      category: requiredJa(block.data, "category_key", `faq/faq-item[${index}]`),
      question: requiredBi(block.data, "question", `faq/faq-item[${index}]`),
      answer: requiredBi(block.data, "answer", `faq/faq-item[${index}]`),
    })),
    scenariosHeading: requiredBi(
      pageConfig.data,
      "scenarios_heading",
      "faq/faq-page",
    ),
    viewMoreLabel: requiredBi(
      pageConfig.data,
      "view_more_label",
      "faq/faq-page",
    ),
    collapseLabel: requiredBi(
      pageConfig.data,
      "collapse_label",
      "faq/faq-page",
    ),
  };
}
