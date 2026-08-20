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

/** The two localizable fields the `legal-doc` block carries, still in their
 * stored form: `heading` ready to render, `body` as the raw richtext HTML
 * string per locale (NOT yet parsed into `LegalBlock[]`). */
type RawLegalFields = { heading: LegalDoc["heading"]; body: { ja: string; en: string } };

/**
 * Everything both readers below need from Atlas, and nothing more: one
 * `getPageBlocks` call plus the field-shape guards. Deliberately stops
 * BEFORE `htmlToBlocks` so the heading-only reader never pays for parsing a
 * body it is going to throw away.
 *
 * `getPageBlocks` is `cache()`-ed, so a page that calls both readers for the
 * same slug (every `legal-*` route does — the route renders the document and
 * the footer resolves the tokushoho label) still issues exactly one HTTP
 * request per render.
 *
 * Returns `null` for "use the constants fallback", after warning with the
 * caller's own name so the log still says which entry point gave up.
 */
async function readLegalFields(
  slug: LegalSlug,
  caller: "getLegalDoc" | "getLegalHeading",
): Promise<RawLegalFields | null> {
  const blocks = await getPageBlocks(slug);
  const block = blocks?.[0];
  if (!block) {
    console.warn(`[cms] ${caller}("${slug}"): no page/block found, using constants fallback`);
    return null;
  }

  // Same guard as every other loader (`fields.ts#pick`) rather than a raw
  // cast: a `heading`/`body` that came back as something other than a
  // `{ ja: string; en: string }` pair used to sail through the cast and only
  // fail later, inside `htmlToBlocks`, or render as "[object Object]".
  const heading = pick(block.data, "heading");
  const body = pick(block.data, "body");
  if (!heading || !body) {
    console.warn(`[cms] ${caller}("${slug}"): missing heading/body field, using constants fallback`);
    return null;
  }

  return { heading, body };
}

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

  const fields = await readLegalFields(slug, "getLegalDoc");
  if (!fields) return fallback;

  const ja = htmlToBlocks(fields.body.ja);
  const en = htmlToBlocks(fields.body.en);
  if (ja.length === 0 || en.length === 0) {
    console.warn(
      `[cms] getLegalDoc("${slug}"): richtext parsed to 0 blocks, using constants fallback`,
    );
    return fallback;
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
 * FALLBACK PARITY WITH `getLegalDoc` — deliberate, and deliberately not
 * total. This reader applies every guard `fetchLegalDoc` applies except the
 * one it cannot afford: it cannot know that a body would have parsed to zero
 * blocks without parsing it. The empty-body check below closes the part of
 * that gap that costs nothing (an empty/whitespace-only body parses to zero
 * blocks by definition, so falling back here matches `getLegalDoc` exactly).
 *
 * What remains, stated rather than hidden: a body that is non-empty in both
 * locales but still parses to zero blocks (e.g. content that is nothing but
 * a `<script>` block, or markup the parser drops entirely) makes
 * `getLegalDoc` serve the constants document while this reader serves the
 * CMS heading — so the footer link would show the CMS title while
 * `/tokushoho` shows the constants title. Accepted because the alternative
 * is parsing the entire body on every route to guard a case that requires
 * Atlas to hold body markup the seeder cannot produce, and because the
 * divergence is cosmetic (a title, on a link that still points at the right
 * page) and self-announcing: `getLegalDoc`'s "parsed to 0 blocks" warning
 * fires on the very same render.
 */
async function fetchLegalHeading(slug: LegalSlug): Promise<LegalDoc["heading"]> {
  const fallback = legalDocs[LEGAL_SLUG_TO_KEY[slug]].heading;

  const fields = await readLegalFields(slug, "getLegalHeading");
  if (!fields) return fallback;

  if (fields.body.ja.trim() === "" || fields.body.en.trim() === "") {
    console.warn(
      `[cms] getLegalHeading("${slug}"): empty richtext body, using constants fallback`,
    );
    return fallback;
  }

  return fields.heading;
}

/** Deduped per-render: `generateMetadata` and the page component both call
 * this for the same slug and trigger only one fetch + one parse. */
export const getLegalDoc = cache(fetchLegalDoc);

/** Deduped per-render, and shares `getPageBlocks`' per-render cache with
 * `getLegalDoc` — on a `legal-*` route, where both are called for the same
 * slug, this adds no HTTP request at all. */
export const getLegalHeading = cache(fetchLegalHeading);
