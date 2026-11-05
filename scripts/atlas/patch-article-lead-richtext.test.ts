import assert from "node:assert/strict";
import test from "node:test";
import { leadToHtml } from "./patch-article-lead-richtext";

test("plain-text lead becomes one <p> per blank-line paragraph", () => {
  assert.equal(leadToHtml("導入1\n\n導入2"), "<p>導入1</p>\n<p>導入2</p>");
});
test("empty or already-HTML lead is left alone", () => {
  assert.equal(leadToHtml(""), null);
  assert.equal(leadToHtml(undefined), null);
  assert.equal(leadToHtml("<p>済</p>"), null);
});
