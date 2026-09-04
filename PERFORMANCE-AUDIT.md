# Audit Performa — marketing-web

**Tanggal:** 2026-09-04
**Cakupan:** strategi caching (`next.config.ts`, `lib/bff-core.ts`, `app/[lang]/layout.tsx`), batas server/client component (`features/`, `components/`), pipeline aset (gambar, font, ikon), konfigurasi build
**Metode:** pembacaan sumber + penghitungan langsung atas pohon komponen (36 file `.tsx` `"use client"` dari 63 non-test) dan seluruh 15 rute di `app/[lang]`
**Status:** temuan statis — **belum ada pengukuran runtime** (lihat Batasan)

---

## Batasan

Audit ini **belum** disertai angka lapangan. Tidak ada Lighthouse run, tidak ada trace WebPageTest, tidak ada pengukuran TTFB produksi, tidak ada `next build` yang outputnya dicatat. Semua temuan di bawah berasal dari pembacaan sumber dan penghitungan struktural — yaitu: *jumlah request upstream per page view* dan *jumlah komponen yang dikirim sebagai JS* dapat dihitung dari kode dengan pasti, tetapi **dampak milidetiknya tidak**.

Estimasi latensi mana pun di dokumen ini ditandai eksplisit sebagai estimasi. Sebelum dan sesudah setiap perbaikan, ukur dengan alat yang sama.

Perbedaan dengan `CMS-INTEGRATION-AUDIT.md` (2026-08-20) yang berbasis verifikasi runtime 26 rute: dokumen itu punya bukti eksekusi, dokumen ini belum.

---

## Vonis

**Situs marketing dengan konten yang berubah mingguan disajikan seolah-olah data per-request.** Tidak ada satu pun halaman yang boleh di-cache oleh Next, dan tidak ada satu pun fetch CMS yang boleh di-cache oleh `fetch`.

Ini keputusan sadar, bukan kelalaian — komentar di `app/[lang]/layout.tsx:16-28` menjelaskan alasannya dengan benar (edit dashboard harus tampil tanpa rebuild) dan bahkan merujuk dokumen Next yang tepat. Yang terlewat: tujuan itu bisa dicapai **tanpa** membuang seluruh lapisan cache.

| Area | Kondisi | Severity |
|---|---|---|
| A. Caching CMS & rendering rute | 3+ fetch upstream blocking per page view, nol cache di kedua lapisan | 🔴 Kritis |
| B. Batas server/client component | 16 komponen presentasional murni jadi client hanya karena mewarisi induk | 🟠 Tinggi |
| C. Payload ganda hydration | Konten CMS diserialisasi 2× ke dalam HTML | 🟠 Tinggi |
| D. Optimasi gambar dimatikan | Original S3 dikirim ke mobile | 🟠 Tinggi |
| E. Bobot font | 3 weight × set CJK penuh | 🟡 Sedang |
| F. Build memakai webpack, bukan Turbopack | Iterasi dev lebih lambat | 🟡 Sedang |
| G. Ikon Tabler | 8 call site, dependency penuh | 🟢 Rendah |

---

## A. Caching CMS & rendering rute — 🔴 akar masalah

Dua lapisan cache dimatikan bersamaan, dan efeknya berlipat, bukan berdampingan.

| Lapisan | Lokasi | Setelan | Akibat |
|---|---|---|---|
| Cache rute Next | `app/[lang]/layout.tsx:28` | `export const dynamic = "force-dynamic"` | Seluruh 15 rute × 2 locale dirender ulang tiap request |
| Cache `fetch` | `lib/bff-core.ts:136` | `cache: "no-store"` | Tiap render menembak Atlas lagi |

`force-dynamic` di layout menurun ke **semua** rute di bawah `app/[lang]` — bukan hanya home.

### Berapa fetch per satu page view

`app/[lang]/layout.tsx:124-128` mengambil tiga dokumen sekaligus:

```
getSite()                       → /pages/site
getLegalHeading("legal-tokushoho") → /pages/legal-tokushoho
getHome()                       → /pages/home
```

