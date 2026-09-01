import "server-only";

import { cache } from "react";
import { getPageBlocks, reportUnexpectedContent } from "./client";
import {
  mapCompany,
  mapServiceFlow,
  mapUseCase,
  type CompanyContent,
  type ServiceFlowContent,
  type UseCaseContent,
} from "./pages-map";

/**
 * The blocks -> content mapping for "use-case"/"service-flow"/"company"
 * lives in `./pages-map` — a dependency-free module `pages-map.test.ts` can
 * actually import and exercise directly (no `server-only`, no bundler). This
 * file stays the thin server-only wrapper per page: fetch the page's blocks,
 * hand them to the pure mapping, dedupe the fetch per-request with React's
 * `cache()`.
 *
 * No fallback layer: when a page is unreachable or its shape doesn't match,
 * the loader throws — the route surfaces an error/404 instead of serving
 * stale `constants/copy.ts` content. See `./pages-map` for the mappings
 * themselves and their full rationale.
 */
export type { UseCaseContent, ServiceFlowContent, CompanyContent };

// ---------------------------------------------------------------------------
// use-case
// ---------------------------------------------------------------------------

async function fetchUseCase(): Promise<UseCaseContent> {
  const blocks = await getPageBlocks("use-case");
  if (!blocks) {
    throw new Error(
      '[cms] getUseCase("use-case"): page data unavailable (Atlas unreachable, not configured, or page missing) — no fallback content exists; the page is unavailable.',
    );
  }
  const mapped = mapUseCase(blocks, reportUnexpectedContent);
  if (!mapped) {
    throw new Error(
      '[cms] getUseCase("use-case"): page data did not match the expected block shape — no fallback content exists; the page is unavailable.',
    );
  }
  return mapped;
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getUseCase()` on the same request triggers at most one fetch. */
export const getUseCase = cache(fetchUseCase);

// ---------------------------------------------------------------------------
// service-flow
// ---------------------------------------------------------------------------

async function fetchServiceFlow(): Promise<ServiceFlowContent> {
  const blocks = await getPageBlocks("service-flow");
  if (!blocks) {
    throw new Error(
      '[cms] getServiceFlow("service-flow"): page data unavailable (Atlas unreachable, not configured, or page missing) — no fallback content exists; the page is unavailable.',
    );
  }
  const mapped = mapServiceFlow(blocks, reportUnexpectedContent);
  if (!mapped) {
    throw new Error(
      '[cms] getServiceFlow("service-flow"): page data did not match the expected block shape — no fallback content exists; the page is unavailable.',
    );
  }
  return mapped;
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getServiceFlow()` on the same request triggers at most one fetch. */
export const getServiceFlow = cache(fetchServiceFlow);

// ---------------------------------------------------------------------------
// company
// ---------------------------------------------------------------------------

async function fetchCompany(): Promise<CompanyContent> {
  const blocks = await getPageBlocks("company");
  if (!blocks) {
    throw new Error(
      '[cms] getCompany("company"): page data unavailable (Atlas unreachable, not configured, or page missing) — no fallback content exists; the page is unavailable.',
    );
  }
  const mapped = mapCompany(blocks, reportUnexpectedContent);
  if (!mapped) {
    throw new Error(
      '[cms] getCompany("company"): page data did not match the expected block shape — no fallback content exists; the page is unavailable.',
    );
  }
  return mapped;
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getCompany()` on the same request triggers at most one fetch. */
export const getCompany = cache(fetchCompany);