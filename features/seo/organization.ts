/**
 * Pure builder for the site-wide Organization/LocalBusiness JSON-LD object.
 *
 * Split out of `components/JsonLd.tsx#organizationJsonLd` so it can run
 * under `node --test` with no bundler, no Next.js runtime and no network —
 * same bootstrapping discipline as `features/cms/fields.ts` /
 * `features/cms/merge.ts`:
 * - RELATIVE imports only (`@/` path aliases do not resolve under bare
 *   `node --test`).
 * - No cross-module RUNTIME import, even a relative one: a real (non-type)
 *   `import { x } from "../cms/fields"` resolves fine under the Next
 *   bundler / tsc's `bundler` moduleResolution, but fails under Node's
 *   native loader, which requires an explicit extension
 *   (`ERR_MODULE_NOT_FOUND`) — and a literal `.ts` extension on a STATIC
 *   import in turn fails `tsc --noEmit` (TS5097), which is exactly why
 *   `features/cms/fields.test.ts` imports its subject dynamically instead of
 *   statically. This module sidesteps the whole problem by depending on
 *   NOTHING at runtime except its own code (see `warnOnce` below, a
 *   deliberate 20-line duplicate of `features/cms/fields.ts#warnOnce`, not
 *   an import of it).
 * - No `constants/*` VALUE import — `CompanyRow`/`Bi` duplicate the shapes
 *   `constants/copy.ts#company` and `features/cms/types.ts#Bilingual`
 *   already declare, the same way `features/cms/types.ts` duplicates
 *   `Bilingual` instead of importing it.
 *
 * `components/JsonLd.tsx#organizationJsonLd` is the only caller. It awaits
 * `getCompany()` (CMS-backed, already falls back to `constants/copy.ts`
 * internally when Atlas is unreachable or the page shape doesn't match) and
 * passes `company.rows` in as `companyRows`, plus `constants/copy.ts#company`
 * itself, UNTRANSFORMED, as `fallbackCompanyRows` — so this module never
 * needs to import `constants/copy.ts`, and there is exactly one fallback
 * path below, not a second hand-copied one.
 */

type Bi = { ja: string; en: string };

/** Matches `constants/copy.ts#company`'s row shape
 * (`Company["rows"][number]`), duplicated locally — see file header. */
export type CompanyRow = { label: Bi; value: Bi };

export type PostalAddress = {
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
};

export type BuildOrganizationJsonLdInput = {
  brandName: string;
  telephone: string;
  /** `site.brand.logo` (see `features/cms/site.ts`) — a full URL when Atlas
   * answers, or the bundled `/images/logo.png` fallback when it doesn't.
   * Relative values are resolved against `siteUrl` (schema.org `logo`/
   * `image` expect an absolute URL). Falsy/empty omits both `logo` and
   * `image` entirely. */
  logoUrl?: string;
  siteUrl: string;
  /** CMS-sourced rows from `getCompany().rows` — may equal
   * `fallbackCompanyRows` already, if `getCompany()` itself fell back. */
  companyRows: CompanyRow[];
  /** `constants/copy.ts#company.rows`, passed through untransformed. Used
   * ONLY when a lookup or parse against `companyRows` fails (a row label
   * renamed in the dashboard, a free-text address that no longer matches the
   * expected shape, ...), so the emitted field never regresses to entirely
   * missing. This is the one fallback path in this module. */
  fallbackCompanyRows: CompanyRow[];
};

// ---------------------------------------------------------------------------
// Diagnostics — a deliberate local duplicate of
// features/cms/fields.ts#warnOnce; see the file header for why it is not an
// import.
// ---------------------------------------------------------------------------

const warnedKeys = new Set<string>();

function warnOnce(key: string, message: string): void {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(message);
}

// ---------------------------------------------------------------------------
// company_row lookups
// ---------------------------------------------------------------------------

const TRADE_NAME_LABEL_EN = "Trade name";
const HEAD_OFFICE_LABEL_EN = "Head office";
const ESTABLISHED_LABEL_EN = "Established";

