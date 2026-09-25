/**
 * Sync only `legal-privacy` from `constants/legal.ts` to Atlas.
 *
 * Source: 【Care24Japan】プライバシーポリシー_2607リーガルチェック済.docx
 * (revision 2026-09-30). Does not touch the other six legal pages.
 *
 * Usage:
 *   ATLAS_ALLOW_LEGAL_RESEED=1 npx tsx scripts/atlas/patch-legal-privacy-2609.ts
 */
import { legalDocs } from "../../constants/legal";
import { blocksToHtml } from "../../features/cms/legal-html";
import {
  createScriptManagementClient,
  ensurePublishedPage,
  getContentType,
  requireAtlasEnv,
} from "./lib";
import { ogImageForSlug } from "./og-image";

const SLUG = "legal-privacy";

async function main(): Promise<void> {
  if (process.env.ATLAS_ALLOW_LEGAL_RESEED !== "1") {
    console.error(
      "[atlas:patch-legal-privacy] refusing to run without ATLAS_ALLOW_LEGAL_RESEED=1",
    );
    process.exitCode = 1;
    return;
  }

  const env = requireAtlasEnv();
  const legalDocType = await getContentType(env, "legal_doc");
  if (!legalDocType) {
    throw new Error("Content type legal_doc not found — run `npm run atlas:schema` first.");
  }

  const doc = legalDocs.privacy;
  const og = ogImageForSlug(SLUG);
  const mgmt = await createScriptManagementClient();

  const result = await ensurePublishedPage(mgmt, {
    slug: SLUG,
    seo: { title: doc.heading.ja, ...(og ? { og_image: og.ja } : {}) },
    seo_translations: {
      en: { title: doc.heading.en, ...(og ? { og_image: og.en } : {}) },
    },
    blocks: [
      {
        block_type_id: legalDocType.id,
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
      },
    ],
  });

  console.log(
    `${result.created ? "created" : "updated"} ${SLUG}` +
      (result.published ? " (newly published)" : " (already published)"),
  );
}

main().catch((error) => {
  console.error("[atlas:patch-legal-privacy] failed:", error);
  process.exitCode = 1;
});
