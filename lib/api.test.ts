import assert from "node:assert/strict";
import { test } from "node:test";
import type * as ApiModule from "./api.ts";

const apiPath = "./api" + ".ts";

async function main(): Promise<void> {
  const { ApiRequestError, unwrap } = (await import(apiPath)) as typeof ApiModule;

  test("unwrap returns data for a successful API result", () => {
    const result = unwrap({
      success: true,
      data: { slug: "company" },
      traceId: "trace-success",
    });

    assert.deepEqual(result, { slug: "company" });
  });

  test("unwrap preserves code, traceId, and field errors on failure", () => {
    const result = {
      success: false as const,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check the form.",
        traceId: "trace-validation",
        fieldErrors: {
          email: ["Enter a valid email address."],
        },
      },
    };

    assert.throws(
      () => unwrap(result),
      (error: unknown) => {
        assert.ok(error instanceof ApiRequestError);
        assert.equal(error.code, "VALIDATION_ERROR");
        assert.equal(error.traceId, "trace-validation");
        assert.deepEqual(error.fieldErrors, {
          email: ["Enter a valid email address."],
        });
        assert.equal(error.message, "Please check the form.");
        return true;
      },
    );
  });
}

void main();
