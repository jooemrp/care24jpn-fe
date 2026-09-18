/**
 * Adds the query-state labels to the already-published `site` page without
 * replaying the full seed-site payload.
 *
 * The live workspace contains intentional dashboard edits (extra nav items,
 * CTA href, and footer text), so running seed-site.ts here would overwrite
 * them. This patch reads the current published page through the delivery API,
 * changes only the four new `site-ui-labels` fields, and sends the complete
 * current block list back with optimistic locking. SEO is omitted from the
 * update body and is therefore left untouched.
 *
 * Usage: npx tsx scripts/atlas/patch-site-query-states.ts
 */
import { cta, queryStates } from "../../constants/copy";
import {
  createScriptManagementClient,
  loadEnv,
  requireAtlasEnv,
} from "./lib";

const PAGE_SLUG = "site";
const QUERY_FIELDS = ["query_loading", "query_error", "query_retry", "query_empty"] as const;

type RawBlock = {
  id: string;
  block_type_id: string;
  position: number;
  data: string | Record<string, unknown>;
  type: string;
};

type RawTranslation = {
  block_id: string;
  locale: string;
  data: string | Record<string, unknown>;
};

type RawPageResponse = {
  page?: { updated_at?: string; status?: string };
  blocks?: RawBlock[];
  block_translations?: RawTranslation[];
};

function parseObject(value: string | Record<string, unknown> | undefined): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object") return { ...value };
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Atlas returned a non-object block payload.");
  }
  return { ...(parsed as Record<string, unknown>) };
}

async function fetchPublishedSite(): Promise<RawPageResponse> {
  loadEnv();
  const env = requireAtlasEnv();
  const deliveryKey = process.env.ATLAS_API_KEY;
  if (!deliveryKey) {
    throw new Error("ATLAS_API_KEY is required for the read-before-write step.");
  }

  const response = await fetch(`${env.baseUrl}/api/v1/public/pages/${PAGE_SLUG}`, {
    headers: { "X-API-Key": deliveryKey },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`GET /api/v1/public/pages/${PAGE_SLUG} -> HTTP ${response.status}`);
  }

  const envelope = (await response.json()) as { success?: boolean; data?: RawPageResponse };
  if (!envelope.success || !envelope.data?.page || !envelope.data.blocks) {
    throw new Error("Atlas returned an incomplete published site page.");
  }
  return envelope.data;
}

function buildPreservedBlocks(page: RawPageResponse) {
  const blocks = page.blocks ?? [];
  const translations = new Map(
    (page.block_translations ?? [])
      .filter((row) => row.locale === "en")
      .map((row) => [row.block_id, parseObject(row.data)]),
  );
  const uiBlocks = blocks.filter((block) => block.type === "site-ui-labels");
  if (uiBlocks.length !== 1) {
    throw new Error(`Expected exactly one site-ui-labels block, found ${uiBlocks.length}.`);
  }

  return blocks.map((block) => {
    const data = parseObject(block.data);
    const enData = translations.get(block.id);
    if (block.type === "site-cta") {
      Object.assign(data, {
        contact: cta.contact.ja,
        sticky_phone_label: cta.stickyPhoneLabel.ja,
        sticky_request_label: cta.stickyRequestLabel.ja,
      });
      if (enData) {
        Object.assign(enData, {
          contact: cta.contact.en,
          sticky_phone_label: cta.stickyPhoneLabel.en,
          sticky_request_label: cta.stickyRequestLabel.en,
        });
      }
    }
    if (block.type === "site-ui-labels") {
      Object.assign(data, {
        query_loading: queryStates.loading.ja,
        query_error: queryStates.error.ja,
        query_retry: queryStates.retry.ja,
        query_empty: queryStates.empty.ja,
      });
      if (enData) {
        Object.assign(enData, {
          query_loading: queryStates.loading.en,
          query_error: queryStates.error.en,
          query_retry: queryStates.retry.en,
          query_empty: queryStates.empty.en,
        });
      }
    }

    return {
      block_type_id: block.block_type_id,
      parent_id: null,
      position: block.position,
      data,
      ...(enData ? { translations: { en: { data: enData } } } : {}),
    };
  });
}

async function main(): Promise<void> {
  const page = await fetchPublishedSite();
  const updatedAt = page.page?.updated_at;
  if (!updatedAt) throw new Error("Published site page has no updated_at for optimistic locking.");

  const blocks = buildPreservedBlocks(page);
  // The live page update can exceed the SDK's default 10s timeout while Atlas
  // rewrites all preserved blocks; keep the same SDK path with a bounded,
  // explicit longer timeout instead of issuing a second untracked REST write.
  const client = await createScriptManagementClient(120_000);
  await client.pages.update(PAGE_SLUG, { updatedAt, blocks });
  console.log(`updated page/${PAGE_SLUG} query fields: ${QUERY_FIELDS.join(", ")}`);
  console.log("preserved all live blocks and omitted SEO from the update body");
}

main().catch((error) => {
  console.error("[atlas:patch-site-query-states] failed:", error);
  process.exitCode = 1;
});
