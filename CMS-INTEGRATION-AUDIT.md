# Audit Integrasi CMS — marketing-web

**Tanggal:** 2026-08-20
**Cakupan:** seluruh `app/`, `components/`, `features/`, `constants/`, `scripts/atlas/`, `public/`
**Metode:** 6 lane audit paralel (homepage, sub-halaman, legal, chrome/UI, lapisan CMS/infra, reality-check workspace live) + verifikasi runtime (render 26 rute) + query langsung ke delivery API `https://api-c24jp.sipsedutech.id`

---

## Vonis

**Body konten benar-benar sudah CMS-driven. Tidak ada halaman yang menyajikan konten statis.**

Bukti runtime yang diverifikasi langsung:

| Bukti | Hasil |
|---|---|
| Render 13 halaman × 2 locale = 26 rute | 26/26 HTTP 200 |
| Warning `[cms:fallback:failure]` / `[cms:fallback:unexpected-content]` | **0** — tidak ada halaman yang jatuh ke `constants/*.ts` |
| Sumber gambar di HTML hasil render | 100% dari Atlas media (`horizoon.s3.../care-24/media/`), bukan `public/` |
| Halaman di Atlas | 15 page, semua `status: published` |
| Kelengkapan locale EN | `block_translations` = jumlah blok di semua 15 page |
| Mismatch nama field loader ↔ schema Atlas | **0** dari ~180 field di 9 loader |
| Paritas `schema.ts` ↔ `seed-*.ts` ↔ loader | Sempurna tiga arah, nol field yatim |

Yang masih statis semuanya berada **di luar batas blok konten** — di lapisan metadata di atasnya, dan di lapisan konsumen di bawahnya.

---

## Ringkasan per area

| Area | Status | Severity |
|---|---|---|
| A. SEO / metadata halaman | Nol persen CMS-driven, padahal datanya ada di Atlas | 🔴 Kritis |
| B. Tujuan link & CTA | Hardcoded; satu field CMS dibaca tapi tidak dipakai | 🔴 Kritis |
| C. JSON-LD structured data | 2 dari 8 field ikut CMS | 🔴 Kritis |
| D. Field CMS yang di-load tapi tidak dirender | 6 field mati | 🟠 Tinggi |
| E. Konten placeholder yang tayang publik | 3 dokumen legal | 🔴 Kritis (kepatuhan) |
| F. Halaman error & 404 | 15 string, nol CMS, tidak ada content type | 🟠 Tinggi |
| G. String UI kecil | 12 string hardcoded | 🟡 Sedang |
| H. Fidelity serializer legal ↔ Tiptap | 5 gap, 3 terbukti rusak | 🔴 Kritis (laten) |
| I. Rute & sitemap | 13 rute dipahat di kode, tidak ada catch-all | 🟠 Tinggi |
| J. Observability & operasional | Diagnostik bagus, tanpa tujuan pengiriman | 🟠 Tinggi |
| K. Dead code | 4 blok besar | 🟡 Sedang |
| L. Konfigurasi | `SITE_URL` domain preview, MCP salah workspace | 🟠 Tinggi |

---

## A. SEO / metadata — 🔴 celah terbesar

Ini bentuk kegagalan paling menipu di repo: field ada di dashboard, **terisi data yang terlihat benar**, dapat disimpan, dapat dipublish — dan mati total.

