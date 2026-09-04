import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cta } from "@/constants/copy";
import type * as ContentModule from "./use-case-content.tsx";

const contentPath = "./use-case-content" + ".tsx";
const darkVariant = ["dark", ":"].join("");

async function main(): Promise<void> {
  const { UseCaseContentView } = (await import(contentPath)) as typeof ContentModule;

  test("populated use-case content renders bilingual CMS data responsively", () => {
    const content = {
      hero: {
        heading: { ja: "利用シーン", en: "Use cases" },
        body: { ja: "本文", en: "Body" },
        ctaHref: "/pricing",
      },
      cases: [
        {
          slug: "first-case",
          title: { ja: "ケース", en: "Case" },
          body: { ja: "短い説明", en: "Short description" },
          detail: { ja: "詳細", en: "Details" },
          highlights: [{ ja: "特徴", en: "Highlight" }],
          imageAlt: { ja: "画像", en: "Image" },
          image: "/images/use-case-1.webp",
        },
      ],
    } satisfies Parameters<typeof UseCaseContentView>[0]["content"];

    const html = renderToStaticMarkup(
      React.createElement(UseCaseContentView, {
        content,
        lang: "en",
        primaryCta: cta.primary,
      }),
    );

    assert.match(html, /Use cases/);
    assert.match(html, /Case/);
    assert.match(html, /id="first-case"/);
    assert.match(html, /Highlight/);
    assert.match(html, /\/pricing/);
    assert.match(html, /md:grid-cols-2/);
    assert.match(html, /text-heading/);
    assert.doesNotMatch(html, new RegExp(darkVariant));
  });
}

void main();