Lalu halamannya sendiri mengambil dokumennya (mis. `app/[lang]/page.tsx:29`). React `cache()` di `features/cms/client.ts:20,31-32` mendedupe dengan benar **di dalam satu request** — `getSite()` dari `generateMetadata` dan dari `RootLayout` memang hanya satu fetch. Yang tidak bisa dilakukan `cache()`: berbagi apa pun **antar request**. Pengunjung ke-2 mengulang seluruhnya dari nol.

Catatan: `getHome()` dipanggil di layout untuk `home.contact` saja — artinya dokumen home ikut ditarik **di setiap rute**, termasuk `/faq` dan `/privacy` yang tidak menampilkannya.

Tiap fetch punya plafon timeout 8 detik (`lib/bff-core.ts:4`, `DEFAULT_BFF_TIMEOUT_MS`). Atlas lambat = seluruh situs lambat, tanpa perantara.

### Perbaikan

Ganti `no-store` dengan revalidasi bertag di `lib/bff-core.ts`:

```ts
// ganti cache: "no-store"
next: { revalidate: 300, tags: [`cms:${slug}`] }
```

Hapus `export const dynamic = "force-dynamic"` dari `app/[lang]/layout.tsx`, lalu tambahkan rute revalidasi:

```ts
// app/api/revalidate/route.ts
revalidateTag(`cms:${slug}`);
```

Arahkan webhook publish Atlas ke sana. Jaminan "edit langsung tampil" tetap utuh — bahkan lebih cepat daripada sekarang untuk pengunjung yang tidak memicu render — sementara pengunjung biasa mendapat halaman ter-cache.

Bila webhook belum bisa dipasang: `revalidate: 60` sendirian sudah mengubah 3 panggilan blocking per view menjadi ~1 per menit per halaman, dengan konsekuensi edit tampil maksimal 60 detik kemudian.

**Prasyarat verifikasi:** `dynamic = "force-dynamic"` juga dideklarasikan terpisah di `app/sitemap.ts:26`, `app/manifest.ts:64`, dan `app/global-not-found.tsx:48` (route segment config tidak menurun ke file konvensi — lihat komentar di `app/sitemap.ts:10-24`). Ketiganya berdiri sendiri dan **tidak** ikut berubah oleh perbaikan ini.

**Estimasi (belum diukur):** penghematan TTFB ~300-800ms. Angka ini dugaan berdasarkan hilangnya 3 round-trip upstream; ganti dengan hasil ukur sebelum dikutip ke mana pun.

---

## B. Batas server/client component — 🟠 36 dari 63

36 file `.tsx` non-test membawa `"use client"`. Pemetaannya:

| Kategori | Jumlah | Contoh |
|---|---|---|
| Pemilik query (butuh client) | 7 | `HomeView.tsx`, `faq-view.tsx`, `rates-view.tsx` |
| Interaktif sejati (butuh client) | 13 | `ContactForm.tsx`, `FaqList.tsx`, `LangToggle.tsx`, `Navbar.tsx` |
| **Presentasional murni** | **16** | `HomeHeroSection.tsx`, `HomeProblemsSection.tsx`, `Footer.tsx` |

16 file terakhir **nol** `useState` / `useEffect` / `onClick` / handler apa pun — markup statis dengan `t()` dan `next/image`. Mereka client semata-mata karena induknya client: `HomeView.tsx:24` memanggil `useHomeQuery()`, dan seluruh subtree di bawahnya ikut terseret.

Biayanya: seluruh JSX itu, plus ikon Tabler dan helper `t()`, dikirim sebagai JS lalu di-hydrate ulang — untuk markup yang sudah dirender server.

### Pertanyaan yang perlu dijawab dulu

Apa sebenarnya kontribusi TanStack Query di halaman-halaman ini?

- Data diambil server-side (`app/[lang]/page.tsx:29`).
- Diseed lewat `queryFn: () => Promise.resolve(home)` (`app/[lang]/page.tsx:34`) — jadi query pertama tidak pernah benar-benar fetch.
- `staleTime: 60_000`, `refetchOnWindowFocus: false` (`components/providers.tsx:16,19`) — refetch otomatis dimatikan.
- Satu-satunya jalur refetch adalah tombol retry manual di state error.

Karena semua rute `force-dynamic`, navigasi client **sudah** memicu render server ulang. Query layer di sini menyimpan snapshot yang tidak pernah di-invalidate dan tidak pernah di-refetch sendiri.

