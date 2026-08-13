# Audit SEO + AEO + Agent Readiness — Care24JPN (marketing-web)
Next.js 16.2.7 · 2026-08-12 · 11 route diaudit

## Verdict

Rendering-nya sehat dan itu justru yang membuat sisanya menyakitkan: semua 11 route ter-generate `○ (Static)`, konten `"use client"` tetap masuk ke raw HTML (227 kata terbaca di `/` via curl User-Agent GPTBot tanpa eksekusi JS), jadi tidak ada satu pun masalah "konten hilang dari crawler" di situs ini — pondasi teknisnya sudah beres. Masalahnya ada satu tingkat di atas itu: crawler bisa membaca halaman ini dengan sempurna, tapi tidak menemukan apa pun yang layak dikutip. Tidak ada `robots.txt`, tidak ada `sitemap.xml`, nol JSON-LD, `<title>` identik di empat halaman utama, dan — temuan baru dari cross-verification — **hanya 1 dari 11 halaman punya `<h1>` sama sekali**, karena `components/ui/Section.tsx:23` meng-hardcode `<h2>` untuk semua judul halaman.

Yang paling merugikan bukan itu, melainkan ini: simulasi retrieval untuk query paling niscaya di bisnis ini ("berapa biaya jasa perawatan di rumah dari Care24") gagal di ketiga kandidat halaman. Tidak ada satu blok teks pun di seluruh situs yang menggabungkan brand + jenis layanan + angka harga + unit jam + status pajak dalam satu chunk yang bisa dikutip utuh. Harga ada (¥3,740/jam, akurat, konsisten), brand ada (di `<title>` dan footer), tapi keduanya tidak pernah bertemu dalam satu kalimat. Ditambah kanibalisasi `/pricing` vs `/fees` — `/fees` adalah superset data harga tapi H1-nya soal gaji supporter (¥2,000/jam) — situs ini bukan cuma gagal dikutip, ia punya jalur konkret untuk **dikutip salah**.

Satu ironi struktural: konten paling AEO-friendly di seluruh codebase (4 artikel use-case naratif di `constants/copy.ts:581-683`, paragraf 60-90 kata, format nyaris "X adalah…") tidak punya URL sama sekali karena pipeline CMS yang seharusnya merendernya 100% dead code. Aset terbaik yang sudah ditulis dan dibayar, tidak accessible ke crawler mana pun.

**Skor: AEO 6/35 · Agent readability 12/25 · Crawler access 7/15 · Structured data 0/10 · Rendering 8/10 · SEO 1/5 — total 34/100**

Rendering 8/10 bukan basa-basi; itu domain di mana proyek ini benar-benar unggul dan tidak perlu disentuh. Structured data 0/10 karena benar-benar nol, bukan karena kurang lengkap.

---

## Catatan metodologi (baca sebelum tabel)

**Dua angka word-count di Lane 2 dan Lane 3 saling bertabrakan, dan resolusinya penting.** Lane 2 (baca manual) menaksir home ~550-650 kata; Lane 3 (empiris, split whitespace dari raw HTML) mengukur 227 kata. Keduanya benar untuk hal berbeda: penghitungan berbasis whitespace **secara sistematis meremehkan teks Jepang**, karena bahasa Jepang tidak memakai spasi antar kata — satu kalimat JA utuh bisa terhitung sebagai 1-3 "kata". Konsekuensinya:

- Angka Lane 3 (`/pricing` 79, `/service-flow` 62, `/company` 81) **tidak boleh dibaca sebagai volume konten**. Itu proxy yang rusak untuk halaman JA.
- Angka Lane 3 **valid dan kuat** untuk pertanyaan lain, yaitu "apakah konten ADA di raw HTML" — dan jawabannya ya.
- Penilaian "konten tipis" di bawah (F-11) karena itu disandarkan pada pembacaan manual Lane 2 dan pada jumlah *proposisi faktual* per halaman, bukan pada word count curl.

**Domain produksi TIDAK DIKETAHUI.** Tidak ada `vercel.json`, `wrangler.toml`, atau `.vercel` di repo; git remote hanya menunjuk source GitHub (`https://github.com/jooemrp/care24jpn-fe.git`), bukan hosting. Semua pengujian HTTP dilakukan di `localhost:3000`. **Perlu dikonfirmasi user** sebelum: pengujian redirect-chain produksi, penulisan `metadataBase`, absolute URL di sitemap, dan `canonical`. Beberapa fix di bawah diblokir oleh unknown ini — ditandai eksplisit.

**Akses server log tidak tersedia**, jadi tidak ada klaim apa pun di dokumen ini tentang volume kunjungan bot aktual (GPTBot/ClaudeBot/PerplexityBot). Semua penilaian dampak bersifat mekanis, bukan trafik-terukur.

---

## Temuan

Urut dampak × kepastian bukti. Semua T1 CRITICAL di atas semua T2 CRITICAL.

| # | Sev | Tier | Domain | Lokasi | Masalah | Dampak | Effort |
|---|---|---|---|---|---|---|---|
| F-01 | CRITICAL | T1 | SEO | raw HTML 4 halaman | `<title>` identik persis di `/`, `/pricing`, `/service-flow`, `/company` | 4 halaman tak terbedakan di SERP & retrieval index | S |
| F-02 | CRITICAL | T1 | Agent-read | `components/ui/Section.tsx:23` | 10 dari 11 halaman tidak punya `<h1>` sama sekali | Tidak ada sinyal topik utama per halaman | S |
| F-03 | CRITICAL | T1 | Crawler | tidak ada file | `robots.txt` 404, `sitemap.xml` 404 | Tidak ada peta situs; discovery murni bergantung link internal | S |
| F-04 | CRITICAL | T1 | AEO | `/pricing` vs `/fees` vs `/compensation` | 3 sumber harga berbeda; `/fees` superset tapi H1 soal gaji | AI bisa jawab ¥2,000/jam padahal biaya customer ¥3,740/jam | M |
| F-05 | CRITICAL | T1 | AEO | seluruh situs | Nol chunk yang menggabungkan brand+layanan+harga+unit+pajak | Query harga — query inti bisnis — tidak punya jawaban yang bisa dikutip | M |
| F-06 | CRITICAL | T1 | AEO | `constants/copy.ts:892-893` | Satu-satunya "(Care24)" di halaman non-legal merujuk entitas India | Risiko AI mengasosiasikan brand ke Aegis Care Advisors Pvt.ltd | S |
| F-07 | CRITICAL | T1 | Schema | raw HTML semua halaman | 0× `<script type="application/ld+json">` | Nol entity/harga/organisasi terbaca sebagai data terstruktur | M |
| F-08 | HIGH | T1 | SEO | `app/{page,pricing,service-flow,company}/page.tsx` | 4 halaman tanpa metadata sendiri; description = tagline EN untuk situs JA | Snippet generik & salah bahasa di semua halaman utama | S |
| F-09 | HIGH | T1 | AEO | `constants/copy.ts:581-683` | 4 use-case naratif (konten terbaik) tidak punya URL | Aset AEO terkuat 100% tak ter-crawl | M |
| F-10 | HIGH | T1 | AEO | 5 halaman non-legal | 0/5 halaman lolos answer-first 40-60 kata | Tidak ada paragraf pembuka yang bisa diangkat jadi jawaban | M |
| F-11 | HIGH | T1 | AEO | `/pricing`, `/fees`, `/service-flow`, `/company` | Prosa nyata sangat sedikit; halaman = judul + tabel | Sedikit permukaan untuk match query | M |
| F-12 | HIGH | T1 | SEO | `features/lang/store.ts:12-15` | Bilingual tanpa routing per-locale; nol hreflang | Konten EN tidak punya URL dan tidak bisa diindeks sama sekali | L |
| F-13 | HIGH | T1 | AEO | `constants/copy.ts`, `constants/legal.ts` | Nol blok FAQ / tanya-jawab di seluruh situs | Format paling mudah dikutip AI sama sekali absen | M |
| F-14 | HIGH | T1 | AEO | `copy.ts:496-536` vs `689-727` | 4 langkah flow duplikat 100% kata-per-kata di 2 URL | Dua URL bersaing untuk chunk yang identik | S |
| F-15 | HIGH | T1 | AEO | `legal.ts:207-221`, `301/348` | Placeholder `［〇］` belum diisi; tokushoho kontradiksi dengan halaman live | Dokumen legal terbaca belum final / stale | S |
| F-16 | HIGH | T1 | AEO | `copy.ts:190`, `legal.ts:414-415` | Chunk bergantung antecedent di luar chunk | Chunk yang diambil sendirian kehilangan makna | M |
| F-17 | MEDIUM | T1 | Agent-read | `components/Navbar.tsx:212-274` | Nav utama tanpa landmark `<nav>` (footer justru punya) | Struktur navigasi tak terdeteksi parser landmark | S |
| F-18 | MEDIUM | T1 | AEO | 5 halaman marketing; `legal.ts:110/112` | Nol tanggal publish/update; tanggal privacy hanya ada di versi JA | Tidak ada sinyal kesegaran | S |
| F-19 | MEDIUM | T1 | SEO | `app/fees/layout.tsx:6` + `app/layout.tsx:19` | Title template menempel brand kedua kali | `…｜Care24 \| Care 24 Japan` — brand ganda, title kepanjangan | S |
| F-20 | MEDIUM | T1 | Agent-read | raw HTML `/` | H2 berupa penggal kalimat, bukan judul | Heading gagal berfungsi sebagai batas chunk | S |
| F-21 | MEDIUM | T1 | AEO | `copy.ts:153,160-162,208` | ~9 klaim kabur vs ~6 spesifik; 0% klaim spesifik di prosa | Prosa tidak mengandung fakta yang bisa dikutip | M |
| F-22 | MEDIUM | T1 | AEO | ~10 heading utama | Hanya 1 heading berbentuk pertanyaan, itu pun generik | Heading tidak match bentuk query | M |
| F-23 | MEDIUM | T1 | SEO | repo-wide | Nol `metadataBase`, `openGraph`, `canonical`, `alternates` | Nol kontrol share preview & tidak ada penegasan URL kanonik | S |
| F-24 | LOW | T1 | Agent-read | `components/Navbar.tsx:200` | `aria-label="メニュー"` hardcoded JA | Inkonsistensi a11y bilingual | S |
| F-25 | LOW | T1 | Agent-read | `Navbar.tsx:232`, `Footer.tsx:33` | `alt` logo pakai `.en` di kedua bahasa | Alt text tidak ikut toggle bahasa | S |
| F-26 | LOW | T1 | Rendering | `features/cms/hooks.ts:1-18` | `useQuery` tanpa prefetch — risiko laten jika CMS diaktifkan | Belum termanifestasi; jebakan untuk nanti | M |
| F-27 | LOW | T2 | Agent-read | tidak ada file | Nol `llms.txt` / `llms-full.txt` | Mekanis nyata, dampak sitasi belum terbukti | S |
| F-28 | LOW | T2 | Agent-read | `next.config.ts` | Nol markdown content negotiation; `Vary` tanpa `Accept` | Mekanis nyata, dampak sitasi belum terbukti | M |

---

### [F-01] `<title>` identik di 4 halaman utama, tanpa canonical — CRITICAL · [T1 — TERBUKTI]

**Lokasi:** `app/layout.tsx:16-25`; efek terukur di raw HTML `/`, `/pricing`, `/service-flow`, `/company`