| Item | Kondisi sekarang | Seharusnya | Kenapa penting |
|---|---|---|---|
| `features/cms/merge.ts:128-152` `shapePageBlocks()` | Hanya mengembalikan `page.blocks`. `page.seo` dan `page.seo_translations` **dibuang** | Teruskan ke loader | Ini akar dari seluruh area A. Satu fungsi yang memutus jalur SEO |
| `features/cms/types.ts:95,121` | Tipe `seo` / `seo_translations` dideklarasikan, nol pembaca | — | Menciptakan ilusi SEO sudah terintegrasi |
| `seo.title` di Atlas | **Terisi di 15/15 page** (terverifikasi live: `home` → `Care 24 Japan — ご自宅で…`, `use-case` → `ご利用シーン` / `Use cases`, dst.) | Dibaca `generateMetadata` | Editor mengubah SEO title di dashboard → nol efek |
| `seo.description` di Atlas | **Kosong di 15/15 page** | Diisi konten | Bahkan kalau jalur dibuka, hasilnya string kosong |
| `seo.og_image` di Atlas | **Kosong di 15/15 page** | Diisi | — |
| `seo_translations` EN | Tidak ada baris EN untuk `pricing`, `fees`, `rates` | Ada | — |
| `generateMetadata` di 12 rute non-legal | Ternary hardcoded `lang === "ja" ? "…" : "…"` | Dari `page.seo` | Dua sumber untuk teks yang sama |
| `app/[lang]/fees/page.tsx:80` vs `constants/copy.ts:749` | **Sudah divergen hari ini**: title SEO `…報酬体系一覧`, H1 dari CMS `…給与体系` | Satu sumber | Bukti nyata bahwa dua-sumber sudah gagal |
| `app/[lang]/pricing/page.tsx:24-25` | Meta description memuat **harga literal** `介護コース1時間3,740円、看護コース1時間6,600円` | Dari CMS | Editor ganti harga → tabel & JSON-LD berubah, **hasil pencarian Google tetap harga lama** |
| `app/[lang]/service-flow/page.tsx:20-23` | Meta description menyebut `4つ` / `four` steps | Dari CMS | Tambah step ke-5 → deskripsi bohong |
| 7 halaman legal | `description` = template rangkai judul `${heading.ja} | ${heading.en} — ${brand.name}` | Deskripsi asli | Boilerplate diduplikasi 7× |
| `openGraph.images` | **Tidak ada di seluruh situs.** Tidak ada `app/opengraph-image.*` | Ada | Setiap share ke LINE/X/Facebook tampil tanpa gambar. LINE adalah kanal utama di pasar JP |
| `openGraph.title` / `description` / `url` / `alternateLocale` | Tidak ada | Ada | — |
| `metadata.robots`, `export const viewport`, `themeColor`, `apple-touch-icon`, `manifest` | Tidak ada | Ada | — |
| `alternates` hreflang | Ditulis manual di layout **dan** diulang di tiap page; tidak ada `x-default` | Diturunkan dari route | Rename slug = sunting 8 file manual |
| `app/sitemap.ts:31` | `lastModified: new Date()` = waktu build | `page.updated_at` dari Atlas (tersedia, mis. `2026-08-20T08:57:44Z`) | Sinyal lastmod menyesatkan crawler, justru paling berarti untuk dokumen legal |
| `constants/site.ts:7` `SITE_URL` | `https://care24jpn.vercel.app` — **domain preview Vercel** | Domain produksi | Menyetir `metadataBase`, 26 URL sitemap, canonical, robots, dan `Organization.url` |

---

## B. Tujuan link & CTA — 🔴 bug fungsional, bukan sekadar utang konten

| Item | Kondisi sekarang | Seharusnya | Kenapa penting |
|---|---|---|---|
| `app/[lang]/page.tsx:465` banner staff | `href="https://portal.care24.jp/caregiver"` **literal**. Field CMS `home_apply.staff_href` dibaca (`home.ts:274`) tapi **hanya** dipakai menghitung `staffHrefIsExternal` di `page.tsx:24` | `href={home.apply.staff.href}` | Editor mengubah `staff_href` di dashboard → **link tidak bergerak sama sekali**, hanya perilaku tab baru yang berubah |
| Turunannya | Nilai fallback `staff_href` = `/fees` (relatif) → `external={false}` diteruskan ke href yang absolut & eksternal | — | Link lintas-domain dirender lewat `<Link>` tanpa `target="_blank"` dan tanpa `rel="noopener"` |
| `app/[lang]/page.tsx:458` banner user | `href="https://portal.care24.jp/register"` literal. **Tidak ada field `user_href`** di schema | Tambah field | Konversi utama halaman di luar jangkauan editor |
| `page.tsx:68` CTA hero primary | `localizeHref("/service-flow")`. Label dari CMS, tujuan tidak | — | Label `お申込みはこちら` (daftar) mengarah ke halaman alur, bukan portal — copy & destinasi tidak sinkron |
| `page.tsx:74` CTA hero secondary | `localizeHref("/pricing")` | — | Label `まずは無料登録` mengarah ke halaman harga |
| `page.tsx:499` CTA kontak | `localizeHref("/#contact")` | — | — |
| `use-case/page.tsx:97`, `service-flow/page.tsx:51` | `localizeHref("/pricing")` | — | `nav_item.href` sudah CMS-driven, CTA tidak |
| `fees/page.tsx:138` | `localizeHref("/#contact")` — komentar mengakui "URL pendaftaran klien masih pending" | — | Field-nya sudah ada di Atlas; begitu klien memberi URL tetap butuh deploy |
| `app/global-not-found.tsx:48` | `<Link href="/">` tanpa `localizeHref` | — | Visitor EN yang 404 dikembalikan ke homepage JA |

