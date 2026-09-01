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
//
// ADA DI DALAM REPO, dan itu disengaja. Sampai sebelum ini kedua direktori
// menunjuk ke `.claude/.orchestration/runs/<run>/output/` — state orkestrasi
// di luar repo, yang boleh dibersihkan kapan saja tanpa memberi tahu siapa
// pun. Kalau direktori itu hilang, `readdirSync` di bawah menghasilkan daftar
// kosong, `totalBaselinePages` jadi 0, `contentFailures` tetap 0, dan gerbang
// ini mencetak "LULUS" dengan NOL halaman yang benar-benar dibandingkan.
// Kegagalan diam-diam semacam itu justru kebalikan dari alasan gerbang ini
// ada. Sekarang baseline ikut ter-commit, jadi hidup-matinya sama dengan
// hidup-matinya skrip yang membacanya, dan `assertBaselineUsable` di bawah
// menolak berjalan kalau isinya kosong.
//
// Override lewat env tetap ada untuk membandingkan terhadap snapshot lain
// (misalnya baseline baru setelah perubahan konten yang memang disetujui).
const BASELINE_DIR = process.env.PARITY_BASELINE_DIR ?? path.join(__dirname, "baseline");
const BASELINE_RAW_DIR =
  process.env.PARITY_BASELINE_RAW_DIR ?? path.join(__dirname, "baseline-raw");

/**
 * Jumlah minimum file baseline yang harus ada sebelum gerbang ini berarti
 * apa-apa. 29 = 13 rute x {ja,en} + 3 file non-rute (`_global-error`,
 * `_not-found`, `favicon.ico`) yang ikut ter-snapshot. Dipatok sebagai angka,
 * bukan sekadar "> 0", supaya salinan yang terpotong separuh juga tertangkap.
 */
const MIN_BASELINE_FILES = 29;

const PORT_CMS_ON = 4101;
const PORT_CMS_OFF = 4102;

/** 13 rute x {ja, en} = 26 URL (+ special not-found). Nama slug cocok dengan pola file baseline.
 * `/faq` and `/contact` (Aug 2026) are intentionally omitted until baseline
 * HTML snapshots for those routes are captured — see note near home-contact-hours.
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

/**
 * Titik buta JSON-LD (K-1): `normalizeHtml` di atas MEMBUANG seluruh
 * `<script>` (baris 106) sebelum pembandingan lulus/gagal, jadi isi
 * `<script type="application/ld+json">` — termasuk salah bahasa, field
 * hilang, atau typo struktur data — tidak pernah bisa membuat gerbang ini
 * merah, benar atau salah isinya. Blok ini TIDAK mengubah itu (mengubah
 * `normalizeHtml` akan membatalkan seluruh 27 baseline yang terukur
 * sekaligus). Ia hanya membaca `rawOn`/`rawOff` — SEBELUM normalisasi — lalu
 * mencetak diff key-set JSON-LD sebagai informasi, murni untuk mata manusia.
 * Tidak pernah memengaruhi `gateFailed`.
 */
function collectJsonLdKeys(value: unknown, prefix: string, out: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdKeys(item, prefix, out);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const keyPath = prefix ? `${prefix}.${k}` : k;
      out.add(keyPath);
      collectJsonLdKeys(v, keyPath, out);
    }
  }
}

function extractJsonLdKeySet(rawHtml: string): Set<string> {
  const keys = new Set<string>();
  const scriptRe = /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(rawHtml))) {
    try {
      collectJsonLdKeys(JSON.parse(m[1]), "", keys);
    } catch {
      // JSON-LD malformed — bukan urusan blok informasional ini untuk
      // memperbaikinya, hanya lewati diam-diam untuk skrip itu saja.
    }
  }
  return keys;
}

/**
 * Menolak berjalan kalau baseline tidak bisa dipakai.
 *
 * Dipanggil PALING AWAL di `main()`, sebelum dua `next build` yang makan
 * waktu bermenit-menit — kalau tidak ada yang bisa dibandingkan, membangun
 * apa pun cuma membuang waktu dan menghasilkan laporan yang terlihat hijau.
 *
 * Kegagalan di sini sengaja dilempar (exit 2, "skrip gagal dijalankan"),
 * bukan dihitung sebagai kegagalan gerbang (exit 1, "ada perbedaan"). Dua hal
 * itu berbeda dan tidak boleh dicampur: exit 1 berarti "sudah diukur, ada
 * beda"; exit 2 berarti "belum terukur sama sekali". CI yang cuma melihat
 * "bukan 0" tetap merah untuk keduanya, tapi manusia yang membaca log tahu
 * mana yang harus diperbaiki.
 */