Jika `dynamic = "force-dynamic"` dicabut (area A), pertanyaan ini berubah: dengan halaman ter-cache, ada argumen sah untuk refetch client-side. Karena itu **kerjakan A dulu, putuskan B setelahnya** — urutan sebaliknya berisiko membongkar query layer lalu menemukan kita membutuhkannya.

`ContactForm` dan akordeon FAQ jelas butuh client. Section marketing tidak.

---

## C. Payload ganda hydration — 🟠

`components/query/CmsQueryBoundary.tsx:29-33` melakukan `dehydrate()` atas snapshot CMS ke dalam `HydrationBoundary`. Konten yang sama karena itu masuk HTML **dua kali**:

1. Sebagai markup hasil render server.
2. Sebagai state query terdehidrasi di payload RSC.

Pada homepage yang padat konten ini porsi yang nyata dari ukuran dokumen. Ini konsekuensi langsung dari pola di area B — memperbaiki B menghapus C dengan sendirinya, jadi jangan tangani terpisah.

---

## D. Optimasi gambar dimatikan — 🟠

`next.config.ts:14` menyetel `images.unoptimized: true`. Komentar di atasnya (baris 9-13) mendokumentasikan alasannya dengan baik: `/_next/image` mengembalikan `402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED` setelah kuota Vercel habis, dan hero kosong lebih buruk daripada gambar besar. Trade-off itu benar untuk situasi saat itu.

Konsekuensinya tetap berlaku: original S3 ukuran penuh dikirim apa adanya ke mobile. `next/image` masih menangani layout/`sizes`/`priority`, tapi tidak ada satu byte pun yang dihemat.

Karena gambar sudah berada di S3, jalan keluarnya bukan mengaktifkan kembali `/_next/image` — melainkan `loader` kustom di `next.config.ts` yang menunjuk CloudFront atau imgproxy. Semantik `next/image` tetap, kuota Vercel tidak tersentuh, gambar responsif kembali nyata.

Catatan: `dangerouslyAllowLocalIP: true` (`next.config.ts:58`) dipasang untuk mengatasi SSRF guard pada resolusi NAT64. Bila proxy gambar tidak lagi lewat `/_next/image`, flag ini **kemungkinan** sudah tidak diperlukan — verifikasi sebelum menghapus, jangan asumsikan.

---

## E. Bobot font — 🟡

`app/fonts.ts:51-56` memuat weight `400`, `500`, `700` Noto Sans JP.

Doc comment di file itu (hasil investigasi yang benar dan sudah diverifikasi empiris) menetapkan bahwa `subsets` **tidak** menyaring glyph: Next mengunduh dan menghosting sendiri seluruh 373 blok `@font-face` per weight, mencakup hiragana/katakana/kanji. Artinya tiap weight adalah satu set CJK penuh.

Bila weight `500` ternyata jarang dipakai, menghapusnya membuang satu set penuh. Hitung dulu pemakaian `font-medium` di seluruh sumber sebelum mengambil keputusan — jangan hapus tanpa penghitungan itu.

Jangan sentuh `subsets: ["latin"]`. Sudah diselidiki, sudah dinyatakan false alarm, dan alasannya terdokumentasi lengkap di file tersebut.

---

## F. Build memakai webpack — 🟡

`package.json` (`scripts.dev` / `scripts.build`):

```
"dev":   "next dev --webpack"
"build": "next build --webpack"
```

Keduanya menolak Turbopack secara eksplisit. Kalau ini sisa dari masa transisi dan bukan penanganan masalah tertentu, melepas flag pada `dev` adalah kemenangan besar untuk iterasi lokal.

Uji `dev` dan `build` **terpisah**. Keduanya bisa punya alasan berbeda untuk ada, dan `build` yang lebih berisiko tidak boleh ikut berubah hanya karena `dev` berhasil.

---

## G. Ikon Tabler — 🟢

`@tabler/icons-react` dipakai di 8 call site (`HomeHeroSection`, `HomeApplySection`, `HomeContactSection`, `HomeCoursesSection`, `HomeExamplesSection`, `HomeFlowSection`, `FaqList`, `Accordion`) untuk sedikit ikon: `IconArrowRight`, `IconArrowDown`, `IconMapPin`, `IconPhone`, `IconClock`, `IconChevronDown`.

