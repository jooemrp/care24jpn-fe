import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../../../styles/globals.css", import.meta.url), "utf8");

function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `missing rule: ${selector}`);
  return css.slice(start, css.indexOf("}", start));
}

test("article body phrases are plain inline text so lines fill the width", () => {
  const span = rule(".article-prose :is(p, li) .jp-phrase > span");
  assert.match(span, /display: inline;/);
  assert.match(span, /white-space: normal;/);
  assert.doesNotMatch(span, /nowrap/);
});

test("the final phrase stays whole so no paragraph ends on a stray ます。", () => {
  assert.match(rule(".article-prose :is(p, li) .jp-phrase > span:last-of-type"), /display: inline-block;/);
});

test("article body breaks by character without splitting Latin tokens", () => {
  const phrase = rule(".article-prose :is(p, li) .jp-phrase");
  assert.match(phrase, /word-break: normal;/);
  assert.match(phrase, /line-break: strict;/);
  assert.doesNotMatch(phrase, /break-all/);
});

test("CTA aside keeps phrases whole and out of the body rule", () => {
  assert.match(rule("aside .article-prose :is(p, li) .jp-phrase"), /word-break: keep-all;/);
  assert.match(rule("aside .article-prose :is(p, li) .jp-phrase > span"), /display: inline-block;/);
});

test("h1-h3 balance their lines and break by phrase at the parent", () => {
  const start = css.indexOf("h1,\nh2,\nh3 {");
  assert.notEqual(start, -1, "missing h1,h2,h3 rule");
  const heading = css.slice(start, css.indexOf("}", start));
  assert.match(heading, /text-wrap: balance;/);
  assert.match(heading, /word-break: auto-phrase;/);
  assert.match(rule(".jp-phrase > span"), /display: inline-block;/);
});

test("headings and table cells keep their phrase-whole rules", () => {
  assert.match(rule(".jp-phrase > span"), /display: inline-block;/);
  assert.match(rule(":is(td, th) .jp-phrase > span"), /overflow-wrap: break-word;/);
});
