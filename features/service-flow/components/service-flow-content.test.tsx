import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cta } from "@/constants/copy";
import type * as ContentModule from "./service-flow-content.tsx";

const contentPath = "./service-flow-content" + ".tsx";
const darkVariant = ["dark", ":"].join("");

async function main(): Promise<void> {
  const { ServiceFlowContentView } = (await import(contentPath)) as typeof ContentModule;

  test("populated service-flow content renders its own step data responsively", () => {
    const content = {
      hero: {
        heading: { ja: "流れ", en: "How it works" },
        body: { ja: "本文", en: "Body" },
        ctaHref: "/contact",
      },
      steps: [
        {
          number: "7",
          title: { ja: "登録", en: "Registration" },
          body: { ja: "説明", en: "Explanation" },
        },
      ],
    } satisfies Parameters<typeof ServiceFlowContentView>[0]["content"];

    const html = renderToStaticMarkup(
      React.createElement(ServiceFlowContentView, {
        content,
        lang: "en",
        primaryCta: cta.primary,
      }),
    );

    assert.match(html, /How it works/);
    assert.match(html, />7</);
    assert.match(html, /Registration/);
    assert.match(html, /href="\/en\/contact"/);
    assert.match(html, /md:py-12/);
    assert.match(html, /bg-surface/);
    assert.doesNotMatch(html, new RegExp(darkVariant));
    assert.doesNotMatch(html, /href="\/en\/pricing"/);
  });
}

void main();
