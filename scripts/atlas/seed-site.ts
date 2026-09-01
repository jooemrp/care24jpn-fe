/**
 * Seeds the "site" page (6 chrome blocks + nav items from
 * constants/copy.ts#nav + footer + 5 footer legal links) on the live Atlas
 * workspace, sourced verbatim from constants/copy.ts (`brand`, `nav`,
 * `contactPhone`, `cta`, `ui`, `footer`, `errorPage`).
 *
 * Field <-> block-type mapping: brand, contact_phone, cta, ui,
 * error_labels, not_found_labels, nav_item (one per `nav` entry), footer,
 * footer_legal_link x5 are
 * seeded with the exact field names declared for each block type in
 * scripts/atlas/schema.ts — that file is the authoritative field list per
 * block type, not this one. Block order (position 0..14) is NOT a
 * contract: per `mapSite`
 * (features/cms/site-map.ts) and `mapBlocksByType` (features/cms/fields.ts),
 * blocks are matched by content-type slug, never by array position — a block can move
 * anywhere in the dashboard's ordering without breaking the reader. The
 * `position` values below only control display order within a type (e.g.
 * which nav item renders first), not identity.
 *
 * Idempotent: safe to run twice, via `ensurePublishedPage`
 * (scripts/atlas/lib.ts). The management plane has no GET for pages, so that
 * helper makes the write itself the existence check: it sends the full
 * desired page to `PUT /pages/:slug` and only falls back to `POST /pages`
 * when that returns 404 — same check-then-write intent as
 * scripts/atlas/lib.ts#ensureContentType, just without a separate probe
 * request (content types do have a GET and use it). A second run finds the
 * page and replaces its block list with the same deterministic data — no
 * duplication, and no publish call that the backend would reject because the
 * page is already published.
 *
 * Usage (from marketing-web/):
 *   npx tsx scripts/atlas/seed-site.ts
 */
import {
  brand,
  nav,
  contactPhone,
  cta,
  ui,
  footer,
  errorPage,
  notFoundPage,
} from "../../constants/copy";
import {
  requireAtlasEnv,
  createScriptManagementClient,
  getContentType,
  ensurePublishedPage,
  requireMediaManifest,
  mediaId,
  type MediaManifest,
} from "./lib";

const PAGE_SLUG = "site";

/** Block types this page uses, in the order fields are looked up. Slugs are
 * the ones sent to schema.ts — `getContentType` normalizes underscore to
 * hyphen and returns the type's real (hyphenated) `id`/`slug`. */
const BLOCK_TYPE_SLUGS = [
  "site_brand",
  "site_contact_phone",
  "site_cta",
  "site_ui_labels",
  "site_error_labels",
  "site_not_found_labels",
  "site_global_error_labels",
  "nav_item",
  "site_footer",
  "footer_legal_link",
] as const;

type BlockTypeSlug = (typeof BLOCK_TYPE_SLUGS)[number];

interface BlockInput {
  block_type_id: string;
  parent_id: null;
  position: number;
  data: Record<string, unknown>;
  translations?: { en: { data: Record<string, unknown> } };
}

/** en-only translation wrapper — the localizable-field subset of `data`. */
function en(data: Record<string, unknown>): { en: { data: Record<string, unknown> } } {
  return { en: { data } };
}

