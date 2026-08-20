/**
 * Seeds the 7 legal pages onto the live Atlas workspace from
 * `constants/legal.ts`, one `legal_doc` block per page.
 *
 * `body` (a Tiptap richtext field) is written with
 * `legal-html.ts#blocksToHtml`, the exact inverse of the
 * `htmlToBlocks` parser the frontend loader (`features/cms/legal.ts`) uses
 * to read it back — so the HTML this script stores is, by construction, the
 * one round-trip that reproduces the original `LegalBlock[]` order. See the
 * header comment on `features/cms/legal-html.ts` for why block order matters
 * (index-based `sec-${i}` TOC anchors in LegalDocPage.tsx).
 *
 * `ja` -> block `data`, `en` -> block `translations.en.data`, same split the
 * runtime loader expects from `getPageBlocks()` (features/cms/client.ts).
 *
 * Idempotent: safe to run twice — every write goes through
 * `ensurePublishedPage` (scripts/atlas/lib.ts), which updates first and only
 * creates on a 404, so an existing page is updated in place. It has to: page
 * slugs are NOT unique at the create endpoint on this backend, so a
 * create-then-catch-409 fallback would quietly produce a second page per slug
 * on the second run.
 * Publishing an already-published page is likewise a no-op there.
 *
 * Usage (from marketing-web/):
 *   npx tsx scripts/atlas/seed-legal.ts
 */
import { legalDocs, type LegalDoc } from "../../constants/legal";
import { blocksToHtml } from "../../features/cms/legal-html";
import {
  requireAtlasEnv,
  getContentType,
  createScriptManagementClient,
  ensurePublishedPage,
} from "./lib";

interface LegalPageSpec {
  /** Atlas page slug — matches architecture-plan.json#pages[].slug. */
  slug: string;
  /** Key into constants/legal.ts#legalDocs. */
  docKey: keyof typeof legalDocs;
}

const LEGAL_PAGES: LegalPageSpec[] = [
  { slug: "legal-privacy", docKey: "privacy" },
  { slug: "legal-tokushoho", docKey: "tokushoho" },
  { slug: "legal-terms-for-care-supporters", docKey: "terms" },
  { slug: "legal-terms-for-users", docKey: "termsForUsers" },
  { slug: "legal-cancellation-policy", docKey: "cancellationPolicy" },
  { slug: "legal-compensation", docKey: "compensation" },
  { slug: "legal-quasi-mandate", docKey: "quasiMandate" },
];

/** Builds the single `legal_doc` block for one page, ja in `data`, en in
 * `translations.en.data` — mirrors what `getPageBlocks()` expects to merge. */
function buildLegalDocBlock(blockTypeId: string, doc: LegalDoc) {
  return {
    block_type_id: blockTypeId,
    parent_id: null,
    position: 0,
    data: {
      heading: doc.heading.ja,
      body: blocksToHtml(doc.body.ja),
    },
    translations: {
      en: {
        data: {
          heading: doc.heading.en,
          body: blocksToHtml(doc.body.en),
        },
      },
    },
  };
}

async function main(): Promise<void> {
  const env = requireAtlasEnv();

  const legalDocType = await getContentType(env, "legal_doc");
  if (!legalDocType) {
    throw new Error(
      "Content type legal_doc not found — run `npm run atlas:schema` before seed-legal.ts.",
    );
  }

  const mgmt = await createScriptManagementClient();

  let created = 0;
  let updated = 0;
  let published = 0;

  for (const { slug, docKey } of LEGAL_PAGES) {
    const doc = legalDocs[docKey];
    const pageInput = {
      seo: { title: doc.heading.ja },
      seo_translations: { en: { title: doc.heading.en } },
      blocks: [buildLegalDocBlock(legalDocType.id, doc)],
    };

    const result = await ensurePublishedPage(mgmt, { slug, ...pageInput });

    if (result.created) {
      created += 1;
      console.log(`+ page  ${slug} (created)`);
    } else {
      updated += 1;
      console.log(`= page  ${slug} (already existed, updated)`);
    }

    if (result.published) {
      published += 1;
      console.log(`  published ${slug}`);
    } else {
      console.log(`  published ${slug} (already published)`);
    }
  }

  console.log("");
  console.log("Summary");
  console.log(
    `  pages: ${created} created, ${updated} updated, ${published} newly published ` +
      `(${LEGAL_PAGES.length} total)`,
  );
}

main().catch((error) => {
  console.error("[atlas:seed-legal] failed:", error);
  process.exitCode = 1;
});