---

## C. JSON-LD — 🔴 dua sumber kebenaran untuk fakta yang sama

`components/JsonLd.tsx:50-80`. Tayang di **setiap** halaman situs.

| Field | Sumber sekarang | Seharusnya |
|---|---|---|
| `name` | ✅ CMS (`site.brand.name`) | — |
| `telephone` | ✅ CMS (`site.contactPhone.tel`) | — |
| `legalName` | ❌ literal `"MedicalInformatics Co.,Ltd."` | CMS `company_row` 商号 |
| `address.*` (5 field) | ❌ literal `2-1-1 Marunouchi…`, `100-0005`, `Chiyoda-ku`, `Tokyo`, `JP` | CMS `company_row` 本社 |
| `foundingDate` | ❌ literal `"2002-10-18"` | CMS `company_row` 設立 |
| `url` | ❌ `SITE_URL` (domain preview) | Domain produksi |
| `@type` | ❌ `Organization` polos | `LocalBusiness`/`MedicalBusiness` — `Organization` tidak memenuhi syarat rich result local business |
| `logo` / `image` | ❌ tidak diemit — padahal `site.brand.logo` **sudah ada** di CMS berisi URL S3 | Emit |
| `sameAs`, `openingHours` | ❌ tidak diemit; tidak ada data sosmed di repo | — |

**Pola paling rapuh** — `JsonLd.tsx:59-60`:

```ts
company.rows.find(row => row.label.en === "Head office")
company.rows.find(row => row.label.en === "Established")
```

Hasil `find()` dipakai **hanya sebagai saklar on/off** (`...(headOffice && {...})`), nilainya dibuang. Dua mode gagal diam:
1. Editor rename label EN jadi `"Head Office"` atau `"HQ"` → **seluruh blok `address` hilang dari structured data**, tanpa error.
2. Editor pindahkan kantor di dashboard → tabel `/company` berubah, mesin pencari tetap dapat alamat Marunouchi lama.

Docstring di `JsonLd.tsx:39-48` yang mengunci pola ini ("must be byte-identical to the pre-CMS output", "no logo asset URL is defined") **sudah tidak akurat** pasca-integrasi dan aktif menghalangi pemakaian data CMS.

---

## D. Field CMS yang di-load tapi tidak pernah dirender — 🟠 dashboard berbohong

Editor mengisi, menyimpan, mempublish — hasilnya hilang tanpa jejak.

| Field CMS | Di-load di | Nasib | Dampak |
|---|---|---|---|
| `home_values.heading` (`選ばれる理由` / `Why families choose us`) | `home.ts:148` | Tidak dirender | Heading section hilang |
| `home_values.item_bodies` (3 kalimat) | `home.ts:146,151` | Tidak dirender | Trust strip hanya menampilkan `title`; seluruh body value mati |
| `home_examples.hours_label` (`ご利用時間`) | `home.ts:248` | Tidak dirender | Angka jam tampil telanjang tanpa label |
| `home_contact.hours` (`【受付時間】平日 9:00〜18:00`) | `home.ts:293` | Tidak dirender | **Paling mencolok**: heading di atasnya mengklaim `24時間365日`, jam resepsionis sebenarnya tidak pernah tampil |
| `home_flow_step.icon` (4 nilai) | `home.ts:256` | Tidak dirender | Komentar `page.tsx:404-406` menjanjikan "line-art icon floats at the right" — tidak diimplementasikan |
| `site_ui_labels.tab_switch_label` | `site.ts:118` | Konsumen (`TabPanel.tsx:4,42`) import `ui` **langsung dari `@/constants/copy`**, bukan dari `site` | Setengah blok `site-ui-labels` mati. Bandingkan `Navbar.tsx:250` yang benar memakai `site.ui.menuToggleLabel` |

---

## E. Konten placeholder yang tayang ke publik — 🔴 isu kepatuhan

Terverifikasi di HTML hasil render, bukan hanya di source. **Semua editable dari dashboard tanpa deploy.**

