# Studi Mendalam: Atlas CMS → marketing-web

> ## ⚠️ KOREKSI PASCA-IMPLEMENTASI (2026-08-20)
> Dokumen di bawah ini adalah riset **pra-implementasi** (2026-08-19). Implementasi sudah
> selesai dan **tiga kesimpulan utama di bawah ini terbukti salah**, diverifikasi empiris
> ke BE live `https://api-c24jp.sipsedutech.id`:
>
> 1. **Rate limit (baris 20, §6.1).** Diklaim "60 request/menit per API key" → **salah**.
>    Rate limit BE ini sebenarnya **2.000.000/menit**. Kesimpulan "fetch per-request tidak
>    layak, wajib SSG/ISR" tidak berlaku.
> 2. **Strategi render (baris 163, §6.2, seluruh §6).** Direkomendasikan "ISR + webhook",
>    lengkap rencana receiver `app/api/atlas/revalidate/route.ts` → **tidak jadi dipakai**.
>    Yang benar-benar ter-implementasi: `export const dynamic = "force-dynamic"` di
>    `app/[lang]/layout.tsx` + `cache: "no-store"` di `features/cms/client.ts`. Tidak ada
>    webhook, tidak ada ISR, tidak ada route `revalidate`. Keputusan produk: editor harus
>    melihat suntingannya langsung tanpa rebuild.
> 3. **Dua fetch untuk dua bahasa (baris 328).** Diasumsikan JA dan EN butuh dua request
>    terpisah (`locale=ja` + `locale=en`) → **salah**. Satu request mengembalikan keduanya
>    sekaligus asal parameter `locale` **dikosongkan**. Bukti kode:
>    `backend/internal/page/usecase/public_get_page.go:181` →
>    `if locale == "" { return false }` (tidak ada penyaringan locale, semua terjemahan
>    lolos). Karena itu loader memakai `atlas.raw.get()`, bukan `atlas.pages.get()` (yang
>    mengerucut ke satu locale). Konsekuensi: lewat `raw.get`, field `data` datang sebagai
>    **JSON string**, wajib `JSON.parse` — kalau lupa, field jadi `undefined` diam-diam.
>
> Arsitektur yang benar-benar ter-implementasi ada di `features/cms/` (client + loader per
> area) dan `scripts/atlas/` (schema + seed). Entry **tidak** dipakai sama sekali untuk
> konten bilingual karena jalur publik membuang terjemahan
> (`backend/internal/entry/usecase/public_get_entry.go:94` → `entry.Translations = nil`).
>
> Sisa dokumen di bawah ini dibiarkan apa adanya sebagai catatan sejarah riset.

Status: **riset saja, belum ada implementasi.** Dokumen ini adalah hasil pembelajaran
Atlas CMS dan pemetaannya ke isi `marketing-web` yang sekarang 100% statis.

Tanggal: 2026-08-19
Sumber: `docs.atlas.latellu.com`, `@latellu/atlas-sdk`, `@latellu/atlas-cli`,
`@latellu/atlas-mcp`, `@latellu/atlas-agent-skills`, plus MCP server Atlas yang
aktif di sesi ini (dipakai untuk membaca workspace nyata).

---

## 1. Ringkasan eksekutif

| Poin | Temuan |
|---|---|
| Bisa? | Ya. Semua teks/angka/tanggal/gambar termasuk navbar, footer, layout, metadata bisa dipindah ke Atlas. |
| Cara utama | `@latellu/atlas-sdk` (delivery client, server-side) + `@latellu/atlas-cli` (codegen tipe) di Next.js. |
| Blocker utama | **Atlas tidak punya tipe field array/repeater/objek bersarang.** Struktur `constants/copy.ts` penuh array bersarang (kartu → daftar item, case → jadwal jam). Ini butuh keputusan pemodelan, bukan sekadar port. |
| Blocker kedua | Rate limit default **60 request/menit per API key**. Fetch per-request (`no-store`) akan kena limit. Wajib ISR/SSG + webhook revalidate. (lihat koreksi di atas) |
| Blocker ketiga | UI sekarang **menampilkan JA dan EN bersamaan** di beberapa tempat (`TabPanel`, `<title>` legal). Model locale Atlas = satu locale per request. Perlu penanganan khusus. |
| Workspace | API key yang terpasang sekarang menunjuk ke workspace sandbox `ilham123's Workspace` (1 content type sampah, **0 locale**, 0 page). Workspace produksi Care 24 belum ada. |
| Estimasi konten | ±265 pasang string bilingual di `copy.ts` + ±439 blok dokumen legal + 22 aset media + 2 tabel harga × 2 kursus × 4 baris. |

