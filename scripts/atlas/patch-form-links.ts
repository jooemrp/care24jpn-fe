/**
 * Client request (Oct 2026): point the apply buttons at the new Google Forms and
 * restore the missing pricing cancellation-policy link.
 *
 *   home/home-hero   cta_primary_href -> Users form
 *   home/home-apply  user_href        -> Users form
 *   home/home-apply  staff_href       -> Care Supporters form
 *   pricing/pricing-meta cancellation_href -> /cancellation-policy
 *     (the field was absent in Atlas, so /pricing rendered a
 *      `[cms-field-error: rates.pricing.cancellationHref ...]` marker)
 *
 * `home-apply.consult_href` is not read by any UI code and is left alone.
 * Re-submits each page's preserved block list with optimistic locking.
 *
 * Usage: npx tsx scripts/atlas/patch-form-links.ts
 */
import {
  createScriptManagementClient,
  loadEnv,
  requireAtlasEnv,
} from "./lib";

const USERS_FORM = "https://forms.gle/tgazJDZiepMxVDMBA";
const SUPPORTERS_FORM = "https://forms.gle/hfVxRr2LmAFuGySh6";

const TARGETS: {
  page: string;
  blockType: string;
  fields: Record<string, string>;
}[] = [
  {
    page: "home",
    blockType: "home-hero",
    fields: { cta_primary_href: USERS_FORM },
  },
  {
    page: "home",
    blockType: "home-apply",
    fields: { user_href: USERS_FORM, staff_href: SUPPORTERS_FORM },
  },
  {
    page: "pricing",
    blockType: "pricing-meta",
    fields: { cancellation_href: "/cancellation-policy" },
  },
];

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

async function fetchPublishedPage(slug: string): Promise<RawPageResponse> {
  const env = requireAtlasEnv();
  const deliveryKey = process.env.ATLAS_API_KEY;
  if (!deliveryKey) {
    throw new Error("ATLAS_API_KEY is required for the read-before-write step.");
  }

  const response = await fetch(`${env.baseUrl}/api/v1/public/pages/${slug}`, {
    headers: { "X-API-Key": deliveryKey },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`GET /api/v1/public/pages/${slug} -> HTTP ${response.status}`);
  }

  const envelope = (await response.json()) as { success?: boolean; data?: RawPageResponse };
  if (!envelope.success || !envelope.data?.page || !envelope.data.blocks) {
    throw new Error(`Atlas returned an incomplete published page (${slug}).`);
  }
  return envelope.data;
}

async function main(): Promise<void> {
  loadEnv();
  const client = await createScriptManagementClient(120_000);

  // One update per page: two targets on `home` must land in a single
  // optimistic-locked write, not two writes racing on the same updated_at.
  const pages = [...new Set(TARGETS.map((target) => target.page))];

  for (const slug of pages) {
    const targets = TARGETS.filter((target) => target.page === slug);
    const page = await fetchPublishedPage(slug);
    const updatedAt = page.page?.updated_at;
    if (!updatedAt) {
      throw new Error(`Page ${slug} has no updated_at for optimistic locking.`);
    }

    const translations = new Map(
      (page.block_translations ?? [])
        .filter((row) => row.locale === "en")
        .map((row) => [row.block_id, parseObject(row.data)]),
    );

    for (const target of targets) {
      const hits = (page.blocks ?? []).filter((block) => block.type === target.blockType);
      if (hits.length !== 1) {
        throw new Error(
          `Expected exactly one ${target.blockType} block on ${slug}, found ${hits.length}.`,
        );
      }
    }

    const blocks = (page.blocks ?? []).map((block) => {
      const data = parseObject(block.data);
      const enData = translations.get(block.id);
      for (const target of targets) {
        if (block.type === target.blockType) Object.assign(data, target.fields);
      }
      return {
        block_type_id: block.block_type_id,
        parent_id: null,
        position: block.position,
        data,
        ...(enData ? { translations: { en: { data: enData } } } : {}),
      };
    });

    await client.pages.update(slug, { updatedAt, blocks });
    for (const target of targets) {
      console.log(
        `updated ${slug}/${target.blockType}: ${Object.keys(target.fields).join(", ")}`,
      );
    }
  }

  console.log("preserved all live blocks and omitted SEO from every update body");
}

main().catch((error) => {
  console.error("[atlas:patch-form-links] failed:", error);
  process.exitCode = 1;
});
