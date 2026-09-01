/**
 * Seeds the "contact" page — page_hero (heading/body) + contact_phone_card +
 * contact_form_card + contact_form_fields + contact_category x3 — from
 * `constants/contact.ts#contactPage` (single source of truth) onto the live
 * Atlas workspace, then publishes it.
 *
 * `page_hero` carries heading + intro. The phone card carries number (the
 * site-wide display number, non-localizable), and the form fields should be
 * read by the ContactForm. `mailto` and category `value` are identifiers,
 * not copy — base (ja) data only.
 *
 * Idempotent: safe to run twice. Every write goes through
 * `ensurePublishedPage` (scripts/atlas/lib.ts): it updates first and only
 * creates on a 404, so an existing page is updated in place (blocks fully
 * replaced, never appended), and publishing an already-published page is a
 * no-op.
 *
 * Requires the `page_hero`, `contact_phone_card`, `contact_form_card`,
 * `contact_form_fields` and `contact_category` block types to already exist
 * — run `npm run atlas:schema` first.
 *
 * Usage (from marketing-web/):
 *   npx tsx scripts/atlas/seed-contact.ts
 */
import { contactPage } from "@/constants/contact";
import { ogImageForSlug } from "./og-image";
import {
  requireAtlasEnv,
  createScriptManagementClient,
  getContentType,
  ensurePublishedPage,
} from "./lib";

const PAGE_SLUG = "contact";

const BLOCK_TYPE_SLUGS = [
  "page_hero",
  "contact_phone_card",
  "contact_form_card",
  "contact_form_fields",
  "contact_category",
] as const;

interface BlockDraft {
  block_type_id: string;
  parent_id: null;
  position: number;
  data: Record<string, unknown>;
  translations?: { en: { data: Record<string, unknown> } };
}

function makeBlock(
  typeIds: Record<string, string>,
  slug: string,
  position: number,
  data: Record<string, unknown>,
  en?: Record<string, string>,
): BlockDraft {
  const blockTypeId = typeIds[slug];
  if (!blockTypeId) {
    throw new Error(`Unknown block type "${slug}" — run "npm run atlas:schema" first.`);
  }
  const draft: BlockDraft = { block_type_id: blockTypeId, parent_id: null, position, data };
  if (en && Object.keys(en).length > 0) {
    draft.translations = { en: { data: en } };
  }
  return draft;
}

/** Joins Bilingual[] into one Bilingual of newline-joined lines — mirrors
 * the `textarea` + `split("\n")` contract. */
function biJoin(items: { ja: string; en: string }[]): { ja: string; en: string } {
  return {
    ja: items.map((i) => i.ja).join("\n"),
    en: items.map((i) => i.en).join("\n"),
  };
}

async function main(): Promise<void> {
  const env = requireAtlasEnv();
  const client = await createScriptManagementClient();

  const typeIds: Record<string, string> = {};
  for (const slug of BLOCK_TYPE_SLUGS) {
    const contentType = await getContentType(env, slug);
    if (!contentType) {
      throw new Error(`Content type "${slug}" not found — run "npm run atlas:schema" first.`);
    }
    typeIds[slug] = contentType.id;
  }

  const blocks: BlockDraft[] = [];
  let position = 0;
  const next = () => position++;

  // page_hero — heading + intro.
  blocks.push(
    makeBlock(
      typeIds,
      "page_hero",
      next(),
      { heading: contactPage.heading.ja, body: contactPage.intro.ja },
      { heading: contactPage.heading.en, body: contactPage.intro.en },
    ),
  );

  // contact_phone_card
  const phoneBullets = biJoin(contactPage.phone.bullets);
  blocks.push(
    makeBlock(
      typeIds,
      "contact_phone_card",
      next(),
      {
        badge: contactPage.phone.badge.ja,
        title: contactPage.phone.title.ja,
        body: contactPage.phone.body.ja,
        tel_label: contactPage.phone.telLabel.ja,
        number: contactPage.phone.number,
        hours: contactPage.phone.hours.ja,
        bullets: phoneBullets.ja,
      },
      {
        badge: contactPage.phone.badge.en,
        title: contactPage.phone.title.en,
        body: contactPage.phone.body.en,
        tel_label: contactPage.phone.telLabel.en,
        hours: contactPage.phone.hours.en,
        bullets: phoneBullets.en,
      },
    ),
  );

  // contact_form_card
  const formBullets = biJoin(contactPage.form.bullets);
  blocks.push(
    makeBlock(
      typeIds,
      "contact_form_card",
      next(),
      {
        badge: contactPage.form.badge.ja,
        title: contactPage.form.title.ja,
        body: contactPage.form.body.ja,
        bullets: formBullets.ja,
        follow_up: contactPage.form.followUp.ja,
        required_note: contactPage.requiredNote.ja,
      },
      {
        badge: contactPage.form.badge.en,
        title: contactPage.form.title.en,
        body: contactPage.form.body.en,
        bullets: formBullets.en,
        follow_up: contactPage.form.followUp.en,
        required_note: contactPage.requiredNote.en,
      },
    ),
  );

  // contact_form_fields — mailto is an identifier (ja data only).
  blocks.push(
    makeBlock(
      typeIds,
      "contact_form_fields",
      next(),
      {
        mailto: contactPage.mailto,
        category: contactPage.fields.category.ja,
        name: contactPage.fields.name.ja,
        phone: contactPage.fields.phone.ja,
        email: contactPage.fields.email.ja,
        message: contactPage.fields.message.ja,
        submit: contactPage.fields.submit.ja,
      },
      {
        category: contactPage.fields.category.en,
        name: contactPage.fields.name.en,
        phone: contactPage.fields.phone.en,
        email: contactPage.fields.email.en,
        message: contactPage.fields.message.en,
        submit: contactPage.fields.submit.en,
      },
    ),
  );

  // contact_category x3 — value is an identifier (ja data only).
  for (const cat of contactPage.categories) {
    blocks.push(
      makeBlock(
        typeIds,
        "contact_category",
        next(),
        { value: cat.value, label: cat.label.ja },
        { label: cat.label.en },
      ),
    );
  }

  if (blocks.length !== 4 + contactPage.categories.length) {
    throw new Error(
      `contact: expected ${4 + contactPage.categories.length} blocks, built ${blocks.length}`,
    );
  }

  const og = ogImageForSlug(PAGE_SLUG);
  const { created, published } = await ensurePublishedPage(client, {
    slug: PAGE_SLUG,
    seo: {
      title: "お問い合わせ",
      description:
        "Care24Japanへのお問い合わせ。サービス・採用・その他のご相談を受け付けています。",
      ...(og ? { og_image: og.ja } : {}),
    },
    seo_translations: {
      en: {
        title: "Contact us",
        description:
          "Contact Care24Japan about services, care supporter recruitment, or other inquiries.",
        ...(og ? { og_image: og.en } : {}),
      },
    },
    blocks,
  });

  console.log(
    created
      ? `+ page "${PAGE_SLUG}" created (${blocks.length} blocks)`
      : `= page "${PAGE_SLUG}" already existed, blocks replaced (${blocks.length} blocks)`,
  );
  console.log(published ? "  published" : "  already published");
}

main().catch((error) => {
  console.error("[atlas:seed-contact] failed:", error);
  process.exitCode = 1;
});