---

## 2. Anatomi Atlas — 4 permukaan, 3 bidang akses

### 2.1 Paket npm

| Paket | Versi terbaru | Peran | Dipakai di mana |
|---|---|---|---|
| `@latellu/atlas-sdk` | **0.3.0** (11 Jul 2026) | Delivery client (baca) + Management client (tulis) | Delivery: di `marketing-web` server-side. Management: script migrasi. |
| `@latellu/atlas-cli` | **0.1.5** (7 Jul 2026) | Generate `atlas.types.ts` dari schema workspace | `npm run atlas:types`, hasil di-commit |
| `@latellu/atlas-mcp` | **1.6.1** (12 Agu 2026) | Tool MCP untuk agent (aku) mengoperasikan konten | Sesi Claude Code, seeding & audit |
| `@latellu/atlas-agent-skills` | **0.6.0** (26 Jul 2026) | Skill + config MCP | Plugin yang terpasang di sini masih **0.5.1** — lihat §9 |

### 2.2 Tiga bidang (plane)

| Plane | Key prefix | Base path | Bisa apa |
|---|---|---|---|
| Delivery | `atlas_live_*` | `/api/v1/public` | Baca entry/page/media/schema **yang sudah published** |
| Management | `atlas_mgmt_*` | `/api/v1/manage` | Tulis: create/update/publish/delete, upload media, authoring schema |
| Dashboard | login user | `cms.atlas.latellu.com` | Semua, termasuk perubahan schema yang merusak data |

Header autentikasi: **`X-API-Key`**, bukan `Authorization: Bearer`.
Base URL default: `https://api.atlas.latellu.com`.

Pemisahan ketat: live key kena 401 di `/manage/*`, mgmt key kena 401 di `/public/*`.

### 2.3 Scope management key

| Scope | Memberi akses |
|---|---|
| `content:write` | create / update / delete / duplicate / reorder entry & page |
| `content:publish` | publish / unpublish / archive / schedule |
| `media:write` | upload & delete media |
| `schema:write` | bikin content type & field (baru, MCP ≥ 1.5.0) |

Scope tidak saling implikasi. Key lama tidak otomatis dapat scope baru — kalau tool
schema kena 403, `schema:write` harus ditambah di dashboard.

**Aturan keamanan:** `atlas_mgmt_*` tidak boleh pernah masuk bundle browser. Hanya
server component / route handler / script CI.

---

## 3. Model konten

```
Workspace  (= tenant, ditentukan oleh API key; tidak ada parameter workspace di endpoint manapun)
 ├── Locale[]              ← default_locale + locale tambahan, diatur di dashboard
 ├── Content Type          ← skema. is_block=false → Entry ; is_block=true → Block
 │    └── Field[]          ← name, label, field_type, required, unique, localizable, filterable, sortable
 ├── Entry                 ← { id, slug, status, published_at, data{}, translations{} }
 ├── Page                  ← { id, slug, status, seo{}, blocks[] }  ← TIDAK punya field title sendiri
 │    └── Block            ← { id, block_type_id, parent_id, position, data{}, translations{} }
 └── Media                 ← file, ≤10 MB
```

### 3.1 Tipe field yang tersedia (10, tidak ada yang lain)

| Tipe | Nilai yang ditulis | Catatan penting |
|---|---|---|
| `text` | string | 1 baris |
| `textarea` | string | multi-baris polos |
| `richtext` | **HTML string (Tiptap)** | Bukan markdown, bukan JSON. Dashboard pakai editor Tiptap. Nilai kosong `""`, `"<p></p>"`, `"<p><br></p>"` dihitung kosong untuk validasi `required`. |
| `number` | JSON number | kirim angka, bukan string |
| `boolean` | JSON boolean | |
| `date` | ISO 8601 string | tidak divalidasi formatnya |
| `select` | salah satu `options` | **tidak divalidasi**; nilai di luar daftar merusak literal-union hasil codegen |
| `image` | **UUID media** saat menulis | Saat dibaca lewat delivery API, UUID sudah ditukar jadi **URL publik** |
| `relation` | **UUID entry** (atau array UUID) | slug ditolak; divalidasi keberadaannya |
| `content_type_reference` | UUID entry | di-resolve 1 level saat baca |

