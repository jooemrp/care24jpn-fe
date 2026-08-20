import "server-only";

import { cache } from "react";
import { getPageBlocks, reportUnexpectedContent } from "./client";
import { mapBlocksByType, pickBi, pickJa, pickLines, type BlockTypeList } from "./fields";
import type { Bilingual, CmsBlock } from "./types";
import {
  useCase as fallbackUseCase,
  serviceFlow as fallbackServiceFlow,
  company as fallbackCompany,
} from "@/constants/copy";

type UseCase = typeof fallbackUseCase;
type UseCaseItem = UseCase["cases"][number];
type ServiceFlow = typeof fallbackServiceFlow;
type ServiceFlowStep = ServiceFlow["steps"][number];
type Company = typeof fallbackCompany;
type CompanyRow = Company["rows"][number];

// ---------------------------------------------------------------------------
// use-case (page_hero + use_case_item xN)
// ---------------------------------------------------------------------------

const EMPTY: Bilingual = { ja: "", en: "" };

const USE_CASE_TYPES = ["page-hero", "use-case-item"] as const satisfies BlockTypeList;

function mapUseCase(blocks: CmsBlock[]): UseCase | null {
  const groups = mapBlocksByType("use-case", blocks, USE_CASE_TYPES, reportUnexpectedContent);
  if (!groups) return null;

  const [heroBlock] = groups["page-hero"];
  const itemBlocks = groups["use-case-item"];
  const F = fallbackUseCase;

  const hero: UseCase["hero"] = {
    heading: pickBi(heroBlock.data, "heading", F.hero.heading),
    body: pickBi(heroBlock.data, "body", F.hero.body),
  };

  // `F.cases[i]` is indexed defensively: a 5th case added in the dashboard now
  // renders instead of reverting the page, and has no constants counterpart.
  const cases: UseCaseItem[] = itemBlocks.map((block, i) => ({
    slug: pickJa(block.data, "slug", F.cases[i]?.slug ?? ""),
    title: pickBi(block.data, "title", F.cases[i]?.title ?? EMPTY),
    body: pickBi(block.data, "body", F.cases[i]?.body ?? EMPTY),
    detail: pickBi(block.data, "detail", F.cases[i]?.detail ?? EMPTY),
    highlights: pickLines(block.data, "highlights", F.cases[i]?.highlights ?? []),
    imageAlt: pickBi(block.data, "image_alt", F.cases[i]?.imageAlt ?? EMPTY),
  }));

  return { hero, cases };
}

async function fetchUseCase(): Promise<UseCase> {
  const blocks = await getPageBlocks("use-case");
  if (!blocks) return fallbackUseCase;
  return mapUseCase(blocks) ?? fallbackUseCase;
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getUseCase()` on the same request triggers at most one fetch. */
export const getUseCase = cache(fetchUseCase);

// ---------------------------------------------------------------------------
// service-flow (page_hero + service_flow_step xN)
// ---------------------------------------------------------------------------

const SERVICE_FLOW_TYPES = ["page-hero", "service-flow-step"] as const satisfies BlockTypeList;

function mapServiceFlow(blocks: CmsBlock[]): ServiceFlow | null {
  const groups = mapBlocksByType(
    "service-flow",
    blocks,
    SERVICE_FLOW_TYPES,
    reportUnexpectedContent,
  );
  if (!groups) return null;

  const [heroBlock] = groups["page-hero"];
  const stepBlocks = groups["service-flow-step"];
  const F = fallbackServiceFlow;

  const hero: ServiceFlow["hero"] = {
    heading: pickBi(heroBlock.data, "heading", F.hero.heading),
    body: pickBi(heroBlock.data, "body", F.hero.body),
  };

  const steps: ServiceFlowStep[] = stepBlocks.map((block, i) => ({
    title: pickBi(block.data, "title", F.steps[i]?.title ?? EMPTY),
    body: pickBi(block.data, "body", F.steps[i]?.body ?? EMPTY),
  }));

  return { hero, steps };
}

async function fetchServiceFlow(): Promise<ServiceFlow> {
  const blocks = await getPageBlocks("service-flow");
  if (!blocks) return fallbackServiceFlow;
  return mapServiceFlow(blocks) ?? fallbackServiceFlow;
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getServiceFlow()` on the same request triggers at most one fetch. */
export const getServiceFlow = cache(fetchServiceFlow);

// ---------------------------------------------------------------------------
// company (page_hero + company_row xN)
// ---------------------------------------------------------------------------

/** The company page's `page-hero` block carries only `heading` — the seed
 * writes no `body` for it (verified against the live workspace). That is no
 * longer something this list has to state: a block is matched by its type
 * slug, not by which fields it happens to carry, and `pickBi` already covers
 * an absent field per call site. */
const COMPANY_TYPES = ["page-hero", "company-row"] as const satisfies BlockTypeList;

function mapCompany(blocks: CmsBlock[]): Company | null {
  const groups = mapBlocksByType("company", blocks, COMPANY_TYPES, reportUnexpectedContent);
  if (!groups) return null;

  const [heroBlock] = groups["page-hero"];
  const rowBlocks = groups["company-row"];
  const F = fallbackCompany;

  const heading = pickBi(heroBlock.data, "heading", F.heading);

  const rows: CompanyRow[] = rowBlocks.map((block, i) => ({
    label: pickBi(block.data, "label", F.rows[i]?.label ?? EMPTY),
    value: pickBi(block.data, "value", F.rows[i]?.value ?? EMPTY),
  }));

  return { heading, rows };
}

async function fetchCompany(): Promise<Company> {
  const blocks = await getPageBlocks("company");
  if (!blocks) return fallbackCompany;
  return mapCompany(blocks) ?? fallbackCompany;
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getCompany()` on the same request triggers at most one fetch. */
export const getCompany = cache(fetchCompany);
