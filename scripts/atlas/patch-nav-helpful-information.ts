/** Add the Helpful Information link to the published site page without reseeding.
 * Usage: npx tsx scripts/atlas/patch-nav-helpful-information.ts
 */
import { createScriptManagementClient, loadEnv, requireAtlasEnv } from "./lib";
import { addHelpfulInformation } from "./patch-nav-helpful-information-data";

async function main() {
  loadEnv();
  const env = requireAtlasEnv();
  const key = process.env.ATLAS_API_KEY;
  if (!key) throw new Error("ATLAS_API_KEY is required for the read-before-write step.");
  const response = await fetch(`${env.baseUrl}/api/v1/public/pages/site`, {
    headers: { "X-API-Key": key }, signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GET /api/v1/public/pages/site -> HTTP ${response.status}`);
  const envelope = await response.json() as {
    success?: boolean;
    data?: Parameters<typeof addHelpfulInformation>[0] & { page?: { updated_at?: string } };
  };
  if (!envelope.success || !envelope.data?.page || !envelope.data.blocks) throw new Error("Atlas returned an incomplete published site page.");
  const blocks = addHelpfulInformation(envelope.data);
  if (!blocks) { console.log("Helpful Information navigation item already exists; no update needed."); return; }
  const updatedAt = envelope.data.page.updated_at;
  if (!updatedAt) throw new Error("Published site page has no updated_at for optimistic locking.");
  const client = await createScriptManagementClient(120_000);
  await client.pages.update("site", { updatedAt, blocks });
  console.log("Added Helpful Information navigation item; preserved existing blocks and SEO.");
}

main().catch((error) => { console.error("[atlas:patch-nav-helpful-information] failed:", error); process.exitCode = 1; });