**Yang TIDAK ADA:** array/list field, repeater, objek bersarang, JSON field,
color picker, file non-media, komputasi. Ini konsekuensi terbesar untuk kita — §7.

### 3.2 Lifecycle

`draft → published → archived`, plus `scheduled` (publish di waktu depan).
Live key dengan environment `production` hanya lihat `published`.
Live key dengan environment `preview` juga lihat `draft` + `scheduled`.
Tidak ada parameter `status` untuk mengakalinya — visibilitas mengikuti key.

### 3.3 Model lokalisasi

Ini yang paling relevan buat kita karena situs ini JA/EN.

- Data disimpan sebagai **base locale** di `data`, plus `translations: { "<locale>": { data: {...} } }`.
- Hanya field ber-flag `localizable: true` yang boleh punya nilai per-locale.
- Pembacaan: kirim `?locale=en`. Merge dilakukan **per-field**; field yang belum
  diterjemahkan jatuh balik ke base locale.
- Response membawa `locale_requested` dan `is_fallback` (true kalau locale diminta
  tapi tidak ada terjemahannya).
- **Jebakan:** field yang `required` **dan** `localizable` divalidasi terhadap
  `translations`, bukan `data`. Kalau nilainya cuma ditaruh di `data`, tulis gagal
  dengan "required localizable field ... is missing".
- **Jebakan 2:** baca tanpa `locale` selalu mengembalikan base locale. Habis nulis
  terjemahan, verifikasinya harus pakai `?locale=`.

---

## 4. Apa yang bisa dibaca (Delivery API / SDK)

```ts
import { createClient } from "@latellu/atlas-sdk";
const atlas = createClient<AtlasContentTypes>({ url, apiKey, fetchImpl });
```

| Operasi | Parameter | Balikan |
|---|---|---|
| `entries(type).list()` | `locale`, `page`, `limit` (max 100), `sort` (`"field:asc\|desc"`), `fields` (sparse, dot-notation) | `{ items, total, page, pageSize }` |
| `entries(type).get(slug)` | `locale`, `fields` | `AtlasEntry<T>` atau `null` kalau 404 |
| `pages.list()` | `locale`, `page`, `limit` | ringkasan page, **tanpa blocks** |
| `pages.get(slug)` | `locale` | `{ id, slug, status, seo, blocks[] }`, blocks selalu terurut `position` |
| `media.get(id)` | — | `MediaAsset` |
| `raw.get(path, query)` | apa saja | escape hatch, dipakai untuk cursor pagination |

Yang SDK kerjakan otomatis (jangan diulang sendiri):
- `entry.data`, page `seo`, block `data` datang sebagai **JSON string** dari API — SDK mem-parse-nya.
- Merge locale field-by-field.
- Sort blocks by position.
- JSON rusak jadi `{}` diam-diam (block korup = gagal senyap, bukan error).

**Yang delivery API TIDAK punya:**
- Tidak ada filter berdasarkan nilai field. `?type=` dan `?locale=` saja. "Semua entry yang kategori = X" berarti paging lalu filter di client.
- Tidak ada full-text search di client SDK.
- Tidak ada namespace schema di client (itu urusan CLI).
- Tidak ada draft preview via SDK (perlu preview key / preview token).

### 4.1 Caching — SDK sengaja tanpa knob

SDK memanggil `fetch(url, { headers })` polos, tanpa direktif cache. Di Next.js App
Router artinya perilakunya = default Next untuk fetch tanpa anotasi. Harus ditentukan
eksplisit lewat `fetchImpl`:

| Tujuan | `fetchImpl` |
|---|---|
| Edit dashboard langsung muncul | `cache: "no-store"` + `export const dynamic = "force-dynamic"` |
| ISR | `next: { revalidate: 60 }` |

**Rekomendasi kita: ISR + webhook, bukan `no-store`.** Alasannya di §6. (lihat koreksi di atas)

---

## 5. Apa yang bisa ditulis

Dua jalur, beda peruntukan:

| | MCP (`@latellu/atlas-mcp`) | Management SDK |
|---|---|---|
| Untuk | edit interaktif dalam sesi agent, audit, seeding beberapa entry | kode yang hidup lebih lama: migrasi, sync job, backend |
| Error | teks per-field | objek error terstruktur per-field |
| Schema authoring | **Ada** (`create_content_type`, `add_field`, dll) | **Tidak ada** |
| Gaya API | tool call | **Effect-based** (`Effect.Effect<T, AtlasError>`) — bukan Promise biasa |
| Optimistic lock | — | `updatedAt` → `ConflictError` (409) |
| Retry 429 | otomatis | otomatis (hanya management client) |

Panduan resmi: kalau menyentuh lebih dari segelintir entry, butuh tahan gagal-sebagian,
dan harus aman dijalankan ulang → itu pekerjaan SDK, walaupun cuma dijalankan sekali.
Migrasi 265 string kita = **pekerjaan SDK**, bukan MCP satu-satu.

### 5.1 Semantik tulis yang wajib diingat

- `update_entry` / `entries.update()` = **full replace** pada `data`, bukan patch.
  Pola wajib: `get` → merge → `update` dengan objek lengkap.
- `create_entry` selalu bikin **draft**. Publish adalah langkah terpisah.
- `update_page` dengan `blocks` = replace seluruh daftar block.
- Page **tanpa block tidak bisa di-publish**.
- Page tidak punya field `title`; judulnya ada di `seo.title`.
- Setiap tulis mengirim `Idempotency-Key` baru per panggilan → mengulang create yang
  gagal = operasi baru. Cek dulu apakah yang pertama sebenarnya berhasil.

### 5.2 Batas authoring schema

Dengan key ber-`schema:write` **BISA**: bikin content type, tambah field, ubah
label/filterable/sortable, reorder field, hapus content type yang masih 0 entry.

**TIDAK BISA lewat API** (dashboard-only, karena menulis ulang data yang sudah ada):
rename field, ganti `field_type`, toggle `localizable`/`is_unique`/`required`,
edit `validation`, hapus field, toggle `is_block`.

> Konsekuensi desain: **skema harus benar sejak awal.** `field_type` dan
> `localizable` tidak bisa diubah lewat API. Hapus-lalu-tambah-ulang bukan solusi —
> itu membuang datanya. Kalau perlu berubah, jalankan `plan_field_change` untuk dapat
> laporan dampak + link dashboard, lalu manusia yang eksekusi.

### 5.3 Media

- Upload ≤ **10 MB** per file.
- Ekstensi: `.jpg .jpeg .png .gif .webp .mp4 .webm .mov .pdf`.
- Field `image` menyimpan UUID; delivery API mengembalikannya sebagai **URL string biasa**.
- **Tidak ada width/height/alt di payload delivery.** Ini penting untuk `next/image` (§7.6).

---

## 6. Rate limit, webhook, dan strategi cache (lihat koreksi di atas — tidak jadi dipakai)

### 6.1 Rate limit
Default **60 request/menit per API key** (bisa dinaikkan per key). Response membawa
header `X-RateLimit-Limit`. Kelebihan → 429. Delivery client SDK **tidak** retry
otomatis pada 429 — hanya management client yang retry.

Artinya: kalau `marketing-web` fetch per request dengan `no-store`, satu halaman
homepage yang butuh ±10 entry akan menghabiskan kuota dalam 6 pageview per menit.
**Tidak layak.** Wajib SSG/ISR.

### 6.2 Webhook (kunci untuk ISR)

Atlas punya sistem webhook lengkap dengan log delivery, retry, dan tombol "Test".

| Event yang bisa di-subscribe |
|---|
| `entry.created`, `entry.updated`, `entry.published`, `entry.unpublished`, `entry.deleted` |
| `page.created`, `page.updated`, `page.published`, `page.unpublished`, `page.deleted` |
| `media.uploaded`, `media.deleted` |

- Payload entry: `{ id, content_type_id, status, slug }` — perhatikan `content_type_id`
  itu **UUID**, bukan slug, jadi butuh peta UUID→slug di sisi kita.
- Payload page: `{ id, status, slug }`.
- Ditandatangani **HMAC-SHA256**, header `X-Atlas-Signature: sha256=<hex>`.
- Secret ditampilkan **sekali saja** saat webhook dibuat.

