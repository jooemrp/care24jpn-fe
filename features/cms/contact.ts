import "server-only";

import { cache } from "react";
import { getPageBlocks, reportUnexpectedContent } from "./client";
import {
  mapBlocksByType,
  pickBi,
  pickJa,
  pickLines,
  type BlockTypeList,
} from "./fields";
import type { Bilingual, CmsBlock } from "./types";

/**
 * The Contact page content, CMS-sourced (no `constants/contact.ts` fallback).
 *
 * Every string/number/href below comes straight from Atlas — the
 * `page_hero`, `contact_phone_card`, `contact_form_card`,
 * `contact_form_fields` and `contact_category` blocks the "contact" page
 * carries (see scripts/atlas/schema.ts + seed-contact.ts). The phone
 * `number` and the `mailto`/category `value` are non-localizable identifiers
 * read via `pickJa`; everything else is the rendered copy.
 *
 * `bullets` are stored as one-per-line textareas and picked back into
 * arrays with `pickLines`.
 */
export type ContactCategory = {
  value: string;
  label: Bilingual;
};

export type ContactContent = {
  hero: { heading: Bilingual; body: Bilingual };
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
    requiredNote: Bilingual;
    fields: {
      category: Bilingual;
      name: Bilingual;
      phone: Bilingual;
      email: Bilingual;
      message: Bilingual;
      submit: Bilingual;
    };
  };
  mailto: string;
  categories: ContactCategory[];
};

const CONTACT_TYPES = [
  "page-hero",
  "contact-phone-card",
  "contact-form-card",
  "contact-form-fields",
  "contact-category",
] as const satisfies BlockTypeList;

function mapContact(blocks: CmsBlock[]): ContactContent | null {
  const groups = mapBlocksByType("contact", blocks, CONTACT_TYPES, reportUnexpectedContent);
  if (!groups) return null;

  const [heroBlock] = groups["page-hero"];
  const [phoneBlock] = groups["contact-phone-card"];
  const [formCardBlock] = groups["contact-form-card"];
  const [fieldsBlock] = groups["contact-form-fields"];
  const categoryBlocks = groups["contact-category"];

  return {
    hero: {
      heading: pickBi(heroBlock.data, "heading"),
      body: pickBi(heroBlock.data, "body"),
    },
    phone: {
      badge: pickBi(phoneBlock.data, "badge"),
      title: pickBi(phoneBlock.data, "title"),
      body: pickBi(phoneBlock.data, "body"),
      telLabel: pickBi(phoneBlock.data, "tel_label"),
      number: pickJa(phoneBlock.data, "number"),
      hours: pickBi(phoneBlock.data, "hours"),
      bullets: pickLines(phoneBlock.data, "bullets"),
    },
    form: {
      badge: pickBi(formCardBlock.data, "badge"),
      title: pickBi(formCardBlock.data, "title"),
      body: pickBi(formCardBlock.data, "body"),
      bullets: pickLines(formCardBlock.data, "bullets"),
      followUp: pickBi(formCardBlock.data, "follow_up"),
      requiredNote: pickBi(formCardBlock.data, "required_note"),
      fields: {
        category: pickBi(fieldsBlock.data, "category"),
        name: pickBi(fieldsBlock.data, "name"),
        phone: pickBi(fieldsBlock.data, "phone"),
        email: pickBi(fieldsBlock.data, "email"),
        message: pickBi(fieldsBlock.data, "message"),
        submit: pickBi(fieldsBlock.data, "submit"),
      },
    },
    mailto: pickJa(fieldsBlock.data, "mailto"),
    categories: categoryBlocks.map((block) => ({
      value: pickJa(block.data, "value"),
      label: pickBi(block.data, "label"),
    })),
  };
}

async function fetchContact(): Promise<ContactContent> {
  const blocks = await getPageBlocks("contact");
  if (!blocks) {
    throw new Error(
      '[cms] getContact("contact"): page data unavailable (Atlas unreachable, not configured, or page missing) — no fallback content exists; the contact page is unavailable.',
    );
  }
  const content = mapContact(blocks);
  if (!content) {
    throw new Error(
      '[cms] getContact("contact"): page data did not match the expected block shape — no fallback content exists; the contact page is unavailable.',
    );
  }
  return content;
}

/** Deduped per-render (React `cache()`). */
export const getContact = cache(fetchContact);