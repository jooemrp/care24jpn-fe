import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type * as ContentModule from "./company-content.tsx";

const contentPath = "./company-content" + ".tsx";
const darkVariant = ["dark", ":"].join("");

async function main(): Promise<void> {
  const { CompanyContentView } = (await import(contentPath)) as typeof ContentModule;

  test("populated company content renders rows without mobile overflow", () => {
    const content = {
      heading: { ja: "運営会社", en: "Operating Company" },
      rows: [
        {
          key: "address",
          label: { ja: "所在地", en: "Head office" },
          value: { ja: "東京都", en: "Tokyo" },
        },
      ],
    } satisfies Parameters<typeof CompanyContentView>[0]["content"];

    const html = renderToStaticMarkup(
      React.createElement(CompanyContentView, { content, lang: "en" }),
    );

    assert.match(html, /Operating Company/);
    assert.match(html, /Head office/);
    assert.match(html, /Tokyo/);
    assert.match(html, /minmax\(0,1fr\)/);
    assert.match(html, /border-border/);
    assert.doesNotMatch(html, new RegExp(darkVariant));
  });
}

void main();
