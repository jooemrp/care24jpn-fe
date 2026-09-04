import "server-only";

import { cache } from "react";
import { unwrap } from "@/lib/api";
import { getPageBlocksStrict } from "./client";
import { mapCompany, mapServiceFlow, mapUseCase, type UseCaseContent } from "./pages-map";
import type { CompanyContent, ServiceFlowContent } from "./pages-map";

/**
 * The blocks -> content mapping for "use-case"/"service-flow"/"company"
 * lives in `./pages-map` — a dependency-free module `pages-map.test.ts` can
 * actually import and exercise directly (no `server-only`, no bundler). This
 * file stays the thin server-only wrapper per page: fetch the page's blocks,
 * hand them to the pure mapping, and let typed CMS failures propagate when
 * Atlas is unreachable or the shape does not match. React's `cache()` dedupes
 * each fetch per request. See `./pages-map` for the mappings themselves.
 */
export type { UseCaseContent };

// ---------------------------------------------------------------------------
// use-case
// ---------------------------------------------------------------------------

async function fetchUseCase(): Promise<UseCaseContent> {
  return mapUseCase(unwrap(await getPageBlocksStrict("use-case")));
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getUseCase()` on the same request triggers at most one fetch. */
export const getUseCaseContent = cache(fetchUseCase);

// ---------------------------------------------------------------------------
// service-flow
// ---------------------------------------------------------------------------

async function fetchServiceFlow(): Promise<ServiceFlowContent> {
  return mapServiceFlow(unwrap(await getPageBlocksStrict("service-flow")));
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getServiceFlow()` on the same request triggers at most one fetch. */
export const getServiceFlowContent = cache(fetchServiceFlow);

// ---------------------------------------------------------------------------
// company
// ---------------------------------------------------------------------------

async function fetchCompany(): Promise<CompanyContent> {
  return mapCompany(unwrap(await getPageBlocksStrict("company")));
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getCompany()` on the same request triggers at most one fetch. */
export const getCompanyContent = cache(fetchCompany);