function buildBlocks(
  blockTypeIds: Record<BlockTypeSlug, string>,
  media: MediaManifest,
): BlockInput[] {
  const blocks: BlockInput[] = [];

  // position 0 — site_brand: name / logoAlt / tagline / logo
  //
  // `logo` holds the Atlas MEDIA ID of public/images/logo.png, not a URL and
  // not a path: the dashboard's image field renderer stores ids (its
  // <MediaPicker> has no `valueType`, which defaults to "id"), so a URL here
  // would be silently replaced by an id the first time an editor changes the
  // picture. Non-localizable — one file serves both locales, only `logo_alt`
  // is translated — so it appears in `data` only, never in `translations.en`.
  //
  // The logo lives on this block rather than on a footer- or navbar-specific
  // one because BOTH chrome components render the same file (Navbar.tsx and
  // Footer.tsx), and `site_brand` already owns its alt text (`logo_alt`).
  // Splitting it in two would let the two copies drift apart in the dashboard
  // with nothing to flag it.
  blocks.push({
    block_type_id: blockTypeIds.site_brand,
    parent_id: null,
    position: 0,
    data: {
      name: brand.name,
      logo_alt: brand.logoAlt.ja,
      tagline: brand.tagline.ja,
      logo: mediaId(media, "logo.png"),
      logo_width: media.assets["logo.png"]?.width ?? 5600,
      logo_height: media.assets["logo.png"]?.height ?? 2101,
    },
    translations: en({ logo_alt: brand.logoAlt.en, tagline: brand.tagline.en }),
  });

  // position 1 — site_contact_phone: display / tel / note
  blocks.push({
    block_type_id: blockTypeIds.site_contact_phone,
    parent_id: null,
    position: 1,
    data: {
      display: contactPhone.display,
      tel: contactPhone.tel,
      note: contactPhone.note.ja,
    },
    translations: en({ note: contactPhone.note.en }),
  });

  // position 2 — site_cta: primary / secondary / contact
  blocks.push({
    block_type_id: blockTypeIds.site_cta,
    parent_id: null,
    position: 2,
    data: {
      primary: cta.primary.ja,
      secondary: cta.secondary.ja,
      contact: cta.contact.ja,
    },
    translations: en({
      primary: cta.primary.en,
      secondary: cta.secondary.en,
      contact: cta.contact.en,
    }),
  });

  // position 3 — site_ui_labels: menuToggleLabel, langToggleLabel.
  // `tab_switch_label` is a dead field — its only consumer, TabPanel.tsx,
  // was deleted along with `ui.tabSwitchLabel` in constants/copy.ts (ST-K1).
  // The Atlas management API has no delete-field endpoint, so the field
  // stays in the `site_ui_labels` content type forever; this seed writes it
  // as an explicit empty string (both locales) rather than omitting the
  // key, to match this file's existing convention for a
  // retired-but-undeletable field (see the tokushoho branch of the
  // footer_legal_link loop below, which does the same for `label`) — an
  // explicit "" tells a dashboard editor the field was deliberately
  // decommissioned, not forgotten.
  //
  // `lang_toggle_label` is new (ST-01/ST-S1): the value is DIRECTIONAL, not
  // per-language — see the doc comment on constants/copy.ts#ui.langToggleLabel
  // for why `.ja` holds the English prompt and `.en` holds the Japanese one.
  //
  // `toc_label` (ST-FIX4) is a normal localizable label — LegalDocPage.tsx's
  // table-of-contents heading. `lang_short_ja`/`lang_short_en` (ST-FIX4) are
  // non-localizable: they are LangToggle.tsx's two always-visible option
  // abbreviations ("JP"/"EN"), not a message translated per `lang` — see
  // constants/copy.ts#ui.langShortJa for why they carry one value each,
  // written into the JA `data` dict only.
  blocks.push({
    block_type_id: blockTypeIds.site_ui_labels,
    parent_id: null,
    position: 3,
    data: {
      menu_toggle_label: ui.menuToggleLabel.ja,
      tab_switch_label: "",
      lang_toggle_label: ui.langToggleLabel.ja,
      toc_label: ui.tocLabel.ja,
      lang_short_ja: ui.langShortJa,
      lang_short_en: ui.langShortEn,
    },
    translations: en({
      menu_toggle_label: ui.menuToggleLabel.en,
      tab_switch_label: "",
      lang_toggle_label: ui.langToggleLabel.en,
      toc_label: ui.tocLabel.en,
    }),
  });

  // position 4 — site_error_labels: title / body / retry_label.
  //
  // F-1 audit fix: `app/[lang]/error.tsx`'s title/body/retry-button text,
  // previously hardcoded per-lang inline in the JSX. Verbatim from
  // constants/copy.ts#errorPage, which is itself verbatim from the strings
  // that were live in error.tsx before this task — value-preserving, not
  // new copy.
  blocks.push({
    block_type_id: blockTypeIds.site_error_labels,
    parent_id: null,
    position: 4,
    data: {
      title: errorPage.title.ja,
      body: errorPage.body.ja,
      retry_label: errorPage.retryLabel.ja,
    },
    translations: en({
      title: errorPage.title.en,
      body: errorPage.body.en,
      retry_label: errorPage.retryLabel.en,
    }),
  });

  // position 5 — site_not_found_labels: eyebrow / title / body / home_label
  // / meta_description.
  //
  // `app/global-not-found.tsx`'s copy, previously hardcoded inline in that
  // file's JSX — the last user-facing surface with no CMS representation at
  // all. Verbatim from constants/copy.ts#notFoundPage, which is itself
  // verbatim from those literals: value-preserving, not new copy. Placed
  // next to site_error_labels because the two are the same kind of thing
  // (the site's two failure surfaces), which pushes nav/footer/legal-link
  // positions down by one.
  //
  // `eyebrow` has no `en` entry: the field is non-localizable in schema.ts.
  blocks.push({
    block_type_id: blockTypeIds.site_not_found_labels,
    parent_id: null,
    position: 5,
    data: {
      eyebrow: notFoundPage.eyebrow,
      title: notFoundPage.title.ja,
      body: notFoundPage.body.ja,
      home_label: notFoundPage.homeLabel.ja,
      meta_description: notFoundPage.metaDescription.ja,
    },
    translations: en({
      title: notFoundPage.title.en,
      body: notFoundPage.body.en,
      home_label: notFoundPage.homeLabel.en,
      meta_description: notFoundPage.metaDescription.en,
    }),
  });

  // position 6 — site_global_error_labels: title / body / retry_label.
  //
  // `app/global-error.tsx`'s copy, same underlying strings as
  // `site_error_labels` (both come from constants/copy.ts#errorPage) — but
  // it is a DISTINCT surface: the root-layout error page, a Client Component
  // that cannot `await getSite()`. Seeding it as its own block keeps the
  // global-error page's renderer source-of-truth in Atlas just like every
  // other surface; the loader surfaces it the same way, and the build
  // friendly read path consumes it. (See app/global-error.tsx.)
  blocks.push({
    block_type_id: blockTypeIds.site_global_error_labels,
    parent_id: null,
    position: 6,
    data: {
      title: errorPage.title.ja,
      body: errorPage.body.ja,
      retry_label: errorPage.retryLabel.ja,
    },
    translations: en({
      title: errorPage.title.en,
      body: errorPage.body.en,
      retry_label: errorPage.retryLabel.en,
    }),
  });

  // nav_item — one block per constants/copy.ts#nav entry, in array order
  // (href is the scroll-spy / routing contract — non-localizable, JA/EN
  // share the same value).
  const navStartPosition = 7;
  nav.forEach((item, i) => {
    blocks.push({
      block_type_id: blockTypeIds.nav_item,
      parent_id: null,
      position: navStartPosition + i,
      data: { href: item.href, label: item.label.ja },
      translations: en({ label: item.label.en }),
    });
  });

  // site_footer: description / legal — empty strings when constants leave them
  // blank (Aug 2026 revision removed the footer blurb).
  const footerPosition = navStartPosition + nav.length;
  blocks.push({
    block_type_id: blockTypeIds.site_footer,
    parent_id: null,
    position: footerPosition,
    data: {
      description: footer.description.ja,
      legal: footer.legal.ja,
    },
    translations: en({ description: footer.description.en, legal: footer.legal.en }),
  });

  // footer_legal_link x5. The tokushoho entry (index 2,
  // href "/tokushoho") carries use_legal_heading="tokushoho" and an empty
  // label in both locales — matching the `{ href, key: "tokushoho" }` union
  // member in constants/copy.ts#footer.legalLinks with no `label` at all.
  footer.legalLinks.forEach((link, i) => {
    const isTokushoho = "key" in link;
    blocks.push({
      block_type_id: blockTypeIds.footer_legal_link,
      parent_id: null,
      position: footerPosition + 1 + i,
      data: {
        href: link.href,
        label: isTokushoho ? "" : link.label.ja,
        use_legal_heading: isTokushoho ? "tokushoho" : "",
      },
      translations: en({ label: isTokushoho ? "" : link.label.en }),
    });
  });

  return blocks;
}

