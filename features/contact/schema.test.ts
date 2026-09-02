/**
 * Tests for features/contact/schema.ts.
 *
 * Run: `npx tsx --test features/contact/schema.test.ts`
 *
 * Same bootstrapping constraints as status-copy.test.ts: relative specifiers
 * need a literal `.ts` extension for Node's loader, and tsc's `bundler`
 * moduleResolution rejects that in a STATIC value import (TS5097), so the
 * value import is resolved dynamically inside `main()` (type-only imports
 * above are erased and therefore allowed to keep the `.ts`).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import type * as SchemaModule from "./schema.ts";

const modulePath = "./schema" + ".ts";

async function main() {
  const m = (await import(modulePath)) as typeof SchemaModule;
  const { contactFormValuesSchema, contactPayloadSchema, fieldErrorMessage } = m;

  const validForm = {
    category: "services",
    name: "山田 太郎",
    phone: "03-5733-6600",
    email: "taro@example.com",
    message: "料金について教えてください。",
    company: "",
    company_name: "",
  };

  const validPayload = {
    ...validForm,
    form_load_at: 1_710_000_000_000,
  };

  test("accepts a valid form payload", () => {
    const result = contactFormValuesSchema.safeParse(validForm);
    assert.equal(result.success, true);
  });

  test("accepts a valid API payload", () => {
    const result = contactPayloadSchema.safeParse(validPayload);
    assert.equal(result.success, true);
  });

  test("rejects empty category", () => {
    const result = contactFormValuesSchema.safeParse({ ...validForm, category: "" });
    assert.equal(result.success, false);
  });

  test("rejects unknown category", () => {
    const result = contactFormValuesSchema.safeParse({ ...validForm, category: "spam" });
    assert.equal(result.success, false);
  });

  test("rejects short message", () => {
    const result = contactFormValuesSchema.safeParse({ ...validForm, message: "short" });
    assert.equal(result.success, false);
  });

  test("rejects bad email", () => {
    const result = contactFormValuesSchema.safeParse({ ...validForm, email: "not-an-email" });
    assert.equal(result.success, false);
  });

  test("rejects short phone", () => {
    const result = contactFormValuesSchema.safeParse({ ...validForm, phone: "123" });
    assert.equal(result.success, false);
  });

  test("rejects phone with letters", () => {
    const result = contactFormValuesSchema.safeParse({ ...validForm, phone: "03-ABCD-6600" });
    assert.equal(result.success, false);
  });

  test("trims name and message", () => {
    const result = contactFormValuesSchema.safeParse({
      ...validForm,
      name: "  Taro  ",
      message: "  料金について教えてください。  ",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.name, "Taro");
      assert.equal(result.data.message, "料金について教えてください。");
    }
  });

  test("rejects API payload without form_load_at", () => {
    const result = contactPayloadSchema.safeParse(validForm);
    assert.equal(result.success, false);
  });

  test("rejects omitted company honeypot fields", () => {
    const withoutHoneypots = {
      category: validForm.category,
      name: validForm.name,
      phone: validForm.phone,
      email: validForm.email,
      message: validForm.message,
    };
    const result = contactFormValuesSchema.safeParse(withoutHoneypots);
    assert.equal(result.success, false);
  });

  test("fieldErrorMessage maps keys for ja and en", () => {
    const table = {
      required: { ja: "必須", en: "Required" },
      category: { ja: "種別", en: "Category" },
      email: { ja: "メール", en: "Email" },
      phone: { ja: "電話", en: "Phone" },
      messageMin: { ja: "短い", en: "Short" },
      messageMax: { ja: "長い", en: "Long" },
      nameMax: { ja: "名前長", en: "Name long" },
    };
    assert.equal(fieldErrorMessage("required", "ja", table), "必須");
    assert.equal(fieldErrorMessage("email", "en", table), "Email");
    assert.equal(fieldErrorMessage("unknown-key", "en", table), table.required.en);
  });
}

void main();
