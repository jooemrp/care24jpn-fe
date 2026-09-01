/**
 * Creates all 30 CMS block content types (and their fields) on the live
 * Atlas workspace. This file IS the specification — every block type and
 * field below is the single authoritative source the seed-*.ts scripts write
 * against and the features/cms/*.ts loaders read back.
 *
 * Idempotent: safe to run twice. A second run finds every type and field
 * already there and skips them — it does not error and does not duplicate
 * anything (see scripts/atlas/lib.ts#ensureContentType /
 * #ensureContentTypeField).
 *
 * Usage (from marketing-web/):
 *   npm run atlas:schema
 */
import {
  requireAtlasEnv,
  ensureContentType,
  ensureContentTypeField,
  type AtlasFieldType,
  type ContentTypeField,
} from "./lib";

interface BlockFieldSpec {
  name: string;
  label: string;
  field_type: AtlasFieldType;
  localizable: boolean;
  required: boolean;
  sort_order: number;
}

interface BlockTypeSpec {
  slug: string;
  name: string;
  is_block: boolean;
  fields: BlockFieldSpec[];
}

const BLOCK_TYPES: BlockTypeSpec[] = [
  {
    slug: "page_hero",
    name: "Page Hero",
    is_block: true,
    fields: [
      { name: "heading", label: "Heading", field_type: "text", localizable: true, required: false, sort_order: 0 },
      { name: "body", label: "Body", field_type: "textarea", localizable: true, required: false, sort_order: 1 },
      // Only read today by the use-case and service-flow pages, for their
      // closing CTA button's destination (`useCase.hero.ctaHref` /
      // `serviceFlow.hero.ctaHref` in constants/copy.ts). `page_hero` is
      // shared with `pricing` and `company`, which do not set or read this
      // field — an unused field on SOME instances of a shared block type is
      // not a dead field, since it is genuinely wired for the other two.
      { name: "cta_href", label: "CTA href", field_type: "text", localizable: false, required: false, sort_order: 2 },
    ],
  },
  {
    slug: "site_brand",
    name: "Site — Brand",
    is_block: true,
    fields: [
      { name: "name", label: "Brand name", field_type: "text", localizable: false, required: false, sort_order: 0 },
      { name: "logo_alt", label: "Logo alt", field_type: "text", localizable: true, required: false, sort_order: 1 },
      { name: "tagline", label: "Tagline", field_type: "text", localizable: true, required: false, sort_order: 2 },
      { name: "logo", label: "Logo", field_type: "image", localizable: false, required: false, sort_order: 3 },
    ],
  },
  {
    slug: "site_contact_phone",
    name: "Site — Contact Phone",
    is_block: true,
    fields: [
      { name: "display", label: "Display number", field_type: "text", localizable: false, required: false, sort_order: 0 },
      { name: "tel", label: "tel: value", field_type: "text", localizable: false, required: false, sort_order: 1 },
      { name: "note", label: "Note (one line)", field_type: "text", localizable: true, required: false, sort_order: 2 },
    ],
  },
  {
    slug: "site_cta",
    name: "Site — Shared CTA labels",
    is_block: true,
    fields: [
      { name: "primary", label: "Primary CTA", field_type: "text", localizable: true, required: false, sort_order: 0 },
      { name: "secondary", label: "Secondary CTA", field_type: "text", localizable: true, required: false, sort_order: 1 },
      { name: "contact", label: "Contact CTA", field_type: "text", localizable: true, required: false, sort_order: 2 },
    ],
  },
  {
    slug: "site_ui_labels",
    name: "Site — UI chrome labels",
    is_block: true,
    fields: [
      { name: "menu_toggle_label", label: "Menu toggle aria-label", field_type: "text", localizable: true, required: false, sort_order: 0 },
      { name: "tab_switch_label", label: "Tab switch aria-label", field_type: "text", localizable: true, required: false, sort_order: 1 },
      { name: "lang_toggle_label", label: "Language toggle aria-label", field_type: "text", localizable: true, required: false, sort_order: 2 },
      { name: "toc_label", label: "Legal doc table-of-contents label", field_type: "text", localizable: true, required: false, sort_order: 3 },
      { name: "lang_short_ja", label: "Lang toggle short label (JA option)", field_type: "text", localizable: false, required: false, sort_order: 4 },
      { name: "lang_short_en", label: "Lang toggle short label (EN option)", field_type: "text", localizable: false, required: false, sort_order: 5 },
    ],
  },
  {
    slug: "site_error_labels",
    name: "Site — Error page labels",
    is_block: true,
    fields: [
      { name: "title", label: "Error heading", field_type: "text", localizable: true, required: false, sort_order: 0 },
      { name: "body", label: "Error body", field_type: "textarea", localizable: true, required: false, sort_order: 1 },
      { name: "retry_label", label: "Retry button label", field_type: "text", localizable: true, required: false, sort_order: 2 },
    ],
  },
  {
    // The 404 page (`app/global-not-found.tsx`). Separate from
    // `site_error_labels` above because they are different surfaces with
    // different copy: that one is the route-segment ERROR boundary (a throw),
    // this one is a page that does not exist. `eyebrow` is non-localizable —
    // "404" is the HTTP status, identical in both locales.
    slug: "site_not_found_labels",
    name: "Site — 404 page labels",
    is_block: true,
    fields: [
      { name: "eyebrow", label: "Eyebrow (status code)", field_type: "text", localizable: false, required: false, sort_order: 0 },
      { name: "title", label: "404 heading", field_type: "text", localizable: true, required: false, sort_order: 1 },
      { name: "body", label: "404 body", field_type: "textarea", localizable: true, required: false, sort_order: 2 },
      { name: "home_label", label: "Back-to-home link label", field_type: "text", localizable: true, required: false, sort_order: 3 },
      { name: "meta_description", label: "404 meta description", field_type: "textarea", localizable: true, required: false, sort_order: 4 },
    ],
  },
  {
    slug: "nav_item",
    name: "Nav Item",
    is_block: true,
    fields: [
      { name: "href", label: "Href", field_type: "text", localizable: false, required: false, sort_order: 0 },
      { name: "label", label: "Label", field_type: "text", localizable: true, required: false, sort_order: 1 },
    ],
  },
  {
    slug: "site_footer",
    name: "Site — Footer",
    is_block: true,
    fields: [
      { name: "description", label: "Description", field_type: "textarea", localizable: true, required: false, sort_order: 0 },
      { name: "legal", label: "Copyright line", field_type: "text", localizable: true, required: false, sort_order: 1 },
    ],
  },
  {
    slug: "footer_legal_link",
    name: "Footer Legal Link",
    is_block: true,
    fields: [
      { name: "href", label: "Href", field_type: "text", localizable: false, required: false, sort_order: 0 },
      { name: "label", label: "Label", field_type: "text", localizable: true, required: false, sort_order: 1 },
      { name: "use_legal_heading", label: "Ambil label dari dokumen legal", field_type: "select", localizable: false, required: false, sort_order: 2 },
    ],
  },
  {
    slug: "home_hero",
    name: "Home — Hero",
    is_block: true,
    fields: [
      { name: "badge", label: "Pyramid badge", field_type: "text", localizable: true, required: false, sort_order: 0 },
      { name: "resolve", label: "Pyramid statement", field_type: "text", localizable: true, required: false, sort_order: 1 },
      { name: "assist", label: "Assist line", field_type: "textarea", localizable: true, required: false, sort_order: 2 },
      { name: "heading", label: "H1", field_type: "textarea", localizable: true, required: false, sort_order: 3 },
      { name: "body", label: "Body", field_type: "textarea", localizable: true, required: false, sort_order: 4 },
      { name: "cta_primary", label: "CTA primary label", field_type: "text", localizable: true, required: false, sort_order: 5 },
      { name: "cta_secondary", label: "CTA secondary label", field_type: "text", localizable: true, required: false, sort_order: 6 },
      { name: "image_alt", label: "Hero image alt", field_type: "text", localizable: true, required: false, sort_order: 7 },
      { name: "image", label: "Hero image", field_type: "image", localizable: false, required: false, sort_order: 8 },
      { name: "cta_primary_href", label: "CTA primary href", field_type: "text", localizable: false, required: false, sort_order: 9 },
      { name: "cta_secondary_href", label: "CTA secondary href", field_type: "text", localizable: false, required: false, sort_order: 10 },
      { name: "area_badge_main", label: "Service area badge (main)", field_type: "text", localizable: true, required: false, sort_order: 11 },
      { name: "area_badge_sub", label: "Service area badge (sub)", field_type: "text", localizable: true, required: false, sort_order: 12 },
    ],
  },
  {
    slug: "home_values",
    name: "Home — Values (trust strip)",
    is_block: true,
    fields: [
      { name: "heading", label: "Heading", field_type: "text", localizable: true, required: false, sort_order: 0 },
      { name: "item_titles", label: "Item titles (satu per baris)", field_type: "textarea", localizable: true, required: false, sort_order: 1 },
      { name: "item_bodies", label: "Item bodies (satu per baris)", field_type: "textarea", localizable: true, required: false, sort_order: 2 },
    ],
  },
  {
    slug: "home_problems",
    name: "Home — Problems",
    is_block: true,
    fields: [
      { name: "heading", label: "Heading", field_type: "text", localizable: true, required: false, sort_order: 0 },
      { name: "items", label: "Items (satu per baris)", field_type: "textarea", localizable: true, required: false, sort_order: 1 },
    ],
  },
  {
    slug: "home_care_course",
    name: "Home — Care Course header",
    is_block: true,
    fields: [
      { name: "lead_in", label: "Lead-in H2", field_type: "textarea", localizable: true, required: false, sort_order: 0 },
      { name: "badge", label: "Course badge", field_type: "text", localizable: true, required: false, sort_order: 1 },
      { name: "tagline", label: "Tagline", field_type: "textarea", localizable: true, required: false, sort_order: 2 },
      { name: "tagline_sub", label: "Tagline (lanjutan)", field_type: "textarea", localizable: true, required: false, sort_order: 3 },
      { name: "price_label", label: "Price label", field_type: "text", localizable: true, required: false, sort_order: 4 },
      { name: "price_hours", label: "Price hours", field_type: "text", localizable: true, required: false, sort_order: 5 },
      { name: "price_amount", label: "Price amount (teks)", field_type: "text", localizable: true, required: false, sort_order: 6 },
      { name: "price_unit", label: "Price unit", field_type: "text", localizable: true, required: false, sort_order: 7 },
      { name: "price_tax_note", label: "Tax note", field_type: "text", localizable: true, required: false, sort_order: 8 },
      { name: "price_tax_included", label: "Tax-included line", field_type: "text", localizable: true, required: false, sort_order: 9 },
    ],
  },
  {
    slug: "home_care_course_fee",
    name: "Home — Care Course fee cell",
    is_block: true,
    fields: [
      { name: "label", label: "Label", field_type: "text", localizable: true, required: false, sort_order: 0 },
      { name: "value", label: "Value", field_type: "text", localizable: true, required: false, sort_order: 1 },
      { name: "note", label: "Note (opsional)", field_type: "text", localizable: true, required: false, sort_order: 2 },
    ],
  },
  {
    slug: "home_care_course_card",
    name: "Home — Care Course service card",
    is_block: true,
    fields: [
      { name: "title", label: "Card title", field_type: "text", localizable: true, required: false, sort_order: 0 },
      { name: "image_alt", label: "Image alt", field_type: "text", localizable: true, required: false, sort_order: 1 },
      { name: "items", label: "Items (satu per baris)", field_type: "textarea", localizable: true, required: false, sort_order: 2 },
      { name: "image", label: "Image", field_type: "image", localizable: false, required: false, sort_order: 3 },
    ],
  },
  {
    slug: "home_nursing_course",
    name: "Home — Nursing Course",
    is_block: true,
    fields: [
      { name: "lead_in", label: "Lead-in H2", field_type: "textarea", localizable: true, required: false, sort_order: 0 },
      { name: "badge", label: "Course badge", field_type: "text", localizable: true, required: false, sort_order: 1 },
      { name: "price_label", label: "Price label", field_type: "text", localizable: true, required: false, sort_order: 2 },
      { name: "price_hours", label: "Price hours", field_type: "text", localizable: true, required: false, sort_order: 3 },
      { name: "price_amount", label: "Price amount (teks)", field_type: "text", localizable: true, required: false, sort_order: 4 },
      { name: "price_unit", label: "Price unit", field_type: "text", localizable: true, required: false, sort_order: 5 },
      { name: "price_tax_note", label: "Tax note", field_type: "text", localizable: true, required: false, sort_order: 6 },
      { name: "price_tax_included", label: "Tax-included line", field_type: "text", localizable: true, required: false, sort_order: 7 },
      { name: "note", label: "Note", field_type: "text", localizable: true, required: false, sort_order: 8 },
      { name: "panel_heading", label: "Panel H3", field_type: "textarea", localizable: true, required: false, sort_order: 9 },
    ],
  },
  {
    slug: "home_nursing_feature",
    name: "Home — Nursing Course feature",
    is_block: true,
    fields: [
      { name: "icon", label: "Icon", field_type: "select", localizable: false, required: false, sort_order: 0 },
      { name: "label", label: "Label", field_type: "text", localizable: true, required: false, sort_order: 1 },
    ],
  },
  {
    slug: "home_examples",
    name: "Home — Examples header",
    is_block: true,
    fields: [
      { name: "lead_in", label: "Lead-in", field_type: "text", localizable: true, required: false, sort_order: 0 },
      { name: "heading", label: "Heading", field_type: "text", localizable: true, required: false, sort_order: 1 },
      { name: "hours_label", label: "Hours label", field_type: "text", localizable: true, required: false, sort_order: 2 },
      { name: "services_label", label: "Services label", field_type: "text", localizable: true, required: false, sort_order: 3 },
      { name: "schedule_label", label: "Schedule label", field_type: "text", localizable: true, required: false, sort_order: 4 },
    ],
  },
  {
    slug: "home_example_case",
    name: "Home — Example case",
    is_block: true,
    fields: [
      { name: "label", label: "Case label", field_type: "text", localizable: true, required: false, sort_order: 0 },
      { name: "tone", label: "Tone", field_type: "select", localizable: false, required: false, sort_order: 1 },
      { name: "title", label: "Title", field_type: "textarea", localizable: true, required: false, sort_order: 2 },
      { name: "request", label: "Request (H3)", field_type: "textarea", localizable: true, required: false, sort_order: 3 },
      { name: "services", label: "Services (satu per baris)", field_type: "textarea", localizable: true, required: false, sort_order: 4 },
      { name: "hours", label: "Hours label", field_type: "text", localizable: true, required: false, sort_order: 5 },
      { name: "schedule_times", label: "Schedule times (satu per baris)", field_type: "textarea", localizable: false, required: false, sort_order: 6 },
      { name: "schedule_activities", label: "Schedule activities (satu per baris)", field_type: "textarea", localizable: true, required: false, sort_order: 7 },
    ],
  },
  {
    slug: "home_flow",
    name: "Home — Flow header",
    is_block: true,
    fields: [
      { name: "heading", label: "Heading", field_type: "text", localizable: true, required: false, sort_order: 0 },
      { name: "step_label", label: "Step badge label (e.g. \"STEP\")", field_type: "text", localizable: true, required: false, sort_order: 1 },
    ],
  },
  {
    slug: "home_flow_step",
    name: "Home — Flow step",
    is_block: true,
    fields: [
      { name: "number", label: "Step number", field_type: "text", localizable: false, required: false, sort_order: 0 },
      { name: "icon", label: "Icon", field_type: "select", localizable: false, required: false, sort_order: 1 },
      { name: "title", label: "Title", field_type: "text", localizable: true, required: false, sort_order: 2 },
      { name: "body", label: "Body", field_type: "textarea", localizable: true, required: false, sort_order: 3 },
    ],
  },
  {
    slug: "home_apply",
    name: "Home — Apply banners",
    is_block: true,
    fields: [
      { name: "user_eyebrow", label: "User eyebrow", field_type: "text", localizable: true, required: false, sort_order: 0 },
      { name: "user_label", label: "User label", field_type: "text", localizable: true, required: false, sort_order: 1 },
      { name: "staff_eyebrow", label: "Staff eyebrow", field_type: "text", localizable: true, required: false, sort_order: 2 },
      { name: "staff_label", label: "Staff label", field_type: "text", localizable: true, required: false, sort_order: 3 },
      { name: "staff_href", label: "Staff href", field_type: "text", localizable: false, required: false, sort_order: 4 },
      { name: "user_href", label: "User href", field_type: "text", localizable: false, required: false, sort_order: 5 },
    ],
  },
  {
    slug: "home_contact",
    name: "Home — Contact",
    is_block: true,
    fields: [
      { name: "lead_in", label: "Lead-in", field_type: "text", localizable: true, required: false, sort_order: 0 },
      { name: "heading", label: "Heading", field_type: "textarea", localizable: true, required: false, sort_order: 1 },
      { name: "hours", label: "Reception hours", field_type: "text", localizable: true, required: false, sort_order: 2 },
      { name: "isms", label: "ISMS note", field_type: "textarea", localizable: true, required: false, sort_order: 3 },
      { name: "mics_logo", label: "Logo mics", field_type: "image", localizable: false, required: false, sort_order: 4 },
      { name: "iso_logo", label: "Badge ISO 27001 (BSI)", field_type: "image", localizable: false, required: false, sort_order: 5 },
      { name: "mics_logo_alt", label: "Logo mics alt", field_type: "text", localizable: true, required: false, sort_order: 6 },
      { name: "iso_logo_alt", label: "Badge ISO alt", field_type: "text", localizable: true, required: false, sort_order: 7 },
      { name: "contact_cta_href", label: "Contact CTA href", field_type: "text", localizable: false, required: false, sort_order: 8 },
      { name: "lead_in_ornament_start", label: "Lead-in ornament (start)", field_type: "text", localizable: true, required: false, sort_order: 9 },
      { name: "lead_in_ornament_end", label: "Lead-in ornament (end)", field_type: "text", localizable: true, required: false, sort_order: 10 },
    ],
  },
  {
    slug: "rate_course",
    name: "Rates — Course",
    is_block: true,
    fields: [
      { name: "course_key", label: "Course key", field_type: "select", localizable: false, required: false, sort_order: 0 },
      { name: "name", label: "Course name", field_type: "text", localizable: true, required: false, sort_order: 1 },
    ],
  },
  {
    slug: "rate_row",
    name: "Rates — Row",
    is_block: true,
    fields: [
      { name: "course_key", label: "Course", field_type: "select", localizable: false, required: false, sort_order: 0 },
      { name: "row_key", label: "Row key", field_type: "text", localizable: false, required: false, sort_order: 1 },
      { name: "label", label: "Label", field_type: "text", localizable: true, required: false, sort_order: 2 },
      { name: "detail", label: "Detail / time band", field_type: "text", localizable: true, required: false, sort_order: 3 },
      { name: "customer_price", label: "Harga pelanggan (yen, tax incl.)", field_type: "number", localizable: false, required: false, sort_order: 4 },
      { name: "supporter_pay", label: "Upah supporter (yen, tax incl.)", field_type: "number", localizable: false, required: false, sort_order: 5 },
    ],
  },
  {
    slug: "pricing_meta",
    name: "Pricing — Meta",
    is_block: true,
    fields: [
      { name: "highlights", label: "Highlights (satu per baris)", field_type: "textarea", localizable: true, required: false, sort_order: 0 },
      { name: "note", label: "Note", field_type: "textarea", localizable: true, required: false, sort_order: 1 },
    ],
  },
  {
    slug: "fees_meta",
    name: "Fees — Meta",
    is_block: true,
    fields: [
      { name: "column_customer", label: "Kolom: pelanggan", field_type: "text", localizable: true, required: false, sort_order: 0 },
      { name: "column_supporter", label: "Kolom: care supporter", field_type: "text", localizable: true, required: false, sort_order: 1 },
      { name: "note", label: "Note", field_type: "textarea", localizable: true, required: false, sort_order: 2 },
      { name: "column_service", label: "Kolom: layanan (header kolom pertama)", field_type: "text", localizable: true, required: false, sort_order: 3 },
      // Closing CTA button's destination (`actionPlan.ctaHref` in
      // constants/copy.ts) — today the home page's contact block, until the
      // client's own registration URL exists.
      { name: "cta_href", label: "CTA href", field_type: "text", localizable: false, required: false, sort_order: 4 },
    ],
  },
  {
    slug: "use_case_item",
    name: "Use Case — Item",
    is_block: true,
    fields: [
      { name: "slug", label: "Anchor slug", field_type: "text", localizable: false, required: false, sort_order: 0 },
      { name: "title", label: "Title (H2)", field_type: "text", localizable: true, required: false, sort_order: 1 },
      { name: "body", label: "Body (ringkas)", field_type: "textarea", localizable: true, required: false, sort_order: 2 },
      { name: "detail", label: "Detail (paragraf panjang)", field_type: "textarea", localizable: true, required: false, sort_order: 3 },
      { name: "highlights", label: "Highlights (satu per baris)", field_type: "textarea", localizable: true, required: false, sort_order: 4 },
      { name: "image_alt", label: "Image alt", field_type: "text", localizable: true, required: false, sort_order: 5 },
      { name: "image", label: "Image", field_type: "image", localizable: false, required: false, sort_order: 6 },
    ],
  },
  {
    slug: "service_flow_step",
    name: "Service Flow — Step",
    is_block: true,
    fields: [
      { name: "title", label: "Title", field_type: "text", localizable: true, required: false, sort_order: 0 },
      { name: "body", label: "Body", field_type: "textarea", localizable: true, required: false, sort_order: 1 },
      { name: "number", label: "Step number", field_type: "text", localizable: false, required: false, sort_order: 2 },
    ],
  },
  {
    slug: "company_row",
    name: "Company — Row",
    is_block: true,
    fields: [
      // `row_key` is the STABLE identity of a row, and exists so the
      // Organization JSON-LD (features/seo/organization.ts) can find the
      // three rows it needs without matching on `label.en` text. Renaming
      // "Head office" to "Head Office" in the dashboard is an ordinary
      // content edit; before this field it silently dropped `address` and
      // `foundingDate` from the site's structured data. Same role `course_key`
      // / `row_key` already play for `rate_row` below — non-localizable, and
      // not rendered anywhere.
      //
      // Appended at `sort_order: 2` rather than inserted first: `lib.ts:554`
      // excludes `sort_order` from drift detection, so re-ordering the two
      // existing fields here would change nothing on a workspace that already
      // has them and would only make this file disagree with the live schema.
      { name: "label", label: "Label", field_type: "text", localizable: true, required: false, sort_order: 0 },
      { name: "value", label: "Value", field_type: "textarea", localizable: true, required: false, sort_order: 1 },
      { name: "row_key", label: "Row key (internal, do not translate)", field_type: "text", localizable: false, required: false, sort_order: 2 },
    ],
  },
  {
    slug: "legal_doc",
    name: "Legal — Document",
    is_block: true,
    fields: [
      { name: "heading", label: "Heading", field_type: "text", localizable: true, required: false, sort_order: 0 },
      { name: "body", label: "Body", field_type: "richtext", localizable: true, required: false, sort_order: 1 },
    ],
  },
];

