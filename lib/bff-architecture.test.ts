import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolve } from "node:path";

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("Atlas delivery credentials are read at runtime, not inlined", () => {
  const bff = source("lib/bff.ts");

  assert.match(bff, /import "server-only"/);
  assert.match(bff, /const env = process\.env/);
  assert.match(bff, /env\.ATLAS_BASE_URL/);
  assert.match(bff, /env\.ATLAS_API_KEY/);
  assert.doesNotMatch(bff, /process\.env\.ATLAS_BASE_URL/);
  assert.doesNotMatch(bff, /process\.env\.ATLAS_API_KEY/);
});

test("Vercel builds fail closed without Atlas credentials", () => {
  const nextConfig = source("next.config.ts");

  assert.match(nextConfig, /process\.env\.VERCEL/);
  assert.match(nextConfig, /ATLAS_BASE_URL/);
  assert.match(nextConfig, /ATLAS_API_KEY/);
  assert.match(nextConfig, /requireAtlasEnvOnVercel/);
});
