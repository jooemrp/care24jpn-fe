import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ensureArticleEntry, reorderArticleEntries, getBlockTypeUsage } from "./lib";
import { CONTENT_TYPES } from "./schema";
import { retireArticlePages } from "./retire-article-pages";
import { seedArticleEntries } from "./seed-articles";
import type { ManagementClient } from "@latellu/atlas-sdk/management";

test("seed creates eleven entries in seed order and publishes only the launch entry", async () => {
  const created: { slug: string; data: Record<string, unknown>; translations: { ja: { data: Record<string, unknown> } } }[] = [];
  const published: string[] = [];
  const writer = {
    update: async () => { throw { status: 404 }; },
    create: async (input: typeof created[number]) => { created.push(input); return { id: input.slug, status: "draft" }; },
    publish: async (slug: string) => { published.push(slug); return {}; },
  };
  const client = { entries: (type: string) => { assert.equal(type, "article"); return writer; } } as unknown as ManagementClient<Record<string, unknown>>;
  const orders: string[][] = [];
  await seedArticleEntries(client, async (ids) => { orders.push(ids); }, async () => null);
  const seed = JSON.parse(readFileSync(new URL("./articles.seed.json", import.meta.url), "utf8")) as { slug: string }[];
  assert.equal(created.length, 11);
  assert.deepEqual(created.map((item) => item.slug), seed.map((item) => item.slug));
  assert.deepEqual(orders, [seed.map((item) => item.slug)]);
  assert.deepEqual(published, ["what-insurance-cannot-cover"]);
  assert.match(String(created[0].translations.ja.data.body), /<p>/);
  assert.match(String(created[0].translations.ja.data.cta_body), /<p>/);
  assert.deepEqual(Object.keys(created[0].data), ["cta_href"]);
  assert.deepEqual(Object.keys(created[0].translations.ja.data), ["title", "category", "summary", "lead", "body", "cta_body", "cta_label"]);
});

for (const status of ["draft", "published", "scheduled", "archived"]) {
  for (const published of [false, true]) {
    test(`existing ${status} entry keeps its status when seed publication preference is ${published}`, async () => {
      const refreshed: unknown[] = [];
      const statusChanges: string[] = [];
      const writer = {
        update: async (slug: string, input: unknown) => {
          refreshed.push({ slug, input });
          return { id: "existing-id", status };
        },
        create: async () => { throw new Error("must not duplicate an existing entry"); },
        publish: async () => { statusChanges.push("publish"); return {}; },
        unpublish: async () => { statusChanges.push("unpublish"); return {}; },
      };
      const client = { entries: () => writer } as unknown as ManagementClient<Record<string, unknown>>;
      const data = { cta_href: "/contact" };
      const translations = { ja: { data: { title: "Refreshed seed title" } } };
      const existing = { entry: { data: JSON.stringify({ og_image: "image-id", title: "old" }), updated_at: "2026-01-01T00:00:00Z" }, translations: [{ locale: "ja", data: JSON.stringify({ title: "old", seo_title: "Editor SEO", seo_description: "Description" }) }, { locale: "en", data: JSON.stringify({ title: "English" }) }] };
      const result = await ensureArticleEntry(client, { slug: "demo", data, translations }, published, async () => existing);
      assert.deepEqual(result, { id: "existing-id", created: false });
      assert.deepEqual(refreshed, [{ slug: "demo", input: { data: { og_image: "image-id", cta_href: "/contact" }, translations: { ja: { data: { title: "Refreshed seed title", seo_title: "Editor SEO", seo_description: "Description" } }, en: { data: { title: "English" } } }, updatedAt: existing.entry.updated_at } }]);
      assert.deepEqual(statusChanges, []);
    });
  }
}

test("re-running the seed refreshes all existing entries without changing editor publication decisions", async () => {
  const refreshed: string[] = [];
  const writer = {
    update: async (slug: string) => {
      refreshed.push(slug);
      return { id: slug, status: slug === "what-insurance-cannot-cover" ? "draft" : "published" };
    },
    create: async () => { throw new Error("must not duplicate existing entries"); },
    publish: async () => { throw new Error("must not publish an existing entry"); },
    unpublish: async () => { throw new Error("must not unpublish an existing entry"); },
  };
  const client = { entries: () => writer } as unknown as ManagementClient<Record<string, unknown>>;
  const orders: string[][] = [];
  await seedArticleEntries(client, async (ids) => { orders.push(ids); }, async () => ({ entry: { data: "{}", updated_at: "2026-01-01T00:00:00Z" }, translations: [] }));
  const seed = JSON.parse(readFileSync(new URL("./articles.seed.json", import.meta.url), "utf8")) as { slug: string }[];
  assert.deepEqual(refreshed, seed.map((item) => item.slug));
  assert.deepEqual(orders, [refreshed]);
});

