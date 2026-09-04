import assert from "node:assert/strict";
import { test } from "node:test";
import type * as ResultsModule from "./results.ts";
import type { RawPageResponse } from "./types";

const resultsPath = "./results" + ".ts";

async function main(): Promise<void> {
  const { toPageBlocksResult, toPageMetaResult } =
    (await import(resultsPath)) as typeof ResultsModule;

  const rawPage: RawPageResponse = {
    page: {
      id: "page-company",
      slug: "company",
      status: "published",
      seo: { title: "運営会社" },
    },
    blocks: [
      {
        id: "block-hero",
        block_type_id: "type-hero",
        type: "page-hero",
        parent_id: null,
        position: 0,
        data: JSON.stringify({ heading: "運営会社" }),
      },
    ],
    block_translations: [
      {
        id: "translation-hero",
        block_id: "block-hero",
        locale: "en",
        data: JSON.stringify({ heading: "Operating Company" }),
      },
    ],
  };

  test("strict page results preserve bilingual CMS data", () => {
    const result = toPageBlocksResult({
      success: true,
      data: rawPage,
      traceId: "trace-cms",
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data[0]?.data.heading, {
        ja: "運営会社",
        en: "Operating Company",
      });
      assert.equal(result.traceId, "trace-cms");
    }
  });

  test("strict page results keep upstream failures instead of turning them into fallback data", () => {
    const failure = {
      success: false as const,
      error: {
        code: "CMS_TIMEOUT",
        message: "CMS request timed out.",
        status: 504,
        traceId: "trace-timeout",
      },
    };

    const result = toPageBlocksResult(failure);

    assert.deepEqual(result, failure);
  });

  test("malformed shaped data becomes an explicit strict result error", () => {
    const result = toPageBlocksResult({
      success: true,
      data: { blocks: "bad" } as unknown as RawPageResponse,
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "CMS_INVALID_PAYLOAD");
    }
  });

  test("metadata results require a page record", () => {
    const result = toPageMetaResult({
      success: true,
      data: { blocks: [] },
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "CMS_INVALID_PAYLOAD");
    }
  });
}

void main();
