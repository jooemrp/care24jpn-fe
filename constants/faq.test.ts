/**
 * Structure tests for constants/faq.ts.
 *
 * Run (from marketing-web/):
 *   npx tsx constants/faq.test.ts
 *
 * Verify:
 * - `faqItems` exports 29 items (Q1–Q24 + S1–S5)
 * - `faqCategories` exports 6 category buckets
 * - Each item has non-empty bilingual question and answer
 * - Q5 (index 4) and Q16 (index 15) explicitly lock in the 2-hour minimum
 * - Scenarios S1–S5 all carry category "scenarios"
 * - Every item id is unique
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import type { FaqItem, FaqCategory } from "./faq.ts";

const faqPath = "./faq" + ".ts";

async function main(): Promise<void> {
  const { faqItems, faqCategories } = (await import(faqPath)) as {
    faqItems: FaqItem[];
    faqCategories: FaqCategory[];
  };

  // -----------------------------------------------------------------------
  // faqCategories: exactly 6 buckets in the correct order
  // -----------------------------------------------------------------------
  test("faqCategories has 6 entries", () => {
    assert.equal(faqCategories.length, 6);
  });

  test("faqCategories ids are 01..05 + scenarios", () => {
    const ids = faqCategories.map((c) => c.id);
    assert.deepEqual(ids, ["01", "02", "03", "04", "05", "scenarios"]);
  });

  test("each faqCategory has non-empty bilingual label", () => {
    for (const cat of faqCategories) {
      assert.ok(cat.label.ja.length > 0, `category ${cat.id} label.ja is empty`);
      assert.ok(cat.label.en.length > 0, `category ${cat.id} label.en is empty`);
    }
  });

  // -----------------------------------------------------------------------
  // faqItems: 29 items (Q1–Q24 + S1–S5)
  // -----------------------------------------------------------------------
  test("faqItems has 29 items (Q1-Q24 + S1-S5)", () => {
    assert.equal(faqItems.length, 29);
  });

  test("first 24 items have ids Q1–Q24", () => {
    for (let i = 0; i < 24; i++) {
      assert.equal(faqItems[i].id, `Q${i + 1}`, `item ${i} id mismatch`);
    }
  });

  test("last 5 items have ids S1–S5", () => {
    for (let i = 0; i < 5; i++) {
      assert.equal(faqItems[24 + i].id, `S${i + 1}`, `scenario ${i} id mismatch`);
    }
  });

  test("all ids are unique", () => {
    const ids = faqItems.map((item) => item.id);
    const unique = new Set(ids);
    assert.equal(unique.size, ids.length, "Duplicate ids found");
  });

  test("all items have non-empty bilingual question and answer", () => {
    for (const item of faqItems) {
      assert.ok(
        item.question.ja.length > 0,
        `${item.id}: question.ja is empty`,
      );
      assert.ok(
        item.question.en.length > 0,
        `${item.id}: question.en is empty`,
      );
      assert.ok(
        item.answer.ja.length > 0,
        `${item.id}: answer.ja is empty`,
      );
      assert.ok(
        item.answer.en.length > 0,
        `${item.id}: answer.en is empty`,
      );
    }
  });

  test("all items have a valid category id", () => {
    const validCategoryIds = new Set(faqCategories.map((c) => c.id));
    for (const item of faqItems) {
      assert.ok(
        validCategoryIds.has(item.category),
        `${item.id}: unknown category "${item.category}"`,
      );
    }
  });

  // -----------------------------------------------------------------------
  // Category membership: Q1–Q8 → "01", Q9–Q12 → "02", etc.
  // -----------------------------------------------------------------------
  test("Q1-Q8 belong to category 01 (About Service)", () => {
    for (let i = 0; i < 8; i++) {
      assert.equal(faqItems[i].category, "01", `${faqItems[i].id} wrong category`);
    }
  });

  test("Q9-Q12 belong to category 02 (Care Supporters)", () => {
    for (let i = 8; i < 12; i++) {
      assert.equal(faqItems[i].category, "02", `${faqItems[i].id} wrong category`);
    }
  });

  test("Q13-Q14 belong to category 03 (Nursing & Medical Care)", () => {
    for (let i = 12; i < 14; i++) {
      assert.equal(faqItems[i].category, "03", `${faqItems[i].id} wrong category`);
    }
  });

  test("Q15-Q18 belong to category 04 (Pricing & Payment)", () => {
    for (let i = 14; i < 18; i++) {
      assert.equal(faqItems[i].category, "04", `${faqItems[i].id} wrong category`);
    }
  });

  test("Q19-Q24 belong to category 05 (Reservation & Matching)", () => {
    for (let i = 18; i < 24; i++) {
      assert.equal(faqItems[i].category, "05", `${faqItems[i].id} wrong category`);
    }
  });

  test("S1-S5 belong to category scenarios", () => {
    for (let i = 24; i < 29; i++) {
      assert.equal(
        faqItems[i].category,
        "scenarios",
        `${faqItems[i].id} wrong category`,
      );
    }
  });

  // -----------------------------------------------------------------------
  // LOCKED: Q5 and Q16 must reference the 2-hour minimum
  // -----------------------------------------------------------------------
  test("Q5 answer (JA) mentions minimum 2 hours (最低2時間)", () => {
    const q5 = faqItems.find((item) => item.id === "Q5")!;
    assert.ok(
      q5.answer.ja.includes("最低2時間") || q5.answer.ja.includes("2時間"),
      `Q5 answer.ja does not mention 2 hours: "${q5.answer.ja}"`,
    );
  });

  test("Q5 answer (EN) mentions minimum 2 hours", () => {
    const q5 = faqItems.find((item) => item.id === "Q5")!;
    assert.ok(
      q5.answer.en.includes("2 hours") || q5.answer.en.includes("2-hour"),
      `Q5 answer.en does not mention 2 hours: "${q5.answer.en}"`,
    );
  });

  test("Q16 answer (JA) mentions minimum 2 hours (最低2時間)", () => {
    const q16 = faqItems.find((item) => item.id === "Q16")!;
    assert.ok(
      q16.answer.ja.includes("最低2時間") || q16.answer.ja.includes("2時間"),
      `Q16 answer.ja does not mention 2 hours: "${q16.answer.ja}"`,
    );
  });

  test("Q16 answer (EN) mentions minimum 2 hours", () => {
    const q16 = faqItems.find((item) => item.id === "Q16")!;
    assert.ok(
      q16.answer.en.includes("2 hours") || q16.answer.en.includes("2-hour"),
      `Q16 answer.en does not mention 2 hours: "${q16.answer.en}"`,
    );
  });

  // -----------------------------------------------------------------------
  // 0907 #22: Q15 answer carries a CMS markdown link to /pricing
  // -----------------------------------------------------------------------
  test("Q15 answer (JA/EN) includes markdown link to /pricing", () => {
    const q15 = faqItems.find((item) => item.id === "Q15")!;
    assert.match(q15.answer.ja, /\[料金ページ\]\(\/pricing\)/);
    assert.match(q15.answer.en, /\[Pricing Page\]\(\/pricing\)/);
  });

  // -----------------------------------------------------------------------
  // scenariosHeading export
  // -----------------------------------------------------------------------
  test("module exports scenariosHeading bilingual", async () => {
    const mod = (await import(faqPath)) as {
      scenariosHeading: { ja: string; en: string };
    };
    assert.ok(
      typeof mod.scenariosHeading.ja === "string" && mod.scenariosHeading.ja.length > 0,
      "scenariosHeading.ja is missing or empty",
    );
    assert.ok(
      typeof mod.scenariosHeading.en === "string" && mod.scenariosHeading.en.length > 0,
      "scenariosHeading.en is missing or empty",
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
