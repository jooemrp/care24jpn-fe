import assert from "node:assert/strict";
import { test } from "node:test";
import type { Bilingual, CmsBlock } from "./types";
import type * as FaqMapModule from "./faq-map.ts";

const faqMapPath = "./faq-map" + ".ts";

function bi(value: string): Bilingual {
  return { ja: value, en: `${value}-en` };
}

function block(
  type: string,
  position: number,
  data: Record<string, unknown>,
): CmsBlock {
  return {
    id: `${type}-${position}`,
    type,
    blockTypeId: `uuid-of-${type}`,
    parentId: null,
    position,
    data,
  };
}

async function main(): Promise<void> {
  const { mapFaq } = (await import(faqMapPath)) as typeof FaqMapModule;

  test("maps published FAQ blocks without bundled copy", () => {
    const result = mapFaq([
      block("page-hero", 0, {
        heading: bi("Hero heading"),
        body: bi("Hero body"),
      }),
      block("faq-category", 1, {
        category_key: bi("01"),
        label: bi("Category"),
      }),
      block("faq-item", 2, {
        item_key: bi("Q1"),
        category_key: bi("01"),
        question: bi("Question"),
        answer: bi("Answer"),
      }),
      block("faq-page", 3, {
        heading: bi("FAQ page heading"),
        intro: bi("FAQ page intro"),
        scenarios_heading: bi("Scenarios"),
        view_more_label: bi("View more"),
        collapse_label: bi("Collapse"),
      }),
    ]);

    assert.deepEqual(result.hero, {
      heading: bi("Hero heading"),
      body: bi("Hero body"),
    });
    assert.deepEqual(result.categories, [{ id: "01", label: bi("Category") }]);
    assert.deepEqual(result.items, [
      {
        id: "Q1",
        category: "01",
        question: bi("Question"),
        answer: bi("Answer"),
      },
    ]);
    assert.deepEqual(result.scenariosHeading, bi("Scenarios"));
    assert.deepEqual(result.viewMoreLabel, bi("View more"));
    assert.deepEqual(result.collapseLabel, bi("Collapse"));
  });

  test("rejects FAQ data when the page configuration block is missing", () => {
    assert.throws(
      () =>
        mapFaq([
          block("page-hero", 0, {
            heading: bi("Hero heading"),
            body: bi("Hero body"),
          }),
          block("faq-category", 1, {
            category_key: bi("01"),
            label: bi("Category"),
          }),
          block("faq-item", 2, {
            item_key: bi("Q1"),
            category_key: bi("01"),
            question: bi("Question"),
            answer: bi("Answer"),
          }),
        ]),
      (error: unknown) =>
        error instanceof Error &&
        "code" in error &&
        error.code === "CMS_MISSING_REQUIRED_BLOCK",
    );
  });
}

void main();
