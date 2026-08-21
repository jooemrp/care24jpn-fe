import "server-only";

import { cache } from "react";
import { getPageBlocks, reportUnexpectedContent } from "./client";
import {
  mapCompany,
  mapServiceFlow,
  mapUseCase,
  FALLBACK_USE_CASE,
  type UseCaseContent,
} from "./pages-map";
import { serviceFlow as fallbackServiceFlow, company as fallbackCompany } from "@/constants/copy";

/**
 * The blocks -> content mapping for "use-case"/"service-flow"/"company"
 * lives in `./pages-map` — a dependency-free module `pages-map.test.ts` can
 * actually import and exercise directly (no `server-only`, no bundler). This
 * file stays the thin server-only wrapper per page: fetch the page's blocks,
 * hand them to the pure mapping, fall back to `constants/copy.ts` when Atlas
 * is unreachable or the shape doesn't match, and dedupe the fetch per-request
 * with React's `cache()`. See `./pages-map` for the mappings themselves and
 * their full rationale.
 */
export type { UseCaseContent };

// ---------------------------------------------------------------------------
// use-case
// ---------------------------------------------------------------------------

async function fetchUseCase(): Promise<UseCaseContent> {
  const blocks = await getPageBlocks("use-case");
  if (!blocks) return FALLBACK_USE_CASE;
  return mapUseCase(blocks, reportUnexpectedContent) ?? FALLBACK_USE_CASE;
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getUseCase()` on the same request triggers at most one fetch. */
export const getUseCase = cache(fetchUseCase);

// ---------------------------------------------------------------------------
// service-flow
// ---------------------------------------------------------------------------

async function fetchServiceFlow(): Promise<typeof fallbackServiceFlow> {
  const blocks = await getPageBlocks("service-flow");
  if (!blocks) return fallbackServiceFlow;
  return mapServiceFlow(blocks, reportUnexpectedContent) ?? fallbackServiceFlow;
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getServiceFlow()` on the same request triggers at most one fetch. */
export const getServiceFlow = cache(fetchServiceFlow);

// ---------------------------------------------------------------------------
// company
// ---------------------------------------------------------------------------

async function fetchCompany(): Promise<typeof fallbackCompany> {
  const blocks = await getPageBlocks("company");
  if (!blocks) return fallbackCompany;
  return mapCompany(blocks, reportUnexpectedContent) ?? fallbackCompany;
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getCompany()` on the same request triggers at most one fetch. */
export const getCompany = cache(fetchCompany);
