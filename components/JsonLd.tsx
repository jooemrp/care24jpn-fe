import { SITE_URL } from "@/constants/site";
import { getCompany } from "@/features/cms/pages";
import type { SiteContent } from "@/features/cms/site";
import { escapeJsonForScript } from "@/features/seo/jsonLdEscape";
import { buildOrganizationJsonLd } from "@/features/seo/organization";

type JsonLdProps = {
  /**
   * Any schema.org object (or array of objects) to serialize. Accepts a
   * promise too: `organizationJsonLd` below is async (it awaits the
   * CMS-backed `getCompany()` loader), so callers pass its pending result
   * straight through without needing to `await` at the call site themselves.
   */
  data: Record<string, unknown> | Promise<Record<string, unknown>>;
};

/**
 * Renders a single JSON-LD `<script>` tag for the given structured-data
 * object. Server component — no client JS needed to emit static markup.
 * Async so it can accept either a resolved object or a pending promise for
 * `data` (awaiting a non-promise value is a no-op, so both call shapes work).
 *
 * Serialized through `escapeJsonForScript` (features/seo/jsonLdEscape.ts),
 * NOT a bare `JSON.stringify` — `resolved` now carries CMS-controlled
 * strings (`legalName`, `address`, `foundingDate`, ... via
 * `organizationJsonLd` below), and plain `JSON.stringify` does not escape
 * `<`, so a `</script>` in any of those fields would break out of this tag.
 * See jsonLdEscape.ts for the full writeup and jsonLdEscape.test.ts for the
 * break-out payload this closes.
 */
export default async function JsonLd({ data }: JsonLdProps) {
  const resolved = await data;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: escapeJsonForScript(resolved) }}
    />
  );
}

/**
 * Site-wide LocalBusiness schema, built from the CMS-backed `site` chrome
 * (`brand.name`, `brand.logo`, `contactPhone.tel` — see features/cms/site.ts)
 * plus the CMS-backed `company` page (`getCompany()` — see
 * features/cms/pages.ts). The actual field mapping (which `company.rows`
 * feed `legalName`/`address`/`foundingDate`, key order, the fallback rule)
 * lives in the pure, unit-tested `features/seo/organization.ts` — this
 * function is a thin wrapper that awaits the two CMS loaders and hands their
 * results across.
 *
 * `getCompany()` has NO fallback layer: when Atlas is unreachable or the
 * page shape doesn't match, it throws and the route surfaces an error, so
 * `features/seo/organization.ts#buildOrganizationJsonLd` only ever sees
 * CMS-sourced rows. A specific row lookup that misses (e.g. "Head office"
 * renamed in the dashboard) resolves to an empty field, not a constants
 * value — see that file for the exact resolution order.
 *
 * Fields intentionally OMITTED because the data isn't in the CMS:
 * - sameAs (social profiles) — no social links exist in the codebase.
 * - founder / employee — not tracked in constants.
 * - openingHours — contactPhone.note mentions 24/7 support, but that's a
 *   support-line note, not a structured opening-hours fact.
 *
 * Key order is load-bearing: `JSON.stringify` preserves insertion order, and
 * `features/seo/organization.test.ts` asserts it exactly (`@context`,
 * `@type`, `name`, `legalName`, `url`, `logo`, `image`, `telephone`,
 * `address`, `foundingDate`, with `logo`/`image` omitted as a pair when no
 * logo URL is available). The output is NOT required to be byte-identical to
 * the pre-CMS version — `legalName`, `address` and `foundingDate` are
 * expected to change the moment an editor changes the corresponding
 * `company_row` in the dashboard, and `logo`/`image` are new fields entirely.
 */
export async function organizationJsonLd(site: SiteContent): Promise<Record<string, unknown>> {
  const company = await getCompany();

  return buildOrganizationJsonLd({
    brandName: site.brand.name,
    telephone: site.contactPhone.tel,
    logoUrl: site.brand.logo,
    siteUrl: SITE_URL,
    companyRows: company.rows,
  });
}