test("retirement dry run lists only eleven allowlisted article pages and never mutates", async () => {
  const deleted: string[] = [];
  const listed: string[] = [];
  await retireArticlePages({
    dryRun: true, removeBlockTypes: true,
    deletePage: async (slug) => { deleted.push(slug); },
    getType: async () => ({ is_block: true }),
    getUsage: async () => ({ is_block: true, count: 0, pages: [] }),
    deleteType: async () => { throw new Error("no mutation"); },
    log: (line) => listed.push(line),
  });
  assert.equal(deleted.length, 0);
  const pages = listed.filter((line) => line.startsWith("[dry-run] page article-"));
  assert.equal(pages.length, 11);
  assert.equal(listed.some((line) => line.includes("page articles")), false);
});

test("retirement tolerates absent pages, and retains retired types still used by any page", async () => {
  const deletedTypes: string[] = [];
  let pages = 0;
  const result = await retireArticlePages({
    dryRun: false, removeBlockTypes: true,
    deletePage: async () => { pages++; throw { status: 404 }; },
    getType: async (slug) => slug === "article-body" ? null : ({ is_block: true }),
    getUsage: async (slug) => ({ is_block: true, count: slug === "article-ref" ? 1 : 0, pages: slug === "article-ref" ? [{ slug: "articles" }] : [] }),
    deleteType: async (slug) => { deletedTypes.push(slug); }, log: () => {},
  });
  assert.equal(pages, 11);
  assert.deepEqual(deletedTypes, ["article-meta", "article-cta"]);
  assert.equal(result.blocked, true);
});

test("retirement refuses deletion when a retired type is no longer a block type", async () => {
  await assert.rejects(retireArticlePages({
    dryRun: false, removeBlockTypes: true, deletePage: async () => {},
    getType: async () => ({ is_block: false }),
    getUsage: async () => { throw new Error("not reached"); },
    deleteType: async () => { throw new Error("must not delete"); }, log: () => {},
  }), /not a block type/);
});


test("article schema is regular, orderable, filterable by category and contains no retired blocks", () => {
  const type = CONTENT_TYPES.find((item) => item.slug === "article")!;
  assert.equal(type.is_block, false);
  assert.equal(type.orderable, true);
  assert.deepEqual(type.fields.map((field) => field.name), ["title", "category", "summary", "lead", "body", "cta_body", "cta_label", "cta_href", "seo_title", "seo_description", "og_image"]);
  assert.equal(type.fields.find((field) => field.name === "title")?.required, false);
  assert.deepEqual(
    type.fields.filter((field) => field.required && field.localizable).map((field) => field.name),
    [],
    "Optional fields allow incomplete entries to be diagnosed by the loader",
  );
  assert.equal(type.fields.find((field) => field.name === "category")?.filterable, true);
  assert.ok(type.fields.filter((field) => !["cta_href", "og_image"].includes(field.name)).every((field) => field.localizable));
  assert.equal(type.fields.find((field) => field.name === "og_image")?.field_type, "image");
  assert.equal(type.fields.find((field) => field.name === "og_image")?.localizable, false);
  assert.ok(type.fields.filter((field) => ["seo_title", "seo_description", "og_image"].includes(field.name)).every((field) => !field.required));
  assert.equal(type.fields.find((field) => field.name === "cta_href")?.localizable, false);
  assert.equal(CONTENT_TYPES.some((item) => ["article_meta", "article_body", "article_cta", "article_ref"].includes(item.slug)), false);
});

test("reordering uses the supported management PATCH with the complete upsert IDs", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), "https://atlas.test/api/v1/manage/content-types/article/entries/reorder");
      assert.equal(init?.method, "PATCH");
      assert.deepEqual(JSON.parse(String(init?.body)), { order: ["id-a", "id-b"] });
      assert.equal(new Headers(init?.headers).get("X-API-Key"), "atlas_mgmt_test");
      return Response.json({ success: true, data: null });
    };
    await reorderArticleEntries({ baseUrl: "https://atlas.test", mgmtKey: "atlas_mgmt_test" }, ["id-a", "id-b"]);
  } finally { globalThis.fetch = original; }
});

test("block usage fails closed when the payload cannot prove that no page uses a type", async () => {
  const original = globalThis.fetch;
  try {
    for (const data of [null, {}, { is_block: false, count: 0, pages: [] }, { is_block: true, count: 1, pages: [] }]) {
      globalThis.fetch = async () => Response.json({ success: true, data });
      await assert.rejects(getBlockTypeUsage({ baseUrl: "https://atlas.test", mgmtKey: "atlas_mgmt_test" }, "article-ref"), /Invalid block usage/);
    }
  } finally { globalThis.fetch = original; }
});
