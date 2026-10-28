import { test } from "node:test";
import { strict as assert } from "node:assert";
import { nav } from "../../constants/copy.ts";
import { addHelpfulInformation } from "./patch-nav-helpful-information-data.ts";

test("inserts the translated nav item in seed order and preserves existing content", () => {
  const existingNav = nav.filter((item) => item.href !== "/helpful-information");
  const page = {
    seo: { title: "Existing SEO" },
    blocks: [
      { id: "brand", type: "site-brand", block_type_id: "brand-type", position: 0, data: { name: "Existing" } },
      ...existingNav.map((item, index) => ({
        id: `nav-${index}`, type: "nav-item", block_type_id: "nav-type", position: index + 1,
        data: { href: item.href, label: item.label.ja },
      })),
      { id: "footer", type: "site-footer", block_type_id: "footer-type", position: existingNav.length + 1, data: { legal: "existing" } },
    ],
    block_translations: [
      ...existingNav.map((item, index) => ({ block_id: `nav-${index}`, locale: "en", data: { label: item.label.en } })),
      { block_id: "footer", locale: "en", data: { legal: "Existing legal" } },
    ],
  };
  const original = structuredClone(page);
  const result = addHelpfulInformation(page);
  assert.ok(result);
  assert.deepEqual(result.filter((block) => block.block_type_id === "nav-type").map((block) => block.data.href), nav.map((item) => item.href));
  const inserted = result.find((block) => block.data.href === "/helpful-information");
  assert.deepEqual(inserted?.data, { href: "/helpful-information", label: "お役立ち情報" });
  assert.deepEqual(inserted?.translations, { en: { data: { label: "Helpful Information" } } });
  const insertionPosition = page.blocks.find((block) => "href" in block.data && block.data.href === "/faq")!.position;
  assert.deepEqual(result.filter((block) => block !== inserted), page.blocks.map((block) => {
    const translations = Object.fromEntries(page.block_translations.filter((row) => row.block_id === block.id).map((row) => [row.locale, { data: row.data }]));
    return { block_type_id: block.block_type_id, parent_id: null, position: block.position >= insertionPosition ? block.position + 1 : block.position, data: block.data, ...(Object.keys(translations).length ? { translations } : {}) };
  }));
  assert.deepEqual(page, original);
  assert.equal(addHelpfulInformation({ ...page, blocks: [...page.blocks, { id: "new", type: "nav-item", block_type_id: "nav-type", position: insertionPosition, data: { href: "/helpful-information" } }] }), null);
});

test("refuses to insert when the FAQ anchor is missing", () => {
  assert.throws(() => addHelpfulInformation({ blocks: [{ id: "nav", type: "nav-item", block_type_id: "nav-type", position: 0, data: { href: "/pricing" } }] }), /Expected a \/faq nav-item/);
});
