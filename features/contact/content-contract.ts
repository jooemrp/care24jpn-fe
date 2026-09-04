/**
 * Backend content contracts for the FAQ and contact surfaces.
 *
 * These contracts describe the published Atlas block types consumed by the
 * FAQ and contact route loaders. They are metadata only: they do not provide
 * copy, assets, URLs, or other page-content fallbacks.
 *
 * This module has no runtime imports so the contract and form types remain
 * easy to exercise without Next.js or a live Atlas connection.
 */

export type ContentFieldType =
  | "text"
  | "textarea"
  | "richtext"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "image"
  | "relation"
  | "content_type_reference";

export type ContentContractField = Readonly<{
  name: string;
  fieldType: ContentFieldType;
  localizable: boolean;
}>;

export type ContentTypeContract = Readonly<{
  slug: string;
  fields: readonly ContentContractField[];
}>;

export type ContentContract = Readonly<{
  pageSlug: "faq" | "contact";
  contentTypes: readonly ContentTypeContract[];
}>;

export type BilingualDiagnostic = Readonly<{
  ja: string;
  en: string;
}>;

const localizedText = (name: string): ContentContractField => ({
  name,
  fieldType: "text",
  localizable: true,
});

const localizedTextarea = (name: string): ContentContractField => ({
  name,
  fieldType: "textarea",
  localizable: true,
});

const sharedKey = (name: string): ContentContractField => ({
  name,
  fieldType: "text",
  localizable: false,
});

/**
 * The Atlas contract needed to render the FAQ route without importing
 * `constants/faq.ts`.
 */
export const faqContentContract = {
  pageSlug: "faq",
  contentTypes: [
    {
      slug: "page-hero",
      fields: [localizedText("heading"), localizedTextarea("body")],
    },
    {
      slug: "faq-page",
      fields: [
        localizedText("heading"),
        localizedTextarea("intro"),
        localizedText("scenarios_heading"),
        localizedText("view_more_label"),
        localizedText("collapse_label"),
      ],
    },
    {
      slug: "faq-category",
      fields: [
        sharedKey("id"),
        localizedText("label"),
        sharedKey("category_key"),
      ],
    },
    {
      slug: "faq-item",
      fields: [
        sharedKey("id"),
        sharedKey("category"),
        localizedText("question"),
        localizedTextarea("answer"),
        sharedKey("item_key"),
        sharedKey("category_key"),
      ],
    },
  ],
} as const satisfies ContentContract;

/**
 * The Atlas contract needed to render the contact route and configure its
 * form without importing `constants/contact.ts`.
 *
 * Category values are non-localized identifiers consumed by the submission
 * schema; their labels remain localized CMS content.
 */
export const contactContentContract = {
  pageSlug: "contact",
  contentTypes: [
    {
      slug: "page-hero",
      fields: [localizedText("heading"), localizedTextarea("body")],
    },
    {
      slug: "contact-phone-card",
      fields: [
        localizedText("badge"),
        localizedText("title"),
        localizedTextarea("body"),
        localizedText("tel_label"),
        sharedKey("number"),
        localizedText("hours"),
        localizedTextarea("bullets"),
      ],
    },
    {
      slug: "contact-form-card",
      fields: [
        localizedText("badge"),
        localizedText("title"),
        localizedTextarea("body"),
        localizedTextarea("bullets"),
        localizedTextarea("follow_up"),
        localizedTextarea("required_note"),
      ],
    },
    {
      slug: "contact-form-fields",
      fields: [
        sharedKey("mailto"),
        localizedText("category"),
        localizedText("name"),
        localizedText("phone"),
        localizedText("email"),
        localizedText("message"),
        localizedText("submit"),
      ],
    },
    {
      slug: "contact-category",
      fields: [
        sharedKey("value"),
        localizedText("label"),
        sharedKey("category_key"),
      ],
    },
    {
      slug: "contact-page",
      fields: [
        localizedText("heading"),
        localizedTextarea("intro"),
        localizedText("phone_badge"),
        localizedText("phone_title"),
        localizedTextarea("phone_body"),
        localizedText("phone_tel_label"),
        sharedKey("phone_number"),
        localizedText("phone_hours"),
        localizedTextarea("phone_bullets"),
        localizedText("form_badge"),
        localizedText("form_title"),
        localizedTextarea("form_body"),
        localizedTextarea("form_bullets"),
        localizedTextarea("form_follow_up"),
        localizedText("required_note"),
        localizedText("category_placeholder"),
        localizedText("field_category"),
        localizedText("field_name"),
        localizedText("field_phone"),
        localizedText("field_email"),
        localizedText("field_message"),
        localizedText("field_submit"),
        localizedText("status_sending"),
        localizedText("status_success"),
        localizedText("status_error"),
        localizedText("status_rate_limited"),
        localizedText("error_required"),
        localizedText("error_category"),
        localizedText("error_email"),
        localizedText("error_phone"),
        localizedText("error_message_min"),
        localizedText("error_message_max"),
        localizedText("error_name_max"),
      ],
    },
  ],
} as const satisfies ContentContract;

/**
 * Type-only form content shape. The live CMS adapter provides every rendered
 * form value through this contract before ContactForm is mounted.
 */
export type ContactCategory = Readonly<{
  value: string;
  label: BilingualDiagnostic;
}>;

export type ContactPageFields = Readonly<{
  category: BilingualDiagnostic;
  name: BilingualDiagnostic;
  phone: BilingualDiagnostic;
  email: BilingualDiagnostic;
  message: BilingualDiagnostic;
  submit: BilingualDiagnostic;
}>;

export type ContactPageContent = Readonly<{
  requiredNote: BilingualDiagnostic;
  categoryPlaceholder: BilingualDiagnostic;
  categories: readonly ContactCategory[];
  fields: ContactPageFields;
  status: {
    sending: BilingualDiagnostic;
    success: BilingualDiagnostic;
    error: BilingualDiagnostic;
    rateLimited: BilingualDiagnostic;
  };
  errors: {
    required: BilingualDiagnostic;
    category: BilingualDiagnostic;
    email: BilingualDiagnostic;
    phone: BilingualDiagnostic;
    messageMin: BilingualDiagnostic;
    messageMax: BilingualDiagnostic;
    nameMax: BilingualDiagnostic;
  };
}>;
