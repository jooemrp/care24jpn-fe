import assert from "node:assert/strict";
import { test } from "node:test";
import type { CmsBlock } from "./types";

const siteMapPath = "./site-map" + ".ts";

type SiteManifestModule = {
  mapSiteManifest: (blocks: CmsBlock[]) => {
    name: string;
    description: string;
  };
};

function block(type: string, position: number, data: Record<string, unknown>): CmsBlock {
  return {
    id: `${type}-${position}`,
    type,
    blockTypeId: `uuid-of-${type}`,
    parentId: null,
    position,
    data,
  };
}

async function main(): Promise<void> {
  const { mapSiteManifest } = (await import(siteMapPath)) as unknown as SiteManifestModule;

  test("manifest projection ignores unrelated missing footer fields", () => {
    assert.deepEqual(
      mapSiteManifest([
        block("site-brand", 0, {
          name: "Care 24 Japan",
          tagline: { ja: "ご自宅で、心安らぐケアを", en: "" },
        }),
        block("site-footer", 1, {
          legal: "© Care 24 Japan",
        }),
      ]),
      {
        name: "Care 24 Japan",
        description: "ご自宅で、心安らぐケアを",
      },
    );
  });

  test("manifest projection reports the exact missing required CMS field", () => {
    assert.throws(
      () =>
        mapSiteManifest([
          block("site-brand", 0, {
            name: "Care 24 Japan",
          }),
        ]),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "CmsContentError" &&
        (error as { code?: string }).code === "CMS_MISSING_REQUIRED_FIELD" &&
        (error as { fields?: string[] }).fields?.includes("site/site-brand.tagline") &&
        error.message.includes('Required CMS field "site/site-brand.tagline"'),
    );
  });
}

void main();