| Halaman | Yang tayang | Kenapa serius |
|---|---|---|
| `/tokushoho` (ja & en) | `（※公開用電話番号を設定した場合は、「電話番号03-XXXX-XXXX」と直接記載）` | Instruksi editorial ke diri sendiri, bukan nomor telepon. Ketiadaan nomor telepon publik di halaman 特定商取引法 adalah isu kepatuhan hukum, bukan copy |
| `/en/quasi-mandate` | `Basic Fee: [X,XXX] yen (Hourly rate [X,XXX] yen × [X] hours)`, `Transportation Fee: [X,XXX] yen`, `Total Outsourcing Fee (Tax Included): [X,XXX] yen`, `Time: [Month] [Day], 2026, [Hour]:[Minute]…` | Placeholder kontrak wajar untuk dokumen spesimen — tapi tidak ditandai sebagai spesimen |
| `/quasi-mandate` (ja) | Catatan implementasi internal `※「マッチング成立時にシステムから自動発行…」としてシステムに組み込む想定` | Catatan internal tim tayang sebagai halaman publik |
| `/terms-for-care-supporters` (ja & en) | `2026年［〇］月［〇］日 制定` / `Established on [Month] [Day], 2026` | Tanggal pemberlakuan dokumen hukum masih placeholder |

---

## F. Halaman error & 404 — 🟠 nol persen CMS

15 string statis, tidak ada content type error di `scripts/atlas/schema.ts`.

| Item | Kondisi | Catatan |
|---|---|---|
| `app/global-not-found.tsx:30-52` | `404`, `お探しのページが見つかりません`, `このページは移動または削除された可能性があります。`, `Page not found`, `The page you are looking for may have been moved or removed.`, `トップページへ / Back to home` | Pendekatan bilingual-ditumpuk di sini **benar dan tak terhindarkan** — file ini melewati `app/[lang]/layout.tsx` |
| `app/global-not-found.tsx:21` | `title` memakai `brand` dari `@/constants/copy`, bukan `getSite()` | `site_brand.name` ada di CMS. Rename brand → judul tab 404 tetap lama |
| `app/global-not-found.tsx:22` | `description` **hanya EN** | Situs JA-first |
| `app/[lang]/error.tsx:23-41` | `エラーが発生しました`, `しばらくしてから再度お試しください。`, `Something went wrong`, `Please try again in a moment.`, `再試行 / Try again` | Bilingual ditumpuk |
| `app/[lang]/error.tsx:5-7` (komentar) | Mengklaim "no lang param is available here" | **Keliru** — file ini di dalam `app/[lang]/`, jadi child dari layout `[lang]`; `lang` bisa dibaca dari `usePathname()` (sudah `"use client"`). Akibatnya user JA melihat blok EN |
| `app/global-error.tsx` | **Tidak ada** | Kalau `app/[lang]/layout.tsx` sendiri throw, `error.tsx` tidak pernah ter-mount → halaman error bawaan Next yang tidak di-style dan **English-only** |

---

## G. String UI kecil yang hardcoded — 🟡

| Lokasi | String | Ada padanan CMS? |
|---|---|---|
| `components/LangToggle.tsx:41` | `aria-label`: `"Switch to English"` / `"日本語に切り替える"` | ❌ Tidak ada `site_ui_labels.lang_toggle_label` — inkonsisten, tetangganya `menu_toggle_label` sudah CMS |
| `components/LangToggle.tsx:44,48` | `EN`, `JP` | ❌ `JP` bahkan tidak cocok dengan kode locale sebenarnya (`ja`) |
| `components/LegalDocPage.tsx:175` | `"目次"` / `"Table of Contents"` | ❌ Satu-satunya string UI di halaman legal |
| `app/[lang]/page.tsx:426` | `STEP` | ❌ |
| `app/[lang]/page.tsx:482` | `＼ … ／` ornamen JA | ❌ Ikut terpasang di locale EN |
| `app/[lang]/page.tsx:511,520` | `alt="mics — MedicalInformatics Co.,Ltd."`, `alt="BSI ISMS-AC ISO27001 認証マーク（IS 793656）"` | ❌ `mics_logo`/`iso_logo` ada di CMS tapi tanpa field alt. Alt JA-only muncul di halaman EN; nomor sertifikat `IS 793656` tertanam di kode |
| `app/[lang]/fees/page.tsx:34` | `<th />` — **header kolom pertama kosong** | ❌ `fees_meta` hanya punya `column_customer`/`column_supporter` |
| `components/ui/StepFlow.tsx:43` | `{i + 1}` nomor step dari index loop | ❌ Inkonsisten: `home_flow_step` **punya** field `number`, `service_flow_step` tidak. Reorder blok di dashboard mengubah nomor diam-diam |
| `constants/pricing.ts:14-16` `formatYen` | `` `¥${amount.toLocaleString("ja-JP")}` `` | ❌ Halaman EN tetap menampilkan `¥3,740`, bukan `JPY 3,740` |
| `app/[lang]/pricing/page.tsx:57` | `priceCurrency: "JPY"` | ❌ |
| `app/[lang]/pricing/page.tsx:52,56` | `.ja` dipaksa di JSON-LD | ❌ JSON-LD di `/en/pricing` tetap berbahasa Jepang |
| `pricing/page.tsx:98` | `tone={course.key === "nursing" ? "accent" : "primary"}` | ❌ Kursus ke-3 dari dashboard selalu biru primary |
| `Navbar.tsx:225`, `Footer.tsx:31` | `width/height` intrinsik untuk gambar CMS yang sama (427×160 vs 320×120) | ❌ Editor upload logo rasio lain → gambar melar |