Named import sudah tree-shakeable, jadi dampaknya kecil. Menyalin ~6 SVG inline akan menghapus dependency sepenuhnya. Kerjakan hanya bila sedang menyentuh file-file itu untuk alasan lain.

---

## Yang sudah benar dan layak dipertahankan

Supaya proporsional — beberapa bagian di sini justru di atas rata-rata:

- **Dedupe per-request sudah benar.** `cache()` di `features/cms/client.ts` dipasang di lapisan yang tepat (hasil raw, bukan hasil terproyeksi), sehingga `getPageBlocks` dan `getPageMeta` untuk slug sama berbagi satu HTTP request. Ini sudah mencegah bug yang jauh lebih halus daripada masalah caching di area A.
- **Satu dokumen per halaman, bukan per section.** `features/home/actions.ts:12` sengaja menolak mengekspos fetch per-section, dengan alasan yang ditulis eksplisit: mencegah snapshot CMS campur. Itu keputusan arsitektur yang benar dan tidak boleh dibongkar saat mengerjakan area B.
- **`Promise.all` di layout.** `app/[lang]/layout.tsx:124` memparalelkan tiga read, bukan menunggu berurutan. Jumlah requestnya yang bermasalah, bukan orkestrasinya.
- **Header keamanan lengkap di lapisan yang tepat.** `next.config.ts:65-107` memasang CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` di Next, bukan di Apache/Nginx — dan `unsafe-eval` sengaja tidak dimasukkan.
- **`remotePatterns` dipersempit, bukan digeneralisasi.** Host + prefix path dikunci ke bucket yang benar-benar dipakai, dan entri localhost dijaga `NODE_ENV !== "production"`. Komentarnya menjelaskan kenapa bulan tidak boleh ikut di-pin.
- **Timeout dan error CMS ternormalisasi.** `lib/bff-core.ts` mengubah kegagalan upstream jadi `ApiResult` bertipe dengan `traceId`, bukan exception mentah.
- **Keputusan performa didokumentasikan bersama alasannya.** `unoptimized`, `dangerouslyAllowLocalIP`, `force-dynamic`, dan `subsets` semuanya punya komentar yang menjelaskan *kenapa*, sebagian dengan rujukan ke sumber Next. Audit ini bisa ditulis justru karena komentar-komentar itu ada.

---

## Urutan perbaikan yang disarankan

**Prioritas 1 — caching (dampak terbesar, perubahan paling terbatas):**
1. Ukur baseline dulu: TTFB produksi + Lighthouse pada `/` dan `/faq`, JA dan EN. Tanpa ini tidak ada cara membuktikan langkah 2-4 berhasil.
2. Ganti `cache: "no-store"` → `next: { revalidate, tags }` di `lib/bff-core.ts:136`.
3. Cabut `dynamic = "force-dynamic"` dari `app/[lang]/layout.tsx:28`. Jangan sentuh deklarasi serupa di `sitemap.ts`, `manifest.ts`, `global-not-found.tsx`.
4. Tambahkan `app/api/revalidate/route.ts` + webhook publish Atlas. Uji: edit di dashboard → muncul tanpa rebuild.
5. Ukur ulang dengan alat yang sama. Bandingkan.

**Prioritas 2 — pengiriman JS (kerjakan hanya setelah P1 stabil):**
6. Putuskan peran TanStack Query pasca-caching (lihat pertanyaan di area B). Keputusan ini menentukan langkah 7.
7. Turunkan 16 komponen presentasional ke Server Component. Ini menghapus area C sekaligus. Pertahankan pola satu-dokumen-per-halaman dari `actions.ts`.
8. Pindahkan `getHome()` di layout agar tidak ikut tertarik pada rute yang tidak memakainya.

**Prioritas 3 — aset & tooling:**
9. `loader` gambar kustom → CloudFront/imgproxy; verifikasi apakah `dangerouslyAllowLocalIP` masih perlu.
10. Hitung pemakaian `font-medium`; hapus weight `500` bila hasilnya membenarkan.
11. Uji lepas `--webpack` pada `dev` lebih dulu, `build` terpisah dan belakangan.
12. Inline ~6 SVG Tabler bila kebetulan sedang menyentuh file terkait.
