import { SITE_URL } from "@/constants/site";
import { getCompanyContent } from "@/features/cms/pages";
import type { SiteContent } from "@/features/cms/site";
import { escapeJsonForScript } from "@/features/seo/jsonLdEscape";
import { buildOrganizationJsonLd } from "@/features/seo/organization";

type JsonLdProps = {
  /**
   * Any schema.org object (or array of objects) to serialize. Accepts a
   * promise too: `organizationJsonLd` below is async (it awaits the strict
   * CMS-backed company loader), so callers pass its pending result
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
 * plus the strict CMS-backed `company` page (`getCompanyContent()` — see
 * features/cms/pages.ts). The actual field mapping (which `company.rows`
 * feed `legalName`/`address`/`foundingDate`, key order and validation) lives
 * in the pure, unit-tested `features/seo/organization.ts` — this function is
 * a thin wrapper that awaits the two strict CMS loaders and hands their
 * results across.
 *
 * Both reads are strict. If Atlas is unavailable or a required company row
 * is missing/malformed, the resulting typed content error reaches the route
 * error boundary instead of producing stale structured data.
 *
 * Fields intentionally omitted because the data is not tracked by the CMS:
 * - sameAs (social profiles) — no social links exist in the codebase.
 * - founder / employee — not tracked by the CMS.
 * - openingHours — contactPhone.note mentions 24/7 support, but that's a
 *   support-line note, not a structured opening-hours fact.
 *
 * Key order is load-bearing: `JSON.stringify` preserves insertion order, and
 * `features/seo/organization.test.ts` asserts it exactly (`@context`,
 * `@type`, `name`, `legalName`, `url`, `logo`, `image`, `telephone`,
 * `address`, `foundingDate`). Missing or malformed backend data throws before
 * this tag can render; no bundled content is substituted.
 */
export async function organizationJsonLd(site: SiteContent): Promise<Record<string, unknown>> {
  const company = await getCompanyContent();

  return buildOrganizationJsonLd({
    brandName: site.brand.name,
    telephone: site.contactPhone.tel,
    logoUrl: site.brand.logo,
    siteUrl: SITE_URL,
    companyRows: company.rows,
  });
}
