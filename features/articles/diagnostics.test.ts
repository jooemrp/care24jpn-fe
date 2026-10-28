import assert from "node:assert/strict";
import { test } from "node:test";
import { readArticleContent } from "./diagnostics";
import { ApiRequestError } from "../../lib/api";
import { CmsContentError } from "../cms/errors";

test("article reads retain normalized request diagnostics across the server-render boundary", async () => {
  const result = await readArticleContent("articles.entries", async () => {
    throw new ApiRequestError({ code: "CMS_TIMEOUT", message: "The CMS request timed out.", traceId: "trace-test" });
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.diagnostic, /articles.entries/);
    assert.match(result.diagnostic, /CMS_TIMEOUT/);
    assert.match(result.diagnostic, /trace-test/);
  }
});

test("missing entry structure retains the exact CMS field instead of a generic production error", async () => {
  const result = await readArticleContent("article.demo", async () => {
    throw new CmsContentError("CMS_INVALID_CONTENT", "Entry data is malformed.", ["article/demo.data"]);
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.diagnostic, /article\/demo.data/);
});

test("successful reads preserve their values, including a missing slug for the route's 404", async () => {
  assert.deepEqual(await readArticleContent("articles", async () => ["data"]), { ok: true, data: ["data"] });
  assert.deepEqual(await readArticleContent("article.missing", async () => null), { ok: true, data: null });
});
