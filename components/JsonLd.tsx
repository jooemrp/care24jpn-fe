import { brand, company, contactPhone } from "@/constants/copy";
import { SITE_URL } from "@/constants/site";

type JsonLdProps = {
  /** Any schema.org object (or array of objects) to serialize. */
  data: Record<string, unknown>;
};

/**
 * Renders a single JSON-LD `<script>` tag for the given structured-data
 * object. Server component — no client JS needed to emit static markup.
 */
export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * Site-wide Organization schema, built only from facts that exist in
 * constants/copy.ts (`brand`, `company`, `contactPhone`).
 *
 * Fields intentionally OMITTED because the data isn't in constants/:
 * - logo / image — no logo asset URL is defined, only alt text.
 * - sameAs (social profiles) — no social links exist in the codebase.
 * - founder / employee — not tracked in constants.
 * - openingHours — contactPhone.note mentions 24/7 support, but that's a
 *   support-line note, not a structured opening-hours fact.
 */
// Sourced directly from `company.rows` in constants/copy.ts:
// - "Head office" row: "Meiji Seimei Building 4F, 2-1-1 Marunouchi,
//   Chiyoda-ku, Tokyo 100-0005" — split into PostalAddress fields since the
//   postal code / region / locality are already explicit in that string.
// - "Established" row: "October 18, 2002" → ISO 8601 date.
const headOffice = company.rows.find((row) => row.label.en === "Head office");
const established = company.rows.find((row) => row.label.en === "Established");

export const organizationJsonLd: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: brand.name,
  legalName: "MedicalInformatics Co.,Ltd.",
  url: SITE_URL,
  telephone: contactPhone.tel,
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