**Arsitektur yang direkomendasikan:**

```
Editor klik Publish di dashboard
        ↓
Atlas kirim webhook  →  POST /api/atlas/revalidate  (Next.js route handler)
        ↓ verifikasi HMAC
   revalidateTag("atlas:<type>")  atau  revalidatePath(...)
        ↓
Halaman ter-regenerate; pengunjung dapat konten baru tanpa rebuild
```

Dengan ini: 0 request Atlas per pageview, konten tetap "instan" saat editor publish,
dan rate limit tidak pernah kesentuh.

### 6.3 Preview draft
Dua mekanisme:
1. **Preview key** — API key public dengan environment `preview`, melihat draft & scheduled.
2. **Preview token** — token bertanda tangan, dibuat dari dashboard ("Get Preview Link"),
   berlaku **48 jam**, dipakai di `GET /api/v1/public/preview?token=...`. Cocok untuk
   klien Care 24 me-review konten sebelum publish tanpa perlu akun.

---

## 7. Pemetaan ke `marketing-web` — di sinilah masalahnya

### 7.1 Inventaris konten yang harus jadi CMS

| Area | File sumber | Isi | Bentuk data |
|---|---|---|---|
| Brand | `constants/copy.ts` `brand` | nama, alt logo, tagline | 3 pasang bilingual |
| Navbar | `copy.ts` `nav`, `contactPhone`, `ui`, `auth` | 4 link nav, nomor telepon + catatan, label a11y, seluruh modal auth | array + ±20 pasang |
| Footer | `copy.ts` `footer` | deskripsi, 4 legal link (1 di antaranya mengambil label dari `legalDocs`), teks copyright | array + 3 pasang |
| Layout/SEO | `app/[lang]/layout.tsx` | title template, description, canonical, hreflang, OG locale, favicon | metadata |
| JSON-LD | `components/JsonLd.tsx` | Organization: legalName, telephone, alamat terurai, foundingDate | terstruktur, **saat ini di-derive dari `company.rows` dengan `.find()` berdasarkan label EN** |
| Sitemap | `app/sitemap.ts` | 12 route × 2 bahasa | daftar route |
| Homepage | `copy.ts` `home` | hero, values, problems, careCourse, nursingCourse, examples, flow, apply, contact | **paling bersarang** |
| Use case | `copy.ts` `useCase` | hero + `cases[]` (slug, title, body, detail, highlights[]) | array of object |
| Service flow | `copy.ts` `serviceFlow` | hero + 4 step | array |
| Pricing | `copy.ts` `pricing`, `staffPricing`, `actionPlan` + `constants/pricing.ts` | hero, highlights, note, **2 tabel × 2 kursus × 4 baris angka yen** | array + number |
| Company | `copy.ts` `company` | 8 baris tabel profil perusahaan | array of {label, value} |
| Legal | `constants/legal.ts` | **6 dokumen**, total 439 blok (109 h2, 20 h3, 201 li, 103 p, 6 table) × 2 bahasa | rich document |
| Media | `public/images/` | 22 file, 2.0 MB (hero, use-case ×4 dalam webp+jpg, logo, iso27001-bsi, mics-logo) | binary |

Total: **±265 pasang string bilingual** di `copy.ts`, plus ±439 blok legal.

### 7.2 GAP #1 — tidak ada array/repeater field

Ini masalah struktural terbesar. Contoh nyata dari `home.careCourse`:

```
careCourse
 ├── leadIn, badge, tagline, taglineSub          ← scalar, gampang
 ├── price { label, hours, amount, unit, taxNote, taxIncluded }   ← objek bersarang
 ├── fees[]      → { label, value, note? }        ← array of object
 └── cards[]     → { title, imageAlt, items[] }   ← array of object berisi array
```

`cards[].items[]` adalah **array di dalam array** (4 kartu × 6–8 item). Atlas tidak
punya field untuk itu. Tiga opsi:

