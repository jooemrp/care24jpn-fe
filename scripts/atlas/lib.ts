/**
 * Shared helpers for one-off Node scripts under scripts/atlas/*.ts (schema
 * creation, seeding). NOT imported by app runtime code — `ATLAS_MGMT_KEY`
 * must never reach a browser bundle or a request handler; see
 * features/cms/client.ts for the read-only, delivery-key runtime client.
 *
 * Run scripts with `npm run atlas:schema` (or `npx tsx scripts/atlas/<file>.ts`
 * directly) from the `marketing-web/` directory, so `.env` resolves relative
 * to the package root.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
// Type-only import: erased at compile time, so it never touches Node's
// module resolution. The runtime binding is loaded via dynamic `import()`
// in `createScriptManagementClient()` below — `@latellu/atlas-sdk` is
// ESM-only ("exports" has no "require" condition) and these scripts run
// under tsx's default CJS transform (marketing-web/package.json has no
// "type": "module"), so a static `import` of a subpath here resolves
// through Node's CJS algorithm and throws ERR_PACKAGE_PATH_NOT_EXPORTED.
// A dynamic `import()` always goes through the ESM resolver instead.
import type {
  ManagementClient,
  CreatePageInput,
  UpdatePageInput,
} from "@latellu/atlas-sdk/management";

// ---------------------------------------------------------------------------
// .env loading
// ---------------------------------------------------------------------------

let envLoaded = false;

/**
 * Loads `marketing-web/.env` into `process.env`, without overwriting values
 * already set (e.g. by the calling shell or CI secrets). Idempotent — safe
 * to call from every script's entrypoint.
 *
 * Delegates to `process.loadEnvFile` (Node's own `.env` parser, the same one
 * behind the `--env-file` CLI flag — available on the Node version this repo
 * runs, no polyfill needed). It already handles quoting, `export ` prefixes
 * and multi-line values correctly, and — like this function's contract —
 * never overwrites a variable that's already set. Calling `node
 * --env-file=.env` directly and skipping this function entirely also works;
 * this exists so `npx tsx scripts/atlas/<file>.ts` (no flag) still resolves
 * `.env` on its own.
 */
export function loadEnv(): void {
  if (envLoaded) return;
  envLoaded = true;

  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  process.loadEnvFile(envPath);
}

export interface AtlasScriptEnv {
  baseUrl: string;
  mgmtKey: string;
}

/** Loads `.env` and validates the two variables every script needs. Throws
 * with a clear message (never a silent `undefined` header) if either is
 * missing — the same fail-fast posture `sdk-management.md` recommends for
 * `ManagementConfigError`. */
export function requireAtlasEnv(): AtlasScriptEnv {
  loadEnv();

  const baseUrl = process.env.ATLAS_BASE_URL;
  const mgmtKey = process.env.ATLAS_MGMT_KEY;

  if (!baseUrl) {
    throw new Error(
      "ATLAS_BASE_URL is not set. Add it to marketing-web/.env before running scripts/atlas scripts.",
    );
  }
  if (!mgmtKey) {
    throw new Error(
      "ATLAS_MGMT_KEY is not set. Add it to marketing-web/.env before running scripts/atlas scripts. " +
        "This must be an atlas_mgmt_ key, never atlas_live_.",
    );
  }
  if (!mgmtKey.startsWith("atlas_mgmt_")) {
    throw new Error(
      `ATLAS_MGMT_KEY does not look like a management key (expected atlas_mgmt_... prefix, got "${mgmtKey.slice(0, 12)}..."). ` +
        "Using a delivery (atlas_live_) key here will fail every write.",
    );
  }

  return { baseUrl, mgmtKey };
}

