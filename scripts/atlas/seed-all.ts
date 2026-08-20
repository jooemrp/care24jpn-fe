/**
 * Runs the full Atlas seeding pipeline in one command: `schema.ts`, then
 * `upload-media.ts`, then every `seed-*.ts` script.
 *
 * Why child processes, not imports: every script under scripts/atlas/*.ts
 * calls its own `main().catch(...)` at module load time (see the bottom of
 * schema.ts / seed-site.ts / ...). `import`-ing one here would run its
 * `main()` as an uncontrolled side effect of the import itself, with no way
 * to sequence it after `schema.ts` or to catch its failure without also
 * catching this file's own errors. Spawning `tsx <script>.ts` as a separate
 * process gives each stage an isolated exit code, isolated stdout/stderr,
 * and a natural place to enforce "schema before any seed-*" — and it means
 * this file never has to touch (or duplicate) a single line of seeding
 * logic that the other lanes have already verified.
 *
 * Ordering: two prerequisite stages run first, one after the other, then the
 * five seed-* scripts run concurrently.
 *
 *   1. schema.ts creates the 30 block content types every seed-* script
 *      depends on (they resolve block_type_id by slug).
 *   2. upload-media.ts uploads public/images/* into the Atlas media library
 *      and writes scripts/atlas/media-manifest.json. seed-site, seed-home and
 *      seed-pages read that manifest to fill their `image` fields with media
 *      ids, and `requireMediaManifest()` throws if it isn't there — so the
 *      upload cannot be folded into the parallel batch, it has to complete
 *      before any seed starts.
 *
 * Stage 2 does not technically depend on stage 1 (media and content types are
 * disjoint resources, so they could overlap), but they are kept sequential
 * anyway: both are prerequisites, the pair costs a few seconds next to the
 * seeding itself, and one failing prerequisite at a time is far easier to
 * read in the log than two interleaved ones. The seeds are the stages worth
 * parallelizing — they write to disjoint page slugs (site / home / legal-* /
 * rates+pricing+fees / service-flow+use-case+company) and share no other
 * mutable state — see architecture-plan.json#pages for the slug-to-script
 * mapping this assumes.
 *
 * Idempotent end-to-end, with one deliberate exception spelled out below.
 * Every page write in every seed-*.ts goes through the single
 * `ensurePublishedPage` helper in scripts/atlas/lib.ts, which sends the full
 * desired page to `PUT /pages/:slug` and only falls back to `POST /pages` on
 * a 404, then skips a publish that would be rejected on an already-published
 * page. Update-first is what makes re-running safe: page slugs are NOT unique
 * at this backend's create endpoint, so a create-then-catch-409 fallback
 * would add a second page per slug on every rerun instead of erroring. `schema.ts` is idempotent
 * the other way round — content types and their fields ARE unique, so it
 * checks-then-creates and now hard-fails on a field whose live `field_type`/
 * `localizable`/`required` disagrees with the spec (there is no update-field
 * endpoint; that drift needs a human, see lib.ts#ensureContentTypeField).
 *
 * The exception: a rerun still REWRITES every page's blocks with freshly
 * built (new-id) block rows, so `updated_at` moves and block ids change even
 * when the content is byte-identical. Idempotent in content and in page
 * count — not a literal no-op at the row level. Anything downstream that
 * keys off block ids must not assume they're stable across a reseed.
 *
 * Fail-loud: the first stage (or, within the parallel batch, the first
 * *reported* stage) to exit non-zero is named explicitly, its stderr tail is
 * printed, and this process exits non-zero. Nothing after a failed
 * prerequisite silently proceeds — if `schema` or `upload-media` fails, no
 * seed-* script is even spawned.
 *
 * Usage (from marketing-web/):
 *   npx tsx scripts/atlas/seed-all.ts
 */
import { spawn } from "node:child_process";
import { resolve } from "node:path";

interface StageResult {
  name: string;
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
}

const SCRIPTS_DIR = resolve(__dirname);
const TSX_BIN = resolve(SCRIPTS_DIR, "..", "..", "node_modules", ".bin", "tsx");

/** Both prerequisites must complete, in this order, before any seed script:
 * schema.ts creates the content types every seed resolves by slug, and
 * upload-media.ts writes the media manifest three of them read. The five
 * seed-* scripts below write disjoint page slugs, so they're safe to run
 * concurrently — see the file-level comment. */
const PREREQ_STAGES = [
  { name: "schema", file: "schema.ts" },
  { name: "upload-media", file: "upload-media.ts" },
];
const SEED_STAGES = [
  { name: "seed-site", file: "seed-site.ts" },
  { name: "seed-home", file: "seed-home.ts" },
  { name: "seed-legal", file: "seed-legal.ts" },
  { name: "seed-rates", file: "seed-rates.ts" },
  { name: "seed-pages", file: "seed-pages.ts" },
];