function findRow(rows: CompanyRow[], labelEn: string): CompanyRow | undefined {
  return rows.find((row) => row.label.en === labelEn);
}

/**
 * "Meiji Seimei Building 4F, 2-1-1 Marunouchi, Chiyoda-ku, Tokyo 100-0005"
 * -> { streetAddress: "2-1-1 Marunouchi, Meiji Seimei Building 4F",
 *      addressLocality: "Chiyoda-ku", addressRegion: "Tokyo",
 *      postalCode: "100-0005", addressCountry: "JP" }
 *
 * Free-text parse of the EN `company_row.value` for the "Head office" row —
 * the CMS carries one address string, not five structured fields, and the
 * split below is exactly what was previously done by hand once and then
 * hardcoded (see the git history of this file's caller). `addressCountry`
 * is always "JP": no live document expresses a country, and Japan is the
 * only one this business has ever operated a registered office in.
 *
 * Returns `null` on anything that doesn't match the known 4-segment,
 * "<region> <postal-code>"-suffixed shape, so a malformed edit falls back
 * rather than emitting a wrong or partially-empty PostalAddress.
 */
function parseAddress(value: string): PostalAddress | null {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length !== 4) return null;

  const [building, street, locality, regionAndPostal] = parts;
  const match = /^(.+?)\s+(\d{3}-\d{4})$/.exec(regionAndPostal);
  if (!match) return null;

  return {
    streetAddress: `${street}, ${building}`,
    addressLocality: locality,
    addressRegion: match[1].trim(),
    postalCode: match[2],
    addressCountry: "JP",
  };
}

const MONTHS_EN: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

/**
 * "October 18, 2002" -> "2002-10-18".
 *
 * Deliberately NOT `new Date(value).toISOString()`: that round-trip is
 * timezone-sensitive (a month-name date string with no offset parses as
 * LOCAL midnight, then `toISOString()` converts to UTC — west of Greenwich
 * that rolls the date back a day), which would make this function's output
 * depend on the server's TZ. A small manual month-name lookup keeps the
 * result deterministic. Returns `null` on anything that doesn't match
 * "<Month> <day>, <year>".
 */
function parseFoundingDate(value: string): string | null {
  const match = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const month = MONTHS_EN[match[1].toLowerCase()];
  if (!month) return null;
  return `${match[3]}-${month}-${match[2].padStart(2, "0")}`;
}

function toAbsoluteUrl(url: string, siteUrl: string): string {
  return /^https?:\/\//.test(url) ? url : `${siteUrl}${url}`;
}

// ---------------------------------------------------------------------------
// Field resolution — CMS row, else the matching constants fallback row,
// else an empty default (never expected to trigger: constants/copy.ts's
// rows are well-formed by construction).
// ---------------------------------------------------------------------------

function resolveLegalName(companyRows: CompanyRow[], fallbackCompanyRows: CompanyRow[]): string {
  const row = findRow(companyRows, TRADE_NAME_LABEL_EN);
  if (row && row.value.en.trim() !== "") return row.value.en;

  warnOnce(
    row
      ? "organization:legal-name-empty"
      : `organization:row-miss:${TRADE_NAME_LABEL_EN}`,
    row
      ? `[cms:unexpected-content] organization: company_row "${TRADE_NAME_LABEL_EN}" has an empty/whitespace value.en — using the constants/copy.ts fallback company row for JSON-LD legalName instead, rather than emitting an empty legalName. Check for a cleared field in the dashboard. This warning only prints once per process.`
        : `[cms:unexpected-content] organization: no company_row with label.en "${TRADE_NAME_LABEL_EN}" — using the constants/copy.ts fallback company row for JSON-LD legalName instead. Check for a renamed row label in the dashboard. This warning only prints once per process.`,
  );
  return findRow(fallbackCompanyRows, TRADE_NAME_LABEL_EN)?.value.en ?? "";
}

const EMPTY_ADDRESS: PostalAddress = {
  streetAddress: "",
  addressLocality: "",
  addressRegion: "",
  postalCode: "",
  addressCountry: "JP",
};