| Opsi | Cara | Plus | Minus |
|---|---|---|---|
| **A. Normalisasi ke entry + relation** | `service-card` jadi content type sendiri, `items` jadi content type `service-item`, dihubungkan `relation` (array UUID) | Bersih, editor bisa reorder, tipe kuat | Banyak content type (perkiraan 18–25), editor harus lompat antar layar untuk 1 kartu, **relation hanya di-resolve 1 level** — `card → items` OK, `course → card → items` tidak |
| **B. Simpan array sebagai JSON di `textarea`** | 1 field `items_json` berisi `["移動介助", ...]` | Sedikit content type, port cepat | Editor mengetik JSON mentah — mengalahkan tujuan pakai CMS; tidak ada validasi |
| **C. Baris jadi `richtext` `<ul><li>`** | `items` jadi 1 field richtext | Editor nyaman (WYSIWYG), 1 field | Kehilangan struktur per-item; styling per-item (ikon centang) harus lewat CSS pada HTML hasil Tiptap |

**Rekomendasi awal: hybrid.**
- Daftar yang murni teks berurutan (`cards[].items`, `pricing.highlights`, `useCase.cases[].highlights`) → **opsi C (richtext `<ul>`)**. Ini yang paling ramah editor dan render-nya cukup satu `dangerouslySetInnerHTML` dengan kelas prose.
- Daftar yang tiap barisnya punya beberapa kolom (`fees[]`, `company.rows[]`, tabel harga, `examples.cases[].schedule[]`) → **opsi A (entry sendiri, orderable)**, karena tiap baris memang punya field terpisah dan angkanya harus tipe `number`.

Keputusan final butuh persetujuan kamu — ini menentukan bentuk skema yang **tidak bisa diubah lagi lewat API**.

### 7.3 GAP #2 — JA dan EN ditampilkan bersamaan

`components/ui/TabPanel.tsx:73-76` merender `tab.label.ja` **dan** `tab.label.en`
sekaligus (JA besar, EN kecil di bawahnya). Halaman legal juga membangun `<title>`
sebagai `"${doc.heading.ja} | ${doc.heading.en}"`.

Model locale Atlas mengembalikan **satu** locale per request. Tiga jalan keluar:

| Cara | Konsekuensi |
|---|---|
| Dua fetch (`locale=ja` + `locale=en`) untuk halaman itu (lihat koreksi di atas) | Menggandakan request; masih aman kalau ISR |
| Field terpisah non-localizable: `label_ja` + `label_en` | Melawan fitur locale Atlas, tapi jujur merepresentasikan "dua bahasa tampil bersamaan" |
| Field `label` localizable + field `label_secondary` non-localizable | Kompromi; agak membingungkan editor |

Perlu diputuskan sebelum bikin skema.

### 7.4 GAP #3 — default locale prefix-less

`features/lang/i18n.ts` menetapkan `DEFAULT_LANG = "ja"` dan `proxy.ts` mem-redirect
`/ja/...` → `/...`. Maka `default_locale` workspace Atlas **wajib `ja`**, dengan `en`
sebagai locale tambahan. Kalau terbalik, semua fallback jadi bahasa Inggris.

> Catatan: workspace yang tersambung sekarang punya `locales: []` dan
> `default_locale: ""` — belum ada locale sama sekali. Locale hanya bisa dibuat
> dari dashboard (Settings → Locales).

### 7.5 GAP #4 — dokumen legal (439 blok)

`LegalBlock` sekarang adalah union `h2 | h3 | p | li(ul/ol) | table`. Ini persis
yang dihasilkan richtext Tiptap sebagai HTML. Jadi **1 field `richtext` per dokumen
per bahasa** adalah pemetaan alami.

Tapi ada dua ketergantungan yang ikut kena:
1. `components/TableOfContents.tsx` + `LegalDocPage.tsx:107-138` membangun daftar isi
   dengan memindai blok `type === "h2"` dan menyuntik `id="sec-${i}"`. Kalau isi jadi
   HTML mentah, TOC harus dibangun ulang dengan mem-parse HTML (atau pakai
   `rehype-slug`-style pass di server).
2. `LegalDocPage` mem-parse link ala markdown `[label](/path)` di dalam teks paragraf.
   Di richtext, link jadi `<a href>` beneran — bagus, tapi kode parser itu jadi mati
   dan link internal harus dilewatkan ke `localizeHref()` agar tetap sadar bahasa.

