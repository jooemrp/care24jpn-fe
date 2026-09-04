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
 * the strict CMS company loader and passes the resulting rows in as
 * `companyRows`. A missing or malformed row is a typed content error; this
 * module never borrows values from the application bundle.
 */

type Bi = { ja: string; en: string };

type OrganizationContentErrorCode =
  | "CMS_MISSING_REQUIRED_FIELD"
  | "CMS_INVALID_REQUIRED_FIELD";

/**
 * The pure JSON-LD builder is also exercised by the repository's plain
 * `node --test` suite, so it cannot import the server-only CMS module graph.
 * Keep the same serializable error contract used by `CmsContentError`:
 * callers and the route error boundary receive a named, coded error with
 * actionable field paths.
 */
class OrganizationContentError extends Error {
  readonly code: OrganizationContentErrorCode;
  readonly fields: string[];
  readonly slug: string;

  constructor(
    code: OrganizationContentErrorCode,
    message: string,
    fields: readonly string[],
    slug: string,
  ) {
    super(message);
    this.name = "CmsContentError";
    this.code = code;
    this.fields = [...fields];
    this.slug = slug;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Matches `constants/copy.ts#company`'s row shape
 * (`Company["rows"][number]`), duplicated locally — see file header.
 *
 * `key` is the stable, non-localizable row identity (`company_row.row_key`
 * in Atlas). It is optional here on purpose: `features/cms/pages-map.ts`
 * fills it with `""` for a workspace seeded before that field existed, and
 * `findRow` below is what handles that case. */
export type CompanyRow = { key?: string; label: Bi; value: Bi };

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
  /** `site.brand.logo` (see `features/cms/site.ts`) — a full URL from Atlas. */
  logoUrl: string;
  siteUrl: string;
  /** Strict CMS-sourced rows from `getCompanyContent().rows`. */
  companyRows: CompanyRow[];
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

/**
 * The three rows this module needs, identified by `company_row.row_key` —
 * the stable, non-localizable key seeded from `constants/copy.ts#company.rows[].key`
 * (see scripts/atlas/schema.ts and scripts/atlas/seed-pages.ts).
 *
 * WHY A KEY AND NOT THE LABEL. This used to match on `row.label.en ===
 * "Head office"`. Renaming that row's English label in the dashboard is an
 * ordinary content edit — "Head office" -> "Head Office", or translating it
 * differently — and it silently dropped `address` and `foundingDate` from
 * the site's structured data, with nothing but one server-log warning to
 * say so. The label is copy; copy is the editor's to change. Identity has
 * to live somewhere the editor is not expected to keep byte-stable.
 */
const TRADE_NAME_ROW_KEY = "trade-name";
const HEAD_OFFICE_ROW_KEY = "head-office";
const ESTABLISHED_ROW_KEY = "established";

/** The English labels these rows carried before `row_key` existed. Kept
 * ONLY for `findRow`'s second pass — see there. */
const LEGACY_LABEL_EN: Record<string, string> = {
  [TRADE_NAME_ROW_KEY]: "Trade name",
  [HEAD_OFFICE_ROW_KEY]: "Head office",
  [ESTABLISHED_ROW_KEY]: "Established",
};

/**
 * Key first, legacy English label second.
 *
 * The second pass keeps this compatible with a workspace that has not been
 * re-seeded since `company_row.row_key` was added, where every row's key is
 * `""` (`features/cms/pages-map.ts` preserves the empty value rather than
 * guessing from position). It still uses the backend row itself; it never
 * imports or substitutes bundled company copy.
 *
 * A row whose key matches wins outright, even if some other row happens to
 * carry the legacy label — the key is the identity, the label is not.
 */
function findRow(rows: CompanyRow[], rowKey: string): CompanyRow | undefined {
  const byKey = rows.find((row) => row.key === rowKey);
  if (byKey) return byKey;

  const legacyLabel = LEGACY_LABEL_EN[rowKey];
  const byLabel = legacyLabel
    ? rows.find((row) => row.label.en === legacyLabel)
    : undefined;
  if (byLabel) {
    warnOnce(
      `company-row-legacy-label:${rowKey}`,
      `[seo:organization] company row "${rowKey}" was found by its English label ("${legacyLabel}"), not by row_key — this workspace predates the company_row.row_key field. Re-run "npx tsx scripts/atlas/seed-pages.ts" so the key is stored; until then, renaming that row's label in the dashboard will drop it from the Organization JSON-LD. This warning prints once per key per process.`,
    );
  }
  return byLabel;
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
 * "<region> <postal-code>"-suffixed shape, so a malformed edit can be
 * surfaced as a typed content error rather than emitting a wrong or
 * partially-empty PostalAddress.
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

function isAbsoluteHttpUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

// ---------------------------------------------------------------------------
// Field resolution — every value comes from the strict CMS rows.
// ---------------------------------------------------------------------------

function companyRowFieldPath(rowKey: string, field?: string): string {
  return `company.company-row[${rowKey}]${field ? `.${field}` : ""}`;
}

function missingCompanyRow(rowKey: string): never {
  const field = companyRowFieldPath(rowKey);
  throw new OrganizationContentError(
    "CMS_MISSING_REQUIRED_FIELD",
    `Required CMS company row "${rowKey}" is missing.`,
    [field],
    "company",
  );
}

function invalidCompanyRowValue(rowKey: string, detail: string): never {
  const field = companyRowFieldPath(rowKey, "value.en");
  throw new OrganizationContentError(
    "CMS_INVALID_REQUIRED_FIELD",
    `Required CMS company row value "${field}" is malformed: ${detail}`,
    [field],
    "company",
  );
}

function requiredCompanyValue(rows: CompanyRow[], rowKey: string): string {
  const row = findRow(rows, rowKey);
  if (!row) return missingCompanyRow(rowKey);

  const value = row.value?.en;
  if (typeof value !== "string" || value.trim() === "") {
    return invalidCompanyRowValue(rowKey, "expected non-empty English text");
  }
  return value;
}

function resolveLegalName(companyRows: CompanyRow[]): string {
  return requiredCompanyValue(companyRows, TRADE_NAME_ROW_KEY);
}

function resolveAddress(companyRows: CompanyRow[]): PostalAddress {
  const rowKey = HEAD_OFFICE_ROW_KEY;
  const value = requiredCompanyValue(companyRows, rowKey);
  const parsed = parseAddress(value);
  if (!parsed) {
    return invalidCompanyRowValue(
      rowKey,
      'expected "<building>, <street>, <ward>, <region> <postal-code>"',
    );
  }
  return parsed;
}

function resolveFoundingDate(companyRows: CompanyRow[]): string {
  const rowKey = ESTABLISHED_ROW_KEY;
  const value = requiredCompanyValue(companyRows, rowKey);
  const parsed = parseFoundingDate(value);
  if (!parsed) {
    return invalidCompanyRowValue(rowKey, 'expected "<Month> <day>, <year>"');
  }
  return parsed;
}

function requiredLogoUrl(value: string): string {
  const field = "site.site-brand.logo";
  if (typeof value !== "string" || value.trim() === "") {
    throw new OrganizationContentError(
      "CMS_MISSING_REQUIRED_FIELD",
      `Required CMS image "${field}" is missing.`,
      [field],
      "site",
    );
  }
  if (!isAbsoluteHttpUrl(value)) {
    throw new OrganizationContentError(
      "CMS_INVALID_REQUIRED_FIELD",
      `Required CMS image "${field}" is malformed.`,
      [field],
      "site",
    );
  }
  return value;
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
 * `logo`/`image` are always present because `logoUrl` is a required,
 * validated CMS image URL.
 */
export function buildOrganizationJsonLd(
  input: BuildOrganizationJsonLdInput,
): Record<string, unknown> {
  const { brandName, telephone, logoUrl, siteUrl, companyRows } = input;

  const legalName = resolveLegalName(companyRows);
  const address = resolveAddress(companyRows);
  const foundingDate = resolveFoundingDate(companyRows);
  const absoluteLogoUrl = requiredLogoUrl(logoUrl);

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: brandName,
    legalName,
    url: siteUrl,
    logo: absoluteLogoUrl,
    image: absoluteLogoUrl,
    telephone,
    address: { "@type": "PostalAddress", ...address },
    foundingDate,
  };
}
