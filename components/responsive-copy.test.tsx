import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResponsiveCopy } from "./ResponsiveCopy";
import { stripPhraseMarkup } from "../lib/phrase-test-utils";

test("desktop-only responsive copy keeps editorial breaks off narrow screens", () => {
  const html = renderToStaticMarkup(
    React.createElement(ResponsiveCopy, {
      text: { ja: "必要な時間だけ\nご利用いただけます", en: "Use it when needed." },
      lang: "ja",
      mode: "desktop-only",
    }),
  );

  const text = stripPhraseMarkup(html);
  assert.match(html, /md:hidden/);
  assert.match(html, /hidden md:inline/);
  assert.match(text, /必要な時間だけご利用いただけます/);
  assert.match(text, /必要な時間だけ\nご利用いただけます/);
});

test("japanese copy wraps only between phrases on every span", () => {
  const html = renderToStaticMarkup(
    React.createElement(ResponsiveCopy, {
      text: { ja: "保険では足りない時間を、有資格者がサポートします。", en: "Care." },
      lang: "ja",
      mode: "desktop-only",
    }),
  );

  const spans = (html.match(/<span[^>]*>/g) ?? []).filter((span) => span !== "<span>");
  assert.equal(spans.length, 2);
  for (const span of spans) assert.match(span, /jp-phrase/);
  assert.match(html, /時間を、<\/span><wbr\/><span>有資格者が/);
  assert.doesNotMatch(html, /有資<wbr/);
});

test("always responsive copy preserves explicit line breaks at every width", () => {
  const html = renderToStaticMarkup(
    React.createElement(ResponsiveCopy, {
      text: { ja: "有資格者が\n訪問します", en: "We visit." },
      lang: "ja",
      mode: "always",
    }),
  );

  assert.match(html, /whitespace-pre-line/);
  assert.doesNotMatch(html, /md:hidden/);
  // The CMS newline must sit outside the phrase span or pre-line loses it.
  assert.match(html, /有資格者が<\/span>\n/);
});

test("desktop-only classes land on the desktop span without touching mobile", () => {
  const html = renderToStaticMarkup(
    React.createElement(ResponsiveCopy, {
      text: { ja: "詳しくはこちら（料金ページ）をご確認ください。", en: "For details." },
      mobileText: { ja: "詳しくはこちら（料金ページ）を\nご確認ください。", en: "For details,\nclick here." },
      lang: "ja",
      mode: "desktop-only",
      desktopClassName: "lg:whitespace-nowrap lg:text-sm",
    }),
  );

  const spans = (html.match(/<span[^>]*>/g) ?? []).filter((span) => span !== "<span>");
  assert.equal(spans.length, 2);
  assert.match(spans[1]!, /lg:whitespace-nowrap/);
  assert.match(spans[1]!, /lg:text-sm/);
  assert.doesNotMatch(spans[0]!, /lg:whitespace-nowrap/);
  assert.doesNotMatch(spans[0]!, /lg:text-sm/);
});