Peringatan isi: file legal itu **hasil legal-check dari .docx klien** dan header
filenya melarang edit kata-kata tanpa dokumen sumber baru. Memindahkannya ke CMS
berarti membuka pintu edit tanpa jejak. Perlu kesepakatan proses (mis. hanya role
tertentu yang boleh edit content type `legal-document`).

### 7.6 GAP #5 — gambar & `next/image`

Delivery API mengembalikan field `image` sebagai **URL string polos** — tanpa width,
height, atau alt. `next/image` butuh salah satu dari: `width`+`height`, atau `fill`.

Yang perlu disiapkan:
- `next.config.ts` → `images.remotePatterns` untuk host CDN Atlas.
- Untuk gambar yang butuh dimensi (logo footer `width={320} height={120}`), tambahkan
  field `number` `image_width` / `image_height` di skema, atau paksa pakai `fill`
  dengan container ber-aspect-ratio.
- `alt` harus jadi field teks **localizable** sendiri — sekarang `imageAlt` sudah
  bilingual di `copy.ts`, jadi ini cocok.
- Hero sekarang punya `priority` + `fetchPriority="high"` + `sizes="100vw"` — itu
  properti komponen, tetap di kode, bukan di CMS.
- Aset `.webp` dan `.jpg` kembar (use-case-1..4) — di CMS cukup satu sumber; Next
  Image Optimization yang mengurus format.

### 7.7 GAP #6 — angka & format

`constants/pricing.ts` menyimpan yen sebagai **integer** lalu memformat dengan
`formatYen()` → `toLocaleString("ja-JP")`. Di Atlas ini harus jadi field `number`,
bukan `text`, supaya `formatYen` tetap bisa jalan dan angkanya bisa dipakai untuk
JSON-LD `Offer`.

Perhatian: `CAREGIVING_BASIC_DAY_CUSTOMER_RATE` sekarang adalah konstanta bersama
antara `supporterRates` dan `courseRates` — sengaja, supaya dua tabel tidak bisa
melenceng. Begitu pindah ke CMS, jaminan itu **hilang**: editor bisa mengubah satu
tabel saja. Perlu diputuskan: gabungkan jadi satu content type `rate` dengan kolom
`customer` + `supporter` (tabel `/fees` pakai keduanya, `/pricing` pakai `customer`
saja) — ini mengembalikan jaminan tersebut.

### 7.8 GAP #7 — tidak ada filter berdasarkan nilai field

Delivery list hanya bisa `type` + `locale` + `sort` + `page`. Jadi pola seperti
"ambil semua `rate` untuk kursus = care" tidak bisa di server. Solusi:
- Buat content type terpisah per kelompok (`care-rate`, `nursing-rate`), atau
- Ambil semua lalu filter di kode (jumlahnya kecil — 8 baris — jadi aman), atau
- Pakai `relation` dari entry `course` ke entry `rate`.

Karena volumenya kecil, **ambil-semua-lalu-filter** paling sederhana.

### 7.9 GAP #8 — ketahanan build

`generateStaticParams` + SSG berarti build memanggil Atlas. Kalau Atlas down atau
key kadaluwarsa saat deploy, **build gagal dan situs tidak ter-deploy**. Perlu
diputuskan sejak awal:
- Fallback ke `constants/*` yang sekarang kalau fetch gagal (rekomendasi: simpan
  `constants/` sebagai seed/fallback, jangan dihapus), atau
- Biarkan build gagal (fail-loud), atau
- Snapshot konten ke JSON saat build sebelumnya.

---

## 8. Rancangan arsitektur yang sedang saya pertimbangkan

Belum diimplementasi — ini bahan diskusi.

```
marketing-web/
  lib/
    atlas.ts          "server-only" + createClient + fetchImpl ber-tag
    atlas.types.ts    HASIL GENERATE @latellu/atlas-cli — jangan diedit tangan
    content/
      brand.ts        loader: Atlas → bentuk yang sama dengan constants/copy.ts hari ini
      nav.ts
      home.ts
      legal.ts
      pricing.ts
  app/api/atlas/revalidate/route.ts   webhook receiver, verifikasi HMAC
  constants/          TETAP ADA sebagai fallback + seed migrasi
  scripts/
    seed-atlas.ts     management SDK, sekali jalan, idempoten
```

