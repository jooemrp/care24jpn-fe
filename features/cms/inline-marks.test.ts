import assert from "node:assert/strict";
import { test } from "node:test";
import { stripInlineMarks } from "./inline-marks.ts";

test("strips ** around a whole heading", () => {
  assert.equal(stripInlineMarks("**1. 契約当事者**"), "1. 契約当事者");
});

test("strips ** when the closing marker follows a full-width parenthesis", () => {
  assert.equal(
    stripInlineMarks("**4. 訪問看護（医療行為）に関する特則（※サービス区分②の場合のみ適用）**"),
    "4. 訪問看護（医療行為）に関する特則（※サービス区分②の場合のみ適用）",
  );
});

test("unwraps italic, links and a bolded link", () => {
  assert.equal(stripInlineMarks("_miring_ dan [tautan](/pricing)"), "miring dan tautan");
  assert.equal(stripInlineMarks("**[tautan](/pricing)**"), "tautan");
});

test("leaves plain text, including a lone underscore, unchanged", () => {
  assert.equal(stripInlineMarks("1. 契約当事者"), "1. 契約当事者");
  assert.equal(stripInlineMarks("a_b"), "a_b");
});