async function main(): Promise<void> {
  const env = requireAtlasEnv();

  let typesCreated = 0;
  let typesSkipped = 0;
  let fieldsCreated = 0;
  let fieldsSkipped = 0;

  for (const spec of BLOCK_TYPES) {
    const { value: contentType, created } = await ensureContentType(env, {
      name: spec.name,
      slug: spec.slug,
      is_block: spec.is_block,
      orderable: false,
    });

    if (created) {
      typesCreated += 1;
      console.log(`+ content type  ${spec.slug} -> ${contentType.slug} (${contentType.id})`);
    } else {
      typesSkipped += 1;
      console.log(`= content type  ${spec.slug} -> ${contentType.slug} (already exists)`);
    }

    const existingFields: ContentTypeField[] | null = contentType.fields;

    for (const field of spec.fields) {
      const { created: fieldCreated } = await ensureContentTypeField(
        env,
        contentType.slug,
        field,
        existingFields,
      );

      if (fieldCreated) {
        fieldsCreated += 1;
        console.log(`  + field ${spec.slug}.${field.name}`);
      } else {
        fieldsSkipped += 1;
        console.log(`  = field ${spec.slug}.${field.name} (already exists)`);
      }
    }
  }

  console.log("");
  console.log("Summary");
  console.log(`  content types: ${typesCreated} created, ${typesSkipped} skipped (${BLOCK_TYPES.length} total)`);
  console.log(`  fields:        ${fieldsCreated} created, ${fieldsSkipped} skipped`);
}

main().catch((error) => {
  console.error("[atlas:schema] failed:", error);
  process.exitCode = 1;
});