**Bukti:** Lane 3, curl langsung ke keempat route — `<title>` byte-identik di semuanya:

```
Care 24 Japan — Premium 24-hour in-home care
```

Sumbernya `app/layout.tsx:16-21`:

```ts
export const metadata: Metadata = {
  title: {
    default: `${brand.name} — ${brand.tagline.en}`,
    template: `%s | ${brand.name}`,
  },
  description: brand.tagline.en,
```

Keempat halaman itu tidak mengekspor `metadata` sendiri (`app/page.tsx`, `app/pricing/page.tsx`, `app/service-flow/page.tsx`, `app/company/page.tsx` semuanya `"use client"` tanpa `layout.tsx` pendamping — bandingkan `app/fees/` yang punya). Karena itu `title.default` yang dipakai, bukan `title.template`. Tambahan: `<link rel="canonical">` = 0 ditemukan di halaman mana pun.

**Kenapa penting:** `<title>` adalah satu-satunya field yang hampir semua sistem retrieval pakai sebagai label chunk — baik indeks pencarian klasik maupun pipeline RAG yang menyimpan `(title, url, text)`. Empat halaman dengan title identik berarti empat entri indeks yang, dari sisi label, tidak bisa dibedakan. Ketika sistem harus memilih satu untuk dikutip, ia memilih tanpa informasi. Ini juga menghilangkan satu-satunya tempat di mana halaman `/pricing` bisa mengatakan "ini halaman harga" — karena, lihat F-02, halaman itu bahkan tidak punya `<h1>`.

**Fix:** Tambahkan `layout.tsx` Server Component per route untuk keempat halaman (pola persis sudah ada dan terbukti di `app/fees/layout.tsx`), masing-masing mengekspor `metadata` dengan title & description unik berbahasa Jepang. Perhatikan interaksi dengan `title.template` — lihat F-19 sebelum menulis stringnya. Canonical menunggu konfirmasi domain (lihat F-23).

**Verifikasi setelah fix:**
```bash
for p in "" pricing service-flow company fees; do
  echo -n "/$p → "; curl -s "http://localhost:3000/$p" | grep -o '<title>[^<]*</title>'
done | sort | uniq -c
```
Lolos jika setiap baris muncul tepat 1×.

---

### [F-02] Hanya 1 dari 11 halaman punya `<h1>` — CRITICAL · [T1 — TERBUKTI]

> Temuan baru dari cross-verification. Tidak terlihat oleh lane mana pun sendirian: Lane 2 menyebut "H1 pricing", "H1 fees", "H1 company" berdasarkan pembacaan `constants/copy.ts` (di mana field-nya memang bernama `hero.heading`); Lane 3 hanya memeriksa hierarki heading di homepage, yang kebetulan satu-satunya halaman yang benar. Baru ketika keduanya diadu dengan komponen renderernya, terlihat bahwa `hero.heading` tidak pernah menjadi `<h1>` di luar homepage.

**Lokasi:** `components/ui/Section.tsx:23`

**Bukti:** `Section` — komponen pembungkus yang dipakai setiap halaman kecuali homepage — meng-hardcode level heading:

```tsx
{heading && (
  <header className="mb-10 animate-fade-up">
    <h2 className="text-3xl font-bold text-heading mb-1">{t(heading, lang)}</h2>
  </header>
)}
```

Grep `<h1` di seluruh `marketing-web/` (di luar `node_modules`) mengembalikan tepat 3 hasil:

```
features/cms/components/UseCaseDetailView.tsx:59   ← dead code
features/cms/components/HomeView.tsx:54            ← dead code
app/page.tsx:49                                    ← satu-satunya yang live
```

Jadi `<h1>` hidup hanya ada di homepage. Rantai penyebabnya konsisten di semua halaman lain:
- `app/pricing/page.tsx:21` — `<Section heading={pricingCopy.hero.heading}>` → `<h2>`
- `app/fees/page.tsx:67` — `<Section heading={feesCopy.hero.heading}>` → `<h2>`
- `app/company/page.tsx:11` — `<Section heading={company.heading}>` → `<h2>`
- `app/service-flow/page.tsx:14` — pola sama → `<h2>`
- `components/LegalDocPage.tsx:198` — `<Section heading={doc.heading}>` → judul 6 dokumen legal juga `<h2>`

Ini konsisten dengan Lane 3, yang mencatat homepage punya "1× H1 lalu beberapa H2/H3" dan tidak menemukan multiple-H1 — memang tidak ada, karena h1-nya cuma satu di seluruh situs.

**Kenapa penting:** Untuk 10 halaman, dokumen dimulai dari level 2 tanpa akar. Ekstraktor konten (Readability-style, yang dipakai banyak pipeline retrieval untuk memisahkan konten utama dari boilerplate) memakai `<h1>` sebagai penanda judul dokumen dan titik awal blok konten utama; tanpa itu, judul halaman harus ditebak dari `<title>` — yang untuk 4 halaman ini identik semua (F-01). Gabungan F-01 + F-02 berarti `/pricing` tidak punya **satu pun** sinyal tingkat-dokumen yang mengatakan halaman itu tentang harga: title generik, tanpa h1, tanpa meta description sendiri. Hierarki juga jadi janggal: `<h2>` judul halaman dan `<h2>` judul seksi berada di level yang sama, sehingga batas chunk hilang.

**Fix:** Tambahkan prop level opsional pada `Section` (default tetap `h2`, agar 40+ pemakaian seksi yang ada tidak berubah) dan set `as="h1"` hanya pada `Section` teratas di tiap halaman: `/pricing`, `/fees`, `/service-flow`, `/company`, dan di `LegalDocPage.tsx:198`. Ini perubahan satu komponen + 5 call site, dan tidak menyentuh copy sama sekali.

**Verifikasi setelah fix:**
```bash
for p in "" pricing fees service-flow company privacy terms tokushoho \
         quasi-mandate compensation cancellation-policy; do
  echo -n "/$p h1=";  curl -s "http://localhost:3000/$p" | grep -c '<h1'
done
```
Lolos jika semua bernilai tepat `1`.

---

### [F-03] `robots.txt` dan `sitemap.xml` tidak ada (404) — CRITICAL · [T1 — TERBUKTI]

**Lokasi:** tidak ada file — dikonfirmasi dari dua arah

**Bukti:** Dari live server (Lane 3):
```
curl http://localhost:3000/robots.txt   → 404
curl http://localhost:3000/sitemap.xml  → 404
curl http://localhost:3000/llms.txt     → 404
```
Dari filesystem: tidak ada `app/robots.ts`, `app/sitemap.ts`, `public/robots.txt`. `find` untuk `middleware*`/`sitemap*`/`robots*` di source (di luar `node_modules`, `.git`, `.next`) = nol hasil. `next.config.ts` juga kosong seluruhnya kecuali `{ devIndicators: false }` — tidak ada `rewrites`/`headers`/`redirects` yang bisa menyediakannya secara tak langsung.

**Kenapa penting:** Ketiadaan `robots.txt` tidak memblokir apa pun — default-nya boleh crawl, jadi ini bukan masalah akses. Yang hilang adalah **pointer sitemap**, yang secara konvensi diletakkan di `robots.txt` dan merupakan cara standar sebuah situs mengumumkan daftar URL-nya. Tanpa itu, penemuan 11 URL sepenuhnya bergantung pada link internal — dan untuk situs 11 halaman yang semua halamannya tertaut dari navbar, dampaknya lebih kecil daripada di situs besar. Yang membuatnya CRITICAL bukan penemuannya, tapi bahwa sitemap adalah satu-satunya tempat sisa untuk menaruh `<lastmod>`, mengingat nol halaman marketing punya tanggal terlihat (F-18). Sitemap di sini adalah kanal freshness satu-satunya yang tersedia.

**Fix:** Tambahkan `app/robots.ts` dan `app/sitemap.ts` (Metadata Route API bawaan Next; keduanya Server Component, ter-generate statis, cocok dengan build yang sudah 100% static). Daftarkan 11 route dan sertakan `lastmod`. **Diblokir sebagian:** kedua file butuh absolute URL, jadi butuh domain produksi terkonfirmasi terlebih dahulu.

**Verifikasi setelah fix:**
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/robots.txt
curl -s http://localhost:3000/sitemap.xml | grep -c '<loc>'   # harus 11
```

---

### [F-04] Kanibalisasi harga: 3 sumber berbeda, dan `/fees` bisa membuat AI menjawab salah — CRITICAL · [T1 — TERBUKTI]

**Lokasi:** `app/pricing/page.tsx` + `constants/pricing.ts:232-289` · `app/fees/page.tsx` + `constants/pricing.ts:146-211` · `constants/legal.ts:407`

**Bukti:** Tiga halaman menampilkan data harga dengan cakupan yang tidak identik:

| Sumber | H1/judul | Isi |
|---|---|---|
| `/pricing` (`copy.ts:776-798`) | 「ご利用者様向け料金」/ "Pricing for users" | `courseRates` — biaya customer: ¥3,740 / ¥4,488 / ¥330 / ¥990 (care); ¥6,600 / ¥7,920 / ¥330 / ¥990 (nursing) |
| `/fees` (`copy.ts:751-770`) | 「ケアサポーターの時給・給与体系」/ "Hourly wage for care supporters" | `supporterRates` — **nilai customer yang sama persis** + kolom gaji supporter ¥2,000 / ¥2,200 / ¥330 / ¥990 |
| `/compensation` (`legal.ts:407`) | dokumen legal | tier tambahan yang tidak ada di dua halaman lain: same-day ¥4,862 / ¥8,580, 「リハビリ業務」¥8,800 |

`/fees` adalah **superset data** dari `/pricing`, bukan topik yang berbeda. Tapi judulnya fokus ke gaji supporter, sementara nama route-nya (`/fees`) cocok secara leksikal dengan query biaya customer.

Ada juga inkonsistensi presentasi: `copy.ts:223` (dirender di `app/page.tsx:159-163`) menonjolkan angka **excl-tax** ¥3,400 sebagai angka besar dengan ¥3,740 kecil sekunder, sedangkan `constants/pricing.ts:241` hanya menyimpan ¥3,740 (incl-tax) tanpa versi excl-tax. Secara matematis konsisten (3.400 × 1,1 = 3.740) — masalahnya bukan salah hitung, melainkan bahwa **angka utama yang terlihat berbeda tergantung halaman mana yang di-retrieve**.

**Kenapa penting:** Ini bukan kanibalisasi ranking biasa (dua halaman berebut kata kunci yang sama), yang dampaknya sekadar dilusi. Ini kanibalisasi yang **mengubah kebenaran jawaban**. Retrieval leksikal atas query "biaya Care24" akan menganggap route bernama `/fees` sangat relevan; halaman itu penuh angka jam-an; angka yang paling menonjol di sana adalah ¥2,000 (gaji supporter). Jawaban yang dihasilkan — "sekitar ¥2,000 per jam" — bersumber dari halaman resmi milik klien, terlihat berdasar, dan salah 47%. Kesalahan yang percaya diri dan bisa dilacak ke situs sendiri lebih merusak daripada tidak dikutip sama sekali.

**Fix:** Tiga langkah, tak satu pun menyentuh angka:
1. Perjelas judul & metadata `/fees` bahwa halaman itu **untuk calon pekerja**, bukan calon klien (mis. eksplisit menyebut 採用/recruitment dalam title dan h1).
2. Buat `/pricing` jadi sumber tunggal harga customer; tambahkan link timbal-balik eksplisit antara `/pricing` ↔ `/fees` yang menyatakan perbedaan audiens.
3. Samakan basis pajak yang ditonjolkan: pilih satu (rekomendasi: incl-tax, karena itu yang disimpan `pricing.ts`) dan konsisten di homepage juga.

Penulisan ulang teks judul/pengantar termasuk perubahan copy → **FASE 4**, bukan sekarang.

**Verifikasi setelah fix:** `curl -s http://localhost:3000/fees | grep -o '<h1[^>]*>[^<]*'` harus memuat penanda audiens pekerja; dan pengujian ulang simulasi retrieval #3 di bawah tidak lagi menghasilkan kandidat yang menyesatkan.