/** Management SDK client for entry/page/media writes (create, publish, ...).
 * Schema (content types + fields) has no SDK surface — use the REST helpers
 * below for that. Async because the underlying module load is a dynamic
 * `import()` (see the comment on the `ManagementClient` type import above).
 *
 * Parameterized `Record<string, unknown>` — that's not an emptied-out
 * generic, it's the SDK's own default for `TSchema` (see
 * `createManagementClient<TSchema = Record<string, unknown>>` in
 * `@latellu/atlas-sdk/management`). A real schema type (`AtlasContentTypes`)
 * only exists once something runs `@latellu/atlas-cli`'s codegen against the
 * live workspace to produce it; nothing in this repo generates that file yet,
 * so there is no more specific type to plug in here. Once that codegen
 * exists, parameterize `createScriptManagementClient<AtlasContentTypes>()`
 * at the call site (the SDK supports that) rather than hardcoding it here. */
export async function createScriptManagementClient(): Promise<
  ManagementClient<Record<string, unknown>>
> {
  const { baseUrl, mgmtKey } = requireAtlasEnv();
  const { createManagementClient } = await import("@latellu/atlas-sdk/management");
  return createManagementClient({ url: baseUrl, token: mgmtKey });
}

// ---------------------------------------------------------------------------
// Schema REST helpers
//
// The management SDK has no schema methods (sdk-management.md: "No schema
// methods... Reach for MCP, or call /api/v1/manage/content-types directly").
// This is the one place in the whole project allowed to hand-roll fetch
// calls against the management plane — every other write goes through the
// SDK.
// ---------------------------------------------------------------------------

export type AtlasFieldType =
  | "text"
  | "textarea"
  | "richtext"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "image"
  | "relation"
  | "content_type_reference";

export interface ContentTypeFieldInput {
  name: string;
  label: string;
  field_type: AtlasFieldType;
  localizable: boolean;
  required: boolean;
  sort_order: number;
}

export interface ContentTypeField extends ContentTypeFieldInput {
  id: string;
  content_type_id: string;
}

export interface ContentTypeInput {
  name: string;
  /** The slug you ask for. The backend silently normalizes underscores to
   * hyphens (`page_hero` -> `page-hero`) — use `normalizeSlug()` /
   * `ensureContentType()`'s returned `contentType.slug` as the source of
   * truth for anything you do afterwards (looking the type up again,
   * building a `block_type_id` map, ...). Never assume the slug you sent
   * is the slug you get back. */
  slug: string;
  is_block: boolean;
  orderable?: boolean;
}

export interface ContentType {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  display_field: string;
  is_block: boolean;
  orderable: boolean;
  fields: ContentTypeField[] | null;
  created_at: string;
  updated_at: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  traceId?: string;
}

export class AtlasManageError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AtlasManageError";
    this.status = status;
    this.code = code;
  }
}

/** Backend normalization observed live: underscores become hyphens. Used to
 * predict the slug a create-content-type call will settle on, so idempotency
 * checks don't need to round-trip a failed create first. */
export function normalizeSlug(slug: string): string {
  return slug.replace(/_/g, "-");
}

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;
/** Upper bound on a single backoff sleep. A server is free to send
 * `Retry-After: 3600`; a seeding script must not silently hang for an hour —
 * better to burn the remaining attempts and fail loudly. */
const MAX_RETRY_DELAY_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Parses a `Retry-After` header into milliseconds, or `null` when the header
 * is absent/unparseable/non-positive. Both RFC 9110 forms are accepted:
 * delay-seconds (`120`) and an HTTP-date (`Wed, 21 Oct 2015 07:28:00 GMT`).
 *
 * Returning `null` — rather than a number — matters: `Number(null)` is `0`
 * and `Number.isFinite(0)` is `true`, so a naive parse turns a *missing*
 * header into a 0 ms backoff, i.e. an immediate tight retry against the very
 * endpoint that just rate-limited us. Callers fall back to exponential
 * backoff on `null`.
 */