function assertBaselineUsable(): void {
  if (!existsSync(BASELINE_DIR)) {
    throw new Error(
      `Direktori baseline tidak ada: ${BASELINE_DIR}\n` +
        "Tanpa baseline, gerbang ini tidak membandingkan apa pun dan akan " +
        "melaporkan LULUS secara palsu. Kembalikan direktori tersebut (ia " +
        "ikut ter-commit di scripts/atlas/baseline), atau arahkan " +
        "PARITY_BASELINE_DIR ke snapshot lain yang sah.",
    );
  }
  const files = readdirSync(BASELINE_DIR).filter((f) => f.endsWith(".txt"));
  if (files.length < MIN_BASELINE_FILES) {
    throw new Error(
      `Baseline tidak lengkap: ${files.length} file .txt di ${BASELINE_DIR}, ` +
        `minimal ${MIN_BASELINE_FILES}.\n` +
        "Salinan yang terpotong membuat halaman yang hilang tidak pernah " +
        "diuji, tanpa satu baris pun di laporan yang menyebutkannya.",
    );
  }
  if (!existsSync(BASELINE_RAW_DIR)) {
    throw new Error(
      `Direktori baseline mentah tidak ada: ${BASELINE_RAW_DIR}\n` +
        "Dipakai untuk pemeriksaan aria-current verbatim, yang tanpa ini " +
        "diam-diam membandingkan terhadap 'tidak ada'.",
    );
  }
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
// normalizer resmi baseline). Aturannya: JANGAN diam-diam membuang baris
// agar diff terlihat kosong. Setiap baris beda yang lolos normalisasi harus
// tetap dicetak apa adanya dan diklasifikasikan lewat mekanisme DIFF_CLASSES
// / ACCEPTED_RESIDUALS di bawah, bukan disaring diam-diam di sini.


// ===========================================================================
// KLASIFIKASI PERBEDAAN
//
// Sampai sebelum ini skrip mencetak setiap baris beda apa adanya dan seorang
// manusia (saya) memutuskan mana yang "wajar" dan mana yang regresi lewat
// penilaian ad-hoc yang tidak ikut ter-commit ke mana pun. Artinya gerbang
// ini tidak pernah bisa LULUS: selama ada satu baris beda, hasilnya GAGAL,
// dan pembacanya harus percaya begitu saja pada penilaian manual itu.
//
// Sekarang ada dua mekanisme, dan perbedaan di antara keduanya adalah inti
// dari desain ini:
//
//   1. KELAS (`DIFF_CLASSES`) — perbedaan yang bisa DIBUKTIKAN sekadar bentuk,
//      lewat kanonikalisasi. Sebuah baris yang dihapus dan sebuah baris yang
//      ditambahkan masuk kelas X kalau keduanya menjadi IDENTIK setelah
//      fungsi kanonikalisasi X dijalankan. Karena seluruh sisa baris harus
//      cocok persis, kelas tidak bisa menyembunyikan perubahan lain yang
//      kebetulan menumpang di baris yang sama: ganti lebar gambar sambil
//      mengganti URL-nya, dan pasangannya tidak lagi cocok.
//
//   2. LEDGER (`ACCEPTED_RESIDUALS`) — perbedaan nyata yang TIDAK bisa
//      dibuktikan sekadar bentuk, tapi sudah diselidiki dan diterima. Ini
//      bukan penyaring: setiap entri mematok JUMLAH persisnya. 26 boleh, 27
//      GAGAL. Jadi entri ledger memberi tahu pembacanya "ini ada, ini sudah
//      diperiksa, dan ini sebabnya" tanpa pernah membuat kejadian ke-27
//      lewat diam-diam.
//
// Apa pun yang bukan keduanya dicetak verbatim dan menggagalkan gerbang.
// Aturan asal gerbang ini (ST-08) tetap berlaku dan diperkuat, bukan
// dilonggarkan: JANGAN diam-diam membuang baris agar diff terlihat kosong.
//
// Klasifikasi dilakukan per HALAMAN, bukan per hunk. Algoritma diff memecah
// satu baris yang sekadar berpindah tempat menjadi DUA hunk terpisah (dihapus
// di sini, ditambahkan di sana), jadi pembandingan per hunk tidak akan pernah
// bisa mengenali pengurutan ulang.
// ===========================================================================

type DiffClass = {
  id: string;
  /** Dicetak di laporan. Harus menyebutkan juga apa yang TIDAK dibuktikan. */
  why: string;
  canonicalize(line: string): string;
};

/**
 * URL gambar di dalam `/_next/image?url=...`.
 *
 * TIDAK membuktikan gambarnya sama. Dari HTML saja, `/images/hero.webp` dan
 * `.../media/<uuid>.jpg` tidak punya identitas bersama apa pun — kelas ini
 * hanya membuktikan bahwa SATU-SATUNYA yang berubah pada baris itu adalah
 * URL gambarnya, sementara `width`, `height`, `sizes`, `alt`, `class`,
 * `loading`, `w=` dan `q=` semuanya tetap identik. Itu persis pertanyaan yang
 * relevan di sini (migrasi memindahkan berkas yang sama ke S3), dan
 * penggantian gambar dengan gambar LAIN tetap tidak akan tertangkap oleh
 * gerbang ini — hanya oleh mata.
 */
const imageSourceClass: DiffClass = {
  id: "sumber-gambar",
  why: "hanya nilai url= di /_next/image yang berbeda (lokal /images/ vs media S3 Atlas); seluruh atribut lain pada baris itu identik. TIDAK membuktikan gambarnya sama.",
  canonicalize: (line) => line.replace(/url=[^&"\s]+/g, "url=GAMBAR"),
};

/**
 * Tautan nav yang sekarang ditandai aktif di HTML server.
 *
 * Sengaja SEMPIT: hanya membuang `aria-current="page"` dan dua fragmen kelas
 * Tailwind yang persis, apa adanya. Perubahan kelas lain apa pun tidak cocok
 * dan tetap dilaporkan. Kalau markup nav diubah, kelas ini berhenti cocok dan
 * gerbang berubah merah — yang memang perilaku yang diinginkan: fragmen di
 * bawah adalah salinan verbatim dari yang dirender hari ini, bukan pola.
 */
const NAV_ACTIVE_CLASSES = "bg-primary-light font-medium text-primary";
const NAV_INACTIVE_CLASSES = "text-body hover:bg-primary-light/60 hover:text-primary";
const navActiveStateClass: DiffClass = {
  id: "status-nav-aktif",
  why: 'tautan nav yang sama (href + teks identik) kini membawa aria-current="page" dan kelas status aktif di HTML server, bukan baru setelah hidrasi. Penyebabnya localizeHref("/","ja") mengembalikan "/" sementara rute internalnya /ja.',
  canonicalize: (line) =>
    line
      .replace(' aria-current="page"', "")
      .replace(NAV_ACTIVE_CLASSES, "STATUS-NAV")
      .replace(NAV_INACTIVE_CLASSES, "STATUS-NAV"),
};

/**
 * ST-GATE, area A (ST-05). `<meta property="og:title">` dan
 * `<meta name="twitter:title">` (twitter:title dicerminkan dari og:title oleh
 * Next sendiri — lihat `postProcessMetadata` di
 * node_modules/next/dist/lib/metadata/resolve-metadata.js:619-655) kini
 * TIDAK LAGI membawa akhiran " | Care 24 Japan" yang masih dipertahankan
 * `<title>`. TIDAK ADA sub-task yang memprediksi ini — ditemukan lewat
 * investigasi gerbang ini sendiri, bukan dari laporan mana pun.
 *
 * Akar penyebab, dibuktikan lewat sumber Next (bukan dugaan):
 * `features/seo/pageMetadata.ts` sekarang menyetel `openGraph.title` secara
 * EKSPLISIT ke string polos `title` (tanpa brand). Sebelumnya `openGraph`
 * sama sekali tidak menyetel `title`, sehingga `inheritFromMetadata`
 * (resolve-metadata.js:603-612, dipanggil dari postProcessMetadata:658)
 * menyalin `metadata.title` — yang SUDAH melalui `title.template` layout
 * (jadi membawa brand) — ke `openGraph.title`. Begitu `openGraph.title`
 * diisi eksplisit, `inheritFromMetadata` tidak lagi menimpanya
 * (`!hasTitle(target)` sudah false), dan `resolveTitle(title,
 * titleTemplates.openGraph)` (resolve-opengraph.js:150) memakai
 * `titleTemplates.openGraph` — kolam template TERPISAH dari
 * `titleTemplates.title` (resolve-metadata.js:747-805) — yang tidak pernah
 * diisi ulang oleh objek `openGraph` polos ini, sehingga tidak ada template
 * yang diterapkan sama sekali.
 *
 * Kelas ini HANYA membuktikan bahwa baris yang dihapus dan baris yang
 * ditambah menjadi identik setelah membuang akhiran " | Care 24 Japan" itu
 * — dan HANYA pada baris og:title/twitter:title. Ini SENGAJA tidak
 * dipasang sebagai kelas yang mengkanonikalisasi og:title/twitter:title
 * secara umum: kalau sisa isinya (judul itu sendiri) berbeda, kelas ini
 * TIDAK cocok dan baris itu tetap tak-terjelaskan — lihat
 * `og-en-mengambil-judul-ja-tanpa-terjemahan` di bawah, yang justru
 * TIDAK tertangkap kelas ini karena isinya bukan cuma beda akhiran.
 *
 * INI BUKAN PERSETUJUAN BAHWA PERILAKU INI BENAR — apakah og:title/
 * twitter:title SEHARUSNYA tetap membawa brand (mis. karena og:site_name
 * dianggap tidak cukup oleh sebagian crawler) adalah keputusan produk yang
 * di luar wewenang gerbang ini untuk mengambil. Dicatat di laporan ST-GATE
 * secara menonjol, bukan dikubur di sini.
 *
 * STATUS SETELAH ST-FIX1: DORMAN, sengaja TIDAK dihapus. ST-FIX1
 * (features/seo/pageMetadata.ts) membangun ulang og:title/twitter:title agar
 * identik dengan <title> (menambahkan " | Care 24 Japan" secara eksplisit,
 * home dikecualikan), jadi kelas ini sekarang cocok 0 pasangan — og:title
 * sudah byte-identik dengan baseline lagi, tidak pernah masuk ke `diffLines`
 * sama sekali. Dibiarkan di sini sebagai jaring pengaman struktural: kalau
 * regresi yang PERSIS sama (openGraph.title eksplisit lolos tanpa sufiks
 * brand) muncul lagi di masa depan, kelas ini akan langsung menangkapnya
 * lagi tanpa perlu ditulis ulang.
 */
const OG_TWITTER_TITLE_TAGS = /(property="og:title"|name="twitter:title")/;
const ogTwitterTitleBrandSuffixClass: DiffClass = {
  id: "og-twitter-title-kehilangan-akhiran-brand",
  why: 'og:title/twitter:title kini di-set eksplisit ke title.template layout tanpa turut menerapkan template-nya (lihat komentar definisi di atas: inheritFromMetadata vs titleTemplates.openGraph terpisah, dibuktikan lewat node_modules/next/dist/lib/metadata/{resolve-metadata,resolve-opengraph,resolve-title}.js) — kehilangan akhiran " | Care 24 Japan" yang <title> sendiri tetap punya. TIDAK diprediksi sub-task manapun. Ini keputusan konten/brand yang belum diputuskan, bukan sesuatu yang terbukti benar — lihat laporan ST-GATE.',
  canonicalize: (line) =>
    OG_TWITTER_TITLE_TAGS.test(line) ? line.replace(/ \| Care 24 Japan"/, '"') : line,
};

/**
 * ST-GATE, area A (ST-05). Begitu `openGraph.images` terisi,
 * `postProcessMetadata` (resolve-metadata.js:621-654) mengisi `twitter.card`
 * bawaan dari "summary" (tanpa gambar) menjadi "summary_large_image" (ada
 * gambar) — efek samping otomatis dari Next, bukan sesuatu yang
 * `pageMetadata()` set langsung. Sempit: hanya menyamakan nilai `content=`
 * pada baris `name="twitter:card"`, tidak menyentuh atribut lain di baris
 * itu (tidak ada yang lain di baris ini).
 */
const twitterCardUpgradeClass: DiffClass = {
  id: "twitter-card-summary-ke-large-image",
  why: 'twitter:card naik dari "summary" ke "summary_large_image" begitu og:image ada — perilaku bawaan Next (postProcessMetadata, resolve-metadata.js:621-654), bukan nilai yang di-set langsung oleh pageMetadata().',
  canonicalize: (line) =>
    /name="twitter:card"/.test(line) ? line.replace(/content="[^"]*"/, 'content="CARD"') : line,
};

/**
 * ST-GATE, area F (ST-HOME). Kedua tautan banner ajakan (`register` untuk
 * pengguna, `caregiver` untuk staf) kini membawa `target="_blank"
 * rel="noopener noreferrer"` yang baseline pre-migrasi TIDAK punya sama
 * sekali pada KEDUANYA (dicek langsung: `grep portal.care24.jp
 * scripts/atlas/baseline/en.txt` — tidak ada `target=` di baris manapun).
 * Ini BEDA dari prediksi awal ST-HOME (yang menyebut hanya banner
 * "user" sebagai baru, karena saat itu ST-HOME membandingkan kodenya
 * sendiri sebelum-dan-sesudah, bukan terhadap baseline pre-migrasi ini).
 * ST-GATE menginvestigasi selisihnya dan mengonfirmasi: KEDUA banner sudah
 * tidak punya `target=` sama sekali di baseline, jadi keduanya sah masuk
 * kelas diff yang sama di bawah ini.
 *
 * Sempit lewat GUARD (href persis ke portal.care24.jp/register atau
 * /caregiver) sebelum membongkar atributnya sama sekali — bukan pola bebas
 * yang bisa menyamarkan tautan lain. `target`/`rel` dibuang lalu SISA
 * atributnya diurutkan alfabetis sebelum dibandingkan, karena `href` juga
 * pindah posisi (dari akhir ke awal atribut) bersamaan dengan penambahan
 * target/rel — dibuktikan sebagai perubahan URUTAN atribut semata (nilai
 * setiap atribut tetap sama), bukan konten baru yang menumpang di baris
 * yang sama.
 */
const BANNER_HREF_GUARD = /href="https:\/\/portal\.care24\.jp\/(register|caregiver)"/;
const bannerTargetBlankClass: DiffClass = {
  id: "banner-target-blank-rel-noopener",
  why: 'kedua tautan ApplyBanner (register, caregiver) kini membawa target="_blank" rel="noopener noreferrer", dan href pindah ke awal daftar atribut (bukan lagi akhir) — perbaikan aksesibilitas/keamanan yang disengaja (ST-HOME), sebab kelima di luar 4 prediksi ST-HOME. TIDAK ADA di baseline pre-migrasi pada kedua banner. Dibandingkan lewat set atribut terurut (order-independent) karena hanya urutan + kehadiran target/rel yang beda, bukan nilai atribut lain.',
  canonicalize: (line) => {
    if (!BANNER_HREF_GUARD.test(line)) return line;
    const inner = line.replace(/^<a\s+/, "").replace(/>\s*$/, "");
    const attrs = (inner.match(/[a-zA-Z-]+="[^"]*"/g) ?? []).filter(
      (a) => !a.startsWith('target="') && !a.startsWith('rel="'),
    );
    attrs.sort();
    return `<a ${attrs.join(" ")}>`;
  },
};

/**
 * ST-GATE, area B (ST-HOME hero "why choose us" list -> mt-3/mt-10 wrapper).
 * Sempit: hanya mengganti `mt-10` dengan `mt-3` pada baris `<ul ...
 * flex flex-wrap gap-2.5">` — satu-satunya beda pada baris itu.
 */
const trustListWrapperClass: DiffClass = {
  id: "home-trust-list-wrapper-mt",
  why: 'wrapper <ul> daftar kepercayaan (ST-HOME) berubah margin-top dari mt-10 ke mt-3 karena <p> label baru (values.heading) kini ditempatkan di atasnya. Hanya nilai margin yang beda pada baris ini.',
  canonicalize: (line) =>
    /class="mt-(10|3) flex flex-wrap gap-2\.5"/.test(line)
      ? line.replace('class="mt-10 flex flex-wrap gap-2.5"', 'class="mt-X flex flex-wrap gap-2.5"').replace('class="mt-3 flex flex-wrap gap-2.5"', 'class="mt-X flex flex-wrap gap-2.5"')
      : line,
};

/**
 * ST-GATE, area B (ST-HOME hero "why choose us" list). Sempit: hanya
 * mengganti dua kelas Tailwind literal pada pembuka `<li>` daftar
 * kepercayaan — satu-satunya beda pada baris ini (item lain di baris yang
 * sama, mis. `style="animation-delay:..."`, tetap identik).
 */
const TRUST_ITEM_GUARD =
  'rounded-full border border-border bg-surface/80 py-2 pl-3 pr-4 text-sm font-medium text-heading shadow-sm backdrop-blur-sm animate-fade-up';
const trustItemOpenTagClass: DiffClass = {
  id: "home-trust-item-li-buka",
  why: `pembuka <li> daftar kepercayaan (ST-HOME) berganti dari class="flex items-center gap-2 ${TRUST_ITEM_GUARD}" menjadi class="flex flex-col gap-0.5 ${TRUST_ITEM_GUARD}" — item dipecah jadi dua baris (judul + body). Hanya dua kata kelas layout yang beda.`,
  canonicalize: (line) =>
    line.includes(TRUST_ITEM_GUARD)
      ? line.replace("flex items-center gap-2 " + TRUST_ITEM_GUARD, "TRUST-ITEM-LAYOUT " + TRUST_ITEM_GUARD).replace(
          "flex flex-col gap-0.5 " + TRUST_ITEM_GUARD,
          "TRUST-ITEM-LAYOUT " + TRUST_ITEM_GUARD,
        )
      : line,
};

/**
 * ST-GATE, area B (ST-HOME). Baris penutup judul item kepercayaan: dulu
 * `</span>TEKS</li>` (item ditutup langsung setelah judul), sekarang
 * `</span>TEKS</span>` (judul jadi baris tersendiri, `</li>` pindah ke
 * baris barunya sendiri — lihat `home-trust-item-li-tutup-baru` di
 * ACCEPTED_RESIDUALS). Sempit: HANYA baris yang diawali `</span>`, dan
 * hanya menyamakan tag PENUTUP paling akhir (`</li>` atau `</span>`) —
 * teks di antaranya (judul kepercayaan itu sendiri) harus identik persis
 * di kedua sisi, kalau tidak baris tetap tak-terjelaskan.
 */
const trustItemTitleCloseClass: DiffClass = {
  id: "home-trust-item-judul-tutup",
  why: '</span>JUDUL</li> (lama) menjadi </span>JUDUL</span> (baru) — judul kepercayaan dipindah jadi baris sendiri, </li> pindah ke baris baru terpisah. Teks JUDUL di antara harus identik, hanya tag penutup akhir yang beda.',
  canonicalize: (line) => {
    if (!line.startsWith("</span>")) return line;
    if (line.endsWith("</li>")) return line.slice(0, -"</li>".length) + "CLOSE";
    if (line.endsWith("</span>")) return line.slice(0, -"</span>".length) + "CLOSE";
    return line;
  },
};

/**
 * ST-GATE2 (ST-FIX7). Logo `<Image>` di Navbar dan Footer, plus baris
 * `<link rel="preload" as="image" imageSrcSet=...>` yang Next memancarkan
 * untuk logo Navbar (`priority`). Tiga lini per URL: 1 preload link + 1
 * `<img>` Navbar + 1 `<img>` Footer.
 *
 * Dua hal berubah SEKALIGUS pada baris yang sama, dan keduanya disengaja
 * (ST-FIX7): (1) dimensi intrinsik diseragamkan ke `560x210`
 * (dulu Navbar `427x160`, Footer `320x120`), yang ikut menggeser kandidat
 * `w=` di `srcSet`/`imageSrcSet` Next (mis. `w=1080`->`w=1200` untuk
 * Navbar `2x`); (2) `url=` gambar berpindah dari `/images/logo.png` lokal
 * ke media S3 Atlas — migrasi konten yang sama dengan `imageSourceClass`
 * di atas, bukan bagian dari perubahan ST-FIX7 itu sendiri.
 *
 * Sempit lewat GUARD: `url=...logo.png` (cocok untuk `/images/logo.png`
 * lokal maupun jalur S3 yang berakhiran `-logo.png`) HARUS ada di baris
 * mentah sebelum kanonikalisasi apa pun dijalankan — baris apa pun di
 * luar itu (apple-touch-icon, og:image, dst.) tidak tersentuh. Hanya
 * `url=`, `width=`, `height=`, dan angka `w=` pada query yang
 * dikanonikalisasi; `alt`, `class`, `style`, `loading`, `decoding` harus
 * tetap identik verbatim di kedua sisi, kalau tidak baris tetap
 * tak-terjelaskan. Karena `class` Navbar (`w-36 origin-left ...`) dan
 * Footer (`w-32`) tidak disentuh, kelas ini tidak bisa memasangkan baris
 * Navbar dengan baris Footer secara keliru.
 */
const LOGO_URL_GUARD = /url=[^&"']*logo\.png/i;
const logoUnifiedDimensionsClass: DiffClass = {
  id: "logo-dimensi-560x210-dan-sumber-atlas",
  why: 'ST-FIX7: dimensi intrinsik <Image> logo diseragamkan ke 560x210 (dulu Navbar 427x160, Footer 320x120), yang ikut mengubah kandidat w= di srcSet/imageSrcSet Next; url= gambar juga berpindah dari /images/logo.png lokal ke media S3 Atlas (migrasi konten, sama seperti imageSourceClass, bukan bagian dari ST-FIX7). Sempit lewat GUARD url=...logo.png; hanya url=, width=, height=, dan angka w= yang dikanonikalisasi — atribut lain (alt, class, style, loading, decoding) harus tetap identik.',
  canonicalize: (line) => {
    if (!LOGO_URL_GUARD.test(line)) return line;
    return line
      .replace(/url=[^&"']+/g, "url=GAMBAR")
      .replace(/w=\d+/g, "w=N")
      .replace(/width="\d+"/g, 'width="N"')
      .replace(/height="\d+"/g, 'height="N"');
  },
};

const DIFF_CLASSES: DiffClass[] = [
  imageSourceClass,
  navActiveStateClass,
  ogTwitterTitleBrandSuffixClass,
  twitterCardUpgradeClass,
  bannerTargetBlankClass,
  trustListWrapperClass,
  trustItemOpenTagClass,
  trustItemTitleCloseClass,
  logoUnifiedDimensionsClass,
];

type AcceptedResidual = {
  id: string;
  side: "dihapus" | "ditambah";
  /** Jumlah PERSIS yang diterima. Lebih atau kurang = GAGAL. */
  count: number;
  why: string;
  matches(line: string): boolean;
};

/**
 * Satu entri, dan entri itu sendiri adalah temuan.
 *
 * Setiap halaman kehilangan tepat satu `<link rel="preload" as="font">`
 * dibanding baseline. Ini BUKAN pengurutan ulang — tidak ada baris pengganti
 * di sisi lain; hint preload-nya benar-benar hilang. Bukti yang sudah
 * dikumpulkan, bukan dugaan:
 *   - `.next/server/next-font-manifest.json` TETAP memuat berkas font untuk
 *     `app/[lang]/layout`, jadi ini bukan soal font yang tidak terdaftar.
 *   - Rute yang masih diprerender statis (`_not-found`) MASIH memancarkan
 *     preload-nya — 1, sama dengan baseline.
 *   - Setiap rute yang dirender dinamis memancarkan 0.
 *   - woff2 yang sama masih dirujuk lewat @font-face di CSS, jadi fontnya
 *     tetap termuat; yang hilang hanya petunjuk prioritasnya.
 * Jadi: rendering dinamis menggugurkan preload next/font di versi Next ini.
 * Rendering dinamis adalah syarat yang diminta (konten CMS tanpa rebuild),
 * jadi ini biaya dari keputusan itu — dicatat di sini supaya berhenti
 * menyamar sebagai "pengurutan ulang", yang adalah salah klasifikasi saya
 * sebelumnya.
 *
 * Dampaknya nyata tapi sedang: `display: "swap"`, jadi teks tetap tampil
 * dengan font cadangan lalu bertukar — preload hanya mempersempit jendela
 * pertukaran itu. Bukan bug kebenaran, bukan pergeseran tata letak.
 */
/** Empat baris literal baru di app/[lang]/not-found.tsx (ST-F1): tautan
 * home dwibahasa (localizeHref ke '/' untuk ja dan en, dibungkus satu
 * <div>) menggantikan satu tautan campur-bahasa lama yang tidak
 * locale-aware. `_not-found.txt` adalah satu-satunya baseline "spesial"
 * yang benar-benar bisa dipicu lewat HTTP sungguhan dan diukur gerbang
 * ini — lihat komentar di fetchRaw("/__st08_parity_probe_nonexistent__")
 * lebih bawah, dan bagian "ST-F1 (area F)" di ACCEPTED_RESIDUALS. */
const NOT_FOUND_NEW_HOME_LINKS = new Set<string>([
  '<div class="flex flex-wrap items-center justify-center gap-3">',
  '<a class="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-mid" href="/">トップページへ</a>',
  '<a lang="en" class="inline-flex items-center gap-2 rounded-full border border-primary px-8 py-3 font-medium text-primary transition hover:bg-primary/10" href="/en">Back to home</a>',
  "</div>",
]);

/**
 * ST-U2 (Tugas 1/ST-09, Tugas 2, Tugas 3). Exact-string sets, same idiom as
 * `NOT_FOUND_NEW_HOME_LINKS` above — used instead of a content-blind
 * canonicalize() because these ARE genuine, deliberate content changes
 * (not "same info, different form"), so DIFF_CLASSES's canonicalization
 * mechanism does not apply (see the file-header comment on why kelas vs
 * ledger are different tools). Every set below was extracted VERBATIM from
 * a real `npx tsx scripts/atlas/verify-html-parity.ts` run's own
 * `[tak-terjelaskan]` output (temporarily printed uncapped, see the 500-cap
 * comment further down) — never hand-typed from memory, so there is no
 * transcription-error risk between what actually rendered and what these
 * sets match.
 *
 * WHY FOUR SEPARATE PAIRS FOR ONE CONCEPT ("description content changed").
 * `AcceptedResidual.count` is checked independently in EACH of this
 * script's two gates (`vs baseline`, `CMS-ON vs CMS-OFF`) — the same entry
 * fires against both gates' own removed/added pools, and MUST match the
 * SAME declared count in both, or the gate reports "TIDAK COCOK". The
 * meta-description change does NOT produce the same count in both gates:
 * - "vs baseline" gate: ALL 13 routes' description changed (baseline had
 *   old hardcoded/generic text; live now has the ST-09-approved text) — 78
 *   lines each side (13 routes x {ja,en} x {description, og:description,
 *   twitter:description}).
 * - "CMS-ON vs CMS-OFF" gate: only the 7 LEGAL routes diverge. The 6
 *   non-legal routes' `constants/seo.ts` fallback was synced to the exact
 *   ST-09 text (see that file), so CMS-ON and CMS-OFF render byte-identical
 *   description tags for them — zero diff, nothing to explain. The 7 legal
 *   routes were DELIBERATELY NOT extended with a literal fallback
 *   description (see `pageMetadata.ts`'s `titleFrom: "legal-heading"`
 *   branch, unchanged) — scope decision, not an oversight: adding a
 *   `description: Bilingual` field to `LegalSeoRoute` would grow this
 *   sub-task's claimed-file surface for a fallback that already exists and
 *   still works (the pre-existing `${heading.ja} | ${heading.en} —
 *   ${brand}` template), just less polished than the Atlas-only ST-09 copy.
 *   So CMS-OFF for these 7 routes still renders that older template while
 *   CMS-ON renders the new approved text — 42 lines each side (7 routes x
 *   {ja,en} x 3 tags). Splitting into 4 sets (old-baseline-13 /
 *   new-approved-13 / new-approved-legal7 / template-legal7) — rather than
 *   one generic `name="description"` regex — is what keeps each entry's
 *   count exactly right in whichever gate it fires in; a generic regex
 *   would either double-fire or mismatch the count in one gate or the
 *   other (verified: an earlier draft using a bare regex here failed the
 *   CMS-ON/OFF gate with "TIDAK COCOK: tercatat 78" against an actual 42).
 */
const ST_U2_DESC_OLD_ALL13 = new Set<string>([
  "<meta name=\"description\" content=\"Premium 24-hour in-home care\"/>",
  "<meta property=\"og:description\" content=\"Premium 24-hour in-home care\"/>",
  "<meta name=\"twitter:description\" content=\"Premium 24-hour in-home care\"/>",
  "<meta name=\"description\" content=\"Care24Japan Cancellation Policy — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan Cancellation Policy — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan Cancellation Policy — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Company profile of MedicalInformatics Co.,Ltd., the operator of Care 24 Japan — trade name, head office, establishment, capital and more.\"/>",
  "<meta property=\"og:description\" content=\"Company profile of MedicalInformatics Co.,Ltd., the operator of Care 24 Japan — trade name, head office, establishment, capital and more.\"/>",
  "<meta name=\"twitter:description\" content=\"Company profile of MedicalInformatics Co.,Ltd., the operator of Care 24 Japan — trade name, head office, establishment, capital and more.\"/>",
  "<meta name=\"description\" content=\"Care24Japan Care Supporter Remuneration Regulations — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan Care Supporter Remuneration Regulations — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan Care Supporter Remuneration Regulations — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Care 24 Japan care-supporter hourly wage and salary system. Hourly rates (tax included) for the caregiving and nursing courses.\"/>",
  "<meta property=\"og:description\" content=\"Care 24 Japan care-supporter hourly wage and salary system. Hourly rates (tax included) for the caregiving and nursing courses.\"/>",
  "<meta name=\"twitter:description\" content=\"Care 24 Japan care-supporter hourly wage and salary system. Hourly rates (tax included) for the caregiving and nursing courses.\"/>",
  "<meta name=\"description\" content=\"Caregiving course ¥3,740/hour, nursing course ¥6,600/hour (daytime, tax included). Care 24 Japan in-home care pricing.\"/>",
  "<meta property=\"og:description\" content=\"Caregiving course ¥3,740/hour, nursing course ¥6,600/hour (daytime, tax included). Care 24 Japan in-home care pricing.\"/>",
  "<meta name=\"twitter:description\" content=\"Caregiving course ¥3,740/hour, nursing course ¥6,600/hour (daytime, tax included). Care 24 Japan in-home care pricing.\"/>",
  "<meta name=\"description\" content=\"Privacy Policy — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Privacy Policy — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Privacy Policy — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Care Service Quasi-Mandate Contract — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Care Service Quasi-Mandate Contract — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Care Service Quasi-Mandate Contract — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"From registration to completion, in four simple steps. How to use Care 24 Japan&#x27;s services.\"/>",
  "<meta property=\"og:description\" content=\"From registration to completion, in four simple steps. How to use Care 24 Japan&#x27;s services.\"/>",
  "<meta name=\"twitter:description\" content=\"From registration to completion, in four simple steps. How to use Care 24 Japan&#x27;s services.\"/>",
  "<meta name=\"description\" content=\"Care24Japan Platform Terms &amp; Conditions (For Care Supporters) — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan Platform Terms &amp; Conditions (For Care Supporters) — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan Platform Terms &amp; Conditions (For Care Supporters) — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Care24Japan Platform Terms of Service (For Users) — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan Platform Terms of Service (For Users) — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan Platform Terms of Service (For Users) — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Notation based on the Act on Specified Commercial Transactions — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Notation based on the Act on Specified Commercial Transactions — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Notation based on the Act on Specified Commercial Transactions — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"After hospital discharge, dementia care, respite for families, end-of-life home care — the everyday situations where Care 24 Japan&#x27;s in-home care helps.\"/>",
  "<meta property=\"og:description\" content=\"After hospital discharge, dementia care, respite for families, end-of-life home care — the everyday situations where Care 24 Japan&#x27;s in-home care helps.\"/>",
  "<meta name=\"twitter:description\" content=\"After hospital discharge, dementia care, respite for families, end-of-life home care — the everyday situations where Care 24 Japan&#x27;s in-home care helps.\"/>",
  "<meta name=\"description\" content=\"ご自宅で、心安らぐ24時間の在宅ケアを\"/>",
  "<meta property=\"og:description\" content=\"ご自宅で、心安らぐ24時間の在宅ケアを\"/>",
  "<meta name=\"twitter:description\" content=\"ご自宅で、心安らぐ24時間の在宅ケアを\"/>",
  "<meta name=\"description\" content=\"Care24Japan キャンセルポリシー | Care24Japan Cancellation Policy — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan キャンセルポリシー | Care24Japan Cancellation Policy — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan キャンセルポリシー | Care24Japan Cancellation Policy — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Care 24 Japanを運営するメディカルインフォマティクス株式会社の会社概要（商号・所在地・設立・資本金など）をご案内します。\"/>",
  "<meta property=\"og:description\" content=\"Care 24 Japanを運営するメディカルインフォマティクス株式会社の会社概要（商号・所在地・設立・資本金など）をご案内します。\"/>",
  "<meta name=\"twitter:description\" content=\"Care 24 Japanを運営するメディカルインフォマティクス株式会社の会社概要（商号・所在地・設立・資本金など）をご案内します。\"/>",
  "<meta name=\"description\" content=\"Care24Japan ケアサポーター報酬規程 | Care24Japan Care Supporter Remuneration Regulations — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan ケアサポーター報酬規程 | Care24Japan Care Supporter Remuneration Regulations — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan ケアサポーター報酬規程 | Care24Japan Care Supporter Remuneration Regulations — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Care24Japan ケアサポーターの時給・給与体系。介護コース・看護コースの1時間単価（税込）をご案内します。\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan ケアサポーターの時給・給与体系。介護コース・看護コースの1時間単価（税込）をご案内します。\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan ケアサポーターの時給・給与体系。介護コース・看護コースの1時間単価（税込）をご案内します。\"/>",
  "<meta name=\"description\" content=\"介護コース1時間3,740円、看護コース1時間6,600円（税込・日中料金）。Care 24 Japanの在宅ケア料金をご案内します。\"/>",
  "<meta property=\"og:description\" content=\"介護コース1時間3,740円、看護コース1時間6,600円（税込・日中料金）。Care 24 Japanの在宅ケア料金をご案内します。\"/>",
  "<meta name=\"twitter:description\" content=\"介護コース1時間3,740円、看護コース1時間6,600円（税込・日中料金）。Care 24 Japanの在宅ケア料金をご案内します。\"/>",
  "<meta name=\"description\" content=\"プライバシーポリシー | Privacy Policy — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"プライバシーポリシー | Privacy Policy — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"プライバシーポリシー | Privacy Policy — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"ケアサービス準委任契約書 | Care Service Quasi-Mandate Contract — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"ケアサービス準委任契約書 | Care Service Quasi-Mandate Contract — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"ケアサービス準委任契約書 | Care Service Quasi-Mandate Contract — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"ご登録からサービス終了まで、4つのステップでご利用いただけます。Care 24 Japanのサービス利用の流れをご案内します。\"/>",
  "<meta property=\"og:description\" content=\"ご登録からサービス終了まで、4つのステップでご利用いただけます。Care 24 Japanのサービス利用の流れをご案内します。\"/>",
  "<meta name=\"twitter:description\" content=\"ご登録からサービス終了まで、4つのステップでご利用いただけます。Care 24 Japanのサービス利用の流れをご案内します。\"/>",
  "<meta name=\"description\" content=\"Care24Japan プラットフォーム利用規約（ケアサポーター向け） | Care24Japan Platform Terms &amp; Conditions (For Care Supporters) — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan プラットフォーム利用規約（ケアサポーター向け） | Care24Japan Platform Terms &amp; Conditions (For Care Supporters) — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan プラットフォーム利用規約（ケアサポーター向け） | Care24Japan Platform Terms &amp; Conditions (For Care Supporters) — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Care24Japan プラットフォーム利用規約（ご利用者様向け） | Care24Japan Platform Terms of Service (For Users) — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan プラットフォーム利用規約（ご利用者様向け） | Care24Japan Platform Terms of Service (For Users) — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan プラットフォーム利用規約（ご利用者様向け） | Care24Japan Platform Terms of Service (For Users) — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"特定商取引法に基づく表記 | Notation based on the Act on Specified Commercial Transactions — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"特定商取引法に基づく表記 | Notation based on the Act on Specified Commercial Transactions — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"特定商取引法に基づく表記 | Notation based on the Act on Specified Commercial Transactions — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"退院後のサポート、認知症のケア、レスパイトケア、終末期ケアなど、Care 24 Japanの在宅ケアがお役に立てるさまざまな暮らしの場面をご紹介します。\"/>",
  "<meta property=\"og:description\" content=\"退院後のサポート、認知症のケア、レスパイトケア、終末期ケアなど、Care 24 Japanの在宅ケアがお役に立てるさまざまな暮らしの場面をご紹介します。\"/>",
  "<meta name=\"twitter:description\" content=\"退院後のサポート、認知症のケア、レスパイトケア、終末期ケアなど、Care 24 Japanの在宅ケアがお役に立てるさまざまな暮らしの場面をご紹介します。\"/>",
]);

const ST_U2_DESC_NEW_ALL13 = new Set<string>([
  "<meta name=\"description\" content=\"Completely custom-made care and nursing support without medical or long-term care insurance — 24-hour presence, trained staff, family partnership.\"/>",
  "<meta property=\"og:description\" content=\"Completely custom-made care and nursing support without medical or long-term care insurance — 24-hour presence, trained staff, family partnership.\"/>",
  "<meta name=\"twitter:description\" content=\"Completely custom-made care and nursing support without medical or long-term care insurance — 24-hour presence, trained staff, family partnership.\"/>",
  "<meta name=\"description\" content=\"Care24Japan&#x27;s policy on the conditions and fees when a user changes or cancels a confirmed visiting care, nursing, or rehabilitation service reservation.\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan&#x27;s policy on the conditions and fees when a user changes or cancels a confirmed visiting care, nursing, or rehabilitation service reservation.\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan&#x27;s policy on the conditions and fees when a user changes or cancels a confirmed visiting care, nursing, or rehabilitation service reservation.\"/>",
  "<meta name=\"description\" content=\"Company profile of MedicalInformatics Co., Ltd., the operator of Care 24 Japan — trade name, head office, establishment date, capital and representative.\"/>",
  "<meta property=\"og:description\" content=\"Company profile of MedicalInformatics Co., Ltd., the operator of Care 24 Japan — trade name, head office, establishment date, capital and representative.\"/>",
  "<meta name=\"twitter:description\" content=\"Company profile of MedicalInformatics Co., Ltd., the operator of Care 24 Japan — trade name, head office, establishment date, capital and representative.\"/>",
  "<meta name=\"description\" content=\"Regulations on how MedicalInformatics Co., Ltd. pays remuneration to Care Supporters who provide services as independent contractors on Care24Japan.\"/>",
  "<meta property=\"og:description\" content=\"Regulations on how MedicalInformatics Co., Ltd. pays remuneration to Care Supporters who provide services as independent contractors on Care24Japan.\"/>",
  "<meta name=\"twitter:description\" content=\"Regulations on how MedicalInformatics Co., Ltd. pays remuneration to Care Supporters who provide services as independent contractors on Care24Japan.\"/>",
  "<meta name=\"description\" content=\"Care 24 Japan&#x27;s hourly wage and salary system for care supporters, showing tax-included hourly rates for the caregiving and nursing courses.\"/>",
  "<meta property=\"og:description\" content=\"Care 24 Japan&#x27;s hourly wage and salary system for care supporters, showing tax-included hourly rates for the caregiving and nursing courses.\"/>",
  "<meta name=\"twitter:description\" content=\"Care 24 Japan&#x27;s hourly wage and salary system for care supporters, showing tax-included hourly rates for the caregiving and nursing courses.\"/>",
  "<meta name=\"description\" content=\"Transparent, all-inclusive pricing. No membership or registration fee, minimum usage 2 hours, all prices tax included. Care 24 Japan pricing for users.\"/>",
  "<meta property=\"og:description\" content=\"Transparent, all-inclusive pricing. No membership or registration fee, minimum usage 2 hours, all prices tax included. Care 24 Japan pricing for users.\"/>",
  "<meta name=\"twitter:description\" content=\"Transparent, all-inclusive pricing. No membership or registration fee, minimum usage 2 hours, all prices tax included. Care 24 Japan pricing for users.\"/>",
  "<meta name=\"description\" content=\"MedicalInformatics Co., Ltd.&#x27;s privacy policy for Care 24 Japan — how personal information from stakeholders is protected as a core management priority.\"/>",
  "<meta property=\"og:description\" content=\"MedicalInformatics Co., Ltd.&#x27;s privacy policy for Care 24 Japan — how personal information from stakeholders is protected as a core management priority.\"/>",
  "<meta name=\"twitter:description\" content=\"MedicalInformatics Co., Ltd.&#x27;s privacy policy for Care 24 Japan — how personal information from stakeholders is protected as a core management priority.\"/>",
  "<meta name=\"description\" content=\"A document certifying the individual quasi-mandate contract between a Contractor and Care Supporter, formed under Care24Japan&#x27;s Terms of Use.\"/>",
  "<meta property=\"og:description\" content=\"A document certifying the individual quasi-mandate contract between a Contractor and Care Supporter, formed under Care24Japan&#x27;s Terms of Use.\"/>",
  "<meta name=\"twitter:description\" content=\"A document certifying the individual quasi-mandate contract between a Contractor and Care Supporter, formed under Care24Japan&#x27;s Terms of Use.\"/>",
  "<meta name=\"description\" content=\"From member registration through your care supporter&#x27;s home visit to the completion report — how Care 24 Japan&#x27;s service flow works, step by step.\"/>",
  "<meta property=\"og:description\" content=\"From member registration through your care supporter&#x27;s home visit to the completion report — how Care 24 Japan&#x27;s service flow works, step by step.\"/>",
  "<meta name=\"twitter:description\" content=\"From member registration through your care supporter&#x27;s home visit to the completion report — how Care 24 Japan&#x27;s service flow works, step by step.\"/>",
  "<meta name=\"description\" content=\"Terms of Use for Care Supporters — nurses and caregivers registering on Care24Japan, the home-care matching platform run by MedicalInformatics Co., Ltd.\"/>",
  "<meta property=\"og:description\" content=\"Terms of Use for Care Supporters — nurses and caregivers registering on Care24Japan, the home-care matching platform run by MedicalInformatics Co., Ltd.\"/>",
  "<meta name=\"twitter:description\" content=\"Terms of Use for Care Supporters — nurses and caregivers registering on Care24Japan, the home-care matching platform run by MedicalInformatics Co., Ltd.\"/>",
  "<meta name=\"description\" content=\"Terms of Service for Care24Japan users — the non-insurance care matching platform operated by MedicalInformatics Co., Ltd., covering conditions of use.\"/>",
  "<meta property=\"og:description\" content=\"Terms of Service for Care24Japan users — the non-insurance care matching platform operated by MedicalInformatics Co., Ltd., covering conditions of use.\"/>",
  "<meta name=\"twitter:description\" content=\"Terms of Service for Care24Japan users — the non-insurance care matching platform operated by MedicalInformatics Co., Ltd., covering conditions of use.\"/>",
  "<meta name=\"description\" content=\"Notation based on Japan&#x27;s Act on Specified Commercial Transactions for MedicalInformatics Co., Ltd. — name, address, representative and contact details.\"/>",
  "<meta property=\"og:description\" content=\"Notation based on Japan&#x27;s Act on Specified Commercial Transactions for MedicalInformatics Co., Ltd. — name, address, representative and contact details.\"/>",
  "<meta name=\"twitter:description\" content=\"Notation based on Japan&#x27;s Act on Specified Commercial Transactions for MedicalInformatics Co., Ltd. — name, address, representative and contact details.\"/>",
  "<meta name=\"description\" content=\"After hospital discharge, dementia care, respite for family caregivers, and end-of-life support — situations Care 24 Japan&#x27;s in-home care helps with.\"/>",
  "<meta property=\"og:description\" content=\"After hospital discharge, dementia care, respite for family caregivers, and end-of-life support — situations Care 24 Japan&#x27;s in-home care helps with.\"/>",
  "<meta name=\"twitter:description\" content=\"After hospital discharge, dementia care, respite for family caregivers, and end-of-life support — situations Care 24 Japan&#x27;s in-home care helps with.\"/>",
  "<meta name=\"description\" content=\"医療保険や介護保険を利用しない、完全オーダーメイドの介護・看護ご支援サービス。24時間の安心、専門スタッフ、ご家族との連携でお困りごとを解消します。\"/>",
  "<meta property=\"og:description\" content=\"医療保険や介護保険を利用しない、完全オーダーメイドの介護・看護ご支援サービス。24時間の安心、専門スタッフ、ご家族との連携でお困りごとを解消します。\"/>",
  "<meta name=\"twitter:description\" content=\"医療保険や介護保険を利用しない、完全オーダーメイドの介護・看護ご支援サービス。24時間の安心、専門スタッフ、ご家族との連携でお困りごとを解消します。\"/>",
  "<meta name=\"description\" content=\"Care24Japanで予約確定した訪問介護・訪問看護・リハビリ等のサービスを変更・キャンセルする場合の条件とキャンセル料を定めたポリシーです。\"/>",
  "<meta property=\"og:description\" content=\"Care24Japanで予約確定した訪問介護・訪問看護・リハビリ等のサービスを変更・キャンセルする場合の条件とキャンセル料を定めたポリシーです。\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japanで予約確定した訪問介護・訪問看護・リハビリ等のサービスを変更・キャンセルする場合の条件とキャンセル料を定めたポリシーです。\"/>",
  "<meta name=\"description\" content=\"メディカルインフォマティクス株式会社の商号・本社所在地・設立年月日・資本金・代表者など、Care 24 Japan運営会社の会社概要をご案内します。\"/>",
  "<meta property=\"og:description\" content=\"メディカルインフォマティクス株式会社の商号・本社所在地・設立年月日・資本金・代表者など、Care 24 Japan運営会社の会社概要をご案内します。\"/>",
  "<meta name=\"twitter:description\" content=\"メディカルインフォマティクス株式会社の商号・本社所在地・設立年月日・資本金・代表者など、Care 24 Japan運営会社の会社概要をご案内します。\"/>",
  "<meta name=\"description\" content=\"Care24Japanで準委任契約により独立した請負人として業務を提供するケアサポーターへの、報酬の支払いに関する基本事項を定めた規程です。\"/>",
  "<meta property=\"og:description\" content=\"Care24Japanで準委任契約により独立した請負人として業務を提供するケアサポーターへの、報酬の支払いに関する基本事項を定めた規程です。\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japanで準委任契約により独立した請負人として業務を提供するケアサポーターへの、報酬の支払いに関する基本事項を定めた規程です。\"/>",
  "<meta name=\"description\" content=\"介護コース・看護コースの1時間あたりの単価を税込表記でご案内する、登録料無料のCare 24 Japanケアサポーター時給・給与体系ページです。\"/>",
  "<meta property=\"og:description\" content=\"介護コース・看護コースの1時間あたりの単価を税込表記でご案内する、登録料無料のCare 24 Japanケアサポーター時給・給与体系ページです。\"/>",
  "<meta name=\"twitter:description\" content=\"介護コース・看護コースの1時間あたりの単価を税込表記でご案内する、登録料無料のCare 24 Japanケアサポーター時給・給与体系ページです。\"/>",
  "<meta name=\"description\" content=\"入会金・登録料は無料、最低利用2時間からご利用いただける、わかりやすい税込料金体系です。内容により変動する場合があるCare 24 Japanの料金ページ。\"/>",
  "<meta property=\"og:description\" content=\"入会金・登録料は無料、最低利用2時間からご利用いただける、わかりやすい税込料金体系です。内容により変動する場合があるCare 24 Japanの料金ページ。\"/>",
  "<meta name=\"twitter:description\" content=\"入会金・登録料は無料、最低利用2時間からご利用いただける、わかりやすい税込料金体系です。内容により変動する場合があるCare 24 Japanの料金ページ。\"/>",
  "<meta name=\"description\" content=\"メディカルインフォマティクス株式会社が、取得した個人情報の保護を経営上の重要課題と位置づけ、全社員に周知徹底する基本方針を定めたCare 24 Japanのプライバシーポリシーです。\"/>",
  "<meta property=\"og:description\" content=\"メディカルインフォマティクス株式会社が、取得した個人情報の保護を経営上の重要課題と位置づけ、全社員に周知徹底する基本方針を定めたCare 24 Japanのプライバシーポリシーです。\"/>",
  "<meta name=\"twitter:description\" content=\"メディカルインフォマティクス株式会社が、取得した個人情報の保護を経営上の重要課題と位置づけ、全社員に周知徹底する基本方針を定めたCare 24 Japanのプライバシーポリシーです。\"/>",
  "<meta name=\"description\" content=\"メディカルインフォマティクス株式会社の「Care24Japan」利用規約に基づき、契約者とケアサポーター間で成立する個別準委任契約の内容を証明する書面です。\"/>",
  "<meta property=\"og:description\" content=\"メディカルインフォマティクス株式会社の「Care24Japan」利用規約に基づき、契約者とケアサポーター間で成立する個別準委任契約の内容を証明する書面です。\"/>",
  "<meta name=\"twitter:description\" content=\"メディカルインフォマティクス株式会社の「Care24Japan」利用規約に基づき、契約者とケアサポーター間で成立する個別準委任契約の内容を証明する書面です。\"/>",
  "<meta name=\"description\" content=\"ご登録からケアサポーターとのご予約確定、ご自宅への訪問、サービス終了後のご報告レポートまで、順を追ってご案内するCare 24 Japanのご利用の流れです。\"/>",
  "<meta property=\"og:description\" content=\"ご登録からケアサポーターとのご予約確定、ご自宅への訪問、サービス終了後のご報告レポートまで、順を追ってご案内するCare 24 Japanのご利用の流れです。\"/>",
  "<meta name=\"twitter:description\" content=\"ご登録からケアサポーターとのご予約確定、ご自宅への訪問、サービス終了後のご報告レポートまで、順を追ってご案内するCare 24 Japanのご利用の流れです。\"/>",
  "<meta name=\"description\" content=\"メディカルインフォマティクス株式会社が運営する保険外在宅支援マッチングプラットフォーム「Care24Japan」の、ケアサポーター向け利用規約です。\"/>",
  "<meta property=\"og:description\" content=\"メディカルインフォマティクス株式会社が運営する保険外在宅支援マッチングプラットフォーム「Care24Japan」の、ケアサポーター向け利用規約です。\"/>",
  "<meta name=\"twitter:description\" content=\"メディカルインフォマティクス株式会社が運営する保険外在宅支援マッチングプラットフォーム「Care24Japan」の、ケアサポーター向け利用規約です。\"/>",
  "<meta name=\"description\" content=\"メディカルインフォマティクス株式会社が運営する保険外サービスマッチングプラットフォーム「Care24Japan」の、ご利用者様向け利用条件を定めた利用規約です。\"/>",
  "<meta property=\"og:description\" content=\"メディカルインフォマティクス株式会社が運営する保険外サービスマッチングプラットフォーム「Care24Japan」の、ご利用者様向け利用条件を定めた利用規約です。\"/>",
  "<meta name=\"twitter:description\" content=\"メディカルインフォマティクス株式会社が運営する保険外サービスマッチングプラットフォーム「Care24Japan」の、ご利用者様向け利用条件を定めた利用規約です。\"/>",
  "<meta name=\"description\" content=\"メディカルインフォマティクス株式会社の名称・住所・代表者・お問い合わせ専用メールアドレスなど、特定商取引法に基づく表記をまとめたページです。\"/>",
  "<meta property=\"og:description\" content=\"メディカルインフォマティクス株式会社の名称・住所・代表者・お問い合わせ専用メールアドレスなど、特定商取引法に基づく表記をまとめたページです。\"/>",
  "<meta name=\"twitter:description\" content=\"メディカルインフォマティクス株式会社の名称・住所・代表者・お問い合わせ専用メールアドレスなど、特定商取引法に基づく表記をまとめたページです。\"/>",
  "<meta name=\"description\" content=\"退院後の生活支援、認知症ケア、ご家族のためのレスパイトケア、終末期ケアなど、Care 24 Japanの在宅ケアが役立つさまざまな暮らしの場面をご紹介します。\"/>",
  "<meta property=\"og:description\" content=\"退院後の生活支援、認知症ケア、ご家族のためのレスパイトケア、終末期ケアなど、Care 24 Japanの在宅ケアが役立つさまざまな暮らしの場面をご紹介します。\"/>",
  "<meta name=\"twitter:description\" content=\"退院後の生活支援、認知症ケア、ご家族のためのレスパイトケア、終末期ケアなど、Care 24 Japanの在宅ケアが役立つさまざまな暮らしの場面をご紹介します。\"/>",
]);

const ST_U2_DESC_NEW_LEGAL7_CMS_ON = new Set<string>([
  "<meta name=\"description\" content=\"メディカルインフォマティクス株式会社が、取得した個人情報の保護を経営上の重要課題と位置づけ、全社員に周知徹底する基本方針を定めたCare 24 Japanのプライバシーポリシーです。\"/>",
  "<meta property=\"og:description\" content=\"メディカルインフォマティクス株式会社が、取得した個人情報の保護を経営上の重要課題と位置づけ、全社員に周知徹底する基本方針を定めたCare 24 Japanのプライバシーポリシーです。\"/>",
  "<meta name=\"twitter:description\" content=\"メディカルインフォマティクス株式会社が、取得した個人情報の保護を経営上の重要課題と位置づけ、全社員に周知徹底する基本方針を定めたCare 24 Japanのプライバシーポリシーです。\"/>",
  "<meta name=\"description\" content=\"MedicalInformatics Co., Ltd.&#x27;s privacy policy for Care 24 Japan — how personal information from stakeholders is protected as a core management priority.\"/>",
  "<meta property=\"og:description\" content=\"MedicalInformatics Co., Ltd.&#x27;s privacy policy for Care 24 Japan — how personal information from stakeholders is protected as a core management priority.\"/>",
  "<meta name=\"twitter:description\" content=\"MedicalInformatics Co., Ltd.&#x27;s privacy policy for Care 24 Japan — how personal information from stakeholders is protected as a core management priority.\"/>",
  "<meta name=\"description\" content=\"メディカルインフォマティクス株式会社が運営する保険外サービスマッチングプラットフォーム「Care24Japan」の、ご利用者様向け利用条件を定めた利用規約です。\"/>",
  "<meta property=\"og:description\" content=\"メディカルインフォマティクス株式会社が運営する保険外サービスマッチングプラットフォーム「Care24Japan」の、ご利用者様向け利用条件を定めた利用規約です。\"/>",
  "<meta name=\"twitter:description\" content=\"メディカルインフォマティクス株式会社が運営する保険外サービスマッチングプラットフォーム「Care24Japan」の、ご利用者様向け利用条件を定めた利用規約です。\"/>",
  "<meta name=\"description\" content=\"Terms of Service for Care24Japan users — the non-insurance care matching platform operated by MedicalInformatics Co., Ltd., covering conditions of use.\"/>",
  "<meta property=\"og:description\" content=\"Terms of Service for Care24Japan users — the non-insurance care matching platform operated by MedicalInformatics Co., Ltd., covering conditions of use.\"/>",
  "<meta name=\"twitter:description\" content=\"Terms of Service for Care24Japan users — the non-insurance care matching platform operated by MedicalInformatics Co., Ltd., covering conditions of use.\"/>",
  "<meta name=\"description\" content=\"メディカルインフォマティクス株式会社が運営する保険外在宅支援マッチングプラットフォーム「Care24Japan」の、ケアサポーター向け利用規約です。\"/>",
  "<meta property=\"og:description\" content=\"メディカルインフォマティクス株式会社が運営する保険外在宅支援マッチングプラットフォーム「Care24Japan」の、ケアサポーター向け利用規約です。\"/>",
  "<meta name=\"twitter:description\" content=\"メディカルインフォマティクス株式会社が運営する保険外在宅支援マッチングプラットフォーム「Care24Japan」の、ケアサポーター向け利用規約です。\"/>",
  "<meta name=\"description\" content=\"Terms of Use for Care Supporters — nurses and caregivers registering on Care24Japan, the home-care matching platform run by MedicalInformatics Co., Ltd.\"/>",
  "<meta property=\"og:description\" content=\"Terms of Use for Care Supporters — nurses and caregivers registering on Care24Japan, the home-care matching platform run by MedicalInformatics Co., Ltd.\"/>",
  "<meta name=\"twitter:description\" content=\"Terms of Use for Care Supporters — nurses and caregivers registering on Care24Japan, the home-care matching platform run by MedicalInformatics Co., Ltd.\"/>",
  "<meta name=\"description\" content=\"メディカルインフォマティクス株式会社の名称・住所・代表者・お問い合わせ専用メールアドレスなど、特定商取引法に基づく表記をまとめたページです。\"/>",
  "<meta property=\"og:description\" content=\"メディカルインフォマティクス株式会社の名称・住所・代表者・お問い合わせ専用メールアドレスなど、特定商取引法に基づく表記をまとめたページです。\"/>",
  "<meta name=\"twitter:description\" content=\"メディカルインフォマティクス株式会社の名称・住所・代表者・お問い合わせ専用メールアドレスなど、特定商取引法に基づく表記をまとめたページです。\"/>",
  "<meta name=\"description\" content=\"Notation based on Japan&#x27;s Act on Specified Commercial Transactions for MedicalInformatics Co., Ltd. — name, address, representative and contact details.\"/>",
  "<meta property=\"og:description\" content=\"Notation based on Japan&#x27;s Act on Specified Commercial Transactions for MedicalInformatics Co., Ltd. — name, address, representative and contact details.\"/>",
  "<meta name=\"twitter:description\" content=\"Notation based on Japan&#x27;s Act on Specified Commercial Transactions for MedicalInformatics Co., Ltd. — name, address, representative and contact details.\"/>",
  "<meta name=\"description\" content=\"メディカルインフォマティクス株式会社の「Care24Japan」利用規約に基づき、契約者とケアサポーター間で成立する個別準委任契約の内容を証明する書面です。\"/>",
  "<meta property=\"og:description\" content=\"メディカルインフォマティクス株式会社の「Care24Japan」利用規約に基づき、契約者とケアサポーター間で成立する個別準委任契約の内容を証明する書面です。\"/>",
  "<meta name=\"twitter:description\" content=\"メディカルインフォマティクス株式会社の「Care24Japan」利用規約に基づき、契約者とケアサポーター間で成立する個別準委任契約の内容を証明する書面です。\"/>",
  "<meta name=\"description\" content=\"A document certifying the individual quasi-mandate contract between a Contractor and Care Supporter, formed under Care24Japan&#x27;s Terms of Use.\"/>",
  "<meta property=\"og:description\" content=\"A document certifying the individual quasi-mandate contract between a Contractor and Care Supporter, formed under Care24Japan&#x27;s Terms of Use.\"/>",
  "<meta name=\"twitter:description\" content=\"A document certifying the individual quasi-mandate contract between a Contractor and Care Supporter, formed under Care24Japan&#x27;s Terms of Use.\"/>",
  "<meta name=\"description\" content=\"Care24Japanで準委任契約により独立した請負人として業務を提供するケアサポーターへの、報酬の支払いに関する基本事項を定めた規程です。\"/>",
  "<meta property=\"og:description\" content=\"Care24Japanで準委任契約により独立した請負人として業務を提供するケアサポーターへの、報酬の支払いに関する基本事項を定めた規程です。\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japanで準委任契約により独立した請負人として業務を提供するケアサポーターへの、報酬の支払いに関する基本事項を定めた規程です。\"/>",
  "<meta name=\"description\" content=\"Regulations on how MedicalInformatics Co., Ltd. pays remuneration to Care Supporters who provide services as independent contractors on Care24Japan.\"/>",
  "<meta property=\"og:description\" content=\"Regulations on how MedicalInformatics Co., Ltd. pays remuneration to Care Supporters who provide services as independent contractors on Care24Japan.\"/>",
  "<meta name=\"twitter:description\" content=\"Regulations on how MedicalInformatics Co., Ltd. pays remuneration to Care Supporters who provide services as independent contractors on Care24Japan.\"/>",
  "<meta name=\"description\" content=\"Care24Japanで予約確定した訪問介護・訪問看護・リハビリ等のサービスを変更・キャンセルする場合の条件とキャンセル料を定めたポリシーです。\"/>",
  "<meta property=\"og:description\" content=\"Care24Japanで予約確定した訪問介護・訪問看護・リハビリ等のサービスを変更・キャンセルする場合の条件とキャンセル料を定めたポリシーです。\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japanで予約確定した訪問介護・訪問看護・リハビリ等のサービスを変更・キャンセルする場合の条件とキャンセル料を定めたポリシーです。\"/>",
  "<meta name=\"description\" content=\"Care24Japan&#x27;s policy on the conditions and fees when a user changes or cancels a confirmed visiting care, nursing, or rehabilitation service reservation.\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan&#x27;s policy on the conditions and fees when a user changes or cancels a confirmed visiting care, nursing, or rehabilitation service reservation.\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan&#x27;s policy on the conditions and fees when a user changes or cancels a confirmed visiting care, nursing, or rehabilitation service reservation.\"/>",
]);

const ST_U2_DESC_TEMPLATE_LEGAL7_CMS_OFF = new Set<string>([
  "<meta name=\"description\" content=\"プライバシーポリシー | Privacy Policy — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"プライバシーポリシー | Privacy Policy — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"プライバシーポリシー | Privacy Policy — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Privacy Policy — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Privacy Policy — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Privacy Policy — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Care24Japan プラットフォーム利用規約（ご利用者様向け） | Care24Japan Platform Terms of Service (For Users) — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan プラットフォーム利用規約（ご利用者様向け） | Care24Japan Platform Terms of Service (For Users) — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan プラットフォーム利用規約（ご利用者様向け） | Care24Japan Platform Terms of Service (For Users) — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Care24Japan Platform Terms of Service (For Users) — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan Platform Terms of Service (For Users) — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan Platform Terms of Service (For Users) — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Care24Japan プラットフォーム利用規約（ケアサポーター向け） | Care24Japan Platform Terms &amp; Conditions (For Care Supporters) — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan プラットフォーム利用規約（ケアサポーター向け） | Care24Japan Platform Terms &amp; Conditions (For Care Supporters) — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan プラットフォーム利用規約（ケアサポーター向け） | Care24Japan Platform Terms &amp; Conditions (For Care Supporters) — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Care24Japan Platform Terms &amp; Conditions (For Care Supporters) — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan Platform Terms &amp; Conditions (For Care Supporters) — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan Platform Terms &amp; Conditions (For Care Supporters) — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"特定商取引法に基づく表記 | Notation based on the Act on Specified Commercial Transactions — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"特定商取引法に基づく表記 | Notation based on the Act on Specified Commercial Transactions — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"特定商取引法に基づく表記 | Notation based on the Act on Specified Commercial Transactions — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Notation based on the Act on Specified Commercial Transactions — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Notation based on the Act on Specified Commercial Transactions — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Notation based on the Act on Specified Commercial Transactions — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"ケアサービス準委任契約書 | Care Service Quasi-Mandate Contract — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"ケアサービス準委任契約書 | Care Service Quasi-Mandate Contract — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"ケアサービス準委任契約書 | Care Service Quasi-Mandate Contract — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Care Service Quasi-Mandate Contract — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Care Service Quasi-Mandate Contract — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Care Service Quasi-Mandate Contract — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Care24Japan ケアサポーター報酬規程 | Care24Japan Care Supporter Remuneration Regulations — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan ケアサポーター報酬規程 | Care24Japan Care Supporter Remuneration Regulations — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan ケアサポーター報酬規程 | Care24Japan Care Supporter Remuneration Regulations — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Care24Japan Care Supporter Remuneration Regulations — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan Care Supporter Remuneration Regulations — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan Care Supporter Remuneration Regulations — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Care24Japan キャンセルポリシー | Care24Japan Cancellation Policy — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan キャンセルポリシー | Care24Japan Cancellation Policy — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan キャンセルポリシー | Care24Japan Cancellation Policy — Care 24 Japan\"/>",
  "<meta name=\"description\" content=\"Care24Japan Cancellation Policy — Care 24 Japan\"/>",
  "<meta property=\"og:description\" content=\"Care24Japan Cancellation Policy — Care 24 Japan\"/>",
  "<meta name=\"twitter:description\" content=\"Care24Japan Cancellation Policy — Care 24 Japan\"/>",
]);

const ST_U2_LEGAL_TITLE_OLD = new Set<string>([
  "<title>Care24Japan Cancellation Policy | Care 24 Japan</title>",
  "<title>Care24Japan Care Supporter Remuneration Regulations | Care 24 Japan</title>",
  "<title>Care24Japan Platform Terms &amp; Conditions (For Care Supporters) | Care 24 Japan</title>",
  "<title>Care24Japan Platform Terms of Service (For Users) | Care 24 Japan</title>",
  "<title>Care24Japan キャンセルポリシー | Care 24 Japan</title>",
  "<title>Care24Japan ケアサポーター報酬規程 | Care 24 Japan</title>",
  "<title>Care24Japan プラットフォーム利用規約（ケアサポーター向け） | Care 24 Japan</title>",
  "<title>Care24Japan プラットフォーム利用規約（ご利用者様向け） | Care 24 Japan</title>",
]);

const ST_U2_LEGAL_TITLE_NEW = new Set<string>([
  "<title>Care24Japan Cancellation Policy</title>",
  "<title>Care24Japan Care Supporter Remuneration Regulations</title>",
  "<title>Care24Japan Platform Terms &amp; Conditions (For Care Supporters)</title>",
  "<title>Care24Japan Platform Terms of Service (For Users)</title>",
  "<title>Care24Japan キャンセルポリシー</title>",
  "<title>Care24Japan ケアサポーター報酬規程</title>",
  "<title>Care24Japan プラットフォーム利用規約（ケアサポーター向け）</title>",
  "<title>Care24Japan プラットフォーム利用規約（ご利用者様向け）</title>",
]);

// --- 2026-08-21 perbaikan konten legal (permintaan user, tindak lanjut audit
// bagian E "konten placeholder tayang publik").
//
// Tiga suntingan, dua halaman:
//   1. /tokushoho (ja & en) — nomor telepon asli menggantikan instruksi
//      editorial ke diri sendiri. 特定商取引法 mewajibkan kontak yang bisa
//      dihubungi; yang tayang sebelumnya adalah catatan "kalau nomor publik
//      sudah ada, tulis langsung" PLUS janji "akan diungkap bila diminta" —
//      padahal nomornya ada dan sudah tampil di header, footer dan blok
//      kontak. Diambil dari constants/copy.ts#contactPhone, bukan diketik
//      ulang, supaya halaman 特商法 tidak bisa berbeda dengan sisa situs.
//   2. /quasi-mandate (ja) — catatan implementasi internal tim dihapus.
//   3. Sisi EN tokushoho: dua paragraf usang menyatu jadi satu baris nomor.
//
// constants/legal.ts DAN Atlas disemai ke nilai yang sama (reseed legal
// dengan opt-in ATLAS_ALLOW_LEGAL_RESEED=1, lalu drift --write pada dua
// halaman itu), jadi CMS-ON dan CMS-OFF identik — gerbang CMS-ON vs CMS-OFF
// tidak melaporkan apa pun untuk perubahan ini.
//
// Placeholder [X,XXX] di /quasi-mandate SENGAJA dibiarkan (keputusan user):
// nilai-nilai itu per-penugasan, bukan data situs.
// ---------------------------------------------------------------------
const LEGAL_CONTACT_FIX_OLD = new Set<string>([
  "<p>*If you contact us at the address above, we will disclose our contact phone number without delay.</p>",
  "<p>(*If a public phone number is set, state it directly as &quot;Phone Number: 03-XXXX-XXXX&quot;)</p>",
  "<p>※「マッチング成立時にシステムから自動発行（メール送信または画面表示）される電子書面」としてシステムに組み込む想定</p>",
  "<p>【問い合わせ専用メールアドレス】 からお問い合わせください。 ※上記宛にお問い合わせいただければ、連絡先電話番号についても遅滞なく開示いたします。 （※公開用電話番号を設定した場合は、「電話番号03-XXXX-XXXX」と直接記載）</p>",
]);
const LEGAL_CONTACT_FIX_NEW = new Set<string>([
  "<p>Phone Number: 0120-001-224</p>",
  "<p>【問い合わせ専用メールアドレス】 からお問い合わせください。</p>",
  "<p>電話番号：0120-001-224</p>",
]);

/** The share card served from the app's own `public/` folder, i.e. the
 * `constants/seo.ts#fallbackOgImage` layer. Distinguishing it from the Atlas
 * media URL is what lets the two og:image ledger entries below fire in one
 * gate each instead of colliding in both. URL-agnostic on purpose: the Atlas
 * url changes whenever the card is re-uploaded, the local path does not. */
const LOCAL_CARD = /\/images\/og-card/;

const ST_U2_YEN_OLD = new Set<string>([

  "<span class=\"text-5xl font-bold tabular-nums text-heading\">¥6,000</span>",
  "<p class=\"mt-1 text-lg text-body\">Tax included ¥6,600</p>",
  "<span class=\"text-5xl font-bold tabular-nums text-heading\">¥3,400</span>",
  "<p class=\"mt-1 text-lg text-body\">Tax included ¥3,740</p>",
  "<dd class=\"mt-1.5 text-lg font-bold text-heading\">¥330/hour</dd>",
  "<dd class=\"mt-1.5 text-lg font-bold text-heading\">¥990 separately</dd>",
  "<dd class=\"whitespace-pre-line text-sm leading-relaxed text-body\">¥100 million</dd>",
]);

const ST_U2_YEN_NEW = new Set<string>([
  "<span class=\"text-5xl font-bold tabular-nums text-heading\">JPY 6,000</span>",
  "<p class=\"mt-1 text-lg text-body\">Tax included JPY 6,600</p>",
  "<span class=\"text-5xl font-bold tabular-nums text-heading\">JPY 3,400</span>",
  "<p class=\"mt-1 text-lg text-body\">Tax included JPY 3,740</p>",
  "<dd class=\"mt-1.5 text-lg font-bold text-heading\">JPY 330/hour</dd>",
  "<dd class=\"mt-1.5 text-lg font-bold text-heading\">JPY 990 separately</dd>",
  "<dd class=\"whitespace-pre-line text-sm leading-relaxed text-body\">JPY 100 million</dd>",
]);

const ACCEPTED_RESIDUALS: AcceptedResidual[] = [
  {
    id: "preload-font-hilang-pada-rute-dinamis",
    side: "dihapus",
    count: 26,
    why: "rendering dinamis (syarat: konten CMS tanpa rebuild) menggugurkan <link rel=preload as=font> dari next/font. Font tetap termuat lewat @font-face; hanya petunjuk prioritas yang hilang. 26 = 13 rute x {ja,en}.",
    matches: (line) => /rel="preload"[^>]*as="font"/.test(line),
  },
  // --- ST-05 (area A): metadata CMS-driven baru, murni aditif ---------
  {
    id: "seo-hreflang-x-default",
    side: "ditambah",
    count: 26,
    why: "ST-05 / audit item hreflang x-default: routeAlternates() kini menyetel languages['x-default'], baris <link rel=alternate hrefLang=x-default> baru di 13 rute x {ja,en}.",
    matches: (line) => /hrefLang="x-default"/.test(line),
  },
  {
    id: "seo-og-url",
    side: "ditambah",
    count: 26,
    why: "ST-05 / audit item og:url: pageMetadata() kini menyetel openGraph.url pada 13 rute x {ja,en} (termasuk home, ditutup lewat pageMetadata({key:'home',...}) di app/[lang]/page.tsx).",
    matches: (line) => /property="og:url"/.test(line),
  },
  {
    id: "seo-og-locale-alternate",
    side: "ditambah",
    count: 26,
    why: "ST-05 / audit item og:locale:alternate: openGraph.alternateLocale baru pada 13 rute x {ja,en}.",
    matches: (line) => /property="og:locale:alternate"/.test(line),
  },
  {
    id: "seo-og-image",
    side: "ditambah",
    count: 26,
    why: "ST-05 / audit item og:image: openGraph.images baru (CMS og_image kosong di 15/15 halaman -> constants/seo.ts#fallbackOgImage) pada 13 rute x {ja,en}.",
    matches: (line) => /property="og:image"/.test(line) && !LOCAL_CARD.test(line),
  },
  {
    id: "seo-twitter-image",
    side: "ditambah",
    count: 26,
    why: "Efek samping Next dari og:image baru: postProcessMetadata (resolve-metadata.js:621-654) mengisi twitter:image dari openGraph.images begitu ada, pada 13 rute x {ja,en}.",
    matches: (line) => /name="twitter:image"/.test(line) && !LOCAL_CARD.test(line),
  },
  // --- ST-HOME (area D): 4 field baru + 1 sebab kelima (banner) -------
  {
    id: "home-values-heading",
    side: "ditambah",
    count: 2,
    why: "ST-HOME / audit item values.heading: label baru di atas trust-strip, 1x ja + 1x en.",
    matches: (line) => /<p class="mt-10 text-sm font-semibold text-body animate-fade-up">/.test(line),
  },
  {
    id: "home-values-item-body",
    side: "ditambah",
    count: 6,
    why: "ST-HOME / audit item values.items[].body: baris kedua baru per pill (3 item x {ja,en} = 6). Prediksi awal menyebut 18 baris untuk restrukturisasi ini, tapi entri ini sendiri hanya menyumbang 6 — selisihnya bukan salah hitung, melainkan baris LAIN dari restrukturisasi yang sama ditangani oleh entri terpisah: home-trust-item-li-buka, home-trust-item-judul-tutup, home-trust-item-icon-wrap, home-trust-item-li-tutup-baru, home-trust-list-wrapper-mt.",
    matches: (line) => /<span class="pl-6 text-xs font-normal text-body">/.test(line),
  },
  {
    id: "home-trust-item-icon-wrap",
    side: "ditambah",
    count: 6,
    why: "ST-HOME: ikon+judul trust-strip kini dibungkus <span class=\"flex items-center gap-2\"> tersendiri (bagian dari restrukturisasi values.items[].body, 3 item x {ja,en}) — baris baru murni, tidak ada padanan lama untuk dipasangkan.",
    matches: (line) => line.trim() === '<span class="flex items-center gap-2">',
  },
  {
    id: "home-trust-item-li-tutup-baru",
    side: "ditambah",
    count: 6,
    why: "ST-HOME: </li> pindah jadi baris tersendiri setelah body <span> baru (pasangan dari home-trust-item-judul-tutup di DIFF_CLASSES, 3 item x {ja,en}).",
    matches: (line) => line.trim() === "</li>",
  },
  {
    id: "home-examples-hours-label",
    side: "ditambah",
    count: 6,
    why: "ST-HOME / audit item examples.hoursLabel: label baru sebelum rentang jam pada 3 kasus x {ja,en}.",
    matches: (line) => /<span class="mr-1 text-lg font-normal text-muted">/.test(line),
  },
  {
    id: "home-hours-p-buka-baru",
    side: "ditambah",
    count: 6,
    why: "ST-HOME: <p> pembungkus rentang jam kini berdiri sendiri (isinya pindah ke baris hours-label baru) — pasangan dari home-hours-p-gabungan-lama, 3 kasus x {ja,en}.",
    matches: (line) => line.trim() === '<p class="text-lg font-bold tabular-nums text-heading">',
  },
  {
    id: "home-hours-p-gabungan-lama",
    side: "dihapus",
    count: 6,
    why: "ST-HOME: baris <p> lama yang menggabungkan rentang jam + durasi dalam satu baris, digantikan oleh home-hours-p-buka-baru + home-examples-hours-label, 3 kasus x {ja,en}.",
    matches: (line) =>
      /^<p class="text-lg font-bold tabular-nums text-heading">\d{1,2}:\d{2}/.test(line),
  },
  {
    id: "home-contact-hours",
    side: "dihapus",
    count: 2,
    why: "Aug 2026 webpage revision: home.contact.hours removed from the homepage contact block (1x ja + 1x en). Spec #3 deletes reception hours UI.",
    matches: (line) => /<p class="mt-1 text-sm text-muted">/.test(line),
  },
  // NOTE: /faq and /contact are live App Router pages (Aug 2026 revision) but
  // are intentionally NOT in ROUTES yet — no committed baseline HTML exists
  // for them. Add them here only after capturing ja__/faq.txt, en__/faq.txt,
  // ja__/contact.txt, and en__/contact.txt into scripts/atlas/baseline/.
  // --- ST-F1 (area F): satu-satunya baseline spesial yang terukur -----
  {
    id: "st-f1-not-found-description",
    side: "dihapus",
    count: 1,
    why: 'ST-F1 / audit item deskripsi global-not-found: deskripsi lama English-only dibuang, diganti versi dwibahasa (lihat st-f1-not-found-description-baru untuk sisi ditambah).',
    matches: (line) =>
      line === '<meta name="description" content="The page you are looking for does not exist."/>',
  },
  {
    id: "st-f1-not-found-description-baru",
    side: "ditambah",
    count: 1,
    why: "ST-F1 / audit item deskripsi global-not-found: deskripsi dwibahasa baru (JA lalu EN) menggantikan versi English-only.",
    matches: (line) =>
      line ===
      '<meta name="description" content="お探しのページが見つかりません。 / The page you are looking for does not exist."/>',
  },
  {
    id: "st-f1-not-found-home-link-lama",
    side: "dihapus",
    count: 1,
    why: "ST-F1 / audit item tautan home global-not-found: satu tautan campur-bahasa lama (href=/, teks JA+EN dicampur) dibuang, diganti dua tautan locale-correct (lihat st-f1-not-found-home-links-baru).",
    matches: (line) =>
      line ===
      '<a class="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-mid" href="/">トップページへ / Back to home</a>',
  },
  {
    id: "st-f1-not-found-home-links-baru",
    side: "ditambah",
    count: 4,
    why: "ST-F1 / audit item tautan home global-not-found: global-not-found.tsx berada di luar app/[lang]/ sehingga tidak tahu bahasa pengunjung, karena itu localizeHref('/','ja') dan localizeHref('/','en') dirender sebagai dua tautan terpisah dibungkus <div> — 1 <div> buka + 2 <a> + 1 </div> tutup.",
    matches: (line) => NOT_FOUND_NEW_HOME_LINKS.has(line),
  },
  // --- ST-FIX3 (icons + manifest + robots/theme-color): 5 tag baru, murni aditif ---
  {
    id: "seo-theme-color",
    side: "ditambah",
    count: 26,
    why: 'ST-FIX3: export const viewport baru menyetel themeColor="#2b7ec1" (--color-primary), dirender sebagai <meta name="theme-color"> pada 13 rute x {ja,en}.',
    matches: (line) => /<meta name="theme-color" content="[^"]*"\/>/.test(line),
  },
  {
    id: "seo-robots",
    side: "ditambah",
    count: 26,
    why: 'ST-FIX3: metadata.robots baru (index, follow) di app/[lang]/layout.tsx, dirender sebagai <meta name="robots"> pada 13 rute x {ja,en}.',
    matches: (line) => /<meta name="robots" content="[^"]*"\/>/.test(line),
  },
  {
    id: "seo-googlebot",
    side: "ditambah",
    count: 26,
    why: 'ST-FIX3: efek turunan Next dari metadata.robots.googleBot — <meta name="googlebot"> dipancarkan otomatis begitu robots.googleBot diisi, pada 13 rute x {ja,en}.',
    matches: (line) => /<meta name="googlebot" content="[^"]*"\/>/.test(line),
  },
  {
    id: "seo-apple-touch-icon",
    side: "ditambah",
    count: 26,
    why: 'ST-FIX3: icons.apple baru di app/[lang]/layout.tsx (public/apple-touch-icon.png, dibuat dari public/images/logo.png lewat scripts/atlas/make-icons.ts), dirender sebagai <link rel="apple-touch-icon"> pada 13 rute x {ja,en}. Dibatasi [lang]/layout.tsx, tidak mencapai global-not-found.tsx.',
    matches: (line) => /<link rel="apple-touch-icon" href="[^"]*"\/>/.test(line),
  },
  {
    id: "seo-manifest-link",
    side: "ditambah",
    count: 27,
    why: 'ST-FIX3: app/manifest.ts baru (file convention Next, di luar app/[lang]/, jadi site-wide) — Next otomatis menyuntikkan <link rel="manifest"> pada 13 rute x {ja,en} = 26, PLUS 1 di halaman _not-found (global-not-found.tsx tidak mewarisi layout [lang] tapi tetap kena karena file convention ini berlaku seluruh situs).',
    matches: (line) => /<link rel="manifest" href="[^"]*"\/>/.test(line),
  },
  // --- ST-U1: constants/pricing.ts#formatYen, keputusan konten pengguna ---
  {
    id: "en-yen-symbol-diganti-jpy-lama-dihapus",
    side: "dihapus",
    count: 24,
    why: 'formatYen() kini merender jumlah pada halaman EN sebagai "JPY 1,234" alih-alih "¥1,234" (konvensi mata uang Inggris, keputusan klien Agu 2026); halaman JA tidak berubah. Baris ini adalah representasi lama "¥..." di baseline pre-migrasi, pada rute EN saja. 24 = 16 di /en/fees.txt (2 kursus x 4 baris x kolom pelanggan+supporter) + 8 di /en/pricing.txt (2 kursus x {2 baris basic + 2 baris tambahan}).',
    matches: (line) => /^<(?:td|p|dd)\b[^>]*>¥[\d,]+<\/(?:td|p|dd)>$/.test(line),
  },
  {
    id: "en-yen-symbol-diganti-jpy-baru-ditambah",
    side: "ditambah",
    count: 24,
    why: 'Pasangan dari en-yen-symbol-diganti-jpy-lama-dihapus: baris baru dengan awalan "JPY " menggantikan "¥", digit setelahnya identik dengan versi lama. Sama 24 = 16 /en/fees.txt + 8 /en/pricing.txt.',
    matches: (line) => /^<(?:td|p|dd)\b[^>]*>JPY [\d,]+<\/(?:td|p|dd)>$/.test(line),
  },
  // --- ST-U2 Tugas 1 (ST-09): 26 meta description disetujui user, ditulis
  // ke Atlas (page.seo.description / seo_translations.en.description) —
  // lihat output/meta-descriptions-review.md Bagian 1 (di luar repo, dirujuk
  // untuk konteks, bukan dibaca oleh skrip ini). Sebelumnya field ini KOSONG
  // di Atlas untuk ke-13 rute, jadi setiap route sebenarnya SUDAH merender
  // sebuah description non-kosong (fallback constants/seo.ts untuk 6 rute
  // non-legal, atau template `${heading.ja} | ${heading.en} — ${brand}`
  // untuk 7 rute legal) — perubahan ini adalah pergantian ISI, bukan
  // penambahan field baru, karena itu masuk ledger (isi nyata berubah),
  // bukan DIFF_CLASSES (tidak ada bentuk yang bisa dibuktikan sama).
  // ---------------------------------------------------------------------
  {
    id: "st-u2-desc-lama-13-rute-dihapus",
    side: "dihapus",
    count: 78,
    why: 'ST-09: isi lama <meta name="description">/og:description/twitter:description (fallback constants/seo.ts atau template legal-heading) digantikan oleh 26 deskripsi yang disetujui user. 78 = 13 rute x {ja,en} x 3 tag.',
    matches: (line) => ST_U2_DESC_OLD_ALL13.has(line),
  },
  {
    id: "st-u2-desc-baru-13-rute-ditambah",
    side: "ditambah",
    count: 78,
    why: 'Pasangan dari st-u2-desc-lama-13-rute-dihapus: 26 deskripsi baru yang disetujui user (meta-descriptions-review.md Bagian 1), sekarang live di Atlas page.seo.description / seo_translations.en.description. 78 = 13 rute x {ja,en} x 3 tag.',
    matches: (line) => ST_U2_DESC_NEW_ALL13.has(line),
  },
  {
    id: "st-u2-desc-cms-on-legal7-dihapus",
    side: "dihapus",
    count: 42,
    why: "ST-09 / gerbang CMS-ON vs CMS-OFF: untuk 7 rute legal, CMS-ON (Atlas) sekarang merender deskripsi baru yang disetujui user, sedangkan CMS-OFF masih memakai template lama (lihat st-u2-desc-cms-off-legal7-fallback-template-ditambah) — keputusan sengaja, BUKAN kelalaian: LegalSeoRoute (constants/seo.ts) sengaja TIDAK diperluas dengan literal description baru untuk menjaga cakupan file yang diklaim sub-task ini tetap kecil; fallback lama tetap berfungsi, hanya kurang selaras dengan copy yang disetujui. 42 = 7 rute x {ja,en} x 3 tag. Konten baris ini SAMA PERSIS dengan separuh dari st-u2-desc-baru-13-rute-ditambah (subset legal-nya) — sengaja dua entri berbeda karena jumlahnya berbeda di tiap gerbang (78 di 'vs baseline', 42 di 'CMS-ON vs CMS-OFF'), lihat komentar di atas ST_U2_DESC_OLD_ALL13 untuk alasan lengkapnya.",
    matches: (line) => ST_U2_DESC_NEW_LEGAL7_CMS_ON.has(line),
  },
  {
    id: "st-u2-desc-cms-off-legal7-fallback-template-ditambah",
    side: "ditambah",
    count: 42,
    why: "Pasangan dari st-u2-desc-cms-on-legal7-dihapus: CMS-OFF (Atlas mati) untuk 7 rute legal tetap merender template lama `${heading.ja} | ${heading.en} — ${brand}` (pageMetadata.ts, titleFrom: \"legal-heading\", tidak diubah) — fallback yang lebih tua, tapi tetap benar dan bilingual. 42 = 7 rute x {ja,en} x 3 tag.",
    matches: (line) => ST_U2_DESC_TEMPLATE_LEGAL7_CMS_OFF.has(line),
  },
  // --- ST-U2 Tugas 2: title.absolute untuk 4 halaman legal yang seo.title
  // Atlas-nya sudah memuat nama brand sendiri (Care24Japan/Care 24 Japan)
  // — lihat titleContainsBrand di features/seo/pageMetadata.ts. Hanya
  // <title> yang berubah bentuk (absolute, bukan lagi lewat title.template);
  // og:title/twitter:title TIDAK berubah pada 4 halaman ini karena
  // buildPageMetadataFields sudah pakai bare title (tanpa sufiks brand) di
  // og:title untuk kasus ini SEBELUM ledger ini ditulis juga — lihat
  // ogTwitterTitleBrandSuffixClass di atas, kelas itu sudah menjelaskan pola
  // og-title-tanpa-sufiks secara umum sejak ST-FIX1, jadi og:title/
  // twitter:title 4 halaman ini tidak menghasilkan baris tak-terjelaskan
  // baru sama sekali.
  // ---------------------------------------------------------------------
  {
    id: "st-u2-legal-title-absolute-lama-dihapus",
    side: "dihapus",
    count: 8,
    why: 'ST-U2 Tugas 2: <title> lama untuk 4 halaman legal (terms-for-users, terms-for-care-supporters, compensation, cancellation-policy) lewat title.template selalu menambahkan " | Care 24 Japan" — tapi seo.title Atlas ke-4 halaman ini SUDAH memuat brand sendiri ("Care24Japan ..."), jadi brand tampil DUA KALI dengan dua ejaan berbeda. 8 = 4 rute x {ja,en}.',
    matches: (line) => ST_U2_LEGAL_TITLE_OLD.has(line),
  },
  {
    id: "st-u2-legal-title-absolute-baru-ditambah",
    side: "ditambah",
    count: 8,
    why: "Pasangan dari st-u2-legal-title-absolute-lama-dihapus: titleContainsBrand() mendeteksi brand sudah ada di title, buildPageMetadataFields merender title: { absolute: title } (bypass title.template sepenuhnya, mekanisme sama seperti home) — brand hanya tampil sekali. 8 = 4 rute x {ja,en}. Terverifikasi ke live Atlas (bukan dari daftar hardcoded): keempat rute ini yang seo.title-nya benar-benar memuat brand pada tanggal penulisan ledger ini.",
    matches: (line) => ST_U2_LEGAL_TITLE_NEW.has(line),
  },
  // --- ST-U2 Tugas 3: ¥ -> JPY untuk pembaca EN, 6 field di halaman home
  // (home-care-course, home-nursing-course, home-care-course-fee x2) + 1
  // field di halaman company (company-row "Capital"). constants/copy.ts
  // (fallback) dan Atlas (live, block data EN) disinkronkan ke nilai yang
  // sama, jadi CMS-ON dan CMS-OFF identik untuk ketujuh field ini — gerbang
  // CMS-ON vs CMS-OFF tidak melaporkan apa pun untuk perubahan ini.
  // ---------------------------------------------------------------------
  {
    id: "st-u2-en-yen-ke-jpy-home-company-lama-dihapus",
    side: "dihapus",
    count: 7,
    why: 'ST-U2 Tugas 3 (keputusan user "en ya en", konsisten dengan formatYen ST-U1): representasi lama "¥..." pada 6 field halaman home (price_amount x2, price_tax_included x2, home-care-course-fee.value x2) + 1 field company-row "Capital". 7 baris.',
    matches: (line) => ST_U2_YEN_OLD.has(line),
  },
  {
    id: "st-u2-en-yen-ke-jpy-home-company-baru-ditambah",
    side: "ditambah",
    count: 7,
    why: 'Pasangan dari st-u2-en-yen-ke-jpy-home-company-lama-dihapus: baris baru berawalan "JPY " menggantikan "¥", angka setelahnya identik. 7 baris.',
    matches: (line) => ST_U2_YEN_NEW.has(line),
  },

  {
    id: "legal-kontak-placeholder-lama-dihapus",
    side: "dihapus",
    count: 4,
    why: "Perbaikan konten legal 2026-08-21 (audit bagian E): instruksi editorial ke diri sendiri dan janji \"nomor akan diungkap bila diminta\" di /tokushoho (1 paragraf JA gabungan + 2 paragraf EN), plus catatan implementasi internal tim di /quasi-mandate (ja). 4 baris.",
    matches: (line) => LEGAL_CONTACT_FIX_OLD.has(line),
  },
  {
    id: "legal-kontak-placeholder-baru-ditambah",
    side: "ditambah",
    count: 3,
    why: "Pasangan dari legal-kontak-placeholder-lama-dihapus: nomor telepon asli 0120-001-224 (dari constants/copy.ts#contactPhone) pada sisi JA dan EN /tokushoho, plus baris email JA yang kini berdiri sendiri setelah kalimat usang dicabut. 3 baris, bukan 4 — catatan internal /quasi-mandate dihapus tanpa pengganti.",
    matches: (line) => LEGAL_CONTACT_FIX_NEW.has(line),
  },

  {
    id: "og-image-cms-off-kartu-lokal",
    side: "ditambah",
    count: 26,
    why: "Gerbang CMS-ON vs CMS-OFF: sejak seo.og_image terisi di Atlas (13 rute x {ja,en}), CMS-ON merender url media Atlas sedangkan CMS-OFF tetap merender kartu lokal constants/seo.ts#fallbackOgImage. Ini sisi CMS-OFF. 26 = 13 rute x {ja,en}. (Sempat tercatat 24: rute home tidak pernah benar-benar diukur gerbang ini karena `seenRoutes` merekonstruksi slug dari nama berkas dan mengubah `ja.txt` jadi `.txt`. Angkanya dicatat apa adanya waktu itu, lalu sebabnya diperbaiki — bukan dibulatkan.)",
    matches: (line) => /property="og:image"/.test(line) && LOCAL_CARD.test(line),
  },
  {
    id: "og-image-cms-on-media-atlas",
    side: "dihapus",
    count: 26,
    why: "Pasangan dari og-image-cms-off-kartu-lokal: sisi CMS-ON, url media Atlas. Jumlah sama persis (26) karena setiap baris kartu lokal punya lawan satu-satu.",
    matches: (line) => /property="og:image"/.test(line) && !LOCAL_CARD.test(line),
  },
  {
    id: "twitter-image-cms-off-kartu-lokal",
    side: "ditambah",
    count: 26,
    why: "Efek samping Next yang sama seperti seo-twitter-image: postProcessMetadata mengisi twitter:image dari openGraph.images, jadi perpecahan og:image di atas terduplikasi di twitter:image. Sisi CMS-OFF.",
    matches: (line) => /name="twitter:image"/.test(line) && LOCAL_CARD.test(line),
  },
  {
    id: "twitter-image-cms-on-media-atlas",
    side: "dihapus",
    count: 26,
    why: "Pasangan dari twitter-image-cms-off-kartu-lokal: sisi CMS-ON.",
    matches: (line) => /name="twitter:image"/.test(line) && !LOCAL_CARD.test(line),
  },
];

type Classification = {
  /** Baris identik yang sekadar berpindah posisi. */
  reordered: number;
  /** id kelas -> jumlah PASANGAN baris yang dijelaskannya. */
  byClass: Map<string, number>;
  /** id ledger -> jumlah baris yang cocok. */
  byResidual: Map<string, number>;
  /** Yang tidak dijelaskan apa pun. Inilah yang menggagalkan gerbang. */
  unexplainedRemoved: string[];
  unexplainedAdded: string[];
};

function emptyClassification(): Classification {
  return {
    reordered: 0,
    byClass: new Map(),
    byResidual: new Map(),
    unexplainedRemoved: [],
    unexplainedAdded: [],
  };
}

function bump(map: Map<string, number>, key: string, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

/** Buang dari `list` sebanyak `budget` menyatakan, dicocokkan lewat `keyOf`. */
function subtract(list: string[], budget: Map<string, number>, keyOf: (l: string) => string): string[] {
  const remaining = new Map(budget);
  const kept: string[] = [];
  for (const line of list) {
    const key = keyOf(line);
    const left = remaining.get(key) ?? 0;
    if (left > 0) remaining.set(key, left - 1);
    else kept.push(line);
  }
  return kept;
}

function intersect(a: string[], b: string[], keyOf: (l: string) => string): Map<string, number> {
  const countA = new Map<string, number>();
  for (const l of a) bump(countA, keyOf(l));
  const common = new Map<string, number>();
  const countB = new Map<string, number>();
  for (const l of b) bump(countB, keyOf(l));
  for (const [k, n] of countA) {
    const m = countB.get(k) ?? 0;
    if (m > 0) common.set(k, Math.min(n, m));
  }
  return common;
}

/**
 * Menjelaskan sebanyak mungkin perbedaan satu halaman, dan mengembalikan
 * sisanya apa adanya.
 *
 * Urutannya penting dan sengaja dari yang paling ketat ke paling longgar:
 * kecocokan verbatim (pengurutan ulang) dulu, baru kelas, baru ledger. Sebuah
 * baris tidak pernah dihitung dua kali.
 */
function classifyPage(removed: string[], added: string[], into: Classification): void {
  // 1. Baris yang identik persis di kedua sisi = sekadar berpindah posisi.
  const identity = (l: string) => l;
  const moved = intersect(removed, added, identity);
  for (const n of moved.values()) into.reordered += n;
  let rb = subtract(removed, moved, identity);
  let ra = subtract(added, moved, identity);

  // 2. Kelas: pasangan yang menjadi identik setelah kanonikalisasi.
  for (const cls of DIFF_CLASSES) {
    if (rb.length === 0 || ra.length === 0) break;
    const common = intersect(rb, ra, cls.canonicalize);
    let matched = 0;
    for (const n of common.values()) matched += n;
    if (matched === 0) continue;
    bump(into.byClass, cls.id, matched);
    rb = subtract(rb, common, cls.canonicalize);
    ra = subtract(ra, common, cls.canonicalize);
  }

  // 3. Ledger: sisa yang sudah diselidiki dan diterima, dihitung ketat.
  for (const entry of ACCEPTED_RESIDUALS) {
    const target = entry.side === "dihapus" ? rb : ra;
    const hit = target.filter((l) => entry.matches(l));
    if (hit.length === 0) continue;
    bump(into.byResidual, entry.id, hit.length);
    const kept = target.filter((l) => !entry.matches(l));
    if (entry.side === "dihapus") rb = kept;
    else ra = kept;
  }

  into.unexplainedRemoved.push(...rb);
  into.unexplainedAdded.push(...ra);
}

/** Cetak hasil klasifikasi, dan kembalikan apakah ia menggagalkan gerbang. */
function reportClassification(label: string, c: Classification): boolean {
  log(`\n  --- Klasifikasi: ${label} ---`);
  if (c.reordered > 0) {
    log(`  [urut-ulang]  ${c.reordered} baris identik hanya berpindah posisi (isi tidak berubah).`);
  }
  for (const cls of DIFF_CLASSES) {
    const n = c.byClass.get(cls.id);
    if (!n) continue;
    log(`  [${cls.id}]  ${n} pasangan baris — ${cls.why}`);
  }

  let ledgerFailed = false;
  for (const entry of ACCEPTED_RESIDUALS) {
    const n = c.byResidual.get(entry.id) ?? 0;
    if (n === 0) continue;
    const ok = n === entry.count;
    if (!ok) ledgerFailed = true;
    log(
      `  [ledger:${entry.id}]  ${n} baris ${entry.side}` +
        (ok
          ? ` (persis seperti yang tercatat: ${entry.count}) — ${entry.why}`
          : `  <<< TIDAK COCOK: tercatat ${entry.count}. Jumlah berubah berarti ada yang bergeser; selidiki, jangan ubah angkanya begitu saja.`),
    );
  }

  const unexplained = c.unexplainedRemoved.length + c.unexplainedAdded.length;
  if (unexplained === 0) {
    log("  [tak-terjelaskan]  tidak ada.");
  } else {
    log(`  [tak-terjelaskan]  ${unexplained} baris — INI yang menggagalkan gerbang:`);
    // Cap dinaikkan dari 25 -> 500 (ST-U2): 25 tidak cukup untuk menulis
    // entri ledger yang presisi saat satu perubahan bergeser >25 baris
    // sekaligus (mis. 26 rute x 3 tag deskripsi meta) — sebelumnya harus
    // menebak isi baris yang terpotong "... N baris lainnya".
    for (const l of c.unexplainedRemoved.slice(0, 500)) log(`        - ${l}`);
    if (c.unexplainedRemoved.length > 500)
      log(`        ... (${c.unexplainedRemoved.length - 500} baris dihapus lainnya)`);
    for (const l of c.unexplainedAdded.slice(0, 500)) log(`        + ${l}`);
    if (c.unexplainedAdded.length > 500)
      log(`        ... (${c.unexplainedAdded.length - 500} baris ditambah lainnya)`);
  }
  return ledgerFailed || unexplained > 0;
}

type PageResult = {
  key: PageKey;
  baselineMissing: boolean;
  identicalToBaseline: boolean;
  diffsVsBaseline: Hunk[];
  ariaCurrentNowJa?: boolean;
  ariaCurrentBaseline?: boolean;
};

async function main() {
  assertBaselineUsable();

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
    // `favicon.ico` di baseline-raw TIDAK punya rute HTTP yang memicunya
    // secara normal (`_global-error` hanya terpicu oleh error render yang
    // tak tertangani, `favicon.ico` disajikan sebagai file statis tanpa
    // lewat App Router) — sengaja dilewati di sini, bukan dibuang diam-diam.
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
  const rawOff = new Map<string, string>();

  if (buildOff.success) {
    const serverOff = startServer(envOff, PORT_CMS_OFF, "CMS-OFF");
    try {
      await waitForServer(`${baseUrlOff}/`);
      for (const k of keys) {
        const raw = await fetchRaw(baseUrlOff, k.urlPath);
        rawOff.set(k.baselineFile, raw);
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
  const baselineClass = emptyClassification();

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
      // Klasifikasi memakai SEMUA hunk, bukan 40 pertama yang tercetak —
      // pemotongan di atas hanya membatasi panjang log, bukan analisis.
      classifyPage(
        diffs.flatMap((h) => h.before),
        diffs.flatMap((h) => h.after),
        baselineClass,
      );
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
  const abClass = emptyClassification();
  // Route slugs come straight from ROUTES, not reconstructed from baseline
  // filenames. The old form stripped the `ja`/`en` prefix off each filename,
  // which works for `ja__pricing.txt` -> `pricing.txt` but turns home's
  // `ja.txt` into `.txt` — never the empty string the branches below test
  // for. Home therefore looked up `ja__.txt`, a file that does not exist,
  // read `""` for both builds, compared empty to empty, and reported "sama"
  // while being counted twice toward the identical tally. The site's biggest
  // CMS-driven page was the one page this gate never actually measured. The
  // printed label gave it away — `/.txt` instead of `/` — for as long as this
  // gate has existed.
  const seenRoutes = new Set(ROUTES.map((r) => (r.slug === "" ? "" : `${r.slug}.txt`)));

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
      classifyPage(jaDiffs.flatMap((h) => h.before), jaDiffs.flatMap((h) => h.after), abClass);
      for (const h of jaDiffs.slice(0, 10)) {
        log(`      [ja ${routeLabel}] dekat baris ${h.atLine}:`);
        for (const line of h.before) log(`        - ${line}`);
        for (const line of h.after) log(`        + ${line}`);
      }
    }
    if (enDiffs.length === 0) abIdentical++;
    else {
      abFailures.push({ file: enFile, diffs: enDiffs.length });
      classifyPage(enDiffs.flatMap((h) => h.before), enDiffs.flatMap((h) => h.after), abClass);
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
  // Pertanyaan 5 (INFORMASIONAL, tidak memengaruhi lulus/gagal): diff
  // key-set JSON-LD CMS-ON vs CMS-OFF, dibaca dari HTML MENTAH sebelum
  // normalizeHtml membuang <script>. Lihat komentar di extractJsonLdKeySet.
  // ---------------------------------------------------------------------
  log(
    "\n########## 5. JSON-LD key-set: CMS-ON vs CMS-OFF (INFORMASIONAL — tidak memengaruhi lulus/gagal) ##########",
  );
  if (buildOff.success) {
    let anyDiff = false;
    for (const k of keys) {
      const onKeys = extractJsonLdKeySet(rawOn.get(k.baselineFile) ?? "");
      const offKeys = extractJsonLdKeySet(rawOff.get(k.baselineFile) ?? "");
      const onlyOn = [...onKeys].filter((x) => !offKeys.has(x)).sort();
      const onlyOff = [...offKeys].filter((x) => !onKeys.has(x)).sort();
      if (onlyOn.length === 0 && onlyOff.length === 0) continue;
      anyDiff = true;
      log(`  ${k.urlPath.padEnd(28)} JSON-LD key-set beda:`);
      for (const key of onlyOn) log(`      + hanya di CMS-ON: ${key}`);
      for (const key of onlyOff) log(`      - hanya di CMS-OFF: ${key}`);
    }
    if (!anyDiff) log("  tidak ada beda key-set JSON-LD di 26 URL manapun.");
    log(
      "  (murni informasional — normalizeHtml membuang <script> sebelum perbandingan lulus/gagal di atas, jadi isi JSON-LD TIDAK PERNAH memengaruhi HASIL LULUS/GAGAL, benar atau salah isinya.)",
    );
  } else {
    log("  dilewati — build CMS-OFF gagal, tidak ada rawOff untuk dibandingkan.");
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

  // Verdict sekarang ditentukan oleh KLASIFIKASI, bukan oleh "ada baris beda
  // atau tidak". Jumlah mentah di atas tetap dicetak apa adanya — yang berubah
  // adalah bahwa skrip ini sekarang menyatakan sendiri mana yang terbukti
  // wajar dan mana yang tidak, alih-alih menyerahkannya ke penilaian manual
  // yang tidak ikut ter-commit. Perhatikan bahwa ini TIDAK melonggarkan
  // gerbang: satu baris yang tidak masuk kelas mana pun dan tidak ada di
  // ledger tetap membuatnya merah, dan jumlah ledger yang bergeser juga.
  const baselineUnexplained = reportClassification("vs baseline pre-migrasi", baselineClass);
  const abUnexplained = buildOff.success
    ? reportClassification("CMS-ON vs CMS-OFF", abClass)
    : true;

  const gateFailed = baselineUnexplained || abUnexplained || !buildOff.success;
  if (gateFailed) {
    log(
      "\nHASIL: GAGAL — ada perbedaan yang TIDAK terjelaskan oleh kelas mana pun " +
        "dan tidak tercatat di ledger (atau jumlah ledger bergeser, atau build " +
        "CMS-OFF gagal). Lihat blok [tak-terjelaskan] di atas.",
    );
  } else {
    log(
      "\nHASIL: LULUS — setiap baris beda terjelaskan: pengurutan ulang, kelas " +
        "yang terbukti lewat kanonikalisasi, atau entri ledger dengan jumlah persis. " +
        "Tidak ada perbedaan konten yang tak terhitung.",
    );
  }

  process.exitCode = gateFailed ? 1 : 0;
}

main().catch((err) => {
  console.error("\nSkrip gagal dijalankan:", err);
  process.exitCode = 2;
});