async function main(): Promise<void> {
  const env = requireAtlasEnv();
  const client = await createScriptManagementClient();

  const blockTypeIds = {} as Record<BlockTypeSlug, string>;
  for (const slug of BLOCK_TYPE_SLUGS) {
    const contentType = await getContentType(env, slug);
    if (!contentType) {
      throw new Error(
        `Content type "${slug}" not found — run "npm run atlas:schema" (scripts/atlas/schema.ts) before seeding.`,
      );
    }
    blockTypeIds[slug] = contentType.id;
  }

  const media = requireMediaManifest();
  const blocks = buildBlocks(blockTypeIds, media);

  const pageInput = {
    slug: PAGE_SLUG,
    seo: { title: "サイト共通（ヘッダー・フッター）" },
    seo_translations: { en: { title: "Site chrome (header & footer)" } },
    blocks,
  };

  const { created, published } = await ensurePublishedPage(client, pageInput);

  console.log(
    created
      ? `+ page/${PAGE_SLUG} (created, ${blocks.length} blocks)`
      : `= page/${PAGE_SLUG} (updated, ${blocks.length} blocks)`,
  );
  console.log(published ? `  published page/${PAGE_SLUG}` : `  = page/${PAGE_SLUG} already published`);
}

main().catch((error) => {
  console.error("[atlas:seed-site] failed:", error);
  process.exitCode = 1;
});
