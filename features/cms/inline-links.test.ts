import assert from "node:assert/strict";
import { test } from "node:test";
import type * as InlineLinksModule from "./inline-links.ts";

const inlineLinksPath = "./inline-links" + ".ts";

async function main(): Promise<void> {
  const { parseInternalMarkdownLinks } = (await import(
    inlineLinksPath
  )) as typeof InlineLinksModule;

  test("parseInternalMarkdownLinks turns [label](/path) into a link part", () => {
    const parts = parseInternalMarkdownLinks(
      "詳しくは[料金ページ](/pricing)をご確認ください。",
    );
    assert.deepEqual(parts, [
      { type: "text", value: "詳しくは" },
      { type: "link", label: "料金ページ", href: "/pricing" },
      { type: "text", value: "をご確認ください。" },
    ]);
  });

  test("parseInternalMarkdownLinks leaves external and javascript hrefs as text", () => {
    const parts = parseInternalMarkdownLinks(
      "See [docs](https://example.com) and [x](javascript:alert(1)).",
    );
    assert.equal(
      parts.every((part) => part.type === "text"),
      true,
    );
  });
}

void main();
