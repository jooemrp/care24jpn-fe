/**
 * st-08 — gerbang penutup migrasi Atlas CMS.
 *
 * Jalankan: npx tsx scripts/atlas/verify-html-parity.ts
 *
 * Ini bukan alat sekali-pakai — dibiarkan di repo sebagai regression guard
 * yang bisa dijalankan ulang kapan saja pohon kode diam. Dua pengukuran
 * independen, keduanya lewat HTTP sungguhan ke server `next build && next
 * start` (bukan `next dev`, bukan baca file `.next/` langsung):
 *
 *  1. PARITAS BASELINE — 29 halaman render sekarang (Atlas hidup) vs 29
 *     snapshot HTML pre-migrasi yang sudah dinormalisasi
 *     (`<run>/output/baseline/*.txt`), memakai normalizer yang sama persis
 *     dengan yang dipakai untuk membuat snapshot itu (lihat `normalizeHtml`
 *     di bawah — port TypeScript dari `<run>/output/normalize-html.mjs`,
 *     dijaga byte-identik dengan aturan situ).
 *  2. GERBANG CMS-ON vs CMS-OFF — 26 URL (13 rute x ja/en) dirender dua
 *     kali: sekali dengan ATLAS_BASE_URL terisi (Atlas hidup) dan sekali
 *     dikosongkan (loader wajib jatuh ke constants/*.ts). Kalau seed BE
 *     setia terhadap constants/*.ts, kedua render WAJIB identik setelah
 *     normalisasi. Ini juga membuktikan jalur fallback benar-benar hidup
 *     saat Atlas mati.
 *
 * Exit code bukan nol kalau ada satu saja perbedaan yang diklasifikasikan
 * sebagai KONTEN (bukan artefak build).
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const NEXT_BIN = path.join(REPO_ROOT, "node_modules", ".bin", "next");

// Snapshot pre-migrasi yang jadi "baseline emas" untuk pertanyaan 1-3.
// Bisa dioverride lewat env kalau baseline dipindah di masa depan.
const BASELINE_DIR =
  process.env.PARITY_BASELINE_DIR ??
  "/Users/ilham/care-24/.claude/.orchestration/runs/2026-08-20-marketing-web-atlas-integration/output/baseline";
const BASELINE_RAW_DIR =
  process.env.PARITY_BASELINE_RAW_DIR ??
  "/Users/ilham/care-24/.claude/.orchestration/runs/2026-08-20-marketing-web-atlas-integration/output/baseline-raw";

const PORT_CMS_ON = 4101;
const PORT_CMS_OFF = 4102;

/** 13 rute x {ja, en} = 26 URL. Nama slug cocok dengan pola file baseline
 * (`ja.txt`, `en.txt`, `ja__pricing.txt`, `en__privacy.txt`, dst). */
const ROUTES: { slug: string; path: string }[] = [
  { slug: "", path: "/" },
  { slug: "pricing", path: "/pricing" },
  { slug: "service-flow", path: "/service-flow" },
  { slug: "company", path: "/company" },
  { slug: "fees", path: "/fees" },
  { slug: "privacy", path: "/privacy" },
  { slug: "terms-for-users", path: "/terms-for-users" },
  { slug: "terms-for-care-supporters", path: "/terms-for-care-supporters" },
  { slug: "tokushoho", path: "/tokushoho" },
  { slug: "quasi-mandate", path: "/quasi-mandate" },
  { slug: "compensation", path: "/compensation" },
  { slug: "cancellation-policy", path: "/cancellation-policy" },
  { slug: "use-case", path: "/use-case" },
];

type PageKey = { lang: "ja" | "en"; baselineFile: string; urlPath: string };

function pageKeys(): PageKey[] {
  const keys: PageKey[] = [];
  for (const r of ROUTES) {
    const jaFile = r.slug === "" ? "ja.txt" : `ja__${r.slug}.txt`;
    const enFile = r.slug === "" ? "en.txt" : `en__${r.slug}.txt`;
    keys.push({ lang: "ja", baselineFile: jaFile, urlPath: r.path });
    keys.push({
      lang: "en",
      baselineFile: enFile,
      urlPath: r.path === "/" ? "/en" : `/en${r.path}`,
    });
  }
  return keys;
}

/**
 * Port TypeScript dari `<run>/output/normalize-html.mjs`, byte-identik
 * secara perilaku (sengaja diduplikasi, bukan di-import, supaya skrip ini
 * tidak punya dependensi ke file di luar repo yang bisa hilang).
 */