---

### [F-05] Tidak ada satu pun chunk yang bisa dikutip untuk pertanyaan harga — CRITICAL · [T1 — TERBUKTI]

**Lokasi:** `app/page.tsx:206-233` + `copy.ts:220-226`; `app/pricing/page.tsx:21-43`; `components/ui/CourseRateTable.tsx`

**Bukti:** Harga di homepage dipecah menjadi enam `<span>` terpisah yang tidak pernah digabung jadi kalimat — `label` / `hours` / `amount` / `unit` / `taxNote` / `taxIncluded` (`copy.ts:220-226`, dirender `app/page.tsx:206-233`). Di `/pricing`, hero body-nya adalah `copy.ts:780-782`:

```
わかりやすい料金体系で、安心してご利用いただけます。すべて税込価格です。
```

— tidak memuat satu angka pun. Angka sebenarnya ada di `<table>`, dan sel tabel hanya berisi label pendek + angka (「基本料金 ¥3,740」) tanpa kalimat yang menyebut brand atau jenis layanan pada baris yang sama.

Satu-satunya tempat di seluruh proyek di mana brand + layanan + harga muncul berdekatan adalah `app/fees/layout.tsx:8` — dan itu **meta description, bukan konten body**:

```ts
description: "Care24Japan ケアサポーターの時給・給与体系。介護コース・看護コースの1時間単価（税込）をご案内します。",
```

Ironisnya kalimat itu justru mendekati bentuk yang benar; ia hanya berada di tempat yang salah dan menggambarkan gaji, bukan biaya.

**Kenapa penting:** Sistem retrieval mengambil **potongan teks**, bukan halaman. Sebuah chunk dikutip kalau ia bisa berdiri sendiri sebagai jawaban. Chunk yang isinya "¥3,740" tanpa konteks tidak bisa dikutip: model tidak tahu itu harga apa, dari siapa, per apa, sudah pajak atau belum. Semua fakta itu **ada di situs**, hanya tersebar ke node DOM berbeda yang kemungkinan besar terpisah saat chunking. Inilah alasan situs dengan data harga akurat dan lengkap tetap absen dari jawaban AI tentang harga.

**Fix:** Tambahkan satu paragraf ringkasan berbahasa alami di `/pricing` (dan cerminannya di seksi harga homepage) yang dalam satu blok teks memuat kelima unsur: nama brand, nama layanan, angka, unit per jam, dan status pajak. Ini murni penambahan; tabel tetap seperti sekarang. **Penulisan kalimatnya adalah pekerjaan copy → FASE 4**, dan harus ditulis manusia/klien dalam suara merek yang ada, bukan diisi teks AI generik.

**Verifikasi setelah fix:** ambil raw HTML `/pricing`, ekstrak paragraf pertama di bawah h1, cek satu blok teks memuat kelima unsur sekaligus; lalu ulangi simulasi retrieval #2.

---

### [F-06] Satu-satunya "Care24" di halaman non-legal merujuk perusahaan lain — CRITICAL · [T1 — TERBUKTI]

**Lokasi:** `app/company/page.tsx:19-21` + `constants/copy.ts:892-893`

**Bukti:** Grep brand di body copy halaman non-legal: `app/page.tsx` (seluruh 502 baris) = 0 kemunculan "Care24"/"Care 24 Japan"; `/pricing`, `/service-flow`, `/fees` = 0 (dikonfirmasi lewat `copy.ts:733-798`). Satu-satunya kemunculan ada di `/company`:

```
グループ企業: Aegis Care Advisors Pvt.ltd (Care24)、PT. SIPS Edutech Indonesia、EvoCare Japan株式会社
```

Yaitu "(Care24)" sebagai nama panggilan **perusahaan grup lain**, bukan self-reference. Kontras: `constants/legal.ts:257` konsisten menyebut "Care24Japan" dengan definisi jelas — tapi dokumen legal adalah jenis halaman yang paling kecil kemungkinannya dikutip untuk pertanyaan produk umum.

**Kenapa penting:** Entity resolution bekerja dari ko-okurensi: sebuah sistem belajar apa itu "Care24" dari teks di sekitar setiap kemunculannya. Di seluruh konten pemasaran situs ini, string itu muncul tepat sekali, dan konteks di sekitarnya adalah `Aegis Care Advisors Pvt.ltd`, sebuah entitas India. Sinyal yang tersedia karena itu **secara aktif menunjuk ke arah yang salah** — bukan sekadar lemah. Ditambah brand tidak pernah muncul di dekat angka harga mana pun (F-05), tidak ada tempat di mana model bisa mempelajari "Care24Japan adalah penyedia jasa perawatan di rumah di Jepang dengan tarif ¥3,740/jam".

**Fix:** Dua hal. (a) Bedakan secara tekstual entitas operasi (Medical Informatics Co.,Ltd. / Care24Japan) dari nama grup "(Care24)" milik Aegis di `/company`, agar keduanya tidak terbaca sebagai alias yang sama. (b) Sebut nama brand secara eksplisit di body copy halaman utama, khususnya berdekatan dengan pernyataan layanan dan harga. Bagian (b) adalah pekerjaan copy → FASE 4. Perbaikan `Organization` JSON-LD (F-07) juga memberi jangkar entitas yang eksplisit dan harus dikerjakan bersamaan.

**Verifikasi setelah fix:** `curl -s http://localhost:3000/ | grep -c 'Care24'` > 0 di dalam `<main>`, dan kemunculan pertama "Care24" di `/company` merujuk entitas operasi Jepang.

---

### [F-07] Nol structured data di seluruh situs — CRITICAL · [T1 — TERBUKTI]

**Lokasi:** raw HTML semua halaman; repo-wide

**Bukti:** Lane 3 — hitungan `<script type="application/ld+json">` = **0** di raw HTML setiap halaman yang diperiksa (home, pricing). Dikonfirmasi dari source: grep repo-wide untuk `metadataBase|openGraph|canonical|alternates|hreflang|application/ld+json` di seluruh `.ts`/`.tsx` di luar `node_modules` = **nol hasil total**.

**Kenapa penting:** JSON-LD adalah satu-satunya kanal di mana fakta dinyatakan tanpa ambiguitas parsing — bahwa string ini adalah nama organisasi, bahwa angka itu adalah harga dalam JPY, bahwa alamat itu milik penyedia layanan. Semua fakta ini sudah ada dan terverifikasi di codebase: nama legal, tanggal berdiri 2002-10-18, modal ¥100 juta (`copy.ts:868-873`), sertifikasi ISMS/ISO27001 (`copy.ts:571-572`), dan tabel tarif lengkap (`constants/pricing.ts`). Yang hilang hanyalah pernyataan mesin-terbaca atas fakta yang sudah ditulis manusia. Ini juga satu-satunya domain audit yang skornya nol mutlak, sehingga rasio effort-terhadap-skornya paling tinggi.

**Fix:** Mulai dari yang faktanya sudah ada di halaman, dan **jangan menambahkan tipe schema untuk konten yang tidak ada**:
- `Organization` (+ `LocalBusiness` jika alamat operasional memang publik) di root layout — semua field sudah tersedia di `copy.ts:868-893`.
- `BreadcrumbList` — struktur route sudah datar dan diketahui.
- `Offer`/`PriceSpecification` di `/pricing` — hanya mencerminkan angka yang sudah tampil di tabel, tidak menambah klaim baru.
- **Jangan** tambahkan `FAQPage`: tidak ada satu pun blok tanya-jawab di situs ini (F-13). Schema FAQ tanpa FAQ terlihat di halaman adalah misrepresentasi.
- `Article`/`HowTo` hanya jika/ketika halaman use-case (F-09) benar-benar dipublikasikan.

**Verifikasi setelah fix:**
```bash
curl -s http://localhost:3000/pricing | grep -c 'application/ld+json'
```
lalu validasi payload-nya dengan Schema.org validator, dan konfirmasi setiap nilai cocok dengan yang tampil di halaman.

---

### [F-08] Empat halaman utama tanpa metadata sendiri; description berbahasa Inggris untuk situs Jepang — HIGH · [T1 — TERBUKTI]

**Lokasi:** `app/page.tsx`, `app/pricing/page.tsx`, `app/service-flow/page.tsx`, `app/company/page.tsx` (tidak ada `layout.tsx` pendamping) · sumber fallback `app/layout.tsx:21`

**Bukti:** Tabel per-halaman Lane 1 mencatat kolom "Metadata sendiri?" = TIDAK ADA untuk keempat halaman itu. Fallback-nya `description: brand.tagline.en` (`app/layout.tsx:21`) — sebuah tagline **berbahasa Inggris**, dipakai untuk situs yang `<html lang="ja">` dan konten utamanya Jepang. 7 halaman lain sudah benar: 6 halaman legal punya `export const metadata` (mis. `app/privacy/page.tsx:9-12`, `title = doc.heading.ja`) dan `/fees` punya `app/fees/layout.tsx:5-9`.

**Kenapa penting:** Meta description bukan faktor ranking, tapi ia sangat sering menjadi ringkasan tingkat-halaman yang tersimpan di indeks dan ditampilkan sebagai snippet. Untuk keempat halaman ini, ringkasan tersebut identik satu sama lain (memperkuat F-01) dan berada dalam bahasa yang berbeda dari kontennya. Yang menonjol: pola yang benar sudah ada di repo — `app/fees/layout.tsx` adalah Server Component `layout.tsx` di samping `page.tsx` yang `"use client"`, persis solusi yang dibutuhkan keempat halaman ini. Ini bukan pola baru yang harus diciptakan, hanya diterapkan empat kali lagi.

**Fix:** Salin pola `app/fees/layout.tsx` untuk keempat route. Description berbahasa Jepang, spesifik per halaman, memuat fakta konkret bila ada (untuk `/pricing`: sebut angka). Digabung dengan F-01 — satu sub-pekerjaan yang sama.

**Verifikasi setelah fix:**
```bash
for p in "" pricing service-flow company; do
  curl -s "http://localhost:3000/$p" | grep -o '<meta name="description" content="[^"]*"'
done | sort | uniq -c
```
Semua unik, semua berbahasa Jepang.

---

### [F-09] Konten AEO terbaik di codebase tidak punya URL — HIGH · [T1 — TERBUKTI]

**Lokasi:** `constants/copy.ts:581-683` (`useCase`), `733-745` (`staffPricing`); renderer di `features/cms/components/*View.tsx`

**Bukti:** `copy.ts:581-683` memuat empat use-case lengkap — `after-hospital-discharge`, `dementia-care`, `respite-care`, `end-of-life-care` — yang menurut pembacaan Lane 2 adalah **konten terpanjang dan paling naratif di seluruh file**, paragraf 60-90 kata dengan bentuk hampir "X adalah…". Tidak satu pun ter-render:

