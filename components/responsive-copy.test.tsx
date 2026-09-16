import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResponsiveCopy } from "./ResponsiveCopy";

test("desktop-only responsive copy keeps editorial breaks off narrow screens", () => {
  const html = renderToStaticMarkup(
    React.createElement(ResponsiveCopy, {
      text: { ja: "必要な時間だけ\nご利用いただけます", en: "Use it when needed." },
      lang: "ja",
      mode: "desktop-only",
    }),
  );

  assert.match(html, /md:hidden/);
  assert.match(html, /hidden md:inline/);
  assert.match(html, /必要な時間だけご利用いただけます/);
  assert.match(html, /必要な時間だけ\nご利用いただけます/);
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
});