function parseRetryAfterMs(header: string | null): number | null {
  if (header === null) return null;

  const trimmed = header.trim();
  if (trimmed === "") return null;

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) {
    return seconds > 0 ? seconds * 1000 : null;
  }

  const dateMs = Date.parse(trimmed);
  if (Number.isNaN(dateMs)) return null;

  const deltaMs = dateMs - Date.now();
  return deltaMs > 0 ? deltaMs : null;
}

/**
 * Core fetch against `/api/v1/manage`, shared by every helper below. Retries
 * on 429 (honoring `Retry-After` if present) and on transient network
 * failures/timeouts, with exponential backoff — the management SDK does this
 * for its own requests, this hand-rolled path previously did not. Returns
 * the raw `Response` plus its parsed envelope (or `null` if the body wasn't
 * valid JSON) rather than unwrapping `data`, so callers decide what an
 * absent/empty body means for their endpoint (see `mgmtFetchOptional` /
 * `mgmtFetchRequired` / `mgmtFetchVoid`).
 */
async function mgmtRequest<T>(
  env: AtlasScriptEnv,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<{ res: Response; envelope: ApiEnvelope<T> | null }> {
  let lastNetworkError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${env.baseUrl}/api/v1/manage${path}`, {
        method: init.method ?? "GET",
        headers: {
          "X-API-Key": env.mgmtKey,
          ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      // Network failure or timeout (AbortSignal.timeout rejects with a
      // DOMException named "TimeoutError"). Retry with backoff; on the last
      // attempt, surface it instead of hanging or swallowing it.
      lastNetworkError = error;
      if (attempt === MAX_RETRIES) {
        const message = error instanceof Error ? error.message : String(error);
        throw new AtlasManageError(
          `Atlas management request to ${path} failed after ${MAX_RETRIES + 1} attempts: ${message}`,
          0,
        );
      }
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
      continue;
    }

    if (res.status === 429 && attempt < MAX_RETRIES) {
      // Exponential backoff is the floor, never the ceiling: an absent or
      // unparseable `Retry-After` must not collapse the wait to 0 ms (see
      // `parseRetryAfterMs`), and a header asking for *less* than our own
      // backoff doesn't earn us a tighter retry loop either. A header asking
      // for more is honored, up to MAX_RETRY_DELAY_MS.
      const backoffMs = RETRY_BASE_DELAY_MS * 2 ** attempt;
      const retryAfterMs = parseRetryAfterMs(res.headers.get("Retry-After"));
      const delayMs = Math.min(Math.max(retryAfterMs ?? backoffMs, backoffMs), MAX_RETRY_DELAY_MS);
      await sleep(delayMs);
      continue;
    }

    const envelope = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
    return { res, envelope };
  }

  // Unreachable (the loop above always returns or throws), but keeps this an
  // honest non-`undefined`-returning function for TS.
  throw lastNetworkError instanceof Error
    ? lastNetworkError
    : new Error(`Atlas management request to ${path} failed`);
}

/** Throws `AtlasManageError` unless the response was a 2xx with a
 * `success: true` envelope. Narrows `envelope` to non-null on return. */
function assertMgmtOk<T>(
  res: Response,
  envelope: ApiEnvelope<T> | null,
): asserts envelope is ApiEnvelope<T> {
  if (!res.ok || !envelope || !envelope.success) {
    throw new AtlasManageError(
      envelope?.message ?? `Atlas management request failed (${res.status})`,
      res.status,
      envelope?.code,
    );
  }
}

/** For GET-style lookups where a 404 means "doesn't exist" (returns `null`)
 * and any 2xx success is expected to carry `data`. Unlike the old single
 * `mgmtFetch`, "not found" and "found but empty" can never be confused here:
 * a 2xx without `data` is a genuine backend error, not silently coerced into
 * `undefined as T`. */
async function mgmtFetchOptional<T>(env: AtlasScriptEnv, path: string): Promise<T | null> {
  const { res, envelope } = await mgmtRequest<T>(env, path);
  if (res.status === 404) return null;
  assertMgmtOk(res, envelope);
  if (envelope.data === undefined) {
    throw new AtlasManageError(
      `Atlas management response for ${path} was successful but had no data`,
      res.status,
      envelope.code,
    );
  }
  return envelope.data;
}

/** For writes whose success response always carries the created/updated
 * resource in `data`. Throws (rather than lying about `T`) if a 2xx comes
 * back without one. */
async function mgmtFetchRequired<T>(
  env: AtlasScriptEnv,
  path: string,
  init: { method?: string; body?: unknown },
): Promise<T> {
  const { res, envelope } = await mgmtRequest<T>(env, path, init);
  assertMgmtOk(res, envelope);
  if (envelope.data === undefined) {
    throw new AtlasManageError(
      `Atlas management response for ${path} was successful but had no data`,
      res.status,
      envelope.code,
    );
  }
  return envelope.data;
}

/** For writes whose success response carries no payload worth returning
 * (e.g. field creation) — the endpoint's `data` is intentionally ignored,
 * not coerced through `undefined as T`. */
async function mgmtFetchVoid(
  env: AtlasScriptEnv,
  path: string,
  init: { method?: string; body?: unknown },
): Promise<void> {
  const { res, envelope } = await mgmtRequest<unknown>(env, path, init);
  assertMgmtOk(res, envelope);
}

function isConflict(error: unknown): error is AtlasManageError {
  return error instanceof AtlasManageError && (error.status === 409 || error.code === "CONFLICT");
}

/** `GET /content-types/:slug` (the normalized slug — see `normalizeSlug`).
 * `null` if it doesn't exist yet. */
export async function getContentType(
  env: AtlasScriptEnv,
  slug: string,
): Promise<ContentType | null> {
  return mgmtFetchOptional<ContentType>(env, `/content-types/${normalizeSlug(slug)}`);
}

/** `POST /content-types`. Throws `AtlasManageError` (status 409) if the
 * normalized slug already exists — prefer `ensureContentType` for
 * idempotent callers. */
export async function createContentType(
  env: AtlasScriptEnv,
  input: ContentTypeInput,
): Promise<ContentType> {
  return mgmtFetchRequired<ContentType>(env, "/content-types", {
    method: "POST",
    body: input,
  });
}

/** `POST /content-types/:slug/fields`. Throws `AtlasManageError` (status
 * 409) if a field with this name already exists on the type — prefer
 * `ensureContentTypeField` for idempotent callers. The endpoint itself
 * doesn't echo the created field, so callers that need its id should
 * re-fetch via `getContentType`. */
export async function createContentTypeField(
  env: AtlasScriptEnv,
  contentTypeSlug: string,
  field: ContentTypeFieldInput,
): Promise<void> {
  await mgmtFetchVoid(env, `/content-types/${normalizeSlug(contentTypeSlug)}/fields`, {
    method: "POST",
    body: field,
  });
}

export interface EnsureResult<T> {
  value: T;
  created: boolean;
}

/**
 * Create-if-missing for a content type. Safe to call twice: a second run
 * finds the existing type (by normalized slug) and returns `created: false`
 * instead of erroring or duplicating it.
 */
export async function ensureContentType(
  env: AtlasScriptEnv,
  input: ContentTypeInput,
): Promise<EnsureResult<ContentType>> {
  const existing = await getContentType(env, input.slug);
  if (existing) return { value: existing, created: false };

  try {
    const created = await createContentType(env, input);
    return { value: created, created: true };
  } catch (error) {
    if (isConflict(error)) {
      const fetched = await getContentType(env, input.slug);
      if (fetched) return { value: fetched, created: false };
    }
    throw error;
  }
}

/** The field attributes that change how data is stored and read back, so a
 * mismatch between `schema.ts` and the live workspace is a real defect rather
 * than cosmetic drift. `label` and `sort_order` are deliberately excluded:
 * both are editable from the dashboard, neither changes the shape of the
 * value a seed script writes or a loader parses. */
const COMPARED_FIELD_ATTRS = ["field_type", "localizable", "required"] as const;

/**
 * Fails loudly when a live field disagrees with the spec in `schema.ts` on
 * any of `COMPARED_FIELD_ATTRS`.
 *
 * Why throwing is the only honest option: the management API has no
 * "update field" endpoint (see the route list in
 * `/api/v1/manage/content-types`), so this process *cannot* reconcile the
 * difference. Reporting `already exists` on a name match alone — as this
 * helper used to — would let `schema.ts` print a green summary while the
 * workspace kept the old field type, and the seed scripts then wrote
 * new-shaped data into it. A human has to migrate the field (or rename it in
 * `schema.ts`), so the script stops and says exactly what differs.
 */
function assertFieldMatches(
  contentTypeSlug: string,
  spec: ContentTypeFieldInput,
  live: ContentTypeField,
): void {
  const mismatches = COMPARED_FIELD_ATTRS.filter((attr) => live[attr] !== spec[attr]).map(
    (attr) => `${attr}: expected ${JSON.stringify(spec[attr])}, found ${JSON.stringify(live[attr])}`,
  );

  if (mismatches.length === 0) return;

  throw new AtlasManageError(
    `Schema drift on field "${normalizeSlug(contentTypeSlug)}.${spec.name}" — ` +
      `${mismatches.join("; ")}. The management API has no update-field endpoint, so this cannot be ` +
      "fixed by re-running the script: migrate the field in the dashboard (or rename it in " +
      "scripts/atlas/schema.ts and re-seed) before continuing.",
    409,
    "SCHEMA_DRIFT",
  );
}

/**
 * Create-if-missing for one field on an existing content type. `existing`
 * is that type's current `fields` (pass the array from `ensureContentType`'s
 * result, or a fresh `getContentType` call) so this doesn't issue a network
 * round-trip per field just to check.
 *
 * A field that already exists is not simply skipped: its `field_type`,
 * `localizable` and `required` are compared against `field` and any
 * difference throws (see `assertFieldMatches`).
 */
export async function ensureContentTypeField(
  env: AtlasScriptEnv,
  contentTypeSlug: string,
  field: ContentTypeFieldInput,
  existing: ContentTypeField[] | null,
): Promise<EnsureResult<void>> {
  const live = existing?.find((f) => f.name === field.name);
  if (live) {
    assertFieldMatches(contentTypeSlug, field, live);
    return { value: undefined, created: false };
  }

  try {
    await createContentTypeField(env, contentTypeSlug, field);
    return { value: undefined, created: true };
  } catch (error) {
    if (isConflict(error)) {
      // The field existed after all (a stale/absent `existing` array, or a
      // concurrent run). Re-read and hold it to the same comparison as the
      // fast path above, so drift can't slip through this branch either.
      const fetched = await getContentType(env, contentTypeSlug);
      const fetchedField = fetched?.fields?.find((f) => f.name === field.name);
      if (fetchedField) assertFieldMatches(contentTypeSlug, field, fetchedField);
      return { value: undefined, created: false };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Page upsert — the ONE idempotent write path every seed-*.ts uses
//
// Three properties of this backend shape the strategy below. All three were
// re-verified live against api-c24jp on 2026-08-20 with a throwaway slug
// (`zz-probe-st18`), not taken on trust:
//
//  1. `POST /pages` with an existing slug returns 409 — BUT uniqueness is a
//     check-then-insert in application code
//     (page/usecase/create_page.go#checkSlugUnique) over a NON-unique index
//     (migration 20260606161646: `CREATE INDEX ... ON pages(workspace_id,
//     slug)`, no UNIQUE). Two concurrent creates of the same slug can both
//     pass the check and leave two rows; `GET /pages/:slug` then returns
//     whichever one the query happens to pick, possibly the unpublished one.
//     So create-then-catch-409 is not a duplication-proof pattern here, it
//     just usually gets away with it.
//  2. `PUT /pages/:slug` on a missing slug returns a clean 404, and on an
//     existing one returns the page's current base state including `status`.
//     That makes update-first a complete existence probe on its own.
//  3. `PUT /pages/:slug` with an EMPTY body is a no-op on the deployed build
//     — but only there. The backend source in this repo
//     (page/usecase/update_page.go#updateBlocks) calls `deleteExistingBlocks`
//     BEFORE its `len(blocks) == 0` early return, i.e. that build would wipe
//     every block of the page being probed. An earlier version of these
//     scripts used exactly that empty-body probe as its "safe" existence
//     check.
//
// Hence: send the full desired page to `PUT` first and only `POST` on a 404.
// One round trip, no create-vs-409 race to lose, no window in which a probed
// page sits blockless, and no dependence on empty-body semantics that differ
// between the deployed backend and its own source.
// ---------------------------------------------------------------------------

/** The management client's `AtlasError` and this module's `AtlasManageError`
 * are different classes that both carry `.status`. Narrow structurally so
 * script code doesn't need the SDK's ESM-only dynamic import just to do an
 * `instanceof` check. */
function errorStatus(error: unknown): number | undefined {
  return error && typeof error === "object" ? (error as { status?: number }).status : undefined;
}

/** The one field of the page response this module reads back. The endpoint
 * returns the full page; only `status` is needed here, to decide whether
 * `publish` would be a guaranteed 400. */
interface PageBaseState {
  status?: string;
  [key: string]: unknown;
}

/**
 * Publishes `slug` unless it is already published.
 *
 * The backend only allows `draft`/`scheduled` -> `published`
 * (page/usecase/publish_page.go#validateStatusTransition) and rejects
 * anything else with a 400 ("page cannot be published from status
 * 'published'"), so a second seeding run would otherwise always fire a
 * request it knows will fail. `currentStatus` lets us skip that call; the 400
 * is still caught, in case the status changed underneath us. Any other
 * publish failure — including a 400 from, say, an `archived` page — is
 * rethrown.
 *
 * Skipping publish does not leave content unpublished: `PUT /pages/:slug`
 * never resets `status` (update_page.go doesn't touch it) and there is no
 * draft/published split for block data, so an update to an already published
 * page is live the moment it returns.
 *
 * @returns `true` if this call published the page, `false` if it was already
 * published.
 */
async function publishIfNeeded(
  client: ManagementClient<Record<string, unknown>>,
  slug: string,
  currentStatus: string | undefined,
): Promise<boolean> {
  if (currentStatus === "published") return false;

  try {
    await client.pages.publish(slug);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (errorStatus(error) === 400 && /cannot be published from status 'published'/.test(message)) {
      return false;
    }
    throw error;
  }
}

export interface PageUpsertResult {
  /** `true` when this run created the page, `false` when it already existed
   * and was updated in place. A second run must report `false`. */
  created: boolean;
  /** `true` when this run published the page, `false` when it was already
   * published. */
  published: boolean;
}

/**
 * Create-or-replace a page and leave it published — the single idempotent
 * write path for every seed-*.ts. Do not hand-roll this per script.
 *
 * `input` must be the COMPLETE desired page (`slug` plus whatever `seo` /
 * `seo_translations` / `blocks` belong on it), because the update path sends
 * everything but `slug` and the backend replaces the whole block list rather
 * than merging into it. Passing a partial page would delete the blocks it
 * omits.
 */
export async function ensurePublishedPage(
  client: ManagementClient<Record<string, unknown>>,
  input: CreatePageInput,
): Promise<PageUpsertResult> {
  const { slug, ...rest } = input;

  let existing: PageBaseState | null;
  try {
    existing = (await client.pages.update(slug, rest as UpdatePageInput)) as PageBaseState;
  } catch (error) {
    if (errorStatus(error) !== 404) throw error;
    existing = null;
    await client.pages.create(input);
  }

  const published = await publishIfNeeded(client, slug, existing?.status);

  return { created: existing === null, published };
}