```
grep -rn "features/cms" app/   →  0 hasil
```

Tidak ada route `/use-case` (Lane 1: hanya 11 `page.tsx`, semua path statis, nol dynamic segment). Ini disengaja, bukan bug — komentar developer di `copy.ts:176`: *"Used only by the (currently CMS-driven, not yet live) HomeView fallback."*

**Kenapa penting:** Semua yang kurang di halaman live — prosa panjang, bentuk definisi, jawaban answer-first, kedalaman topikal untuk query bermaksud spesifik seperti "perawatan di rumah setelah keluar rumah sakit" — sudah tertulis, dalam suara merek yang benar, oleh manusia. Ia hanya tidak punya URL. Ini juga satu-satunya rekomendasi berdampak tinggi di audit ini yang **tidak memerlukan copywriting baru sama sekali**, sehingga rasio dampak-terhadap-effort-nya jauh di atas temuan lain.

**Fix:** Publikasikan keempat use-case sebagai route statis (satu halaman indeks + empat halaman detail, atau satu halaman gabungan bila lebih disukai) yang membaca langsung dari `constants/copy.ts` — mengikuti pola statis-sinkron yang sudah terbukti aman di 11 route lain. **Jangan** aktifkan pipeline CMS untuk ini (lihat F-26). Setelah live, halaman-halaman ini masuk sitemap dan layak diberi schema `Article`.

**Verifikasi setelah fix:** keempat URL mengembalikan 200; raw HTML tiap URL memuat teks paragraf naratifnya tanpa eksekusi JS; keempatnya muncul di `sitemap.xml`.

---

### [F-10] Answer-first gagal di 5 dari 5 halaman non-legal — HIGH · [T1 — TERBUKTI]

**Lokasi:** `app/page.tsx:49-55` & `190-204`; `app/pricing/page.tsx:21-24`; `app/fees/page.tsx:67-70`; `app/service-flow/page.tsx:14-17`; `app/company/page.tsx:11-24`

**Bukti:** Evaluasi enam heading utama terhadap kriteria "paragraf pembuka 40-60 kata berisi jawaban faktual":

| Halaman | Bukti | Putusan |
|---|---|---|
| Home hero (`copy.ts:126-133`) | H1 「医療保険や介護保険を利用しない、介護・看護のご支援サービス」, body 1 kalimat slogan ~13 kata, tanpa definisi/harga/brand | FAIL |
| Home problems (`copy.ts:189-192`) | 「このようなお困りごとはありませんか？」 langsung lompat ke 9 bullet, nol paragraf jawaban | FAIL |
| `/pricing` (`copy.ts:780-782`) | ~13 kata, tanpa satu angka pun | PARTIAL |
| `/fees` (`copy.ts:757-760`) | body 6 kata: 「1時間単価・税込み表記です。」 | FAIL |
| `/service-flow` (`copy.ts:692-695`) | ~11 kata tapi langsung menjawab "berapa langkah": 4 | PASS MINIMAL |
| `/company` (`app/company/page.tsx:11-24`) | H2 langsung ke `<dl>`, nol paragraf pembuka | FAIL |

**Kenapa penting:** Paragraf pertama di bawah judul adalah kandidat kutipan dengan probabilitas tertinggi di halaman mana pun — posisinya diistimewakan oleh hampir semua strategi chunking dan ekstraksi. Di situs ini, posisi itu ditempati slogan di setiap halaman. Slogan tidak bisa dikutip sebagai jawaban karena tidak berisi proposisi yang bisa dinilai benar. Fakta-fakta yang tersedia (harga, jumlah langkah, kualifikasi staf) ada di bawah, di dalam struktur yang tidak berbentuk kalimat.

**Fix:** Untuk setiap halaman, sisipkan satu paragraf faktual 40-60 kata tepat di bawah h1, sebelum elemen visual/tabel. Slogan tetap boleh ada — pindahkan sesudahnya. `/service-flow` sudah paling dekat dan hanya perlu perluasan. **Ini pekerjaan copy → FASE 4**, dan harus ditulis oleh klien/penulis manusia; mengisinya dengan teks AI generik akan merusak suara merek yang saat ini konsisten.

**Verifikasi setelah fix:** ekstrak paragraf pertama setelah `<h1>` di tiap halaman dari raw HTML; periksa panjang dan keberadaan minimal satu klaim faktual bernomor/bernama.

---

### [F-11] Konten tipis di empat halaman non-legal — HIGH · [T1 — TERBUKTI]

**Lokasi:** `/pricing`, `/fees`, `/service-flow`, `/company`

**Bukti:** Baca catatan metodologi di atas — angka word-count curl **tidak** dipakai sebagai bukti volume di sini. Yang dipakai adalah pembacaan manual Lane 2 dan jumlah proposisi faktual berbentuk prosa:

- `/fees`: prosa ~20-30 kata (hero body 6 kata) — paling tipis
- `/pricing`: prosa ~40-60 kata
- `/service-flow`: ~90-110 kata, tetapi 100% duplikat dari homepage (F-14)
- `/company`: ~60-90 kata, namun padat fakta (tanggal berdiri, modal, grup) — untuk halaman jenis impressum, tipis itu wajar
- Homepage: ~550-650 kata, tapi terfragmentasi jadi puluhan potongan JSX pendek (9 problem item, 4 flow step, 3 kartu use-case + jadwal, chip biaya), bukan prosa mengalir
- 6 halaman legal: ratusan-ribuan kata — volume PASS

**Kenapa penting:** Masalahnya bukan panjang demi panjang, melainkan bahwa halaman-halaman ini nyaris seluruhnya terdiri dari **judul + widget**. Tabel dan daftar bagus untuk ekstraksi terstruktur (dan di sini memang bagus — lihat PASS), tapi tidak menyediakan permukaan tekstual untuk match query semantik, dan tidak menyediakan kalimat untuk dikutip. `/company` adalah pengecualian yang wajar; `/fees` yang paling merugikan karena tipis **dan** menyesatkan (F-04).

**Fix:** Penambahan prosa untuk `/pricing`, `/fees`, `/service-flow` — sebagian besar terselesaikan oleh F-05 dan F-10. `/company` sebaiknya dibiarkan; jangan mengembangkan halaman impressum hanya demi word count. **FASE 4.**

**Verifikasi setelah fix:** hitung karakter (bukan kata, karena teks Jepang) dari node teks di dalam `<main>` di luar `<table>`/`<ul>` untuk tiap halaman.

---

### [F-12] Bilingual tanpa routing per-locale: konten Inggris tidak punya URL — HIGH · [T1 — TERBUKTI]

**Lokasi:** `features/lang/store.ts:12-15`; `app/layout.tsx:34`; `features/lang/HtmlLangSync.tsx`

**Bukti:** Bahasa disimpan di Zustand store, default **selalu** `"ja"`, dan **tidak ada persist middleware** (tanpa localStorage/cookie) — jadi render pertama di server maupun client selalu Jepang sampai user menekan toggle secara manual. `<html lang="ja">` di-hardcode di `app/layout.tsx:34` lalu disinkronkan oleh komponen client `HtmlLangSync`. Grep repo-wide untuk `hreflang|alternates` = nol hasil. Tidak ada route segment `[locale]` (Lane 1: nol `params`/`searchParams` di seluruh `app/`).

**Kenapa penting:** Setiap string EN di `constants/copy.ts` dan `constants/legal.ts` — kira-kira separuh dari 1.400+ baris konten — berada di balik interaksi client dan tidak memiliki URL sendiri. Crawler mengambil satu URL dan menerima versi Jepang; tidak ada URL kedua untuk ditemukan, jadi konten Inggris **tidak dapat diindeks sama sekali**, terlepas dari kualitasnya. Ini juga menjelaskan mengapa `description` berbahasa Inggris di F-08 sangat tidak cocok: satu-satunya sinyal EN yang terlihat crawler adalah metadata, sementara seluruh body-nya JA.

**Fix:** Ini keputusan arsitektural, bukan tweak — masuk ke daftar keputusan untuk user, bukan langsung dikerjakan. Pilihan realistisnya: (a) routing per-locale sungguhan (`/ja/*`, `/en/*`) plus `hreflang` timbal-balik — benar, mahal, menyentuh setiap route; (b) tetap JA-only untuk indeksasi dan menerima bahwa toggle EN adalah fitur UX untuk pengunjung manusia, bukan permukaan SEO — murah, jujur, dan mungkin tepat bila target pasarnya memang domestik Jepang. **Pilihan ini bergantung pada apakah Care24JPN menargetkan pencari berbahasa Inggris (keluarga ekspatriat di Jepang, klien luar negeri) — perlu jawaban user.** Effort L, dan tidak boleh dimulai tanpa keputusan itu.

**Verifikasi setelah fix:** jika (a) dipilih — tiap URL memuat `<link rel="alternate" hreflang>` timbal-balik dan `<html lang>` yang tepat, dikonfirmasi via curl per locale.

---

### [F-13] Nol blok FAQ di seluruh situs — HIGH · [T1 — TERBUKTI]

**Lokasi:** `constants/copy.ts` (897 baris), `constants/legal.ts` (530 baris)

**Bukti:** Grep untuk 「よくある質問」 dan "FAQ" di kedua file konten = kosong. Lane 2 mengonfirmasi setelah membaca kedua file secara utuh: tidak ada satu pun pasangan tanya-jawab literal di mana pun. Blok definisi "X adalah…" juga absen di homepage/pricing/fees; yang terdekat adalah Article 1 di tiap dokumen legal — definisi legal formal yang panjang, bukan definisi ringkas 1-2 kalimat.

**Kenapa penting:** Pasangan tanya-jawab adalah bentuk konten yang paling langsung dapat dikutip: pertanyaannya cocok dengan bentuk query, jawabannya berdiri sendiri sebagai chunk, dan batas antar-item bertepatan dengan batas chunk secara alami. Untuk bisnis dengan pertanyaan yang sangat mudah ditebak — biaya berapa, minimal berapa jam, apakah pakai asuransi, bagaimana kalau perlu perawatan medis, bagaimana pembatalan — jawabannya sudah ada di codebase (`copy.ts:230-241` minimal 2 jam, indeksasi ¥330/jam, transport ¥990; `legal.ts:360` persentase pembatalan 50/75/100%), hanya tidak pernah dinyatakan dalam bentuk pertanyaan.

**Fix:** Tambahkan seksi FAQ yang dirakit dari fakta yang **sudah ada** (harga, minimum jam, cakupan asuransi, alur, pembatalan). Setelah blok FAQ benar-benar terlihat di halaman, `FAQPage` JSON-LD menjadi sah untuk ditambahkan — sebelum itu tidak (lihat F-07). Penulisan pertanyaan/jawaban = pekerjaan copy → **FASE 4**.

**Verifikasi setelah fix:** blok FAQ ada di raw HTML tanpa JS; tiap jawaban berdiri sendiri saat dibaca terpisah dari pertanyaannya.

---

### [F-14] Empat langkah alur duplikat 100% kata-per-kata di dua URL — HIGH · [T1 — TERBUKTI]

**Lokasi:** `constants/copy.ts:496-536` (`home.flow`) vs `constants/copy.ts:689-727` (`serviceFlow.steps`)

