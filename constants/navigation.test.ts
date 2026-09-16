import assert from "node:assert/strict";
import { test } from "node:test";

test("desktop navigation places Contact immediately after FAQ", async () => {
  const copyPath = "./copy" + ".ts";
  const { nav } = (await import(copyPath)) as typeof import("./copy");
  const faqIndex = nav.findIndex((item) => item.href === "/faq");

  assert.notEqual(faqIndex, -1);
  assert.equal(nav[faqIndex + 1]?.href, "/contact");
  assert.deepEqual(nav[faqIndex + 1]?.label, {
    ja: "お問い合わせ",
    en: "Contact Us",
  });
});