Kunci desainnya: **loader mengembalikan bentuk yang identik dengan `constants/`
sekarang.** Dengan begitu 790 baris `app/[lang]/page.tsx` dan semua komponen tidak
perlu diubah sama sekali di tahap pertama — yang berubah hanya dari mana datanya
datang. Migrasi jadi bisa bertahap per-area dan bisa di-rollback.

Env yang dibutuhkan (`.env.local`, tidak di-commit):

| Variabel | Isi |
|---|---|
| `ATLAS_BASE_URL` | `https://api.atlas.latellu.com` |
| `ATLAS_API_KEY` | `atlas_live_...` (delivery, production) |
| `ATLAS_PREVIEW_API_KEY` | `atlas_live_...` (delivery, environment preview) — opsional |
| `ATLAS_MGMT_API_KEY` | `atlas_mgmt_...` — **hanya untuk script seed, bukan runtime** |
| `ATLAS_WEBHOOK_SECRET` | secret HMAC dari webhook |

Script codegen: `"atlas:types": "atlas-cli generate --output=./lib/atlas.types.ts"`,
dijalankan ulang **setiap kali skema berubah** dan hasilnya di-commit.

---

## 9. Temuan & catatan akurasi

| # | Temuan | Dampak |
|---|---|---|
| 1 | Workspace yang tersambung sekarang = sandbox `ilham123's Workspace`: 1 content type sampah (`kylee-glenn`), **0 locale**, **0 page**. | Workspace produksi Care 24 **belum dibuat**. Itu langkah pertama, dan hanya bisa dari dashboard. |
| 2 | Plugin skill Atlas yang terpasang di mesin ini **v0.5.1**, terbaru **v0.6.0**; MCP server jalan di **v1.6.1**. | Skill 0.5.1 masih bilang "schema dashboard-only" — sudah tidak benar; MCP 1.5.0+ punya `create_content_type`/`add_field`. Sebaiknya update plugin. |
| 3 | Dokumentasi `/docs/content-types` menyebut richtext = "Editor.js JSON". | Semua sumber lain (skill + SDK) konsisten menyebut **Tiptap HTML**. Sebelum menulis richtext dalam jumlah besar, satu entry uji wajib dibuat dulu untuk memastikan formatnya. |
| 4 | Dokumentasi menyebut field `image` "fully resolved (URL + dimensions + alt text)"; SDK 0.3.0 menyatakan `image` = string. | Yang bisa dipastikan: nilainya **string URL** saat dibaca. Jangan mengandalkan adanya dimensi/alt sampai terverifikasi pada workspace nyata. |
| 5 | Management client SDK ber-basis **Effect**, bukan Promise. | Script migrasi butuh dependency `effect` dan gaya penulisan berbeda. Perlu dipertimbangkan vs memakai `raw` HTTP call biasa. |
| 6 | `get_entry` me-resolve relation 1 level; `list_entries` tidak dijanjikan begitu. | Skema jangan mengandalkan relation bertingkat 2 level. |

---

## 10. Yang perlu keputusan kamu sebelum implementasi

1. **Workspace produksi** — buat workspace Care 24 baru di dashboard, atau pakai yang sandbox ini? (Kalau baru: locale `ja` sebagai default + `en`, lalu terbitkan key `atlas_live_` production, `atlas_live_` preview, dan `atlas_mgmt_` dengan 4 scope.)
2. **Pemodelan array** (§7.2) — hybrid richtext + entry seperti rekomendasi saya, atau semuanya dinormalisasi jadi entry?
3. **JA+EN tampil bersamaan** (§7.3) — dua fetch, atau field `_ja`/`_en` terpisah?
4. **Dokumen legal** (§7.5) — betul mau masuk CMS juga? Isinya hasil legal-check dan file sumbernya melarang edit bebas.
5. **Page vs Entry** — homepage dijadikan Atlas *Page* dengan blocks (editor bisa menyusun ulang urutan section), atau tetap section tetap yang isinya dari Entry? Yang pertama lebih fleksibel tapi jauh lebih besar pekerjaannya.
6. **Fallback build** (§7.9) — pertahankan `constants/` sebagai jaring pengaman, atau hapus total?
7. **Cakupan tahap 1** — mau mulai dari area yang mana? Saran saya: `brand + nav + footer + company` dulu (paling sedikit array, langsung membuktikan seluruh rantai: schema → seed → SDK → ISR → webhook), baru homepage, baru legal.

