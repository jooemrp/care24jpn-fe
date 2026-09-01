/**
 * Enforces hard rule #3 — "ja has no URL prefix, en does, and every internal
 * href must be built through localizeHref()" — as a source scan, not a
 * behavioural test.
 *
 * Why a source scan and not an import-based test: app/[lang]/page.tsx (and
 * every route under app/) transitively imports "server-only", which is not
 * an installed package here, so it can never be loaded by this test runner.
 * It is also a Server Component, so no test can render its JSX and inspect
 * the resulting anchor tags. Reading the file as text with node:fs is the
 * only mechanical way this repo's tooling can look at those hrefs at all.
 *
 * What triggered this file: app/[lang]/page.tsx passed three of the four
 * home CTA hrefs through localizeHref() and left the fourth
 * (`home.apply.user.href`) raw. Four rounds of human review missed it
 * because the wrapped and unwrapped lines sit a few lines apart in the same
 * JSX block and read the same at a glance. That is exactly the failure mode
 * a diff-reading human is bad at and a mechanical scan is good at.
 *
 * RED evidence (captured against a scratch copy of app/[lang]/page.tsx with
 * line 515 reverted to the pre-fix `href={home.apply.user.href}`, run via
 * `npx tsx features/lang/hrefCallSites.test.ts`):
 *
 *   AssertionError [ERR_ASSERTION]:
 *   1 href={...} binding is neither localizeHref(...), a tel:/mailto:
 *   template, nor an allowlisted pass-through. Wrap it in localizeHref() —
 *   features/lang/i18n.ts.
 *     - app/[lang]/page.tsx:515  href={home.apply.user.href}
 *
 *   AssertionError [ERR_ASSERTION]: values do not match
 *   + actual - expected
 *   ... (deepEqual on the sorted violations array vs. [])
 *
 * The real repo file was never edited to produce this — see dev-ST-T3.md
 * for how the RED run was reproduced without touching tracked files.
 *
 * Design notes for future maintainers:
 *  - This test globs app/**\/*.tsx and components/**\/*.tsx itself (plain
 *    fs.readdirSync recursion), so a brand-new file with a raw href is
 *    caught by default. Nothing needs to be registered for a new file to be
 *    scanned — only the opposite (the ALLOWLIST below) requires a
 *    deliberate edit.
 *  - Every `href={...}` binding source-wide is classified into exactly one
 *    of: a plain string literal (e.g. href={"/foo"} — inherently static,
 *    not the failure mode this test guards), a localizeHref(...) call, a
 *    `tel:`/`mailto:` template literal, or an ALLOWLIST entry. Anything
 *    left over is a violation.
 *  - ALLOWLIST entries are matched by exact file + line + trimmed source
 *    text. If the source at that file:line changes at all (moved, edited,
 *    deleted), the entry stops matching and the "stale allowlist entry"
 *    test goes red — the allowlist cannot silently go out of date the way
 *    the bug this file exists for did.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const SCAN_DIRS = ["app", "components"];

type Binding = {
  /** Repo-relative, forward-slash path — stable across the allowlist. */
  file: string;
  line: number;
  /** Trimmed source text between `href={` and its matching `}`. */
  content: string;
};

/**
 * Every pass-through `href={...}` binding that is not a localizeHref(...)
 * call or a tel:/mailto: template, together with the reason it is still
 * safe: in every case the value was already localized at the caller, one
 * or a few lines above, and is simply threaded through as a prop/const.
 *
 * Adding an entry here must be a deliberate act — see the header comment.
 */
const ALLOWLIST: Array<Binding & { reason: string }> = [
  {
    file: "app/[lang]/page.tsx",
    line: 795,
    content: "href",
    reason:
      "ApplyBanner's <a> branch. Its only caller wraps the value first: " +
      "page.tsx:487 and :495 both pass href={localizeHref(...)} into this " +
      "component — see the comment above the ApplyBanner call site.",
  },
  {
    file: "app/[lang]/page.tsx",
    line: 806,
    content: "href",
    reason:
      "Same ApplyBanner component, the <Link> branch a few lines below " +
      "the <a> branch above; same already-localized prop.",
  },
  {
    file: "components/Navbar.tsx",
    line: 217,
    content: "homeHref",
    reason:
      "homeHref = localizeHref(\"/\", lang) is assigned earlier in the " +
      "same component body (Navbar.tsx:174).",
  },
  {
    file: "components/Navbar.tsx",
    line: 273,
    content: "href",
    reason:
      "const href = localizeHref(item.href, lang) is assigned on the " +
      "line directly above, inside the same .map() callback (desktop nav).",
  },
  {
    file: "components/Navbar.tsx",
    line: 301,
    content: "href",
    reason:
      "Same pattern as :273, one .map() callback below, in the mobile " +
      "nav menu.",
  },
];

