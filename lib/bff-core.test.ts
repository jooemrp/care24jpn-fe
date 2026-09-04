import assert from "node:assert/strict";
import { test } from "node:test";
import type * as BffCoreModule from "./bff-core.ts";

const bffCorePath = "./bff-core" + ".ts";

async function main(): Promise<void> {
  const { fetchPublicPage } = (await import(bffCorePath)) as typeof BffCoreModule;

  test("returns a configuration error without Atlas credentials", async () => {
    let called = false;
    const result = await fetchPublicPage("company", {
              baseUrl: "  ",
              apiKey: "\t",
      fetchImpl: async () => {
        called = true;
        return new Response();
      },
    });

    assert.equal(called, false);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "CMS_NOT_CONFIGURED");
      assert.equal(result.error.status, 503);
    }
  });

  test("normalizes a timed-out Atlas request", async () => {
    const fetchImpl: typeof fetch = async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        if (init?.signal?.aborted) {
          reject(new DOMException("The operation was aborted.", "AbortError"));
          return;
        }
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("The operation was aborted.", "AbortError")),
          { once: true },
        );
      });

    const result = await fetchPublicPage("company", {
      baseUrl: "https://atlas.example.test",
      apiKey: "atlas_live_test",
      timeoutMs: 5,
      fetchImpl,
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "CMS_TIMEOUT");
      assert.equal(result.error.status, 504);
    }
  });

  test("normalizes a non-timeout network failure", async () => {
    const result = await fetchPublicPage("company", {
      baseUrl: "https://atlas.example.test",
      apiKey: "atlas_live_test",
      fetchImpl: async () => {
        throw new Error("socket closed");
      },
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "CMS_NETWORK_ERROR");
      assert.equal(result.error.status, 502);
    }
  });

  test("normalizes an upstream error with trace and field errors", async () => {
    const result = await fetchPublicPage("company", {
      baseUrl: "https://atlas.example.test",
      apiKey: "atlas_live_test",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            success: false,
            code: "UPSTREAM_UNAVAILABLE",
            message: "The CMS is temporarily unavailable.",
            traceId: "trace-upstream",
            errors: { slug: ["Page is not published."] },
          }),
          { status: 502, headers: { "content-type": "application/json" } },
        ),
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "UPSTREAM_UNAVAILABLE");
      assert.equal(result.error.message, "The CMS is temporarily unavailable.");
      assert.equal(result.error.status, 502);
      assert.equal(result.error.traceId, "trace-upstream");
      assert.deepEqual(result.error.fieldErrors, {
        slug: ["Page is not published."],
      });
    }
  });

  test("returns a normalized error for malformed JSON", async () => {
    const result = await fetchPublicPage("company", {
      baseUrl: "https://atlas.example.test",
      apiKey: "atlas_live_test",
      fetchImpl: async () =>
        new Response("{not-json", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "CMS_INVALID_JSON");
      assert.equal(result.error.status, 502);
    }
  });

  test("accepts a valid bilingual page payload and keeps the request server-only", async () => {
    let request: { url: string; init?: RequestInit } | undefined;
    const data = {
      page: { id: "page-company", slug: "company", status: "published" },
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

    const result = await fetchPublicPage("company", {
      baseUrl: "https://atlas.example.test/",
      apiKey: "atlas_live_test",
      fetchImpl: async (input, init) => {
        request = { url: String(input), init };
        return new Response(JSON.stringify({ success: true, data }), {
          status: 200,
          headers: { "content-type": "application/json", "x-trace-id": "trace-success" },
        });
      },
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data, data);
      assert.equal(result.traceId, "trace-success");
    }
    assert.equal(request?.url, "https://atlas.example.test/api/v1/public/pages/company");
    assert.equal(request?.init?.cache, "no-store");
    assert.equal(request?.init?.method, "GET");
    assert.equal(new Headers(request?.init?.headers).get("X-API-Key"), "atlas_live_test");
  });

  test("rejects a successful envelope whose page payload is malformed", async () => {
    const result = await fetchPublicPage("company", {
      baseUrl: "https://atlas.example.test",
      apiKey: "atlas_live_test",
      fetchImpl: async () =>
        new Response(JSON.stringify({ success: true, data: { blocks: "not-an-array" } }), {
          status: 200,
        }),
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, "CMS_INVALID_PAYLOAD");
      assert.equal(result.error.status, 502);
    }
  });
}

void main();