/**
 * Runs one script under `tsx` as a child process, streaming its stdout/
 * stderr live (prefixed with the stage name, so concurrent stages stay
 * distinguishable) while also buffering it for the end-of-run summary.
 */
function runStage(stage: { name: string; file: string }): Promise<StageResult> {
  return new Promise((res) => {
    const start = Date.now();
    const child = spawn(TSX_BIN, [resolve(SCRIPTS_DIR, stage.file)], {
      cwd: resolve(SCRIPTS_DIR, "..", ".."),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      for (const line of text.split("\n")) {
        if (line.length > 0) console.log(`[${stage.name}] ${line}`);
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      for (const line of text.split("\n")) {
        if (line.length > 0) console.error(`[${stage.name}] ${line}`);
      }
    });

    child.on("close", (exitCode) => {
      res({ name: stage.name, exitCode, durationMs: Date.now() - start, stdout, stderr });
    });
    child.on("error", (error) => {
      res({
        name: stage.name,
        exitCode: 1,
        durationMs: Date.now() - start,
        stdout,
        stderr: stderr + `\nfailed to spawn: ${error.message}`,
      });
    });
  });
}

/**
 * Heuristic tally from a stage's own stdout: every script in this directory
 * prefixes a create with `+` and an already-exists/already-published/
 * updated-in-place line with `=` (see schema.ts, seed-legal.ts, ...). This
 * doesn't try to force those into a strict created/updated/skipped split —
 * the scripts don't agree closely enough on what "updated" vs "skipped"
 * means to make that split meaningful across all of them — it just counts
 * the two markers every one of them already uses consistently, which is
 * exactly what a second, idempotent run should show settle to
 * `created: 0`.
 */
function tallyMarkers(stdout: string): { created: number; unchanged: number } {
  // Most scripts put the marker at the very start of the line
  // ("+ page/site (created, ...)"), but seed-rates.ts embeds it mid-line
  // ("rates: + created, + published (...)"). Matching `+`/`=` wherever they
  // appear right before a word, not just at line-start, catches both.
  let created = 0;
  let unchanged = 0;
  for (const rawLine of stdout.split("\n")) {
    created += (rawLine.match(/(?:^|\s)\+\s(?=\S)/g) ?? []).length;
    unchanged += (rawLine.match(/(?:^|\s)=\s(?=\S)/g) ?? []).length;
  }
  return { created, unchanged };
}

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

async function main(): Promise<void> {
  const overallStart = Date.now();
  const results: StageResult[] = [];

  for (const stage of PREREQ_STAGES) {
    console.log(`=== stage: ${stage.name} ===`);
    const result = await runStage(stage);
    results.push(result);

    if (result.exitCode !== 0) {
      printSummary(results, Date.now() - overallStart);
      console.error(
        `\n[atlas:seed-all] prerequisite stage "${result.name}" failed (exit ${result.exitCode}) — ` +
          "stopping before any seed-* script runs. The seeds resolve block types by slug (schema.ts) " +
          "and read media ids out of scripts/atlas/media-manifest.json (upload-media.ts); running " +
          "them on a half-built prerequisite would write pages with missing block types or empty " +
          "image fields.",
      );
      process.exitCode = 1;
      return;
    }
  }

  console.log(`\n=== stage: ${SEED_STAGES.map((s) => s.name).join(", ")} (parallel) ===`);
  const seedResults = await Promise.all(SEED_STAGES.map(runStage));
  results.push(...seedResults);

  const failed = seedResults.filter((r) => r.exitCode !== 0);

  printSummary(results, Date.now() - overallStart);

  if (failed.length > 0) {
    console.error(
      `\n[atlas:seed-all] ${failed.length} stage(s) failed: ${failed.map((r) => r.name).join(", ")}.`,
    );
    for (const stage of failed) {
      console.error(`\n--- ${stage.name} stderr (exit ${stage.exitCode}) ---`);
      console.error(stage.stderr.trim() || "(no stderr output)");
    }
    process.exitCode = 1;
    return;
  }

  console.log("\n[atlas:seed-all] all stages completed successfully.");
}

function printSummary(results: StageResult[], totalMs: number): void {
  console.log("\nSummary");
  for (const result of results) {
    const { created, unchanged } = tallyMarkers(result.stdout);
    const status = result.exitCode === 0 ? "ok" : `FAILED (exit ${result.exitCode})`;
    console.log(
      `  ${result.name.padEnd(12)} ${status.padEnd(16)} ${formatDuration(result.durationMs).padStart(6)}  ` +
        `+${created} created, =${unchanged} unchanged`,
    );
  }
  console.log(`  total: ${formatDuration(totalMs)}`);
}

main().catch((error) => {
  console.error("[atlas:seed-all] failed:", error);
  process.exitCode = 1;
});
