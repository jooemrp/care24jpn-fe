import "server-only";

import { cache } from "react";
import { unwrap } from "@/lib/api";
import type { LegalDoc } from "@/constants/legal";
import { CmsContentError } from "./errors";
import { getPageBlocksStrict } from "./client";
import { htmlToBlocks } from "./legal-html";
import { selectLegalFields } from "./legal-select";

/** Atlas page slugs for the legal documents seeded in Atlas
 * (see scripts/atlas/seed-legal.ts). The 7 keys below are exhaustive. */
export type LegalSlug =
  | "legal-privacy"
  | "legal-tokushoho"
  | "legal-terms-for-care-supporters"
  | "legal-terms-for-users"
  | "legal-cancellation-policy"
  | "legal-compensation"
  | "legal-quasi-mandate";

/**
 * Reads one legal document from Atlas and returns the render shape expected by
 * `LegalDocPage`. Missing or malformed content is a typed CMS error.
 *
 * `body` is a single richtext field per locale — JA and EN block structures
 * are not parallel, so one Atlas block cannot map to one `LegalBlock`.
 * `htmlToBlocks` is the exact inverse of the
 * `blocksToHtml` serializer `scripts/atlas/seed-legal.ts` used to write it,
 * so a successful parse reproduces the original block order — which is what
 * keeps `LegalDocPage`'s index-based `sec-${i}` TOC anchors correct.
 *
 */
async function fetchLegalDoc(slug: LegalSlug): Promise<LegalDoc> {
  const fields = selectLegalFields(
    slug,
    unwrap(await getPageBlocksStrict(slug)),
    "getLegalDoc",
  );
  const ja = htmlToBlocks(fields.body.ja);
  const en = htmlToBlocks(fields.body.en);
  if (ja.length === 0 || en.length === 0) {
    throw new CmsContentError(
      "CMS_INVALID_REQUIRED_FIELD",
      `Required legal document body "${slug}.legal-doc.body" contains no renderable blocks.`,
      [`${slug}.legal-doc.body`],
      slug,
    );
  }
  return { heading: fields.heading, body: { ja, en } };
}

/**
 * The document's HEADING only — no `htmlToBlocks`, in either locale.
 *
 * Exists for `components/Footer.tsx`, which renders on every route and needs
 * exactly one string out of `legal-tokushoho`: the label of the footer link
 * whose `footer-legal-link` block sets `use_legal_heading` (see
 * `features/cms/site.ts#mapSite`). That coupling is deliberate — an editor
 * who retitles the document retitles the footer link with it — so the read
 * stays, but calling `getLegalDoc` for it made every single page parse the
 * whole tokushoho body twice (ja + en) and discard the result.
 *
 * This is a projection of the same strict document read so the footer label
 * and legal page heading can never disagree.
 */
async function fetchLegalHeading(slug: LegalSlug): Promise<LegalDoc["heading"]> {
  return (await fetchLegalDoc(slug)).heading;
}

/** Deduped per-render: `generateMetadata` and the page component both call
 * this for the same slug and trigger only one fetch + one parse. */
export const getLegalDoc = cache(fetchLegalDoc);

/** Deduped per-render, and shares `getPageBlocks`' per-render cache with
 * `getLegalDoc` — on a `legal-*` route, where both are called for the same
 * slug, this adds no HTTP request at all. */
export const getLegalHeading = cache(fetchLegalHeading);
