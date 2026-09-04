import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("contact server boundaries keep upstream access out of the route and client", () => {
  const route = read("app/api/contact/route.ts");
  const service = read("features/contact/service.ts");
  const action = read("features/contact/actions.ts");
  const hook = read("features/contact/hooks.ts");
  const form = read("components/contact/ContactForm.tsx");
  const clientHelper = read("features/contact/lib.ts");

  assert.match(service, /^import ["']server-only["'];/);
  assert.match(service, /contactPayloadSchema\.safeParse/);
  assert.match(route, /submitContactRequest/);
  assert.doesNotMatch(route, /\bfetch\s*\(/);
  assert.doesNotMatch(route, /ATLAS_API_KEY/);

  assert.match(action, /^"use server";/);
  assert.match(action, /ApiResult/);
  assert.match(action, /submitContactPayload/);

  assert.match(hook, /^"use client";/);
  assert.match(hook, /useMutation/);
  assert.match(hook, /queryKeys\.contact\.submit/);
  assert.doesNotMatch(hook, /server-only|ATLAS_API_KEY|CONTACT_API_URL/);
  assert.doesNotMatch(clientHelper, /\/api\/contact|fetch\s*\(/);
  assert.doesNotMatch(form, /\/api\/contact|fetch\s*\(|submitContact\s*\(/);

  for (const requiredPattern of [
    /useContactMutation/,
    /mutateAsync/,
    /contactFormValuesSchema/,
    /company_name/,
    /form_load_at/,
    /setSubmitAttemptedAt/,
    /aria-live="polite"/,
    /noValidate/,
    /statusCopyFor/,
  ]) {
    assert.match(form, requiredPattern);
  }
});
