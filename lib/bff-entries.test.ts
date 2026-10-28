import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchPublicEntries } from "./bff-core";
const options = { baseUrl: "https://atlas.example.test/", apiKey: "atlas_live_test" };
const entry = (slug: string) => ({ id: slug, slug, position: 0, status: "published", data: JSON.stringify({ title: "題名" }) });

test("entries requests use explicit type, JA locale, limit, position sort and the page request policy", async () => {
  let request: { url: string; init?: RequestInit } | undefined;
  const result = await fetchPublicEntries("article", "ja", {
    ...options,
    fetchImpl: async (url, init) => {
      request = { url: String(url), init };
      return Response.json({ success: true, data: [entry("demo")] }, { headers: { "x-trace-id": "trace" } });
    },
  });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data[0].slug, "demo");
  const url = new URL(request!.url);
  assert.equal(url.pathname, "/api/v1/public/entries");
  assert.equal(url.searchParams.get("type"), "article");
  assert.equal(url.searchParams.get("locale"), "ja");
  assert.equal(url.searchParams.get("limit"), "100");
  assert.equal(url.searchParams.get("sort"), "position:asc");
  assert.equal(request?.init?.cache, "no-store");
  assert.equal(new Headers(request?.init?.headers).get("X-API-Key"), options.apiKey);
  assert.ok(request?.init?.signal);
});

test("entries are paginated beyond the API maximum without losing later published articles", async () => {
  const requested: string[] = [];
  const result = await fetchPublicEntries("article", "ja", {
    ...options,
    fetchImpl: async (url) => {
      const page = new URL(String(url)).searchParams.get("page")!;
      requested.push(page);
      return Response.json({ success: true, data: page === "1" ? Array.from({ length: 100 }, (_, i) => entry(String(i))) : [entry("last")] });
    },
  });
  assert.deepEqual(requested, ["1", "2"]);
  assert.equal(result.success && result.data.length, 101);
});

for (const [name, payload, code] of [
  ["invalid JSON", "{", "CMS_INVALID_JSON"],
  ["invalid list", JSON.stringify({ success: true, data: {} }), "CMS_INVALID_PAYLOAD"],
  ["invalid entry identity", JSON.stringify({ success: true, data: [{ data: {} }] }), "CMS_INVALID_PAYLOAD"],
  ["invalid position", JSON.stringify({ success: true, data: [{ ...entry("bad"), position: "0" }] }), "CMS_INVALID_PAYLOAD"],
] as const) {
  test(`entries normalize ${name}`, async () => {
    const result = await fetchPublicEntries("article", "ja", { ...options, fetchImpl: async () => new Response(payload) });
    assert.equal(!result.success && result.error.code, code);
  });
}

test("entries preserve field errors and trace ids", async () => {
  const result = await fetchPublicEntries("article", "ja", { ...options, fetchImpl: async () => Response.json({ success: false, error: { code: "DENIED", message: "Denied", field_errors: { type: "Not allowed" } } }, { status: 403, headers: { "x-trace-id": "trace" } }) });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.code, "DENIED");
    assert.equal(result.error.traceId, "trace");
    assert.deepEqual(result.error.fieldErrors, { type: ["Not allowed"] });
  }
});

test("entries retry transport failures and fail closed on missing credentials", async () => {
  let count = 0;
  const fetchImpl: typeof fetch = async () => {
    count++;
    if (count === 1) throw new Error("reset");
    return Response.json({ success: true, data: [] });
  };
  assert.equal((await fetchPublicEntries("article", "ja", { ...options, fetchImpl })).success, true);
  assert.equal(count, 2);
  const missing = await fetchPublicEntries("article", "ja", { fetchImpl });
  assert.equal(!missing.success && missing.error.code, "CMS_NOT_CONFIGURED");
  assert.equal(count, 2);
});

test("entries normalize timeouts", async () => {
  const result = await fetchPublicEntries("article", "ja", {
    ...options, timeoutMs: 5,
    fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
      init!.signal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }),
  });
  assert.equal(!result.success && result.error.code, "CMS_TIMEOUT");
});
