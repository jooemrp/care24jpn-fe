import "server-only";

import { cache } from "react";
import { legalDocs, type LegalDoc } from "@/constants/legal";
import { pick } from "./fields";
import { getPageBlocks } from "./client";
import { htmlToBlocks } from "./legal-html";

/** Atlas page slug -> key into constants/legal.ts#legalDocs. Matches
 * architecture-plan.json#pages[].slug for the 7 "legal-*" pages. */
const LEGAL_SLUG_TO_KEY = {
  "legal-privacy": "privacy",
  "legal-tokushoho": "tokushoho",
  "legal-terms-for-care-supporters": "terms",
  "legal-terms-for-users": "termsForUsers",
  "legal-cancellation-policy": "cancellationPolicy",
  "legal-compensation": "compensation",
  "legal-quasi-mandate": "quasiMandate",
} as const satisfies Record<string, keyof typeof legalDocs>;

export type LegalSlug = keyof typeof LEGAL_SLUG_TO_KEY;

/**
 * Reads one legal document from Atlas and returns it in the exact shape of
 * `constants/legal.ts#legalDocs[key]` — the return type is `LegalDoc`, so
 * `LegalDocPage.tsx` / `TableOfContents.tsx` never need to know whether the
 * document came from Atlas or the fallback constant.
 *
 * `body` is a single richtext field per locale (see architecture-plan.json —
 * JA and EN block structures are not parallel, so one Atlas block cannot map
 * to one `LegalBlock`). `htmlToBlocks` is the exact inverse of the
 * `blocksToHtml` serializer `scripts/atlas/seed-legal.ts` used to write it,
 * so a successful parse reproduces the original block order — which is what
 * keeps `LegalDocPage`'s index-based `sec-${i}` TOC anchors correct.
 *
 * Falls back to `constants/legal.ts` (with a warning) on ANY failure:
 * the page fetch failing, the page having no blocks, the heading/body
 * fields being empty in either locale, or the richtext parsing to zero
 * blocks (a sign the stored HTML doesn't match what the parser expects).
 */
async function fetchLegalDoc(slug: LegalSlug): Promise<LegalDoc> {
  const fallback = legalDocs[LEGAL_SLUG_TO_KEY[slug]];

  const blocks = await getPageBlocks(slug);
  const block = blocks?.[0];
  if (!block) {
    console.warn(`[cms] getLegalDoc("${slug}"): no page/block found, using constants fallback`);
    return fallback;
  }

  // Same guard as every other loader (`fields.ts#pick`) rather than a raw
  // cast: a `heading`/`body` that came back as something other than a
  // `{ ja: string; en: string }` pair used to sail through the cast and only
  // fail later, inside `htmlToBlocks`, or render as "[object Object]".
  const heading = pick(block.data, "heading");
  const body = pick(block.data, "body");
  if (!heading || !body) {
    console.warn(
      `[cms] getLegalDoc("${slug}"): missing heading/body field, using constants fallback`,
    );
    return fallback;
  }

  const ja = htmlToBlocks(body.ja);
  const en = htmlToBlocks(body.en);
  if (ja.length === 0 || en.length === 0) {
    console.warn(
      `[cms] getLegalDoc("${slug}"): richtext parsed to 0 blocks, using constants fallback`,
    );
    return fallback;
  }

  return { heading, body: { ja, en } };
}

/** Deduped per-render: `generateMetadata` and the page component both call
 * this for the same slug and trigger only one fetch + one parse. */
export const getLegalDoc = cache(fetchLegalDoc);
