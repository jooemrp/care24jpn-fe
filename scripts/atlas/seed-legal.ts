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
import { ogImageForSlug } from "./og-image";

interface LegalPageSpec {
  /** Atlas page slug this legal doc is published under. */
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
  // The project rule is that legal document CONTENT in Atlas is not touched
  // by a routine seed: these are compliance documents, and a reseed that
  // "just" reformats them is still a change to live legal text.
  //
  // The guard was originally added because blocksToHtml had started
  // serializing `[label](href)` markdown into a real `<a href="...">`, and
  // the fear was that a reseed would rewrite all 7 live bodies. A measured
  // reseed on 2026-08-21 showed the real blast radius is ONE document:
  // `legal-tokushoho` is the only body containing markdown link syntax, and
  // the conversion is render-neutral (LegalDocPage.tsx already turns the
  // markdown form into a real <Link>). The other six bodies came back
  // byte-identical — verified by `atlas:drift`, which reported exactly the
  // three fields that run intended to change and nothing else.
  //
  // So the guard stays, but for the durable reason rather than the original
  // one: reseeding legal is a deliberate act, not a step in `atlas:seed`.
  // Run it with the opt-in, then `atlas:drift --write` the pages it touched
  // and re-run `atlas:verify`.
  if (process.env.ATLAS_ALLOW_LEGAL_RESEED !== "1") {
    console.error(
      "[atlas:seed-legal] refusing to run: legal document CONTENT in Atlas must not be " +
        "touched (see marketing-web project rules). Set ATLAS_ALLOW_LEGAL_RESEED=1 if you " +
        "have deliberately decided to reseed the 7 live legal pages.",
    );
    process.exitCode = 1;
    return;
  }

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
    // og:image travels with the page that owns it — see og-image.ts for why
    // it is not written by a script of its own.
    const og = ogImageForSlug(slug);
    const pageInput = {
      seo: { title: doc.heading.ja, ...(og ? { og_image: og.ja } : {}) },
      seo_translations: { en: { title: doc.heading.en, ...(og ? { og_image: og.en } : {}) } },
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
