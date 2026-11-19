import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArticleCta, CTA_BUTTON_CLASS, justifyCtaBlocks } from "./article-cta";
import { fixDoubledKochira, shortLabel } from "../../../scripts/atlas/patch-article-cta-label";

const body = [{ type: "p" as const, text: "「Care24Japan」では、プロのスタッフがサポートします。" }];
const render = (props: Partial<Parameters<typeof ArticleCta>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(ArticleCta, {
      body,
      label: "Care24Japanの「自費介護サービス」の詳細はこちら",
      href: "/contact",
      lang: "ja",
      contentLang: "ja",
      ...props,
    }),
  );

test("phone button: full width, centred, px-3 and a softer corner; pill from sm up (ClickUp #2)", () => {
  for (const cls of ["w-full", "justify-center", "text-center", "px-3", "rounded-xl", "sm:px-8", "sm:rounded-full", "sm:w-auto"]) {
    assert.ok(CTA_BUTTON_CLASS.split(" ").includes(cls), `missing ${cls}`);
  }
  assert.ok(!CTA_BUTTON_CLASS.split(" ").includes("text-left"));
  assert.ok(!CTA_BUTTON_CLASS.split(" ").includes("justify-between"));
});

test("without a phone label, the full label shows everywhere, brand lead on its own phone line", () => {
  const html = render();
  assert.doesNotMatch(html, /sm:hidden/);
  assert.match(html, /<span class="block whitespace-nowrap sm:inline">Care24Japanの<\/span>/);
  assert.match(html, /<span class="inline-block whitespace-nowrap">詳細はこちら<\/span>/);
});

test("a phone label replaces the full label below sm only, with 「…はこちら」 kept whole", () => {
  const html = render({ labelShort: "自費介護サービスの詳細・料金はこちら" });
  assert.match(html, /<span class="sm:hidden"><span lang="ja">.*自費介護サービスの.*<span class="inline-block whitespace-nowrap">詳細・料金はこちら<\/span>/);
  assert.match(html, /<span class="hidden sm:inline"><span lang="ja"><span class="block whitespace-nowrap sm:inline">Care24Japanの<\/span>/);
});

test("a blank phone label is ignored", () => {
  assert.doesNotMatch(render({ labelShort: "   " }), /sm:hidden/);
});

test("CMS label fixes: doubled こちら and the client's phone rule", () => {
  assert.equal(fixDoubledKochira("…の詳細はこちらこちら"), "…の詳細はこちら");
  assert.equal(fixDoubledKochira("…の詳細はこちら"), "…の詳細はこちら");
  assert.equal(shortLabel("Care24Japanの「自費介護サービス」の詳細はこちらこちら"), "自費介護サービスの詳細はこちら");
  assert.equal(shortLabel("Care24 Japanへの無料相談・お問い合わせはこちらこちら"), "無料相談・お問い合わせはこちら");
  assert.equal(shortLabel("Care 24 Japanの詳しい料金プラン・時間単価のご確認はこちら"), "詳しい料金プラン・時間単価のご確認はこちら");
});

test("CTA copy is justified so it fills the box; headings and chosen alignments are kept", () => {
  assert.match(render(), /<p [^>]*data-align="justify"/);
  const out = justifyCtaBlocks([
    { type: "p", text: "a" },
    { type: "p", text: "b", align: "center" },
    { type: "li", list: "ul", text: "c" },
    { type: "h2", text: "d" },
  ]);
  assert.deepEqual(out.map((b) => ("align" in b ? b.align : undefined)), ["justify", "center", "justify", undefined]);
});