---

## H. Fidelity serializer legal ↔ Tiptap — 🔴 laten, meledak saat editor menyimpan

`features/cms/legal-html.ts`. Tiga di antaranya **sudah dibuktikan** dengan menjalankan parser-nya.

| # | Gap | Bukti | Dampak |
|---|---|---|---|
| 1 | `parseTableRows` (`:340-355`) hanya membaca header dari `<thead>`. **Tiptap tidak pernah meng-emit `<thead>`** — `<th>` diletakkan di `<tr>` pertama dalam `<tbody>`, dan `extractCells` mencari `<td>` | Input `<table><tbody><tr><th>A</th><th>B</th></tr>…` → `rows: [[], ["1","2"]]` | **Judul tabel hilang total.** Mengenai tabel harga `compensation`, tabel biaya pembatalan, tabel layanan quasi-mandate, tabel pengiriman data eksternal di privacy. Terpicu begitu ada editor menyimpan ulang tabel mana pun dari dashboard |
| 2 | `TOP_LEVEL_PATTERN`/`LI_PATTERN` (`:151-152`) non-greedy, tanpa dukungan nesting | `<ul><li><p>outer</p><ul><li><p>inner</p></li></ul></li>…` → `[{li,"outer</p><ul><li><p>inner"}, {p,"after"}]` | **Markup mentah bocor sebagai teks kasat mata** di dalam bullet. Nested list adalah hal paling wajar di dokumen hukum |
| 3 | `unescapeHtml` (`:56-63`) hanya menangani 5 entity | `<p>Rp&nbsp;1.000 &mdash; ok</p>` → teks literal `Rp&nbsp;1.000 &mdash; ok` | `&nbsp;` adalah entity yang paling sering di-emit Tiptap |
| 4 | Pass ke-5 (`:283-289`) membuang semua atribut termasuk `colspan`/`rowspan`/`colwidth` | `<th colspan="2">Merged</th>` → `rows: [[], ["x","y"]]` | Tabel `compensation` justru mengandalkan merged cell (kini diemulasi dengan sel `""`). Editor pakai merge asli → tabel harga bergeser kolom |
| 5 | Hanya `h2`/`h3` yang dikenal (`:151,163-176`) | `<h4>` → `{type:"p"}` | Editor menambah sub-sub-pasal → hierarki hilang jadi paragraf biasa |
| 6 | Link markdown `[label](/path)` tidak diserialisasi jadi `<a>` (`:76-96`) | Terkonfirmasi live: body tokushoho di Atlas berisi literal `[こちらの料金ページ](/pricing)` | Di dashboard editor melihat markdown mentah. Kalau ia "membetulkan"-nya jadi link Tiptap, label lama tetap tinggal → link ganda. Sebaliknya teks legal yang mengandung `[2](3)` berubah jadi link tak sengaja |

**`legal-html.test.ts` (382 baris) hijau tapi tidak menangkap satu pun dari gap #1-#5** — seluruh inputnya adalah HTML buatan `blocksToHtml` sendiri atau Tiptap yang disederhanakan. Tidak ada kasus tabel tanpa `<thead>`, nested list, `h4`, atau `&nbsp;`. Suite-nya menutup permukaan keamanan dengan baik (`<script>`, `javascript:`, `on*`, render proof, localizeHref) — cakupan fidelity-nya yang bolong.

**Dua celah guard tambahan:**
- `features/cms/legal.ts:57-62` — `pick()` memvalidasi `heading` bertipe `string`, bukan non-kosong. Guard non-kosong hanya ada untuk `body` (`:94`). EN heading kosong → `<h1>` dan `<title>` kosong di halaman EN.
- `features/cms/merge.ts:93` — terjemahan EN yang belum diisi **diam-diam jatuh ke teks JA tanpa warning apa pun**. Untuk 7 dokumen legal ini failure mode paling mudah terjadi dan paling sulit terdeteksi.

