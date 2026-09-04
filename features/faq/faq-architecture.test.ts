/**
 * FAQ view / list architecture: CMS answers carry links; views never hardcode
 * `/pricing`. Run: `npx tsx --test features/faq/faq-architecture.test.ts`
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import FaqList from "@/components/faq/FaqList";

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("faq-view does not hardcode a /pricing Link href", () => {
  const view = source("features/faq/components/faq-view.tsx");
  assert.doesNotMatch(view, /href=["']\/pricing["']/);
  assert.doesNotMatch(view, /localizeHref\(["']\/pricing["']/);
});

test("FaqList resolves CMS markdown pricing links without hardcoded hrefs", () => {
  const list = source("components/faq/FaqList.tsx");
  assert.match(list, /InlineCmsText/);
  assert.doesNotMatch(list, /href=["']\/pricing["']/);

  const html = renderToStaticMarkup(
    React.createElement(FaqList, {
      lang: "en",
      items: [
        {
          id: "Q15",
          category: "04",
          question: { ja: "料金?", en: "Cost?" },
          answer: {
            ja: "詳しくは[料金ページ](/pricing)をご確認ください。",
            en: "Please check our [Pricing Page](/pricing) for detailed rates.",
          },
        },
      ],
      categories: [{ id: "04", label: { ja: "料金", en: "Pricing" } }],
      scenariosHeading: { ja: "場面", en: "Scenarios" },
      viewMoreLabel: { ja: "もっと見る", en: "View more" },
      collapseLabel: { ja: "閉じる", en: "Collapse" },
      defaultVisible: 5,
    }),
  );

  assert.match(html, /href="\/en\/pricing"/);
  assert.match(html, /Pricing Page/);
});
