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

test("the last 3 characters stay together instead of the whole last phrase going atomic (CARE-505)", () => {
  assert.match(rule(".article-prose .jp-tail"), /white-space: nowrap;/);
  // An atomic last phrase pushes itself to the next line under justify and
  // stretches the line above it character by character.
  assert.doesNotMatch(css, /span:last-of-type\s*\{/);
});

test("justified headings and CTA copy break like the body instead of stretching (CARE-505)", () => {
  const span = rule('aside .article-prose [data-align="justify"] .jp-phrase > span');
  assert.match(span, /display: inline;/);
  assert.match(span, /white-space: normal;/);
  assert.doesNotMatch(span, /nowrap/);
  assert.match(css, /\.article-prose :is\(h2, h3\)\[data-align="justify"\] \.jp-phrase > span,/);
  const phrase = rule('aside .article-prose [data-align="justify"] .jp-phrase');
  assert.match(phrase, /word-break: normal;/);
  assert.match(phrase, /line-break: strict;/);
});

test("justified headings do not balance, or justify stretches the narrowed lines (CARE-505)", () => {
  const heading = rule('.article-prose :is(h2, h3)[data-align="justify"]');
  assert.match(heading, /text-wrap: pretty;/);
  assert.doesNotMatch(heading, /balance/);
});

test("left-aligned headings keep their phrase-whole rule", () => {
  assert.match(rule(".jp-phrase > span"), /display: inline-block;/);
});

test("article body breaks by character without splitting Latin tokens", () => {
  const phrase = rule(".article-prose :is(p, li) .jp-phrase");
  assert.match(phrase, /word-break: normal;/);
  assert.match(phrase, /line-break: strict;/);
  assert.doesNotMatch(phrase, /break-all/);
});

test("CTA aside copy follows the article body rule and fills the line", () => {
  assert.throws(() => rule("aside .article-prose :is(p, li) .jp-phrase"));
  assert.throws(() => rule("aside .article-prose :is(p, li) .jp-phrase > span"));
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

test("CMS line breaks (\\n from <br>) show in article and legal text instead of collapsing (ClickUp #4, #6)", () => {
  assert.match(rule(".article-prose :is(p, li, th, td)"), /white-space: pre-line;/);
  assert.match(rule(".legal-body :is(p, li, th, td)"), /white-space: pre-line;/);
  // The \n sits inside `.jp-phrase` but outside its spans, so `.jp-phrase`
  // must not reset white-space or the break would collapse again.
  assert.doesNotMatch(rule(".jp-phrase"), /white-space/);
});
