import { SITE_URL } from "@/constants/site";
import { getCompany } from "@/features/cms/pages";
import type { SiteContent } from "@/features/cms/site";

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
 */
export default async function JsonLd({ data }: JsonLdProps) {
  const resolved = await data;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(resolved) }}
    />
  );
}

/**
 * Site-wide Organization schema, built from the CMS-backed `site` chrome
 * (`brand.name`, `contactPhone.tel` — see features/cms/site.ts) plus the
 * CMS-backed `company` page (`getCompany()` — see features/cms/pages.ts).
 * `getCompany()` already falls back to `constants/copy.ts`'s `company` when
 * Atlas is unreachable or the page shape doesn't match, so this function
 * never needs its own fallback logic.
 *
 * Fields intentionally OMITTED because the data isn't in constants/:
 * - logo / image — no logo asset URL is defined, only alt text.
 * - sameAs (social profiles) — no social links exist in the codebase.
 * - founder / employee — not tracked in constants.
 * - openingHours — contactPhone.note mentions 24/7 support, but that's a
 *   support-line note, not a structured opening-hours fact.
 *
 * Key order is load-bearing: `JSON.stringify` preserves insertion order, and
 * the rendered `<script>` tag must be byte-identical to the pre-CMS output
 * (@context, @type, name, legalName, url, telephone, address, foundingDate).
 */
export async function organizationJsonLd(site: SiteContent): Promise<Record<string, unknown>> {
  const company = await getCompany();

  // Sourced from `company.rows` (CMS `company` page, falls back to
  // `constants/copy.ts`):
  // - "Head office" row: "Meiji Seimei Building 4F, 2-1-1 Marunouchi,
  //   Chiyoda-ku, Tokyo 100-0005" — split into PostalAddress fields since the
  //   postal code / region / locality are already explicit in that string.
  // - "Established" row: "October 18, 2002" → ISO 8601 date.
  const headOffice = company.rows.find((row) => row.label.en === "Head office");
  const established = company.rows.find((row) => row.label.en === "Established");

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.brand.name,
    legalName: "MedicalInformatics Co.,Ltd.",
    url: SITE_URL,
    telephone: site.contactPhone.tel,
    ...(headOffice && {
      address: {
        "@type": "PostalAddress",
        streetAddress: "2-1-1 Marunouchi, Meiji Seimei Building 4F",
        addressLocality: "Chiyoda-ku",
        addressRegion: "Tokyo",
        postalCode: "100-0005",
        addressCountry: "JP",
      },
    }),
    ...(established && { foundingDate: "2002-10-18" }),
  };
}