---

## I. Rute & sitemap — 🟠 batas kaku yang perlu disampaikan ke klien

| Item | Kondisi | Dampak |
|---|---|---|
| `app/sitemap.ts:6-20` | Daftar 13 rute di-hardcode sebagai array TS; tidak ada catch-all `[slug]` di `app/[lang]/` | **Halaman baru yang dibuat editor di Atlas tidak sekadar absen dari sitemap — tidak ada rute yang merendernya sama sekali (404).** Menambah halaman butuh 5 perubahan kode: page Atlas + content type + loader + `app/[lang]/<slug>/page.tsx` + entri sitemap |
| `app/sitemap.ts:31` | `lastModified: new Date()`; `force-dynamic` di `app/[lang]/layout.tsx:23` tidak menjangkau segment ini | Sitemap di-prerender saat build |
| `app/sitemap.ts:33-45` | Tidak ada `x-default` | — |
| `app/robots.ts` | `allow: "/"` semua UA, tidak CMS-driven | Wajar. Tapi tidak punya jalur untuk tahu kalau ada halaman draft yang perlu di-noindex |
| `app/[lang]/layout.tsx:33` | `generateStaticParams` hardcode `[{lang:"ja"},{lang:"en"}]` padahal `LANGS` sudah ada di `i18n.ts:14` | Dua sumber kebenaran; `sitemap.ts:35` pakai `LANGS`, layout tidak |

---

## J. Observability & operasional — 🟠 diagnostik bagus, tanpa tujuan pengiriman

| Item | Kondisi |
|---|---|
| Mekanisme deteksi fallback | **Sangat rapi**: 3 tag terpisah (`[cms:fallback:failure]`, `[cms:fallback:unexpected-content]`, `[cms:unexpected-content]`), pesan expected-vs-received konkret, dedupe per-proses |
| Tujuan log | **Tidak ada.** Nol Sentry/Datadog/Logtail, nol `/api/*` route, nol health endpoint, nol `NEXT_PUBLIC_*` |
| Skenario terburuk | `ATLAS_API_KEY` hilang saat deploy → satu `console.warn` di boot (`client.ts:95`), `atlasClient` di-memo jadi `null` (`:83-86`, tidak pernah retry), lalu situs menyajikan `constants/*.ts` **dengan sempurna dan selamanya**. Situs tampak 100% sehat; dashboard tidak berpengaruh apa-apa. Tidak ada yang sadar sampai ada yang mengeluh "editan saya tidak muncul" |
| Caching | `cache: "no-store"` di setiap fetch + `dynamic = "force-dynamic"` di layout. Nol `revalidate`/`unstable_cache`/`revalidateTag` di seluruh repo |
| Biaya per page view | Baseline 3 request Atlas (`site` + `legal-tokushoho` + `company`) sebelum halamannya sendiri. Home = 4, `/pricing` & `/fees` = 5. Semua `no-store`, timeout 8s masing-masing |
| Request sia-sia | `getCompany()` dipanggil dari layout root **di setiap rute**, hanya untuk mengecek keberadaan 2 baris yang nilainya toh hardcoded (area C). Sia-sia di 14 dari 15 rute |
| Konsekuensi | Situs tidak bisa di-CDN-cache; availability situs = availability Atlas |

**Satu perilaku struktural yang perlu disampaikan ke klien:** `pickJa`/`pickBi` (`fields.ts:79-87`) memakai `||`, dan nilai kosong di kedua locale collapse jadi `undefined` (`merge.ts:95`). Artinya **editor tidak bisa mengosongkan field** — menghapus isi di dashboard justru membangkitkan kembali teks lama dari `constants/copy.ts`, tanpa warning. Sudah ditangani benar untuk 2 field opsional (`pickBiOptional` untuk `fee.note` dan `rate_row.detail`), tidak untuk sisanya.

**Sisa kopling posisi yang tersembunyi** — `site.ts:131-150`: `use_legal_heading` diseed `""` untuk link non-tokushoho, collapse jadi `undefined`, lalu jatuh ke fallback **berbasis indeks array** `FALLBACK.footer.legalLinks[i]`. Kalau editor men-drag urutan legal link sehingga indeks 2 ditempati link lain, link itu mewarisi `use_legal_heading = "tokushoho"` dan tampil di footer dengan judul dokumen tokushoho. Ironis: seluruh `mapBlocksByType` dibangun justru untuk membunuh kopling posisi, tapi lolos di jalur fallback ini.

---

## K. Dead code — 🟡