**Bukti:** Judul dan body keempat langkah **identik kata-per-kata** di kedua konstanta, dan keduanya dirender: seksi 「ご利用の流れ」 di homepage (`app/page.tsx:364`, sebagai `<ol>`) dan halaman penuh `/service-flow`. Karena `/service-flow` prosa keseluruhannya hanya ~90-110 kata, duplikat ini merupakan **hampir seluruh isi** halaman tersebut.

**Kenapa penting:** Dua URL menyajikan chunk yang identik berarti sistem retrieval harus memilih salah satu tanpa dasar, dan tidak ada canonical (F-01) untuk memberi tahu mana yang utama. Yang lebih merugikan: `/service-flow` tidak menawarkan apa pun di luar apa yang sudah ada di homepage, sehingga tidak punya alasan untuk dikutip maupun di-rank.

**Fix:** Pilih satu peran per URL. Rekomendasi: homepage menyimpan versi ringkas (judul langkah saja, tanpa body), `/service-flow` diperluas menjadi versi kanonik dengan detail yang tidak ada di homepage (durasi tiap langkah, dokumen yang dibutuhkan, apa yang terjadi di tiap tahap). Perluasan isi = copy → **FASE 4**; pemangkasan di homepage adalah perubahan render, bisa lebih awal.

**Verifikasi setelah fix:** bandingkan teks langkah di raw HTML kedua URL — tidak boleh identik penuh lagi.

---

### [F-15] Placeholder legal belum terisi dan kontradiksi internal tokushoho — HIGH · [T1 — TERBUKTI]

**Lokasi:** `constants/legal.ts:207-221`, `235-236`, `301`, `348`

**Bukti:** Tiga cacat berbeda di dokumen yang sudah live:

1. `legal.ts:301` (terms, JA) dan `legal.ts:348` (EN) — 「2026年［〇］月［〇］日 制定」: **placeholder bracket masih kosong di kedua bahasa**.
2. `legal.ts:220-221` (tokushoho) — merujuk 「［料金表等へのリンク］」, sebuah **placeholder literal dalam kurung siku**, bukan link aktual.
3. Kontradiksi internal: tokushoho memuat 「（※料金ページはこれから作成）」 ("halaman harga akan dibuat kemudian") padahal `/pricing` **sudah live**, dan 「（※キャンセルポリシーはこれから作成）」 padahal `cancellationPolicy` **sudah lengkap** di `legal.ts:352-394` dan tersaji di `/cancellation-policy`.

**Kenapa penting:** Tokushoho (特定商取引法) adalah pengungkapan wajib menurut hukum Jepang; ia adalah halaman yang paling dicek untuk menilai legitimasi penyedia jasa. Placeholder yang terlihat publik dan tanggal yang belum diisi merusak sinyal kepercayaan tepat di tempat yang paling penting. Untuk pembaca mesin, teks yang menyatakan sebuah halaman "akan dibuat" sementara halaman itu sudah ada dan tertaut dari navbar adalah kontradiksi langsung di dalam properti yang sama. Ini juga temuan dengan effort terendah di seluruh audit: semua yang dirujuk sudah ada.

**Fix:** Isi tanggal 制定 di terms (JA & EN), ganti 「［料金表等へのリンク］」 dengan link nyata ke `/pricing`, dan hapus kedua catatan "akan dibuat" sambil menautkan ke `/pricing` dan `/cancellation-policy`.

**Verifikasi setelah fix:**
```bash
curl -s http://localhost:3000/tokushoho | grep -E '［|これから作成'   # harus kosong
curl -s http://localhost:3000/terms     | grep '〇'                  # harus kosong
```

---

### [F-16] Chunk bergantung pada konteks di luar dirinya — HIGH · [T1 — TERBUKTI]

**Lokasi:** `copy.ts:190`, `copy.ts:328-329`, `copy.ts:376/404`, `legal.ts:400/414-415`

**Bukti:** Empat pola berbeda:

- `copy.ts:190` — 「このようなお困りごとはありませんか？」 ("masalah seperti ini?"): demonstratif tanpa antesenden di dalam chunk-nya sendiri; ia bergantung pada daftar 9 item JSX yang menyusul terpisah.
- `copy.ts:328-329` (`home.nursingCourse.note`) — 「※詳しくは料金表をご覧ください。」 merujuk 「料金表」 tanpa href di dalam data itu sendiri.
- `copy.ts:376` (`scheduleLabel` 「1日の流れ」) + baris jadwal individual (`copy.ts:404` 「お食事サポート」/"meal support") — tiap baris tidak menyebut ulang kasus/pasien yang sedang dibahas.
- `constants/legal.ts` — masing-masing dari 5 dokumen mendefinisikan ulang 「当社」/「本サービス」 secara terpisah; chunk di tengah dokumen (mis. compensation Article 7, `legal.ts:414-415`) bergantung pada definisi di `legal.ts:400` yang tidak ikut terbawa bila chunk diambil sendirian.

**Kenapa penting:** Chunk diambil sendirian, tanpa saudaranya. Chunk yang isinya 「お食事サポート」 tidak memberi tahu untuk siapa, di layanan apa, dari penyedia mana. Chunk berisi kewajiban legal yang seluruhnya bertumpu pada 「当社」 tidak menyebutkan perusahaan mana yang dimaksud — dan ini persisnya kelas kesalahan yang menghasilkan kutipan salah-atribusi.

**Fix:** Untuk konten legal, sisipkan nama entitas secara berkala alih-alih hanya mendefinisikannya sekali di Article 1. Untuk konten marketing, pastikan setiap judul seksi menyebut subjeknya (「このようなお困りごと」 → judul yang menyebut perawatan di rumah secara eksplisit). Sebagian besar = copy → **FASE 4**.

**Verifikasi setelah fix:** ambil sampel acak 5 heading + paragraf pertamanya, baca terpisah dari halaman, dan cek apakah subjeknya jelas.

---

### [F-17] Navigasi utama tanpa landmark `<nav>` (footer justru punya) — MEDIUM · [T1 — TERBUKTI]

**Lokasi:** `components/Navbar.tsx:212-237` (nav tier-2 desktop), `240-274` (menu mobile); bandingkan `components/Footer.tsx:43`

**Bukti:** `Navbar.tsx:149` punya `<header>`, tapi daftar link ke semua halaman di baris 212-237 dan 240-274 hanyalah `<ul>` polos **tanpa elemen `<nav>` pembungkus**. Sementara `Footer.tsx:28` punya `<footer>` **dan** `<nav>` eksplisit di baris 43. Jadi pola yang benar sudah dipakai di proyek ini — hanya tidak konsisten. Landmark lain aman: `components/AppShell.tsx:9-14` menyediakan `<main className="flex-1">`.

**Kenapa penting:** Ekstraktor konten memakai landmark untuk memisahkan navigasi dari isi. Tanpa `<nav>`, daftar link navbar berisiko diperlakukan sebagai konten badan halaman dan ikut terbawa ke dalam chunk — mencemari teks yang diekstrak dengan boilerplate di setiap halaman. Efeknya paling terasa di halaman tipis (F-11), di mana boilerplate menyusun proporsi besar dari teks yang terekstrak.

**Fix:** Bungkus kedua `<ul>` di `Navbar.tsx` dengan `<nav aria-label="…">`, mengikuti pola `Footer.tsx:43`.

**Verifikasi setelah fix:** `curl -s http://localhost:3000/ | grep -c '<nav'` bertambah dari 1 menjadi 3.

---

### [F-18] Nol sinyal kesegaran di 5 halaman marketing; tanggal privacy hanya di versi JA — MEDIUM · [T1 — TERBUKTI]

**Lokasi:** `constants/legal.ts:110` vs `112-193`; 5 halaman marketing

**Bukti:**
- `legal.ts:110` (privacy JA) memuat 「2026年7月10日 改定」 — tanggal terlihat manusia. Versi EN (`legal.ts:112-193`) **tidak punya baris tanggal ini sama sekali**.
- Konsisten JA/EN: `legal.ts:372/391` (cancellation-policy 「2026年9月1日より制定・施行」) dan `legal.ts:427/457` (compensation).
- Terms: placeholder kosong di kedua bahasa (F-15).
- Lima halaman marketing utama: **nol** tanggal publish/update, nol elemen `<time>`.

**Kenapa penting:** Untuk pertanyaan harga dan kebijakan, kebaruan mempengaruhi apakah sebuah sumber layak dipercaya sebagai yang berlaku saat ini. Situs ini menerbitkan tarif konkret tanpa satu pun penanda kapan tarif itu berlaku — sehingga tidak ada dasar untuk memilih antara halaman ini dan sumber pihak ketiga yang lebih tua tapi bertanggal. Karena tidak ada sitemap (F-03), bahkan `<lastmod>` pun tidak tersedia sebagai jalur alternatif.

**Fix:** Tambahkan `<lastmod>` di sitemap saat F-03 dikerjakan; tambahkan tanggal "berlaku sejak" yang terlihat pada halaman yang memuat harga; samakan baris tanggal privacy antara JA dan EN.

**Verifikasi setelah fix:** `curl -s http://localhost:3000/pricing | grep -o '<time[^>]*>'`, dan sitemap memuat `<lastmod>` untuk 11 URL.

---

### [F-19] Title template menempelkan brand untuk kedua kalinya di `/fees` — MEDIUM · [T1 — TERBUKTI]

> Temuan dari cross-verification. Lane 1 mencatat `/fees` punya metadata sendiri (benar, dan itu hal bagus); Lane 3 mengukur title empiris tapi tidak menguji `/fees`. Interaksi antara keduanya baru terlihat saat dokumentasi Next dibaca.

**Lokasi:** `app/fees/layout.tsx:6` bersama `app/layout.tsx:19`

**Bukti:** Child menetapkan title berupa string:

```ts
// app/fees/layout.tsx:6
title: "ケアサポーターの時給・報酬体系一覧｜Care24",
```

Root menetapkan template:

```ts
// app/layout.tsx:19
template: `%s | ${brand.name}`,
```

