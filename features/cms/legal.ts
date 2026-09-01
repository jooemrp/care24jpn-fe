import "server-only";

import { cache } from "react";
import type { Bilingual } from "./types";
import { getPageBlocks, reportUnexpectedContent } from "./client";
import { htmlToBlocks } from "./legal-html";
import { selectLegalFields, type RawLegalFields } from "./legal-select";

/** Atlas page slug -> one of the 7 "legal-*" pages seeded in Atlas (see
 * scripts/atlas/seed-legal.ts). */
const LEGAL_SLUGS = [
  "legal-privacy",
  "legal-tokushoho",
  "legal-terms-for-care-supporters",
  "legal-terms-for-users",
  "legal-cancellation-policy",
  "legal-compensation",
  "legal-quasi-mandate",
] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

/**
 * The parsed shape a legal document's loader returns: the bilingual heading
 * plus the richtext body parsed back into block form per locale.
 */
export type LegalDoc = {
  heading: Bilingual;
  body: { ja: ReturnType<typeof htmlToBlocks>; en: ReturnType<typeof htmlToBlocks> };
};

/**
 * Everything both readers below need from Atlas, and nothing more: one
 * `getPageBlocks` call plus `./legal-select`'s pure field-shape guards
 * (extracted there so `legal-select.test.ts` can import and exercise them —
 * `legal.ts` itself opens with `import "server-only"`, which cannot be
 * loaded outside Next's bundler). Deliberately stops BEFORE `htmlToBlocks`
 * so the heading-only reader never pays for parsing a body it is going to
 * throw away.
 *
 * Returns `null` for "the page data is unavailable" — the caller throws /
 * surfaces an error rather than substituting `constants/legal.ts` (the
 * no-fallback sweep removes the legal fallback layer wholesale).
 */
async function readLegalFields(
  slug: LegalSlug,
  caller: "getLegalDoc" | "getLegalHeading",
): Promise<RawLegalFields | null> {
  const blocks = await getPageBlocks(slug);
  if (!blocks) {
    console.warn(`[cms] ${caller}("${slug}"): no page/block found — page unavailable (no fallback)`);
    return null;
  }

  return selectLegalFields(slug, blocks, caller, reportUnexpectedContent);
}

/**
 * Reads one legal document from Atlas and returns the parsed bilingual
 * document. `body` is a single richtext field per locale — JA and EN block
 * structures are not parallel, so one Atlas block cannot map to one block;
 * `htmlToBlocks` is the exact inverse of the `blocksToHtml` serializer
 * `scripts/atlas/seed-legal.ts` used to write it.
 *
 * No fallback to `constants/legal.ts`: on ANY failure (page fetch failing,
 * fields empty, richtext parsing to zero blocks) this throws, and the route
 * surfaces an error/404 rather than serving stale constants content.
 */
async function fetchLegalDoc(slug: LegalSlug): Promise<LegalDoc> {
  const fields = await readLegalFields(slug, "getLegalDoc");
  if (!fields) {
    throw new Error(
      `[cms] getLegalDoc("${slug}"): legal page data unavailable (Atlas unreachable, not configured, or page missing) — no fallback content exists.`,
    );
  }

  const ja = htmlToBlocks(fields.body.ja);
  const en = htmlToBlocks(fields.body.en);
  if (ja.length === 0 || en.length === 0) {
    throw new Error(
      `[cms] getLegalDoc("${slug}"): richtext parsed to 0 blocks in one or both locales — the stored HTML does not match what the parser expects; the page is unavailable instead of serving stale constants content.`,
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
 * No fallback to `constants/legal.ts`: on failure this throws. The empty-body
 * check below closes the gap where a body that is non-empty but parses to
 * zero blocks would make `getLegalDoc` throw while this reader returned a
 * heading — now both throw, so the two surfaces cannot diverge.
 */
async function fetchLegalHeading(slug: LegalSlug): Promise<Bilingual> {
  const fields = await readLegalFields(slug, "getLegalHeading");
  if (!fields) {
    throw new Error(
      `[cms] getLegalHeading("${slug}"): legal page data unavailable (Atlas unreachable, not configured, or page missing) — no fallback content exists.`,
    );
  }

  if (fields.body.ja.trim() === "" || fields.body.en.trim() === "") {
    throw new Error(
      `[cms] getLegalHeading("${slug}"): empty richtext body in one or both locales — the page is unavailable instead of serving stale constants content.`,
    );
  }

  return fields.heading;
}

/** Deduped per-render: `generateMetadata` and the page component both call
 * this for the same slug and trigger only one fetch + one parse. */
export const getLegalDoc = cache(fetchLegalDoc);

/** Deduped per-render, and shares `getPageBlocks`' per-render cache with
 * `getLegalDoc` — on a `legal-*` route this adds no HTTP request at all. */
export const getLegalHeading = cache(fetchLegalHeading);