import assert from "node:assert/strict";
import { test } from "node:test";
import type { Bilingual, CmsBlock } from "./types";
import type * as ContactMapModule from "./contact-map.ts";

const contactMapPath = "./contact-map" + ".ts";

function bi(value: string): Bilingual {
  return { ja: value, en: `${value}-en` };
}

function block(
  type: string,
  position: number,
  data: Record<string, unknown>,
): CmsBlock {
  return {
    id: `${type}-${position}`,
    type,
    blockTypeId: `uuid-of-${type}`,
    parentId: null,
    position,
    data,
  };
}

function pageConfig(): Record<string, unknown> {
  return {
    heading: bi("Contact"),
    intro: bi("Contact intro"),
    required_note: bi("All fields required"),
    category_placeholder: bi("Select a category"),
    status_sending: bi("Sending"),
    status_success: bi("Sent"),
    status_error: bi("Failed"),
    status_rate_limited: bi("Too many requests"),
    error_required: bi("Required"),
    error_category: bi("Choose a category"),
    error_email: bi("Invalid email"),
    error_phone: bi("Invalid phone"),
    error_message_min: bi("Message is too short"),
    error_message_max: bi("Message is too long"),
    error_name_max: bi("Name is too long"),
  };
}

async function main(): Promise<void> {
  const { mapContact } = (await import(contactMapPath)) as typeof ContactMapModule;

  test("maps the published contact page into the existing form contract", () => {
    const result = mapContact([
      block("page-hero", 0, {
        heading: bi("Contact"),
        body: bi("Contact intro"),
      }),
      block("contact-phone-card", 1, {
        badge: bi("Phone badge"),
        title: bi("Phone title"),
        body: bi("Phone body"),
        tel_label: bi("TEL"),
        number: bi("0120-001-224"),
        hours: bi("Weekdays"),
        bullets: bi("Phone bullet 1\nPhone bullet 2"),
      }),
      block("contact-form-card", 2, {
        badge: bi("Form badge"),
        title: bi("Form title"),
        body: bi("Form body"),
        bullets: bi("Form bullet 1\nForm bullet 2"),
        follow_up: bi("Follow up"),
        required_note: bi("All fields required"),
      }),
      block("contact-form-fields", 3, {
        category: bi("Category"),
        name: bi("Name"),
        phone: bi("Phone"),
        email: bi("Email"),
        message: bi("Message"),
        submit: bi("Submit"),
        mailto: bi("info@example.com"),
      }),
      block("contact-category", 4, {
        category_key: bi("services"),
        label: bi("Services"),
      }),
      block("contact-page", 5, pageConfig()),
    ]);

    assert.deepEqual(result.heading, bi("Contact"));
    assert.deepEqual(result.intro, bi("Contact intro"));
    assert.deepEqual(result.phone, {
      badge: bi("Phone badge"),
      title: bi("Phone title"),
      body: bi("Phone body"),
      telLabel: bi("TEL"),
      number: "0120-001-224",
      hours: bi("Weekdays"),
      bullets: [
        { ja: "Phone bullet 1", en: "Phone bullet 1" },
        { ja: "Phone bullet 2", en: "Phone bullet 2-en" },
      ],
    });
    assert.deepEqual(result.form.bullets, [
      { ja: "Form bullet 1", en: "Form bullet 1" },
      { ja: "Form bullet 2", en: "Form bullet 2-en" },
    ]);
    assert.deepEqual(result.fields, {
      category: bi("Category"),
      name: bi("Name"),
      phone: bi("Phone"),
      email: bi("Email"),
      message: bi("Message"),
      submit: bi("Submit"),
    });
    assert.deepEqual(result.categories, [
      { value: "services", label: bi("Services") },
    ]);
    assert.deepEqual(result.status, {
      sending: bi("Sending"),
      success: bi("Sent"),
      error: bi("Failed"),
      rateLimited: bi("Too many requests"),
    });
    assert.deepEqual(result.errors.required, bi("Required"));
  });

  test("rejects contact data when the page configuration block is missing", () => {
    assert.throws(
      () =>
        mapContact([
          block("page-hero", 0, {
            heading: bi("Contact"),
            body: bi("Contact intro"),
          }),
          block("contact-phone-card", 1, {
            badge: bi("Phone badge"),
            title: bi("Phone title"),
            body: bi("Phone body"),
            tel_label: bi("TEL"),
            number: bi("0120-001-224"),
            hours: bi("Weekdays"),
            bullets: bi("Phone bullet"),
          }),
          block("contact-form-card", 2, {
            badge: bi("Form badge"),
            title: bi("Form title"),
            body: bi("Form body"),
            bullets: bi("Form bullet"),
            follow_up: bi("Follow up"),
            required_note: bi("All fields required"),
          }),
          block("contact-form-fields", 3, {
            category: bi("Category"),
            name: bi("Name"),
            phone: bi("Phone"),
            email: bi("Email"),
            message: bi("Message"),
            submit: bi("Submit"),
          }),
          block("contact-category", 4, {
            category_key: bi("services"),
            label: bi("Services"),
          }),
        ]),
      (error: unknown) =>
        error instanceof Error &&
        "code" in error &&
        error.code === "CMS_MISSING_REQUIRED_BLOCK",
    );
  });
}

void main();