Diverifikasi dengan grep menyeluruh; nol konsumen.

| Item | Ukuran | Catatan |
|---|---|---|
| `constants/copy.ts:76-113` — `auth` | 15 string bilingual, ~38 baris | Nol konsumen, nol content type Atlas |
| `constants/copy.ts:728-745` — `staffPricing` | `hero.heading`, `hero.body`, `note` | Nol konsumen. **`hero.body` + `note`-nya duplikat verbatim** dengan `pricing.hero.body`/`pricing.note` yang CMS-backed → jebakan: editor ubah satu, mengira yang lain ikut |
| `constants/pricing.ts:132-189` — `courseRates` | 77 baris, 8 baris tarif lengkap | Nol konsumen (hanya **type** `CourseRates` yang di-import `rates.ts:18`; nilai `courseRates` di `pricing/page.tsx` adalah variabel lokal dari `getCourseRates()`). Duplikat angka yen yang bisa mengambang diam-diam dari sumber sebenarnya |
| `components/ui/TabPanel.tsx` | 97 baris | Nol import. Masih memakai pola bilingual-ditumpuk pra-refactor (`{tab.label.ja}` + `{tab.label.en}` bersamaan, `:72-77`) — kalau dihidupkan lagi akan mengabaikan `lang` |
| `public/` | 13 dari 22 file (~59%) tidak dirujuk | Sisa starter Next (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`); aset yatim (`logo.svg` ×2, `triangle_badge.svg`); 5 `.jpg` yang **menipu** — namanya sama dengan `uploaded_as` di `media-manifest.json` padahal `upload-media.ts:97-157` membaca varian `.webp` dan transcode di memori |

---

## L. Konfigurasi & tooling — 🟠

| Item | Kondisi | Catatan |
|---|---|---|
| **MCP server `atlas`** | Menunjuk workspace **`ilham123's-workspace`**: 0 pages, 1 entry sampah, 1 content type, locales `[]` | Workspace produksi adalah `care-24` di `api-c24jp.sipsedutech.id`: 30 content type, 15 page published. **Audit lewat MCP saja akan menyimpulkan CMS kosong — terbalik 180 derajat.** Perbaiki env MCP sebelum ada yang menjalankan tool tulis Atlas |
| `features/cms/atlas.types.ts` | **Nol field bertipe `image`** di hasil generate — hanya `image_alt`/`logo_alt`. Padahal `schema.ts` mendefinisikan 6: `site_brand.logo`, `home_hero.image`, `home_care_course_card.image`, `home_contact.mics_logo`, `home_contact.iso_logo`, `use_case_item.image` | `atlas-cms generate` tidak memancarkan tipe `image`. Loader tetap jalan (baca `Record<string, unknown>`), tapi salah ketik nama field gambar lolos `tsc` dan diam-diam menyajikan file bundel selamanya |
| `next.config.ts:23-29` | `remotePatterns` satu entri: `horizoon.s3.ap-southeast-1.amazonaws.com/care-24/media/**` | Cocok dengan URL nyata — gambar memang bisa dimuat. Tiga kerapuhan: (a) host & prefix bucket hardcoded, pindah bucket/CDN = 400 untuk semua gambar; (b) `ATLAS_BASE_URL` tidak ada hubungannya dengan host media; (c) instance dev dengan MinIO `http://localhost:9000` (diuji eksplisit di `fields.test.ts:525-530`) **tidak** diizinkan → gambar rusak di dev |
| `proxy.ts:36-38` | `matcher: ["/((?!_next|.*\\..*).*)"]` | Benar — `/sitemap.xml` & `/robots.txt` lewat tanpa rewrite. Redirect 308 `/ja/*` → `/*` konsisten dengan `localizeHref`. Nol temuan |
| Regresi format media | `media-manifest.json`: sumber `.webp`, `uploaded_as` `.jpg`/`.png` | Repo punya `.webp` (14 file) tapi CMS menyajikan varian JPEG lebih berat. Logo 407 KB PNG untuk gambar 5600×2101 paling boros |
| Komentar usang | `seed-site.ts:8-12` menyatakan "Block order (position 0..13) is a hard contract… destructures positionally" — **sudah tidak benar** sejak `mapBlocksByType` (`site.ts:76-83` justru mendokumentasikan penghapusannya) | Pembaca berikutnya bisa menyalakan lagi kopling posisi yang sudah dibongkar |
| Rujukan file hantu | `architecture-plan.json` (disebut `schema.ts:1-2`, `client.ts:52`), `plan-notes.md` (`rates.ts:35`) | Tiga rujukan otoritatif yang disebut berulang di komentar, tak satu pun ada di repo |
| Font | `Noto_Sans_JP` dideklarasikan **dua kali** (`layout.tsx:25-30` dan `global-not-found.tsx:13-18`), `subsets: ["latin"]` untuk font Jepang | Ubah weight di satu tempat, yang lain diam-diam beda |

---

## Yang sudah benar dan layak dipertahankan

Supaya proporsional — bagian mekanis integrasi ini di atas rata-rata:

- **Paritas field sempurna tiga arah.** Setiap field di `schema.ts` diseed oleh suatu `seed-*.ts` dan dibaca oleh suatu loader; setiap field yang dibaca loader ada di schema. Nol yatim di arah mana pun, ~180 field.
- **Kopling posisi sudah dibongkar.** `mapBlocksByType` mengelompokkan berdasarkan slug tipe blok, bukan indeks. Editor bisa menambah nav item ke-5 atau use-case ke-5 tanpa meruntuhkan halaman ke fallback.
- **Fallback per-field, bukan per-halaman.** Satu field rusak tidak menjatuhkan seluruh halaman.
- **`pickImage` menolak UUID mentah dan skema non-http** — itulah yang mencegah `<img src="01a01e63-…">` bocor ke HTML.
- **Kelengkapan bilingual tinggi.** Dari 202 field localizable di 15 halaman, hanya 8 kosong — dan kedelapannya kosong secara sengaja (`page-hero.body` di company yang loadernya memang tidak baca, `rate-row.detail` pada baris nomination/transport, `home-care-course-fee.note` pada 2 fee cell, `footer-legal-link.label` pada link tokushoho yang labelnya diambil dari heading dokumen legal).
- **Media nyata.** 8 aset direferensikan, semuanya HTTP 200 di S3. Tidak ada halaman yang jatuh ke `public/` karena gambarnya hilang.
- **Pipeline legal nol drift.** Menjalankan `htmlToBlocks` atas HTML asli dari Atlas menghasilkan blok yang identik dengan `constants/legal.ts` untuk seluruh 14 body ja/en.
- **`Navbar` dan `Footer`** adalah komponen tersehat: nol string user-visible hardcoded, semua lewat `t(site.*)`, termasuk `aria-label` hamburger.
- **`features/lang/i18n.ts` bersih** — nol kamus string UI. Arsitekturnya benar: "kamus" adalah `constants/copy.ts` yang CMS-backed.
- **`features/cms` bukan lagi dead code** — ter-wire ke 19 file di `app/` dan `components/`. Ini mengoreksi catatan lama.

---

## Urutan perbaikan yang disarankan

**Segera (konten, tanpa deploy — bisa dikerjakan klien di dashboard hari ini):**
1. Isi nomor telepon publik di `/tokushoho` dan hapus instruksi editorial `03-XXXX-XXXX`.
2. Hapus catatan internal `※…システムに組み込む想定` dari `/quasi-mandate`.
3. Isi tanggal pemberlakuan `/terms-for-care-supporters`.
4. Tandai `/quasi-mandate` sebagai dokumen spesimen, atau isi placeholder `[X,XXX]`.

**Prioritas 1 (bug fungsional):**
5. Sambungkan `href` banner staff ke `home.apply.staff.href`, tambahkan field `user_href`, perbaiki perhitungan `external`.
6. Buka jalur SEO: teruskan `page.seo` + `seo_translations` di `shapePageBlocks`, baca di `generateMetadata` 12 rute, isi `description` + `og_image` di Atlas.
7. Ganti `SITE_URL` ke domain produksi.

**Prioritas 2 (kualitas & ketahanan):**
8. Perbaiki `parseTableRows` agar menerima `<th>` di dalam `<tbody>` — sebelum ada editor menyentuh tabel legal mana pun.
9. Tambahkan `openGraph.images` / `app/opengraph-image.tsx`.
10. Sambungkan `legalName`/`address`/`foundingDate` di JSON-LD ke `company_row`, ganti `@type` ke `LocalBusiness`.
11. Render atau hapus 6 field mati di area D.
12. Tambahkan `app/global-error.tsx`; jadikan `error.tsx` sadar `lang`.

**Prioritas 3 (kebersihan):**
13. Hapus dead code area K.
14. Perbaiki env MCP `atlas` ke workspace `care-24`.
15. Tambahkan tujuan pengiriman untuk log `[cms:fallback:*]`.
16. Tambahkan kasus uji Tiptap asli ke `legal-html.test.ts`.
