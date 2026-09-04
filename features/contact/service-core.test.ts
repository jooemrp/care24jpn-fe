import assert from "node:assert/strict";
import { test } from "node:test";
import type * as ContactServiceModule from "./service-core.ts";
import type * as SchemaModule from "./schema.ts";

const modulePath = "./service-core" + ".ts";
const schemaModulePath = "./schema" + ".ts";

function validPayload() {
  return {
    category: "services",
    name: "山田 太郎",
    phone: "03-5733-6600",
    email: "taro@example.com",
    message: "料金と空き状況について教えてください。",
    company: "",
    company_name: "",
    form_load_at: 1_710_000_000_000,
  };
}

async function main(): Promise<void> {
  const {
    CONTACT_BODY_LIMIT,
    submitContactPayload,
    submitContactRequest,
  } = (await import(modulePath)) as typeof ContactServiceModule;
  const { contactPayloadSchema } = (await import(schemaModulePath)) as typeof SchemaModule;

  const validatePayload: ContactServiceModule.ContactPayloadValidator = (payload) => {
    const parsed = contactPayloadSchema.safeParse(payload);
    return parsed.success
      ? { success: true, data: parsed.data }
      : { success: false };
  };
  const submitRequest = (
    rawBody: string,
    options: ContactServiceModule.ContactServiceOptions = {},
  ) => submitContactRequest(rawBody, { ...options, validatePayload });
  const submitPayload = (
    payload: unknown,
    options: ContactServiceModule.ContactServiceOptions = {},
  ) => submitContactPayload(payload, { ...options, validatePayload });

  test("does not relay without the server validation policy", async () => {
    let called = false;
    const result = await submitContactRequest(JSON.stringify(validPayload()), {
      endpoint: "https://backend.example.test/api/v1/public/contact",
      apiKey: "atlas_live_test",
      fetchImpl: async () => {
        called = true;
        return new Response();
      },
    });

    assert.equal(called, false);
    assert.equal(result.outcome, "error");
    assert.equal(result.status, 503);
  });

  test("returns a configuration error without calling upstream", async () => {
    let called = false;
    const result = await submitRequest(JSON.stringify(validPayload()), {
      endpoint: "",
      apiKey: "",
      fetchImpl: async () => {
        called = true;
        return new Response();
      },
    });

    assert.equal(called, false);
    assert.deepEqual(result, {
      outcome: "error",
      status: 503,
      body: JSON.stringify({
        success: false,
        message: "Contact service is not configured.",
      }),
    });
  });

  test("rejects a request over the 16 KiB cap before parsing or forwarding", async () => {
    let called = false;
    const oversized = `${JSON.stringify(validPayload())}${"x".repeat(CONTACT_BODY_LIMIT)}`;
    const result = await submitRequest(oversized, {
      endpoint: "https://backend.example.test/api/v1/public/contact",
      apiKey: "atlas_live_test",
      fetchImpl: async () => {
        called = true;
        return new Response();
      },
    });

    assert.equal(called, false);
    assert.equal(result.outcome, "error");
    assert.equal(result.status, 413);
    assert.deepEqual(JSON.parse(result.body), {
      success: false,
      message: "Request body too large.",
    });
  });

  test("rejects malformed JSON before contacting upstream", async () => {
    let called = false;
    const result = await submitRequest("{", {
      endpoint: "https://backend.example.test/api/v1/public/contact",
      apiKey: "atlas_live_test",
      fetchImpl: async () => {
        called = true;
        return new Response();
      },
    });

    assert.equal(called, false);
    assert.equal(result.status, 400);
    assert.deepEqual(JSON.parse(result.body), {
      success: false,
      message: "Invalid JSON body.",
    });
  });

  test("applies the shared Zod schema before forwarding", async () => {
    let called = false;
    const result = await submitRequest(
      JSON.stringify({ ...validPayload(), email: "not-an-email" }),
      {
        endpoint: "https://backend.example.test/api/v1/public/contact",
        apiKey: "atlas_live_test",
        fetchImpl: async () => {
          called = true;
          return new Response();
        },
      },
    );

    assert.equal(called, false);
    assert.equal(result.status, 400);
    assert.deepEqual(JSON.parse(result.body), {
      success: false,
      message: "Invalid request body.",
    });
  });

  test("forwards normalized payload, origin, timeout, and no-store policy", async () => {
    let request: { input: RequestInfo | URL; init?: RequestInit } | undefined;
    const upstreamBody = JSON.stringify({ success: true, data: { accepted: true } });
    const result = await submitRequest(
      JSON.stringify({
        ...validPayload(),
        name: "  山田 太郎  ",
        message: "  料金と空き状況について教えてください。  ",
      }),
      {
        endpoint: "https://backend.example.test/api/v1/public/contact",
        apiKey: "atlas_live_test",
        origin: "https://care24.jp/contact",
        timeoutMs: 25,
        fetchImpl: async (input, init) => {
          request = { input, init };
          return new Response(upstreamBody, {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        },
      },
    );

    assert.equal(result.outcome, "success");
    assert.equal(result.status, 200);
    assert.equal(result.body, upstreamBody);
    assert.equal(String(request?.input), "https://backend.example.test/api/v1/public/contact");
    assert.equal(request?.init?.method, "POST");
    assert.equal(request?.init?.cache, "no-store");
    assert.equal(request?.init?.signal instanceof AbortSignal, true);
    const headers = new Headers(request?.init?.headers);
    assert.equal(headers.get("Content-Type"), "application/json");
    assert.equal(headers.get("X-API-Key"), "atlas_live_test");
    assert.equal(headers.get("Origin"), "https://care24.jp/contact");
    assert.deepEqual(JSON.parse(String(request?.init?.body)), {
      ...validPayload(),
      name: "山田 太郎",
      message: "料金と空き状況について教えてください。",
    });
  });

  test("maps upstream rate limits to the stable rate_limited result", async () => {
    const upstreamBody = JSON.stringify({
      success: false,
      message: "too many submissions",
    });
    const result = await submitRequest(JSON.stringify(validPayload()), {
      endpoint: "https://backend.example.test/api/v1/public/contact",
      apiKey: "atlas_live_test",
      fetchImpl: async () => new Response(upstreamBody, { status: 429 }),
    });

    assert.equal(result.outcome, "rate_limited");
    assert.equal(result.status, 429);
    assert.equal(result.body, upstreamBody);
  });

  test("maps non-rate-limit upstream failures to the stable error result", async () => {
    const upstreamBody = JSON.stringify({
      success: false,
      message: "temporary failure",
    });
    const result = await submitRequest(JSON.stringify(validPayload()), {
      endpoint: "https://backend.example.test/api/v1/public/contact",
      apiKey: "atlas_live_test",
      fetchImpl: async () => new Response(upstreamBody, { status: 503 }),
    });

    assert.equal(result.outcome, "error");
    assert.equal(result.status, 503);
    assert.equal(result.body, upstreamBody);
  });

  test("maps a timed-out upstream request to a stable error result", async () => {
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

    const result = await submitRequest(JSON.stringify(validPayload()), {
      endpoint: "https://backend.example.test/api/v1/public/contact",
      apiKey: "atlas_live_test",
      timeoutMs: 5,
      fetchImpl,
    });

    assert.equal(result.outcome, "error");
    assert.equal(result.status, 502);
    assert.deepEqual(JSON.parse(result.body), {
      success: false,
      message: "Contact service unavailable, please try again later.",
    });
  });

  test("serializes Server Action payloads through the same size and validation path", async () => {
    let called = false;
    const result = await submitPayload(
      { ...validPayload(), extra: "x".repeat(CONTACT_BODY_LIMIT) },
      {
        endpoint: "https://backend.example.test/api/v1/public/contact",
        apiKey: "atlas_live_test",
        fetchImpl: async () => {
          called = true;
          return new Response();
        },
      },
    );

    assert.equal(called, false);
    assert.equal(result.outcome, "error");
    assert.equal(result.status, 413);
  });
}

void main();