function normalizeHtml(html: string): string {
  let s = html;
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/\s(?:id|for|aria-labelledby|aria-controls|aria-describedby)="[^"]*"/gi, "");
  s = s.replace(/\/_next\/static\/[^"']*/g, "/_next/static/HASH");
  s = s.replace(/\s+/g, " ").replace(/> </g, "><").trim();
  s = s.replace(/></g, ">\n<");
  return s;
}

function log(line: string = ""): void {
  process.stdout.write(line + "\n");
}

/**
 * Tidak throw pada build gagal — build CMS-OFF gagal itu sendiri adalah
 * temuan yang wajib dilaporkan (acceptance st-08: "npm run build sukses
 * dengan ATLAS_BASE_URL dikosongkan"), bukan alasan menghentikan skrip
 * sebelum sisa pengukuran (baseline parity, aria-current) sempat dilaporkan.
 */
function runBuild(env: NodeJS.ProcessEnv, label: string): { success: boolean } {
  log(`\n=== Build (${label}) ===`);
  const result = spawnSync(NEXT_BIN, ["build", "--webpack"], {
    cwd: REPO_ROOT,
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    log(`=== Build (${label}) GAGAL (exit ${result.status}) ===`);
    return { success: false };
  }
  log(`=== Build (${label}) sukses ===`);
  return { success: true };
}

/** Batas per-percobaan saat menunggu server siap. Pendek: satu percobaan yang
 * menggantung tidak boleh menghabiskan seluruh anggaran `timeoutMs` di bawah
 * — kita ingin mencoba lagi, bukan menunggu satu koneksi mati. */
const PROBE_FETCH_TIMEOUT_MS = 5_000;

/** Batas per-halaman saat mengambil HTML. Longgar: ini `next start` yang
 * merender SSR + memanggil Atlas, jauh lebih lambat dari probe di atas, tapi
 * `fetch` tanpa batas sama sekali membuat skrip ini menggantung tanpa pesan
 * kalau server macet. Pola yang sama dipakai runtime di
 * features/cms/client.ts (NO_STORE_FETCH_TIMEOUT_MS). */
const PAGE_FETCH_TIMEOUT_MS = 60_000;

async function waitForServer(url: string, timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(PROBE_FETCH_TIMEOUT_MS) });
      if (res.status < 500) return;
    } catch {
      // server belum siap (atau probe timeout), coba lagi
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server ${url} tidak siap dalam ${timeoutMs}ms`);
}

function startServer(env: NodeJS.ProcessEnv, port: number, label: string): ChildProcess {
  log(`\n=== Start (${label}) di port ${port} ===`);
  const proc = spawn(NEXT_BIN, ["start", "-p", String(port)], {
    cwd: REPO_ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  proc.stdout?.on("data", () => {});
  proc.stderr?.on("data", (chunk) => process.stderr.write(chunk));
  return proc;
}

function stopServer(proc: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (proc.exitCode !== null) return resolve();
    proc.once("exit", () => resolve());
    proc.kill("SIGTERM");
    setTimeout(() => {
      if (proc.exitCode === null) proc.kill("SIGKILL");
    }, 5000);
  });
}

/** Ambil HTML mentah (tidak dinormalisasi) — dipakai untuk pemeriksaan
 * `aria-current` verbatim, karena normalizer tidak membuang atribut itu tapi
 * kita ingin melihat apa adanya. */
async function fetchRaw(baseUrl: string, urlPath: string): Promise<string> {
  const res = await fetch(`${baseUrl}${urlPath}`, {
    signal: AbortSignal.timeout(PAGE_FETCH_TIMEOUT_MS),
  });
  return res.text();
}

type Hunk = { atLine: number; before: string[]; after: string[] };

/**
 * Diff baris berbasis LCS (bukan perbandingan indeks-demi-indeks). Ini
 * PENTING: dua HTML yang beda satu baris saja (misal satu atribut
 * disisipkan) menggeser nomor baris semua baris setelahnya. Perbandingan
 * indeks-demi-indeks salah mengklasifikasikan ratusan baris identik sebagai
 * "beda" hanya karena bergeser posisi — LCS mengembalikan hunk perubahan
 * yang sebenarnya, sama seperti `diff` Unix.
 */
function computeLcsOps(a: string[], b: string[]): { type: "same" | "del" | "add"; text: string }[] {
  const n = a.length;
  const m = b.length;
  const dp: Int32Array[] = new Array(n + 1);
  for (let i = 0; i <= n; i++) dp[i] = new Int32Array(m + 1);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: { type: "same" | "del" | "add"; text: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "del", text: a[i] });
      i++;
    } else {
      ops.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < n) {
    ops.push({ type: "del", text: a[i] });
    i++;
  }
  while (j < m) {
    ops.push({ type: "add", text: b[j] });
    j++;
  }
  return ops;
}

/** Baseline (`a`) vs sekarang (`b`), sebagai daftar hunk nyata (bukan
 * pergeseran indeks palsu). `atLine` adalah nomor baris di `a` (baseline)
 * tempat hunk itu mulai. */
function diffLines(a: string, b: string): Hunk[] {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const ops = computeLcsOps(aLines, bLines);
  const hunks: Hunk[] = [];
  let lineNo = 0; // posisi di `a`
  let i = 0;
  while (i < ops.length) {
    if (ops[i].type === "same") {
      lineNo++;
      i++;
      continue;
    }
    const before: string[] = [];
    const after: string[] = [];
    const startLine = lineNo + 1;
    while (i < ops.length && ops[i].type !== "same") {
      if (ops[i].type === "del") {
        before.push(ops[i].text);
        lineNo++;
      } else {
        after.push(ops[i].text);
      }
      i++;
    }
    hunks.push({ atLine: startLine, before, after });
  }
  return hunks;
}

// CATATAN: skrip ini SENGAJA tidak membuang/menyaring baris beda apa pun di
// luar apa yang `normalizeHtml` sudah lakukan (yang identik dengan
// normalizer resmi baseline). Setiap baris beda yang lolos normalisasi
// dicetak apa adanya dan diklasifikasikan secara manual di parity-report.md
// — lihat instruksi "JANGAN diam-diam membuang baris agar diff terlihat
// kosong" di brief st-08.

type PageResult = {
  key: PageKey;
  baselineMissing: boolean;
  identicalToBaseline: boolean;
  diffsVsBaseline: Hunk[];
  ariaCurrentNowJa?: boolean;
  ariaCurrentBaseline?: boolean;
};

async function main() {
  const baseEnv = { ...process.env } as NodeJS.ProcessEnv;

  // ---------------------------------------------------------------------
  // Fase A: CMS-ON (ATLAS_BASE_URL asli dari .env, dibaca otomatis oleh
  // Next lewat @next/env karena tidak kita override di sini).
  // ---------------------------------------------------------------------
  const envOn: NodeJS.ProcessEnv = { ...baseEnv };
  const buildOn = runBuild(envOn, "CMS-ON");
  if (!buildOn.success) {
    throw new Error(
      "next build gagal untuk CMS-ON (jalur normal, Atlas hidup) — tidak ada dasar untuk lanjut mengukur apa pun.",
    );
  }
  const serverOn = startServer(envOn, PORT_CMS_ON, "CMS-ON");
  const baseUrlOn = `http://localhost:${PORT_CMS_ON}`;

  const keys = pageKeys();
  const normalizedOn = new Map<string, string>();
  const rawOn = new Map<string, string>();

  try {
    await waitForServer(`${baseUrlOn}/`);
    for (const k of keys) {
      const raw = await fetchRaw(baseUrlOn, k.urlPath);
      rawOn.set(k.baselineFile, raw);
      normalizedOn.set(k.baselineFile, normalizeHtml(raw));
    }
    // _not-found — satu-satunya "halaman spesial" yang benar-benar bisa
    // dipicu lewat HTTP sungguhan (path tak terdaftar). `_global-error` dan
    // `favicon.ico` di baseline-raw TIDAK bisa dipicu lewat HTTP normal
    // (lihat catatan di parity-report.md) — sengaja dilewati di sini, bukan
    // dibuang diam-diam.
    const notFoundRaw = await fetchRaw(baseUrlOn, "/__st08_parity_probe_nonexistent__");
    rawOn.set("_not-found.txt", notFoundRaw);
    normalizedOn.set("_not-found.txt", normalizeHtml(notFoundRaw));
  } finally {
    await stopServer(serverOn);
  }

  // ---------------------------------------------------------------------
  // Fase B: CMS-OFF (ATLAS_BASE_URL dan ATLAS_API_KEY dikosongkan secara
  // eksplisit di env proses anak — @next/env tidak menimpa key yang sudah
  // ada di process.env, jadi ini beneran memaksa kosong, bukan sekadar
  // "belum diset").
  // ---------------------------------------------------------------------
  const envOff: NodeJS.ProcessEnv = { ...baseEnv, ATLAS_BASE_URL: "", ATLAS_API_KEY: "" };
  const buildOff = runBuild(envOff, "CMS-OFF");
  const baseUrlOff = `http://localhost:${PORT_CMS_OFF}`;

  const normalizedOff = new Map<string, string>();

  if (buildOff.success) {
    const serverOff = startServer(envOff, PORT_CMS_OFF, "CMS-OFF");
    try {
      await waitForServer(`${baseUrlOff}/`);
      for (const k of keys) {
        const raw = await fetchRaw(baseUrlOff, k.urlPath);
        normalizedOff.set(k.baselineFile, normalizeHtml(raw));
      }
    } finally {
      await stopServer(serverOff);
    }
  } else {
    log(
      "\n  CMS-OFF tidak berhasil di-build sama sekali — dilewati (start/fetch tidak dijalankan). Lihat log build di atas untuk error verbatim.",
    );
  }

  // ---------------------------------------------------------------------
  // Pertanyaan 1: aria-current — ukur, jangan nalar.
  // ---------------------------------------------------------------------
  log("\n\n########## 1. aria-current: pengukuran verbatim ##########");
  const ariaProbes: { label: string; file: string }[] = [
    { label: "ja depan (/)", file: "ja.txt" },
    { label: "en depan (/en)", file: "en.txt" },
    { label: "ja /service-flow", file: "ja__service-flow.txt" },
  ];
  const ariaResults: { label: string; nowHas: boolean; baselineHas: boolean }[] = [];
  for (const probe of ariaProbes) {
    const nowRaw = rawOn.get(probe.file) ?? "";
    const nowHas = /aria-current="page"/.test(nowRaw);
    let baselineHas = false;
    const baselineRawPath = path.join(
      BASELINE_RAW_DIR,
      probe.file.replace(/\.txt$/, ".html"),
    );
    if (existsSync(baselineRawPath)) {
      baselineHas = /aria-current="page"/.test(readFileSync(baselineRawPath, "utf8"));
    }
    ariaResults.push({ label: probe.label, nowHas, baselineHas });
    log(
      `  ${probe.label.padEnd(20)} sekarang(render server)=${nowHas ? "ADA" : "TIDAK ADA"}  baseline=${
        baselineHas ? "ADA" : "TIDAK ADA"
      }`,
    );
  }

  // ---------------------------------------------------------------------
  // Pertanyaan 2 & 3: paritas 29 halaman vs baseline, tiap baris beda
  // diklasifikasi.
  // ---------------------------------------------------------------------
  log("\n########## 2-3. Paritas terhadap 29 baseline pre-migrasi ##########");
  const baselineFiles = existsSync(BASELINE_DIR) ? readdirSync(BASELINE_DIR) : [];
  const results: PageResult[] = [];
  let identicalCount = 0;
  let contentFailures = 0;

  for (const file of baselineFiles) {
    if (!file.endsWith(".txt")) continue;
    const baselinePath = path.join(BASELINE_DIR, file);
    const baselineText = readFileSync(baselinePath, "utf8").trim();
    const nowText = (normalizedOn.get(file) ?? "").trim();
    const baselineMissing = !normalizedOn.has(file);

    if (baselineMissing) {
      log(`  [LEWAT] ${file} — tidak dirender live (lihat catatan _global-error/favicon.ico)`);
      continue;
    }

    const diffs = diffLines(baselineText, nowText);
    const identical = diffs.length === 0;
    if (identical) identicalCount++;

    log(`  ${identical ? "[SAMA]" : "[BEDA]"} ${file}${identical ? "" : ` — ${diffs.length} hunk beda`}`);
    if (!identical) {
      for (const h of diffs.slice(0, 40)) {
        log(`      dekat baris baseline ${h.atLine}:`);
        for (const line of h.before) log(`        - ${line}`);
        for (const line of h.after) log(`        + ${line}`);
      }
      if (diffs.length > 40) log(`      ... (${diffs.length - 40} hunk beda lainnya dipotong)`);
      contentFailures++;
    }

    results.push({
      key: { lang: file.startsWith("en") ? "en" : "ja", baselineFile: file, urlPath: "" },
      baselineMissing: false,
      identicalToBaseline: identical,
      diffsVsBaseline: diffs,
    });
  }

  const totalBaselinePages = baselineFiles.filter((f) => f.endsWith(".txt")).length;
  log(
    `\n  Ringkasan: ${identicalCount}/${totalBaselinePages} halaman baseline identik setelah normalisasi.`,
  );

  // ---------------------------------------------------------------------
  // Pertanyaan 4: gerbang CMS-on vs CMS-off (26 URL, byte demi byte setelah
  // normalisasi — hash chunk/skrip sudah diseragamkan oleh normalizer).
  // ---------------------------------------------------------------------
log("\n########## 4. Gerbang CMS-ON vs CMS-OFF (fallback constants) ##########");
  const abFailures: { file: string; diffs: number }[] = [];
  let abIdentical = 0;
  const seenRoutes = new Set(keys.map((k) => k.baselineFile.replace(/^(ja|en)(__)?/, "")));

  if (!buildOff.success) {
    log(
      "  GAGAL SEBELUM BISA DIUKUR — `next build` dengan ATLAS_BASE_URL kosong tidak selesai. Lihat log build CMS-OFF di atas untuk error verbatim.",
    );
    for (const routeSlugRaw of seenRoutes) {
      abFailures.push({ file: routeSlugRaw || "/", diffs: -1 });
    }
    log(`\n  Ringkasan CMS-on vs CMS-off: 0/${seenRoutes.size * 2} URL terukur (build CMS-OFF gagal).`);
  } else {
  log("  Rute | JA | EN | Diff");
  for (const routeSlugRaw of seenRoutes) {
    const jaFile = routeSlugRaw === "" ? "ja.txt" : `ja__${routeSlugRaw}`;
    const enFile = routeSlugRaw === "" ? "en.txt" : `en__${routeSlugRaw}`;
    const jaOn = normalizedOn.get(jaFile) ?? "";
    const jaOff = normalizedOff.get(jaFile) ?? "";
    const enOn = normalizedOn.get(enFile) ?? "";
    const enOff = normalizedOff.get(enFile) ?? "";
    const jaDiffs = diffLines(jaOn, jaOff);
    const enDiffs = diffLines(enOn, enOff);
    const routeLabel = routeSlugRaw === "" ? "/" : `/${routeSlugRaw}`;
    const jaStatus = jaDiffs.length === 0 ? "sama" : `${jaDiffs.length} beda`;
    const enStatus = enDiffs.length === 0 ? "sama" : `${enDiffs.length} beda`;
    log(`  ${routeLabel.padEnd(28)} | ${jaStatus.padEnd(8)} | ${enStatus.padEnd(8)}`);
    if (jaDiffs.length === 0) abIdentical++;
    else {
      abFailures.push({ file: jaFile, diffs: jaDiffs.length });
      for (const h of jaDiffs.slice(0, 10)) {
        log(`      [ja ${routeLabel}] dekat baris ${h.atLine}:`);
        for (const line of h.before) log(`        - ${line}`);
        for (const line of h.after) log(`        + ${line}`);
      }
    }
    if (enDiffs.length === 0) abIdentical++;
    else {
      abFailures.push({ file: enFile, diffs: enDiffs.length });
      for (const h of enDiffs.slice(0, 10)) {
        log(`      [en ${routeLabel}] dekat baris ${h.atLine}:`);
        for (const line of h.before) log(`        - ${line}`);
        for (const line of h.after) log(`        + ${line}`);
      }
    }
  }
  log(
    `\n  Ringkasan CMS-on vs CMS-off: ${abIdentical}/${seenRoutes.size * 2} URL byte-identik setelah normalisasi.`,
  );
  }

  // ---------------------------------------------------------------------
  // Ringkasan akhir + exit code
  // ---------------------------------------------------------------------
  log("\n########## RINGKASAN ##########");
  log(`  Baseline: ${identicalCount}/${totalBaselinePages} halaman identik, ${contentFailures} gagal (kandidat perubahan konten).`);
  log(
    buildOff.success
      ? `  CMS-on vs CMS-off: ${abIdentical}/${seenRoutes.size * 2} URL identik, ${abFailures.length} gagal.`
      : `  CMS-on vs CMS-off: TIDAK TERUKUR — build CMS-OFF gagal (lihat di atas). Ini sendiri adalah kegagalan gerbang.`,
  );
  log(
    `  aria-current: ${ariaResults
      .map((r) => `${r.label}=${r.nowHas ? "ADA" : "TIDAK-ADA"}(baseline:${r.baselineHas ? "ADA" : "TIDAK-ADA"})`)
      .join(", ")}`,
  );

  const gateFailed = contentFailures > 0 || abFailures.length > 0 || !buildOff.success;
  if (gateFailed) {
    log("\nHASIL: GAGAL — ada perbedaan yang harus diperlakukan sebagai perubahan konten, bukan diperbaiki di sini.");
  } else {
    log("\nHASIL: LULUS — tidak ada perbedaan konten terhadap baseline maupun antara jalur CMS-on/CMS-off.");
  }

  process.exitCode = gateFailed ? 1 : 0;
}

main().catch((err) => {
  console.error("\nSkrip gagal dijalankan:", err);
  process.exitCode = 2;
});