function resolveAddress(
  companyRows: CompanyRow[],
  fallbackCompanyRows: CompanyRow[],
): PostalAddress {
  const row = findRow(companyRows, HEAD_OFFICE_LABEL_EN);
  if (row) {
    const parsed = parseAddress(row.value.en);
    if (parsed) return parsed;
    warnOnce(
      "organization:address-unparseable",
      `[cms:unexpected-content] organization: company_row "${HEAD_OFFICE_LABEL_EN}" value "${row.value.en}" does not match the expected "<building>, <street>, <ward>, <region> <postal>" shape — using the constants/copy.ts fallback address for JSON-LD instead. This warning only prints once per process.`,
    );
  } else {
    warnOnce(
      `organization:row-miss:${HEAD_OFFICE_LABEL_EN}`,
      `[cms:unexpected-content] organization: no company_row with label.en "${HEAD_OFFICE_LABEL_EN}" — using the constants/copy.ts fallback address for JSON-LD instead. Check for a renamed row label in the dashboard. This warning only prints once per process.`,
    );
  }

  const fallbackRow = findRow(fallbackCompanyRows, HEAD_OFFICE_LABEL_EN);
  const fallbackParsed = fallbackRow ? parseAddress(fallbackRow.value.en) : null;
  return fallbackParsed ?? EMPTY_ADDRESS;
}

function resolveFoundingDate(
  companyRows: CompanyRow[],
  fallbackCompanyRows: CompanyRow[],
): string {
  const row = findRow(companyRows, ESTABLISHED_LABEL_EN);
  if (row) {
    const parsed = parseFoundingDate(row.value.en);
    if (parsed) return parsed;
    warnOnce(
      "organization:founding-date-unparseable",
      `[cms:unexpected-content] organization: company_row "${ESTABLISHED_LABEL_EN}" value "${row.value.en}" does not match the expected "<Month> <day>, <year>" shape — using the constants/copy.ts fallback founding date for JSON-LD instead. This warning only prints once per process.`,
    );
  } else {
    warnOnce(
      `organization:row-miss:${ESTABLISHED_LABEL_EN}`,
      `[cms:unexpected-content] organization: no company_row with label.en "${ESTABLISHED_LABEL_EN}" — using the constants/copy.ts fallback founding date for JSON-LD instead. Check for a renamed row label in the dashboard. This warning only prints once per process.`,
    );
  }

  const fallbackRow = findRow(fallbackCompanyRows, ESTABLISHED_LABEL_EN);
  const fallbackParsed = fallbackRow ? parseFoundingDate(fallbackRow.value.en) : null;
  return fallbackParsed ?? "";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds the plain object serialized into the site-wide `<script
 * type="application/ld+json">` tag (`components/JsonLd.tsx`). Pure: no I/O,
 * no CMS access, no `Date.now()`.
 *
 * Key order is load-bearing — `JSON.stringify` preserves insertion order and
 * `features/seo/organization.test.ts` asserts it exactly:
 *   @context, @type, name, legalName, url, logo, image, telephone, address,
 *   foundingDate
 * `logo`/`image` are omitted as a pair when `logoUrl` is falsy/empty; every
 * other key is always present (using the constants fallback rather than
 * being omitted, per `fallbackCompanyRows` above).
 */
export function buildOrganizationJsonLd(
  input: BuildOrganizationJsonLdInput,
): Record<string, unknown> {
  const { brandName, telephone, logoUrl, siteUrl, companyRows, fallbackCompanyRows } = input;

  const legalName = resolveLegalName(companyRows, fallbackCompanyRows);
  const address = resolveAddress(companyRows, fallbackCompanyRows);
  const foundingDate = resolveFoundingDate(companyRows, fallbackCompanyRows);
  const absoluteLogoUrl = logoUrl ? toAbsoluteUrl(logoUrl, siteUrl) : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: brandName,
    legalName,
    url: siteUrl,
    ...(absoluteLogoUrl ? { logo: absoluteLogoUrl, image: absoluteLogoUrl } : {}),
    telephone,
    address: { "@type": "PostalAddress", ...address },
    foundingDate,
  };
}