Dokumentasi Next 16.2.7 (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md:343`) menyatakan: *"`title` (string) defines the routes title. It will augment `title.template` from the closest parent segment if it exists."* Jadi title yang ter-render menjadi:

```
ケアサポーターの時給・報酬体系一覧｜Care24 | Care 24 Japan
```

— brand disebut dua kali dengan dua pemisah berbeda. Hal yang sama berlaku untuk 6 halaman legal (`title = doc.heading.ja` + suffix), tetapi di sana hasilnya justru diinginkan karena judul dokumen sendiri tidak memuat brand.

**Kenapa penting:** Dampaknya kecil dan kosmetik — title yang panjang cenderung terpotong, dan brand ganda memboroskan ruang. Yang membuatnya layak dicatat bukan `/fees` hari ini, tetapi bahwa **F-01 dan F-08 akan menambahkan empat title baru lagi**; kalau ditulis dengan pola yang sama seperti `/fees`, cacat ini akan direplikasi empat kali. Perbaiki sekarang, sebelum polanya disalin.

**Fix:** Hapus 「｜Care24」 dari string di `app/fees/layout.tsx:6` dan biarkan template root yang menambahkan brand — atau gunakan `title.absolute` bila string persis itu memang diminta client sheet (komentar di `app/fees/layout.tsx:4` menyebut title ini "recommended by the client sheet", jadi **konfirmasi ke user sebelum mengubahnya**). Empat title baru dari F-01 harus ditulis **tanpa** brand, mengandalkan template.

**Verifikasi setelah fix:**
```bash
curl -s http://localhost:3000/fees | grep -o '<title>[^<]*</title>'
```
Brand muncul tepat sekali.

---

### [F-20] Heading berupa penggal kalimat, bukan judul — MEDIUM · [T1 — TERBUKTI]

**Lokasi:** raw HTML `/` (dari pemeriksaan hierarki heading Lane 3)

**Bukti:** Satu H2 di homepage berupa fragmen kalimat yang terpotong: 「医療行為が必要な方に対しては、」 — berakhir dengan partikel penghubung 「、」, jelas bukan judul utuh. Langsung diikuti H3 yang juga penggalan: 「看護師の資格を保有したスタッフが医療ケアが必要な場合のケアや」. HTML-nya valid dan hierarkinya tidak melompat, tetapi elemen heading di sini dipakai sebagai perangkat tipografi untuk memecah satu kalimat, bukan sebagai judul.

**Kenapa penting:** Heading berfungsi ganda: gaya visual, dan **batas struktural**. Chunker memotong di heading dan sering menyalin teks heading sebagai konteks yang dilekatkan ke chunk. Heading berupa "Bagi yang memerlukan tindakan medis," memberi konteks yang terpotong di tengah, dan kalimat aslinya terbelah antara dua chunk sehingga tidak ada satu pun yang memuat pernyataan lengkapnya.

**Fix:** Ubah kalimat yang terpecah itu menjadi satu judul ringkas berdiri sendiri, dan pindahkan sisa kalimatnya ke paragraf di bawahnya. Penulisan ulang teks = copy → **FASE 4**; tetapi keputusan strukturalnya (heading harus judul, bukan penggalan kalimat) berlaku untuk semua heading baru yang ditulis nanti.

**Verifikasi setelah fix:** ekstrak semua `<h2>`/`<h3>` dari raw HTML homepage; tidak boleh ada yang berakhir dengan 「、」 atau partikel penghubung.

---

### [F-21] Klaim kabur mendominasi prosa; klaim spesifik hanya ada di tabel — MEDIUM · [T1 — TERBUKTI]

**Lokasi:** kabur: `copy.ts:153`, `160-162`, `208`, `333`, `737`, `780` · spesifik: `copy.ts:223-226`, `230-241`, `322-325`, `868-873`, `constants/pricing.ts:150-209`, `legal.ts:360`, `407`

**Bukti:** Katalogisasi Lane 2 atas ~15 klaim: sekitar 9 kabur vs 6 spesifik. Contoh kabur — 「24時間の安心」 (tanpa SLA respons), 「専門スタッフ」 (tanpa jumlah/rasio staf), 「一流の介護士」 (superlatif tanpa tolok ukur), dan 「わかりやすい料金体系で、安心してご利用いただけます」 yang **diulang identik** di `copy.ts:780` (`/pricing`) dan `copy.ts:737` (`staffPricing`, dead code). Contoh spesifik yang bagus — `copy.ts:571-572` menyebut ISMS/ISO27001 dengan nomor standar; `copy.ts:868-873` tanggal berdiri 2002-10-18 dan modal ¥100 juta.

Yang menentukan adalah distribusinya: **100% klaim spesifik berada di tabel harga atau dokumen legal; 0% berada di prosa pembuka mana pun.**

**Kenapa penting:** Kalimat yang dikutip adalah kalimat yang mengandung sesuatu yang bisa diverifikasi. Prosa di situs ini hampir seluruhnya tersusun dari klaim yang tidak bisa dibuktikan salah, sedangkan setiap fakta yang bisa diverifikasi hidup dalam struktur yang bukan kalimat. Kedua bagian ini sehat sendiri-sendiri; masalahnya keduanya tidak pernah bertemu — bentuk lain dari akar masalah yang sama seperti F-05.

**Fix:** Ketika prosa ditambahkan untuk F-05/F-10/F-13, sandarkan setiap paragraf pada minimal satu fakta yang sudah tersedia (angka, sertifikasi, tahun, minimum jam). Semua faktanya sudah ada di codebase — tidak perlu klaim baru, dan **jangan** menciptakan klaim baru. **FASE 4.**

**Verifikasi setelah fix:** tiap paragraf pembuka memuat minimal satu angka atau nama standar yang dapat ditelusuri ke `constants/`.

---

### [F-22] Heading hampir tidak pernah berbentuk pertanyaan — MEDIUM · [T1 — TERBUKTI]

**Lokasi:** ~10 heading utama di `/`, `/pricing`, `/service-flow`, `/company`, `/fees`

**Bukti:** Hanya **1** dari ~10 heading utama yang benar-benar berbentuk pertanyaan — `copy.ts:190` 「このようなお困りごとはありませんか？」 — dan itu pun generik, bukan query spesifik. Sisanya label produk atau proses: 「ご利用の流れ」 ("How it works"), 「ご利用者様向け料金」 ("Pricing for users"), 「ケアサポーターの時給・給与体系」, 「運営会社」 ("Operating Company").

**Kenapa penting:** Heading berbentuk pertanyaan memberi dua keuntungan sekaligus: bentuknya menyerupai query sehingga cocok secara leksikal maupun semantik, dan ia menciptakan kewajiban struktural bagi teks di bawahnya untuk menjadi jawaban — yang secara otomatis mengurangi F-10. 「ご利用者様向け料金」 adalah label yang sah dan tidak salah; ia hanya tidak menyerupai apa pun yang diketik orang.

**Fix:** Untuk seksi-seksi dengan maksud pencarian tertinggi (harga, alur, kelayakan), gunakan judul berbentuk pertanyaan yang menyerupai query nyata, dengan label produk tetap dipertahankan sebagai sub-judul bila perlu untuk navigasi. **FASE 4** — dan ini justru area di mana penulis manusia yang paham istilah pencarian pelanggan Jepang jauh lebih baik daripada teks yang dihasilkan model.

**Verifikasi setelah fix:** minimal 3 heading utama berakhir dengan 「か？」 atau setara, dan paragraf di bawahnya menjawabnya dalam 40-60 kata.

---

### [F-23] Nol `metadataBase`, Open Graph, dan canonical di seluruh repo — MEDIUM · [T1 — TERBUKTI]

**Lokasi:** repo-wide; `app/layout.tsx:16-25`

**Bukti:** Grep repo-wide untuk `metadataBase|openGraph|canonical|alternates|hreflang` di semua `.ts`/`.tsx` di luar `node_modules` = **nol hasil total**. Dikonfirmasi empiris: Lane 3 tidak menemukan `<link rel="canonical">` di halaman mana pun. Root metadata hanya berisi `title`, `description`, dan `icons`. Tidak ada `<meta name="robots">` — artinya default `index,follow` berlaku, yang **benar** dan bukan masalah, hanya tidak ada penegasan eksplisit.

**Kenapa penting:** Ketiadaan Open Graph berarti setiap pembagian tautan di LINE, X, atau Facebook — kanal yang relevan untuk layanan konsumen di Jepang — menghasilkan preview tanpa gambar dan tanpa judul yang layak. Ketiadaan canonical menghilangkan satu-satunya alat yang tersedia untuk menyelesaikan duplikasi di F-14. Dan tanpa `metadataBase`, setiap URL absolut yang nanti dibutuhkan (OG image, canonical, sitemap) tidak punya dasar untuk dibentuk.

**Fix:** Tambahkan `metadataBase`, `openGraph` (dengan satu OG image di `public/`), dan `alternates.canonical` per route. **Diblokir:** ketiganya butuh domain produksi. Ini alasan terkuat untuk menanyakan domain ke user lebih dulu — F-03, F-12, dan F-23 semuanya menunggu jawaban yang sama.

**Verifikasi setelah fix:** `curl -s <url> | grep -E 'og:(title|image|url)|rel="canonical"'` mengembalikan nilai absolut yang benar di tiap halaman.

---

### [F-24] `aria-label` hamburger hardcoded bahasa Jepang — LOW · [T1 — TERBUKTI]

**Lokasi:** `components/Navbar.tsx:200`

**Bukti:** Tombol hamburger memakai `aria-label="メニュー"` yang **hardcoded** dan tidak ikut toggle EN/JA seperti teks lain di navbar. Kontras dengan komponen tetangganya yang sudah benar: LangToggle (`Navbar.tsx:58-76`) punya `aria-label` dinamis ("Switch to English" / 「日本語に切り替える」), dan PhoneBlock (`Navbar.tsx:87-121`) memakai `<a href="tel:...">` dengan `aria-label` deskriptif. Pola serupa juga ada di `components/ui/TabPanel.tsx:39` — `aria-label="プラン切り替え"` hardcoded.

**Kenapa penting:** Dampak SEO/AEO praktis nol. Ini murni inkonsistensi aksesibilitas: pengguna screen reader berbahasa Inggris yang sudah men-toggle situs ke EN tetap mendengar label Jepang. Dicatat untuk kelengkapan, dengan prioritas rendah.

**Fix:** Salurkan lewat helper `t()` yang sudah dipakai di seluruh komponen tersebut. Berlaku juga untuk `TabPanel.tsx:39`.

**Verifikasi setelah fix:** toggle ke EN, periksa `aria-label` pada tombol menu dan tablist berubah.

---

### [F-25] `alt` logo selalu memakai versi Inggris — LOW · [T1 — TERBUKTI]

**Lokasi:** `components/Navbar.tsx:232`, `components/Footer.tsx:33`

**Bukti:** Kedua tempat memakai `alt={brand.logoAlt.en}` — versi `.en` secara langsung, tanpa melewati `t()`, sehingga tidak ikut berubah saat bahasa di-toggle. Bandingkan pemakaian yang benar di file yang sama-sama aktif: `app/page.tsx:20` `alt={t(home.hero.imageAlt, lang)}`, `app/page.tsx:242` `alt={t(card.imageAlt, lang)}`, dan `components/ui/ServiceCard.tsx:29` `alt={t(image.alt, lang)}`. Jadi pola yang benar dominan; dua tempat ini menyimpang.

**Kenapa penting:** Kecil. Alt logo yang berbahasa Inggris di halaman Jepang sebenarnya sedikit membantu asosiasi entitas karena memunculkan nama brand dalam huruf Latin (bandingkan F-06, di mana brand nyaris absen) — jadi bukan sepenuhnya kerugian. Dicatat sebagai inkonsistensi, bukan kerusakan. `app/page.tsx:484` memakai `alt="mics — MedicalInformatics Co.,Ltd."` yang hardcoded tapi tepat, karena itu nama legal yang memang tidak diterjemahkan.

**Fix:** Salurkan lewat `t()` bila konsistensi diinginkan, atau biarkan dan dokumentasikan sebagai sengaja. Rendah prioritas.

**Verifikasi setelah fix:** toggle bahasa, inspeksi `alt` pada logo navbar dan footer.

---

### [F-26] Pipeline CMS akan merusak agent-readability bila diaktifkan apa adanya — LOW (laten) · [T1 — TERBUKTI]

**Lokasi:** `features/cms/actions.ts:1`, `features/cms/hooks.ts:1-18`, `components/providers.tsx:1-22`, `lib/bff.ts:36`

**Bukti:** `features/cms/actions.ts:1` adalah `"use server"` (Server Action yang mengambil data server-side lewat `lib/bff.ts` dengan `next: { revalidate: 300 }`) — sisi itu sehat. Masalahnya pembungkusnya: `features/cms/hooks.ts:1-18` adalah `"use client"` `useBilingualPage()` yang memanggilnya lewat `useQuery` **tanpa** `prefetchQuery` + `HydrationBoundary` di server. `components/providers.tsx:1-22` hanya memuat `QueryClientProvider` (staleTime 5 menit, retry 1) — **tidak ada `HydrationBoundary`/`dehydrate` di layout mana pun**, dikonfirmasi Lane 1.

Risiko ini **saat ini tidak termanifestasi**: grep `features/cms` di `app/` = 0 hasil, jadi tidak satu pun halaman memakainya, dan build memang menghasilkan 11 route statis semuanya.

**Kenapa penting:** Ini satu-satunya tempat di seluruh proyek di mana "use client" benar-benar berbahaya bagi crawler. Bedanya jelas dan penting: halaman live memakai data **sinkron compile-time** dari `constants/`, sehingga ter-prerender penuh ke HTML (dibuktikan Lane 3). Pipeline CMS memakai **fetch asinkron setelah mount** tanpa prefetch server, sehingga crawler non-JS akan menerima state kosong/loading di raw HTML. Jika F-09 dikerjakan lewat CMS alih-alih route statis, semua keunggulan rendering yang sekarang dimiliki proyek ini akan hilang di halaman-halaman baru itu.

**Fix:** Jangan aktifkan pipeline CMS tanpa menambahkan `prefetchQuery` + `HydrationBoundary` di Server Component. Untuk F-09, gunakan route statis membaca `constants/` — bukan CMS. Jika CMS memang akan dihidupkan nanti, itu keputusan arsitektural tersendiri dan perlu diaudit ulang.

**Verifikasi setelah fix:** jika CMS pernah diaktifkan — `curl` halaman terkait tanpa JS dan pastikan konten aslinya ada, bukan skeleton.

---

### [F-27] Tidak ada `llms.txt` / `llms-full.txt` — LOW · [T2 — MEKANIS NYATA, DAMPAK SITASI BELUM TERBUKTI]

**Lokasi:** tidak ada file

**Bukti:** `curl http://localhost:3000/llms.txt` → 404; `find` untuk `llms*.txt` di source (di luar `node_modules`/`.git`/`.next`) = nol hasil.

**Kenapa penting — dan batas klaimnya:** `llms.txt` adalah konvensi yang diusulkan komunitas, bukan standar yang diadopsi. **Tidak ada bukti publik bahwa penyedia LLM besar mana pun mengambilnya untuk keputusan sitasi.** Yang dapat dinyatakan jujur: file ini adalah cara berbiaya rendah untuk menempatkan pernyataan entitas kanonik dan ringkasan harga di satu URL yang stabil dan mudah dibaca. Kalaupun tidak ada crawler yang memintanya, ia memaksa proyek menuliskan "Care24Japan adalah X, harganya Y" dalam satu tempat — kalimat yang saat ini tidak ada di mana pun (F-05, F-06). Nilainya nyata dan bersifat higienis; klaim ranking-nya nol.

**Fix:** Kalau F-05 dan F-06 sudah dikerjakan, `llms.txt` menjadi turunan yang hampir gratis dari kalimat-kalimat itu. **Jangan kerjakan sebelum itu** — file yang menunjuk ke halaman yang masih belum bisa dikutip tidak memperbaiki apa pun. Prioritas: setelah semua T1.

**Verifikasi setelah fix:** `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/llms.txt` → 200, dan isinya konsisten dengan halaman live.

---

### [F-28] Tidak ada markdown content negotiation; `Vary` tidak memuat `Accept` — LOW · [T2 — MEKANIS NYATA, DAMPAK SITASI BELUM TERBUKTI]

**Lokasi:** `next.config.ts` (isi lengkapnya hanya `{ devIndicators: false }`)

**Bukti:** Lane 3, pengujian langsung:

```
curl -H "Accept: text/markdown, text/html;q=0.7" http://localhost:3000/pricing
→ HTTP 200, Content-Type: text/html; charset=utf-8
```

Permintaan markdown diabaikan sepenuhnya. Response header:

```
Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding
```

`Accept` **tidak** termasuk. `next.config.ts` tidak memiliki `rewrites`/`headers` yang bisa menyediakan negotiation.

**Kenapa penting — dan batas klaimnya:** Saat ini `Vary` tanpa `Accept` **bukan masalah**, karena tidak ada negotiation sama sekali sehingga tidak ada respons berbeda yang bisa salah di-cache. Ini dicatat justru sebagai peringatan bersyarat: **jika** markdown negotiation ditambahkan nanti tanpa juga menambahkan `Accept` ke `Vary`, cache di depan situs bisa menyajikan markdown ke browser atau HTML ke klien markdown. Itu regresi nyata yang lahir dari "perbaikan". Adapun manfaat negotiation itu sendiri: mekanismenya nyata, tetapi ini situs company profile B2C, bukan properti developer-facing — populasi klien yang meminta `text/markdown` kemungkinan besar sangat kecil, dan tanpa akses server log kami tidak bisa mengukurnya.

**Fix:** Tidak direkomendasikan untuk situs ini pada tahap sekarang (lihat "Sengaja tidak direkomendasikan"). Jika tetap dikerjakan: implementasi negotiation **dan** `Vary: Accept` harus masuk dalam satu perubahan yang sama, tidak boleh terpisah.

**Verifikasi setelah fix (jika dikerjakan):**
```bash
curl -sI -H "Accept: text/markdown" http://localhost:3000/pricing | grep -Ei 'content-type|vary'
```
Content-Type `text/markdown` **dan** `Vary` memuat `Accept`.

---

## Simulasi Retrieval

Bagian ini disalin apa adanya dari Lane 2. Ini bukti paling konkret dalam audit — bukan penilaian gaya, melainkan penelusuran langkah demi langkah atas apa yang terjadi ketika sebuah sistem retrieval mencoba menjawab pertanyaan paling niscaya yang akan diajukan orang tentang bisnis ini.

**Query: "berapa biaya jasa perawatan di rumah dari Care24"** (persis seperti orang mengetik ke Perplexity/ChatGPT)

**1. Home — TIDAK ADA chunk layak.** Alasan konkret: harga `careCourse` (`app/page.tsx:206-233`, `copy.ts:220-226`) dipecah jadi 6 field `<span>` terpisah (label/hours/amount/unit/taxNote/taxIncluded) — TIDAK PERNAH digabung jadi satu kalimat "Care24JPN care course berbiaya ¥3,740/jam (9:00-18:00, termasuk pajak)". Brand name juga TIDAK muncul dekat angka harga manapun di halaman ini.

**2. Pricing — TIDAK ADA chunk layak (paling dekat tapi masih gagal).** Hero body tidak mengandung angka sama sekali (hanya klaim kabur "mudah dipahami"), angka aktual ada di `<table>` di balik tab-switcher, cell tabel hanya berisi angka+label pendek (「基本料金 ¥3,740」) TANPA kalimat lengkap yang menyebut brand+jenis layanan dalam baris yang sama.

**3. Fees — TIDAK RELEVAN untuk query ini** — seluruh isi tentang gaji supporter (pekerja), BUKAN biaya customer. RISIKO KONKRET: kalau retrieval system AI salah ambil chunk ini karena nama route "fees" cocok leksikal dengan query "biaya", jawaban yang dihasilkan akan SALAH (menyebut ¥2,000/jam gaji supporter, bukan ¥3,740/jam biaya customer).

**KESIMPULAN SIMULASI:** tidak ada satu chunk pun di seluruh situs yang menggabungkan (brand eksplisit + jenis layanan + angka harga + unit/jam + status pajak) dalam satu blok teks yang bisa dikutip utuh oleh AI.

**Catatan sintesis atas simulasi:** kalimat "di balik tab-switcher" pada kandidat #2 semula merupakan pertanyaan terbuka Lane 2 dan kini sudah terjawab — konten tab **memang ada** di raw HTML (lihat PASS di bawah). Ini justru memperkuat kesimpulannya, bukan melemahkannya: kegagalan retrieval bukan karena angkanya tidak terkirim ke crawler, melainkan karena angka yang **sudah terkirim** tidak pernah dirangkai menjadi pernyataan yang bisa dikutip. Ini masalah komposisi konten, bukan masalah rendering — dan itu kabar bagus, karena masalah rendering jauh lebih mahal untuk diperbaiki.

---

## Yang sudah benar (PASS)

Hanya hal yang terbukti dari ketiga lane report atau dari cross-verification. Tidak ada yang ditambahkan demi menyeimbangkan nada.

**Rendering & delivery — area terkuat proyek ini**

- **Semua 11 route ter-generate sebagai `○ (Static)`** oleh `npm run build`, termasuk yang `"use client"`. Nol route dynamic/SSR. Ini konfigurasi delivery terbaik yang mungkin untuk situs jenis ini.
- **`"use client"` tidak merugikan crawler di sini.** Raw HTML homepage (curl User-Agent GPTBot, tanpa eksekusi JS) memuat konten yang sesuai dengan yang tampil di browser — nol celah konten JS-only. Ini konsisten dengan dokumentasi Next 16.2.7 di `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md:100-121`: *"Client Components and the RSC Payload are used to prerender HTML."* Datanya sinkron compile-time dari `constants/`, jadi ikut ter-prerender.
- **Nol dependensi fetch asinkron di jalur yang live.** Nol `Suspense`, nol `params`/`searchParams`, nol `generateStaticParams`. Tidak ada yang bisa berakhir sebagai skeleton di raw HTML.

**Struktur & aksesibilitas**

- **Konten tab non-aktif ADA di raw HTML — PASS.** Ini pertanyaan terbuka Lane 2, sekarang terjawab. `components/ui/TabPanel.tsx:80-91` merender **semua** panel ke DOM dan menyembunyikan yang tidak aktif dengan atribut `hidden`, bukan conditional render:
  ```tsx
  {tabs.map((tab, i) => (
    <div ... role="tabpanel" hidden={i !== active} className="pt-8">
      {tab.content}
    </div>
  ))}
  ```
  Artinya tabel 「看護コース」 di `/pricing` dan kedua tabel di `/fees` terkirim penuh ke fetcher raw-HTML. Kekhawatiran "tab kedua hilang dari initial HTML" **tidak berlaku**. Implementasinya juga mengikuti pola WAI-ARIA tabs dengan benar: `role="tablist"`/`role="tab"`/`role="tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby`, roving `tabIndex`, dan navigasi panah kiri/kanan.
- `<main>` ada — `components/AppShell.tsx:9-14`. `<header>` ada — `Navbar.tsx:149`. `<footer>` ada — `Footer.tsx:28`.
- **Footer punya landmark `<nav>` eksplisit** (`Footer.tsx:43`) — pola yang benar, sudah ada di proyek, tinggal disalin ke Navbar (F-17).
- **Hierarki heading homepage bersih**: tepat 1× H1, tanpa multiple-H1, tanpa lompatan level yang parah.
- Semua link internal memakai `next/link` dengan anchor text deskriptif — nol "klik di sini".
- Semua gambar memakai `next/image` dengan `alt` terisi di setiap pemakaian (`app/page.tsx:20,242,484`, `Navbar.tsx:232`, `Footer.tsx:33`, `ServiceCard.tsx:29`) — nol gambar tanpa alt.
- `aria-label` dinamis yang benar di LangToggle (`Navbar.tsx:58-76`) dan CTA telepon `<a href="tel:...">` dengan label deskriptif (`Navbar.tsx:87-121`).

**Perilaku HTTP**

- **404 asli, bukan soft-404.** `/this-page-does-not-exist` mengembalikan status 404 sungguhan.
- **Redirect trailing slash 1 hop.** `/pricing/` → 308 → `/pricing`; `/pricing` langsung 200. Perilaku standar Next, tidak ada rantai redirect.
- Tidak ada `<meta name="robots">` yang memblokir apa pun; default `index,follow` berlaku dan itu benar.

**Konten & data**

- **Tabel HTML semantik sungguhan** untuk semua data harga: `SupporterRateTable` (`app/fees/page.tsx:17-53`) dan `CourseRateTable` memakai `<table>`/`<thead>`/`<tbody>`; `components/LegalDocPage.tsx:128-158` merender tabel native untuk persentase biaya pembatalan dan tarif kompensasi. Ini format paling mudah diekstrak yang tersedia, dan sudah dipakai dengan benar.
- **`<ol>` eksplisit** untuk alur 4 langkah (`app/page.tsx:364`) — format yang tepat untuk konten prosedural.
- **Data harga akurat dan konsisten secara matematis** (¥3.400 × 1,1 = ¥3.740); masalahnya presentasi dan duplikasi (F-04), bukan kebenaran angka.
- **Dokumen legal punya kedalaman nyata** (privacy ~1.500+ kata JA) dan **konsisten menyebut "Care24Japan" dengan definisi jelas** di `legal.ts:257` — jangkar entitas terbaik yang saat ini dimiliki situs ini.
- **7 dari 11 halaman sudah punya metadata sendiri**: 6 halaman legal (`app/privacy/page.tsx:9-12` dkk) plus `/fees` (`app/fees/layout.tsx:5-9`). Pola `layout.tsx` Server Component di samping `page.tsx` client sudah terbukti bekerja di repo ini — persis yang dibutuhkan F-01/F-08.
- **Klaim spesifik memang ada dan berkualitas** jika dicari: ISMS/ISO27001 dengan nomor standar (`copy.ts:571-572`), tanggal berdiri dan modal (`copy.ts:868-873`), tabel kompensasi rinci (`legal.ts:407`), persentase pembatalan bertingkat (`legal.ts:360`).
- Tanggal berlaku konsisten JA/EN pada cancellation-policy (`legal.ts:372/391`) dan compensation (`legal.ts:427/457`).
- `constants/legal.ts` menyediakan ID heading yang stabil untuk anchor link (`LegalDocPage.tsx:162` `id={`sec-${i}`}`) — memungkinkan deep-link ke seksi tertentu.
- Komentar developer akurat dan jujur — `copy.ts:176` menandai jelas mana yang belum live. Ini membuat pemisahan dead code dari bug bisa dilakukan dengan keyakinan penuh, dan patut diapresiasi.

---

## Sengaja tidak direkomendasikan

Hal-hal yang lazim muncul di artikel GEO/AEO tapi tidak didukung bukti untuk kasus ini. Setiap butir menyebutkan alasan penolakannya, dan syarat yang akan mengubah keputusan itu.

**Content-Signal directive di `robots.txt` — [T3 — SPEKULATIF], tidak direkomendasikan.** Ini usulan yang sangat baru dan belum ada bukti publik bahwa crawler besar mana pun mengimplementasikannya sebagai perilaku yang mengikat. Menambahkannya tidak merugikan, tetapi memasukkannya ke daftar kerja akan menyiratkan tingkat kepastian yang tidak dimiliki. Ketika `robots.txt` dibuat untuk F-03, biaya menambahkannya nyaris nol — silakan, tapi jangan hitung sebagai fix. *Berubah jika:* ada penyedia besar mendokumentasikan dukungannya.

**`.well-known/agents.json`, MCP server card, katalog API — [T3 — SPEKULATIF], tidak direkomendasikan.** Semua ini menganggap agen ingin *bertransaksi* dengan properti Anda secara programatik. Care24JPN adalah company profile lead-gen B2C tanpa satu pun form (`grep "<form|onSubmit"` = nol hasil di seluruh proyek) dan tanpa API publik; setiap CTA adalah `<a href="tel:...">` menuju percakapan telepon manusia. Tidak ada permukaan yang bisa dipanggil agen. *Berubah jika:* booking/inquiry online ditambahkan.

**Markdown content negotiation — [T2], tidak direkomendasikan sekarang.** Mekanismenya nyata (F-28), tetapi audiens situs ini adalah keluarga Jepang yang mencari perawatan untuk kerabat lansia, bukan developer atau tooling. Tanpa akses server log kami tidak bisa mengukur trafik agent, dan tidak ada dasar apriori untuk menduganya signifikan di sini. Yang lebih menentukan: **menyajikan konten yang sama dalam markdown tidak memperbaiki apa pun kalau kontennya sendiri belum bisa dikutip (F-05).** Ini akan menjadi format yang lebih rapi untuk masalah yang sama. Kerjakan komposisi konten dulu. *Berubah jika:* log menunjukkan trafik agent yang berarti, dan T1 sudah selesai.

**`llms.txt` sekarang — [T2], ditunda, bukan ditolak.** Alasan lengkapnya di F-27. Ringkasnya: file ini seharusnya merupakan ringkasan dari pernyataan kanonik yang saat ini belum ada. Bangun pernyataannya dulu (F-05, F-06), lalu file ini menjadi turunan yang hampir gratis. Membuatnya sekarang berarti menulis ringkasan atas sesuatu yang belum ditulis.

**`FAQPage` JSON-LD — tidak direkomendasikan sampai FAQ benar-benar ada.** Situs ini tidak punya satu pun blok tanya-jawab (F-13). Menambahkan schema FAQ untuk konten yang tidak terlihat di halaman adalah misrepresentasi dan melanggar pedoman structured data. Urutannya wajib: FAQ dulu, schema kemudian.

**Halaman "hub" atau glosarium yang dibuat khusus untuk AI — tidak direkomendasikan.** Situs ini sudah menderita duplikasi (F-14) dan kanibalisasi (F-04). Menambah halaman yang mengulang konten yang sama dalam format berbeda akan memperburuk keduanya. Aset yang belum dimanfaatkan sudah ada dan tinggal dipublikasikan (F-09) — mulai dari sana.

**Mengembangkan `/company` demi word count — tidak direkomendasikan.** `/company` tipis (~60-90 kata) tetapi padat fakta dan merupakan halaman jenis impressum, di mana ringkas justru wajar dan diharapkan. Ini kasus di mana ambang word-count generik akan menyesatkan.

**Refactor rendering apa pun untuk "memperbaiki `use client`" — tidak direkomendasikan, dan ini penting.** Sebagian audit SEO akan merekomendasikan konversi ke Server Component secara menyeluruh. Untuk proyek ini itu keliru dan merusak: konten sudah ter-prerender penuh (dibuktikan empiris via curl), semua route sudah statis, dan `"use client"` di sini melayani toggle bahasa client-side yang merupakan keputusan produk. Refactor semacam itu akan menghabiskan effort besar untuk nol perolehan crawler, sambil membawa risiko regresi pada satu-satunya domain yang saat ini bernilai 8/10.

---

## Di luar kendali kode

Hal-hal yang mempengaruhi hasil tetapi tidak bisa diselesaikan dengan mengubah repo ini. Dicantumkan agar tidak keliru dianggap sebagai kegagalan implementasi.

- **Domain produksi belum diketahui — pemblokir langsung, dan ini yang pertama harus dijawab user.** Tidak ada `vercel.json`, `wrangler.toml`, maupun `.vercel` di repo; git remote hanya menunjuk ke source GitHub. F-03 (sitemap butuh absolute URL), F-23 (`metadataBase`, OG, canonical), dan F-12 (hreflang) semuanya menunggu jawaban yang sama. Pengujian redirect-chain produksi juga dilewati karena ini.
- **Platform hosting/edge tidak diketahui.** Perilaku caching, dukungan header, dan penanganan `Vary` berbeda antar platform. Relevan jika F-28 pernah dikerjakan.
- **Otoritas domain dan profil backlink** — tidak dapat dinilai dari repo, dan tidak dapat diperbaiki dari repo.
- **Kehadiran entitas di luar situs:** Wikidata, Google Business Profile, direktori layanan perawatan Jepang, dan pencatatan asosiasi industri. Untuk masalah entitas di F-06, sinyal luar situs kemungkinan berbobot lebih besar daripada perbaikan di dalam situs — terutama untuk membedakan Care24JPN dari "Care24" milik Aegis Care Advisors, entitas yang **sudah** ada di luar sana dengan nama itu.
- **Sitasi dan ulasan pihak ketiga** yang menyebut penyedia bersama harganya. Ini kerap menjadi sumber yang dikutip AI ketika situs resminya sendiri tidak menyediakan pernyataan yang bisa dikutip — persis situasi F-05 hari ini.
- **Data log server** tidak tersedia untuk audit ini, sehingga tidak ada klaim tentang kunjungan bot aktual (GPTBot/ClaudeBot/PerplexityBot). Jika akses log dibuka nanti, ini akan menyelesaikan pertanyaan T2 secara empiris alih-alih lewat penalaran.
- **Keputusan strategi bahasa** (F-12) adalah pilihan bisnis, bukan pilihan teknis: apakah Care24JPN menargetkan pencari berbahasa Inggris di Jepang atau tidak. Rekomendasi teknisnya bercabang sepenuhnya di titik itu.
- **Kepemilikan copy.** Sebagian besar temuan berdampak tinggi (F-05, F-10, F-13, F-16, F-20, F-21, F-22) memerlukan penulisan teks dalam bahasa Jepang, dengan istilah pencarian yang tepat dan suara merek yang sudah ada. Itu pekerjaan **FASE 4** dan harus dilakukan oleh manusia yang memahami bisnis ini. Mengisinya dengan teks yang dihasilkan model akan menyelesaikan metrik struktural sambil merusak hal yang membuat halaman-halaman ini layak dikutip sejak awal.

---

## Urutan kerja yang disarankan (untuk FASE 4, setelah approval)

Bukan bagian dari temuan; disertakan agar approval bisa diberikan per gugus, bukan sekaligus.

1. **Tanya user dulu:** domain produksi (membuka F-03, F-12, F-23), dan apakah string title `/fees` dari client sheet boleh diubah (F-19).
2. **Perbaikan struktural, nol perubahan copy** — F-02 (h1), F-01+F-08 (metadata per halaman), F-17 (nav landmark), F-15 (placeholder legal), F-19. Semuanya kecil, terisolasi, berisiko rendah.
3. **Setelah domain dikonfirmasi** — F-03 (robots+sitemap), F-23 (metadataBase/OG/canonical), F-07 (JSON-LD `Organization`/`Breadcrumb`/`Offer`).
4. **Publikasikan konten yang sudah ada** — F-09 (use-case sebagai route statis; **bukan** lewat CMS, lihat F-26). Dampak tinggi, nol copy baru.
5. **Pekerjaan copy** — F-05, F-10, F-13, F-04 (judul), F-14, F-16, F-20, F-21, F-22. Butuh penulis manusia.
6. **Baru setelah itu**, pertimbangkan ulang T2 (F-27, F-28) dengan bukti yang saat itu tersedia.