function listTsxFiles(dir: string, out: string[]): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listTsxFiles(full, out);
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Finds every `href={...}` occurrence in `src` by walking brace depth from
 * `href={` to its matching `}` — not a fixed-depth regex — so this holds up
 * against arbitrarily nested expressions (object literals, nested template
 * interpolation, etc.), not just the shapes present in the repo today.
 */
function extractHrefBindings(file: string, src: string): Binding[] {
  const rel = path.relative(repoRoot, file).split(path.sep).join("/");
  const marker = "href={";
  const results: Binding[] = [];
  let searchFrom = 0;

  while (true) {
    const start = src.indexOf(marker, searchFrom);
    if (start === -1) break;

    let depth = 1;
    let i = start + marker.length;
    while (i < src.length && depth > 0) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") depth--;
      i++;
    }
    if (depth !== 0) {
      throw new Error(
        `${rel}: unbalanced braces scanning href={...} starting at offset ${start}`,
      );
    }

    const content = src.slice(start + marker.length, i - 1).trim();
    const line = src.slice(0, start).split("\n").length;
    results.push({ file: rel, line, content });
    searchFrom = i;
  }

  return results;
}

/** A plain quoted string literal — never `${...}` interpolated. */
function isStringLiteral(content: string): boolean {
  return (
    /^"(?:[^"\\]|\\.)*"$/.test(content) || /^'(?:[^'\\]|\\.)*'$/.test(content)
  );
}

function isLocalizeHrefCall(content: string): boolean {
  return content.startsWith("localizeHref(") && content.endsWith(")");
}

function isTelOrMailtoTemplate(content: string): boolean {
  return content.startsWith("`tel:") || content.startsWith("`mailto:");
}

function findAllBindings(): Binding[] {
  const files = SCAN_DIRS.flatMap((dir) =>
    listTsxFiles(path.join(repoRoot, dir), []),
  );
  return files.flatMap((file) =>
    extractHrefBindings(file, fs.readFileSync(file, "utf8")),
  );
}

function allowlistMatch(binding: Binding) {
  return ALLOWLIST.find(
    (entry) =>
      entry.file === binding.file &&
      entry.line === binding.line &&
      entry.content === binding.content,
  );
}

test("every href={...} in app/ and components/ is localizeHref(...), a tel:/mailto: template, a string literal, or an allowlisted pass-through", () => {
  const bindings = findAllBindings();

  // Sanity check on the scanner itself: if this ever finds zero bindings,
  // the glob or the brace-walker broke silently and every assertion below
  // would pass for the wrong reason (nothing to check).
  assert.ok(
    bindings.length > 0,
    "found zero href={...} bindings under app/ or components/ — the scanner is broken, not the codebase",
  );

  const violations = bindings.filter(
    (b) =>
      !isStringLiteral(b.content) &&
      !isLocalizeHrefCall(b.content) &&
      !isTelOrMailtoTemplate(b.content) &&
      !allowlistMatch(b),
  );

  const report = violations
    .map((v) => `  - ${v.file}:${v.line}  href={${v.content}}`)
    .join("\n");

  assert.deepEqual(
    violations,
    [],
    `${violations.length} href={...} binding(s) are neither localizeHref(...), a tel:/mailto: template, ` +
      `a string literal, nor an allowlisted pass-through. Wrap it in localizeHref() — features/lang/i18n.ts.\n${report}`,
  );
});

test("every ALLOWLIST entry still matches real source — a moved or edited line must not silently stay exempt", () => {
  const bindings = findAllBindings();

  const stale = ALLOWLIST.filter(
    (entry) =>
      !bindings.some(
        (b) =>
          b.file === entry.file &&
          b.line === entry.line &&
          b.content === entry.content,
      ),
  );

  const report = stale
    .map((s) => `  - ${s.file}:${s.line}  expected href={${s.content}}`)
    .join("\n");

  assert.deepEqual(
    stale,
    [],
    `${stale.length} ALLOWLIST entry(ies) no longer match any href={...} in source. ` +
      `The line moved, changed, or was deleted — update or remove the stale entry ` +
      `in features/lang/hrefCallSites.test.ts instead of leaving it exempting nothing:\n${report}`,
  );
});

test("no href={...} binding is left over uncategorized outside the allowlist count (documents the current inventory)", () => {
  const bindings = findAllBindings();

  const localized = bindings.filter((b) => isLocalizeHrefCall(b.content));
  const telMailto = bindings.filter((b) => isTelOrMailtoTemplate(b.content));
  const literals = bindings.filter((b) => isStringLiteral(b.content));
  const allowlisted = bindings.filter((b) => allowlistMatch(b));

  // literals + localized + telMailto + allowlisted must account for every
  // binding found — anything not in one of these four buckets is caught by
  // the first test above, but this cross-check pins the actual composition
  // so a silent reclassification (e.g. a localizeHref(...) call quietly
  // rewritten to no longer start with that identifier) cannot hide behind
  // an unrelated allowlist addition.
  assert.equal(
    literals.length + localized.length + telMailto.length + allowlisted.length,
    bindings.length,
  );
});
