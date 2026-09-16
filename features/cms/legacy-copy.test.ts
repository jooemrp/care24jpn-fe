import assert from "node:assert/strict";
import { test } from "node:test";
import { replaceExactBilingual } from "./legacy-copy.ts";

test("replaceExactBilingual migrates only matching legacy locales", () => {
  const result = replaceExactBilingual(
    { ja: "old-ja", en: "editor-en" },
    { ja: "new-ja", en: "new-en" },
    { ja: "old-ja", en: "old-en" },
  );

  assert.deepEqual(result, { ja: "new-ja", en: "editor-en" });
});

test("replaceExactBilingual leaves unrelated CMS copy unchanged", () => {
  const value = { ja: "editor-ja", en: "editor-en" };
  assert.deepEqual(replaceExactBilingual(value, { ja: "new-ja", en: "new-en" }, { ja: "old-ja" }), value);
});

test("replaceExactBilingual accepts multiple known legacy variants", () => {
  assert.deepEqual(
    replaceExactBilingual(
      { ja: "old-ja-2", en: "old-en-2" },
      { ja: "new-ja", en: "new-en" },
      { ja: ["old-ja-1", "old-ja-2"], en: ["old-en-1", "old-en-2"] },
    ),
    { ja: "new-ja", en: "new-en" },
  );
});
