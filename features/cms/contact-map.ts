/**
 * Pure Atlas blocks -> contact page content mapping.
 *
 * The live page contains both the shared page hero and dedicated phone/form
 * blocks. Submission copy and validation messages live on the page-specific
 * `contact-page` block; categories remain repeated blocks so editors can
 * reorder or add options without changing application code.
 */

import {
  mapBlocksByType,
  optionalLines,
  requiredBi,
  requiredJa,
  type BlockTypeList,
} from "./fields";
import { CmsContentError } from "./errors";
import type { Bilingual, CmsBlock } from "./types";
import type {
  ContactCategory,
  ContactPageContent,
} from "@/features/contact/content-contract";

export type ContactContent = ContactPageContent & {
  heading: Bilingual;
  intro: Bilingual;
  phone: {
    badge: Bilingual;
    title: Bilingual;
    body: Bilingual;
    telLabel: Bilingual;
    number: string;
    hours: Bilingual;
    bullets: Bilingual[];
  };
  form: {
    badge: Bilingual;
    title: Bilingual;
    body: Bilingual;
    bullets: Bilingual[];
    followUp: Bilingual;
  };
};

const CONTACT_TYPES = [
  "page-hero",
  "contact-phone-card",
  "contact-form-card",
  "contact-form-fields",
  "contact-category",
] as const satisfies BlockTypeList;

function requiredPageBlock(
  blocks: readonly CmsBlock[],
  type: string,
  context: string,
): CmsBlock {
  const block = blocks.find((candidate) => candidate.type === type);
  if (block) return block;

  throw new CmsContentError(
    "CMS_MISSING_REQUIRED_BLOCK",
    `Page "${context}" is missing required CMS block type "${type}".`,
    [`${context}.${type}`],
    context,
  );
}

export function mapContact(blocks: CmsBlock[]): ContactContent {
  const pageConfig = requiredPageBlock(blocks, "contact-page", "contact");
  const groups = mapBlocksByType(
    "contact",
    blocks.filter((block) => block.type !== "contact-page"),
    CONTACT_TYPES,
  );
  const [heroBlock] = groups["page-hero"];
  const [phoneBlock] = groups["contact-phone-card"];
  const [formBlock] = groups["contact-form-card"];
  const [fieldsBlock] = groups["contact-form-fields"];

  // The page-specific block repeats the hero and card copy in the live
  // payload. The dedicated blocks stay canonical for the rendered layout;
  // these two required reads keep the complete published page contract
  // observable without introducing a bundled fallback.
  requiredBi(pageConfig.data, "heading", "contact/contact-page");
  requiredBi(pageConfig.data, "intro", "contact/contact-page");

  const phoneBullets = optionalLines(
    phoneBlock.data,
    "bullets",
    "contact/contact-phone-card",
  );
  const formBullets = optionalLines(
    formBlock.data,
    "bullets",
    "contact/contact-form-card",
  );

  const fields: ContactPageContent["fields"] = {
    category: requiredBi(fieldsBlock.data, "category", "contact/contact-form-fields"),
    name: requiredBi(fieldsBlock.data, "name", "contact/contact-form-fields"),
    phone: requiredBi(fieldsBlock.data, "phone", "contact/contact-form-fields"),
    email: requiredBi(fieldsBlock.data, "email", "contact/contact-form-fields"),
    message: requiredBi(fieldsBlock.data, "message", "contact/contact-form-fields"),
    submit: requiredBi(fieldsBlock.data, "submit", "contact/contact-form-fields"),
  };

  const categories: ContactCategory[] = groups["contact-category"].map((block, index) => ({
    value: requiredJa(
      block.data,
      "category_key",
      `contact/contact-category[${index}]`,
    ),
    label: requiredBi(block.data, "label", `contact/contact-category[${index}]`),
  }));

  return {
    heading: requiredBi(heroBlock.data, "heading", "contact/page-hero"),
    intro: requiredBi(heroBlock.data, "body", "contact/page-hero"),
    phone: {
      badge: requiredBi(phoneBlock.data, "badge", "contact/contact-phone-card"),
      title: requiredBi(phoneBlock.data, "title", "contact/contact-phone-card"),
      body: requiredBi(phoneBlock.data, "body", "contact/contact-phone-card"),
      telLabel: requiredBi(phoneBlock.data, "tel_label", "contact/contact-phone-card"),
      number: requiredJa(phoneBlock.data, "number", "contact/contact-phone-card"),
      hours: requiredBi(phoneBlock.data, "hours", "contact/contact-phone-card"),
      bullets: phoneBullets,
    },
    form: {
      badge: requiredBi(formBlock.data, "badge", "contact/contact-form-card"),
      title: requiredBi(formBlock.data, "title", "contact/contact-form-card"),
      body: requiredBi(formBlock.data, "body", "contact/contact-form-card"),
      bullets: formBullets,
      followUp: requiredBi(formBlock.data, "follow_up", "contact/contact-form-card"),
    },
    fields,
    categories,
    requiredNote: requiredBi(pageConfig.data, "required_note", "contact/contact-page"),
    categoryPlaceholder: requiredBi(
      pageConfig.data,
      "category_placeholder",
      "contact/contact-page",
    ),
    status: {
      sending: requiredBi(pageConfig.data, "status_sending", "contact/contact-page"),
      success: requiredBi(pageConfig.data, "status_success", "contact/contact-page"),
      error: requiredBi(pageConfig.data, "status_error", "contact/contact-page"),
      rateLimited: requiredBi(
        pageConfig.data,
        "status_rate_limited",
        "contact/contact-page",
      ),
    },
    errors: {
      required: requiredBi(pageConfig.data, "error_required", "contact/contact-page"),
      category: requiredBi(pageConfig.data, "error_category", "contact/contact-page"),
      email: requiredBi(pageConfig.data, "error_email", "contact/contact-page"),
      phone: requiredBi(pageConfig.data, "error_phone", "contact/contact-page"),
      messageMin: requiredBi(
        pageConfig.data,
        "error_message_min",
        "contact/contact-page",
      ),
      messageMax: requiredBi(
        pageConfig.data,
        "error_message_max",
        "contact/contact-page",
      ),
      nameMax: requiredBi(pageConfig.data, "error_name_max", "contact/contact-page"),
    },
  };
}
