# Review UI/UX & Konsistensi Desain — Care 24 Japan (`marketing-web`)

**Tanggal:** 13 Agustus 2026
**Ruang lingkup:** seluruh `app/`, `components/`, `styles/`, `constants/` — 12 rute × 2 bahasa (JA/EN)
**Viewport diuji:** Desktop 1440×900 · Tablet 768×1024 dan 820×1180 · Mobile 375×812
**Metode:** pembacaan sumber menyeluruh + pengukuran DOM langsung di `localhost:3001`. Setiap angka hasil ukur atau hasil hitung, bukan perkiraan.

> **Batasan yang diminta:** perubahan **wording / copy tidak termasuk** dalam lingkup rekomendasi. Temuan yang akarnya murni pilihan kata ditandai **`[wording — di luar lingkup]`** dan dicatat sebagai informasi saja. Temuan yang kebetulan menyentuh teks tetapi akarnya struktural (tujuan tautan, format angka, bug render) tetap direkomendasikan, dengan solusi yang **tidak mengubah kata-katanya**.

---

## 0. Design Read

> Situs ini terbaca sebagai: **landing page layanan perawatan lansia B2C untuk keluarga Jepang (pengambil keputusan usia 40–60)**, dengan bahasa visual **calm / trust-first**, condong ke **Tailwind utilities + Noto Sans JP + motion tertahan**.

| Dial | Nilai | Alasan |
|---|---|---|
| `DESIGN_VARIANCE` | **4** | Audiens lansia + keluarga. Kejutan layout = beban kognitif, bukan nilai tambah. |
| `MOTION_INTENSITY` | **3** | Sektor kesehatan; animasi harus menjelaskan, bukan menghibur. |
| `VISUAL_DENSITY` | **3–4** | Teks besar, banyak ruang putih, satu ide per blok. |

Standar aksesibilitas dinaikkan satu tingkat dari default karena audiens utama adalah pengguna dengan penurunan penglihatan dan motorik. Untuk situs ini WCAG AA adalah **lantai**, bukan target.

---

## 1. Ringkasan Skor

| Area | Skor | Catatan satu baris |
|---|---|---|
| A. Sistem desain & token | **5/10** | Token bagus; `DESIGN_SYSTEM.md` menggambarkan situs yang sudah tidak ada. |
| B. Tipografi | **4/10** | Tiga rezim ukuran yang saling bertentangan dalam satu situs. |
| C. Layout & responsif | **5/10** | Desktop rapi; **tablet titik terlemah**; mobile 16,5 layar. |
| D. Navigasi & IA | **2/10** | **4 halaman sama sekali tidak punya tautan masuk.** |
| E. Konversi & CTA | **3/10** | Semua CTA "daftar/pesan" mendarat di halaman informasi. |
| F. Aksesibilitas | **3/10** | Nol gaya fokus, nol skip-link, `--color-muted` gagal di **20 dari 20** penggunaan. |
| G. Motion & performa | **6/10** | Hero ter-upscale 1,8×; reduced-motion bocor di satu titik yang penting. |
| H. Kode mati & drift | **4/10** | ~40 kunci copy tidak pernah dirender; 4 komentar kode faktual salah. |
| **Total** | — | **≈ 40/100** |

---

## 2. Ringkasan Eksekutif — 10 Hal yang Paling Merugikan

| # | Temuan | Bukti | Dampak |
|---|---|---|---|
| 1 | **Empat halaman tidak punya satu pun tautan masuk** | `/use-case`, `/fees`, `/compensation`, `/quasi-mandate` — grep menyeluruh `href=` di `app/` + `components/` + `constants/`: nol kecocokan | `/use-case` adalah halaman konten penuh (4 skenario, `generateMetadata` sendiri, canonical, hreflang, entri sitemap) yang **tidak bisa dicapai dari mana pun**. Hanya sitemap yang menemukannya. |
| 2 | **`/pricing` tidak punya satu pun tautan atau CTA** | `main a` = **0**; 17 elemen fokusabel di halaman, **0 di dalam `<main>`** | Tujuan tombol utama navbar. Semua halaman lain menyalurkan ke sini, dan di sini alurnya berhenti. |
| 3 | **Harga yang sama tampil berbeda di dua halaman** | Beranda menonjolkan **`3,400円`** (48px, belum pajak) dengan `3,740円` kecil di bawahnya; `/pricing` menonjolkan **`¥3,740`** (36px) | Kursus yang sama terlihat punya dua harga. Nursing: `6,000円` vs `¥6,600`. **Ini masalah keputusan angka mana yang jadi headline, bukan masalah kata.** |
| 4 | **Semua CTA "daftar/pesan" mendarat di halaman informasi** | `"Apply here"` → `/service-flow`; `"Register for free"` → `/pricing`; `"Book a free consultation"` (2×) → `/pricing`; `"Contact us"` → `/service-flow` | Nol form di seluruh basis kode. Tidak ada satu pun rute untuk benar-benar mendaftar atau memesan. |
| 5 | **Dua banner CTA menuju satu tujuan** | `page.tsx:451` `#contact`; `page.tsx:459` `staff.href` = `"#contact"` (`copy.ts:545`) | Pelamar kerja mendarat di telepon konsultasi pelanggan. Sementara `/fees` — halaman yang menjawab "berapa gaji saya?" — tidak punya tautan masuk. |
| 6 | **Nol indikator fokus keyboard** | `grep -rE "focus:\|focus-visible\|outline" app components` → **0 kecocokan**; pemindaian stylesheet runtime → **0 aturan `:focus`** | 22 kelompok kontrol interaktif hanya bergantung pada cincin bawaan browser. |
| 7 | **`--color-muted` gagal kontras di 20 dari 20 penggunaan** | Terbaik **2,84:1**, terburuk **2,53:1** (minimum AA 4,5:1) | Tidak ada satu pun penggunaannya yang lolos, di ukuran mana pun. |
| 8 | **Seksi alur beranda menduplikasi `/service-flow` kata per kata** | 4 langkah, `title` + `body` **byte-identical** di kedua bahasa (`copy.ts:494/691`, `503/698`, `512/705`, `521/712`) | Klik nav "ご利用の流れ" membawa pengguna ke halaman berisi 4 kalimat yang baru saja mereka lewati — dengan skala tipe berbeda (14px vs 18px). |
| 9 | **Tablet: kartu masalah jadi 3 kolom sempit** | 768px → kolom **229px**, teks **20px**, **±12 karakter/baris** | Hanya terjadi di EN. Layout diberi ukuran menurut panjang teks Jepang. |
| 10 | **Menu mobile: target sentuh 20px, tanpa kunci scroll, tanpa Escape** | Item **20px** tinggi; `body.overflow` = `visible`; fokus tetap di `BODY` | Satu-satunya navigasi di ponsel, dan komponen paling lemah di situs. |

---

## A. Sistem Desain & Token

### A.1 `DESIGN_SYSTEM.md` sudah tidak sinkron — 4 dari 6 aturan komponennya tidak berlaku

| Item | Tertulis di dokumen | Kondisi nyata di kode | Status |
|---|---|---|---|
| Logo | "intrinsic 427×160" | `logo.png` sebenarnya **5600×2101**, 407 KB | ❌ Angka acuan salah |
| Cards | `shadow-sm hover:shadow-md transition-shadow` | **Nol kartu punya shadow.** Semua 9 blok `rounded-2xl` hanya border | ❌ Aturan tak pernah dipakai |
| Button accent | `hover:opacity-90` | `ApplyBanner` (`page.tsx:691`) pakai `hover:brightness-95` | ❌ Dua definisi hover |
| Pola bilingual | "Setiap teks render JA lalu EN bertumpuk" | Sudah diganti rute `/[lang]/`; satu-satunya sisa implementasinya ada di `TabPanel.tsx:72–77` yang **sudah mati** | ❌ Menggambarkan arsitektur yang dihapus |
| EN secondary label | "0.7rem uppercase tracking-widest muted" | Tidak ada lagi di mana pun | ❌ |
| Section padding | `py-20` desktop / `py-12` mobile | `Section.tsx:25` → `py-12 md:py-20` | ✅ Satu-satunya yang masih akurat |

Aturan header `copy.ts:2–4` juga masih mendokumentasikan pola dua-bahasa-serentak yang sama.

**Rekomendasi:** tulis ulang `DESIGN_SYSTEM.md` dari kode nyata, atau hapus. Dokumen desain yang salah lebih berbahaya daripada tidak ada dokumen.

### A.2 Dua nama untuk satu warna

`--color-surface: #ffffff` dan `bg-white` bawaan Tailwind identik, tapi keduanya beredar:

| `bg-white` | `bg-surface` |
|---|---|
| `page.tsx:118` (kartu masalah) | `page.tsx:252` (sel tarif) |
| `page.tsx:501` (kotak logo mics) | `CourseRateCard.tsx:35`, `:56` |
| `page.tsx:510` (badge ISO) | `fees/page.tsx:25` |
| `TableOfContents.tsx:52` | `Footer.tsx:10`, `Navbar.tsx:285`, `Section.tsx:25` |

`page.tsx:118` dan `:252` adalah kartu bersaudara di halaman yang sama, dicat dengan dua nama berbeda.

### A.3 Warna mentah di dalam TSX

| File:line | Literal | Token yang sudah ada |
|---|---|---|
| `page.tsx:421` | `shadow-[0_4px_12px_rgba(43,126,193,0.25)]` | `43,126,193` = `#2b7ec1` = `--color-primary` |
| `StepFlow.tsx:42` | literal identik, disalin persis | idem |
| `Navbar.tsx:196` | `shadow-[0_2px_12px_rgba(27,31,94,0.07)]` | `27,31,94` = `#1b1f5e` = `--color-heading` |

Tidak ada hex mentah — bagus. Tiga rgba ini yang akan tertinggal saat palet berubah.

### A.4 Skala radius: 5 utility, lompatan tak beraturan

| Lokasi | Masalah |
|---|---|
| `pricing/page.tsx:77` (`xl`) vs `CourseRateCard.tsx:35` (`2xl`) | Dua blok bersaudara di **halaman yang sama** — pil highlight persis di atas kartu kursus |
| `fees/page.tsx:25` (`2xl`) vs `pricing/page.tsx:77` (`xl`) | Dua halaman tarif, radius berbeda untuk objek setara |
| `page.tsx:472` (`2xl`) → `:501`, `:510` (`lg`) | Lompat 2 tingkat, melewati `xl` |
| `TableOfContents.tsx:52` (`2xl`) → `:67` (`lg`) | Lompat 2 tingkat di dalam satu kartu |
| `page.tsx:338` (`full`) vs `:370` (`r-xl`) | Dua daftar dalam satu `<article>`, dua bahasa radius tak berhubungan |

### A.5 Ritme vertikal: 13 langkah `mt-*`, 16 nilai `gap-*`

Untuk grid kartu yang setara: `gap-3` (`pricing:73`), `gap-4` (`page:114`), `gap-5` (`page:449`), `gap-6` (`fees:113`, `pricing:89`), `gap-8` (`page:160`, `:266`), `gap-16` (`use-case:46`). **Enam nilai untuk satu jenis hubungan.**

Nilai ganjil di luar tangga: `mt-7` (`page:331`, `pricing:73`), `pt-7` (`Footer:42`), `py-14` (`Footer:11`), `p-7`/`px-7` (5 tempat), `gap-3.5` (`page:194`), `gap-x-7` (`Footer:42`), `py-3.5` (`TableOfContents:55`).

### A.6 Tujuh angka berbeda untuk satu header

| File:line | Nilai | Untuk |
|---|---|---|
| `Navbar.tsx:19` | `h-[81px] md:h-[130px]` | tinggi shell sebenarnya |
| `Section.tsx:25` | `scroll-mt-36` = **144px** | offset anchor seksi |
| `page.tsx:162` | `md:top-36` = **144px** | kartu harga sticky |
| `TableOfContents.tsx:6` | `HEADER_OFFSET = 150` | scroll JS |
| `globals.css:107` | `9.5rem` = **152px** | heading dokumen legal |
| `LegalDocPage.tsx:160` | `top-40` = **160px** | TOC sticky |
| `Navbar.tsx:104` | `rootMargin: -140px` | deteksi seksi aktif |

**Rekomendasi:** satu token CSS `--header-offset` yang dibaca semuanya.

---

## B. Tipografi

### B.1 Lantai 18px hanya diterapkan di 3 dari 8 halaman

Hasil ukur langsung — elemen teks terlihat dengan `font-size < 18px` di dalam `<main>`:

| Halaman | Elemen < 18px | Ukuran yang muncul |
|---|---|---|
| `/pricing` | **0** ✅ | 18 / 20 / 24 / 30 / 36 |
| `/fees` | **0** ✅ | 18 / 20 / 24 / 30 |
| `/service-flow` | **0** ✅ | 18 / 24 / 30 |
| **Beranda** | **22** ❌ | **8** / 12 / 14 / 16 / 18 / 20 / 30 / 36 / 48 |
| **`/use-case`** | **30** ❌ | **14** / 16 / 24 / 30 — seluruh isi 14px |
| **`/company`** | seluruh `<dl>` ❌ | 14px untuk `<dt>` dan `<dd>` (`company:43,44`) |
| `/terms` (legal) | TOC 13px (22×) | badan dokumen 17px — sengaja, boleh |

Elemen terkecil: **8px** — label "STEP" di badge alur beranda (`page.tsx:422`). Di `/service-flow` label yang sama sudah dihapus **justru karena melanggar lantai**. Dua halaman yang menampilkan alur identik memakai standar tipografi yang berlawanan.

### B.2 Konten sama, ukuran berbeda antar halaman

| Konten | Di beranda | Di halaman khusus | Selisih |
|---|---|---|---|
| Isi langkah alur | `page.tsx:433` `text-sm` = **14px** | `StepFlow.tsx:49` `text-lg` = **18px** | 4px |
| Judul langkah | `page.tsx:430` `text-lg` = **18px** | `StepFlow.tsx:46` `text-2xl` = **24px** | 6px |
| Node nomor | `page.tsx:421` `h-12 w-12` = **48px** | `StepFlow.tsx:42` `h-14 w-14` = **56px** | 8px |
| Rel putus-putus | `left-6 top-12` | `left-7 top-14` | offset berbeda |
| Label "STEP" | **8px** | dihapus | — |
| Paragraf pembuka | `text-lg` di `/fees` `/pricing` `/service-flow` | `text-base` di `use-case:40` | 2px |

### B.3 Tiga perlakuan judul seksi dalam satu halaman

| Perlakuan | Lokasi | Bentuk |
|---|---|---|
| Via `Section` | `page.tsx:113`, `:404` | rata kiri, `text-3xl` |
| Hand-rolled tengah | `:152`, `:211`, `:477` | rata tengah, `text-2xl md:text-3xl` |
| Eyebrow + judul | `:300–301` | rata tengah + eyebrow `text-lg` |

Dan **3 file melewati `Section` untuk judul halaman** (`page.tsx:61`, `error.tsx:22`, `global-not-found.tsx:32`) → **tiga ukuran H1 berbeda** di satu situs: `text-4xl md:text-5xl`, `text-3xl`, `text-2xl`.

Dua seksi beranda (`:135` piramida, `:448` banner) **tidak punya heading sama sekali**, jadi outline heading punya dua wilayah tanpa nama.

### B.4 `Section.tsx` tidak membedakan H1 dan H2

`Section.tsx:30` — prop `level` hanya mengubah **tag**, tidak pernah ukuran. Judul halaman dan judul seksi sama-sama `text-3xl`. Semantik benar, hierarki visual hilang.

### B.5 Tidak ada skala tipografi responsif untuk H2

Diukur: `<h2>` beranda **30px di 1440px** dan **30px di 768px**. Di 375px sebagian turun ke 24px, sebagian tetap 30px — tidak konsisten ke bawah juga.

### B.6 Satu utility warna yang tidak pernah berlaku

`page.tsx:301` memberi `text-primary` pada `<h2>`. Aturan **tak berlayer** di `globals.css:50–57` (`h1,h2,h3,h4 { color: var(--color-heading) }`) mengalahkan setiap utility berlayer Tailwind v4 — jadi heading ini render **navy**, bukan biru. `CourseRateCard.tsx:41–44` sudah mendokumentasikan jebakan ini dan menyiasatinya dengan `<span>` di dalam; `page.tsx:301` belum.

---

## C. Layout & Responsif

### C.1 Desktop (1440×900)

| Item | Hasil ukur | Penilaian |
|---|---|---|
| Overflow horizontal | `scrollWidth` = 1440 = viewport | ✅ Bersih |
| Tinggi header | 130px (14,4% viewport) | ⚠️ Berat tapi wajar untuk 2 tier |
| Tinggi beranda | **8.641px** (~9,6 layar) | ⚠️ |
| Lebar kontainer | Chrome + hero `max-w-6xl` (1152px) vs isi `max-w-5xl` (1024px); piramida `page.tsx:135` **tanpa kontainer sama sekali** | ❌ **Tiga lebar konten di satu halaman.** Tepi kiri logo dan H1 hero tidak sejajar dengan judul seksi mana pun di bawahnya |
| Hero image | Sumber **800×764**, dirender **1440×770** | ❌ Upscale **1,8×** (3,6× efektif di retina). Ini gambar LCP. |

### C.2 Tablet — area terlemah

Semua temuan berikut **hanya muncul di 768–1023px**.

| # | Item | Hasil ukur di 768px | Masalah |
|---|---|---|---|
| C.2.1 | **Kartu masalah beranda** (`page.tsx:114`) | `md:grid-cols-3` → kolom **229px**, teks **20px**, **±12 karakter/baris** | Grid loncat `sm:2` → `md:3` tepat saat kolom jadi terlalu sempit. Ideal 45–75 karakter. |
| C.2.2 | **Header tier-1 nyaris meluap** | Tersedia 720px, terpakai **718px** → sisa **2px**. Di 820px sisa 55px | `PhoneBlock` lebar tetap `w-72` (288px) + logo 144 + toggle + CTA 144. Fragile. |
| C.2.3 | **Kartu kursus `/pricing` bertumpuk** | `lg:grid-cols-2` → di 768px jadi **1 kolom, 720px** | Seluruh alasan tab dihapus adalah agar dua tarif bisa dibandingkan berdampingan. Di tablet manfaat itu hilang lagi. |
| C.2.4 | **Inner-before-outer inversion** | `page.tsx:224` band `lg:flex-row`, tapi `<dl>` di dalamnya `sm:grid-cols-3` (`:248`) | Antara **640–1023px**: blok harga full-width bertumpuk di atas baris 3 kolom sepertiga. Sakelar luar terjadi **384px lebih lambat** dari sakelar dalam. Pola sama di `pricing:89` vs `CourseRateCard:54`. |
| C.2.5 | **Seksi contoh penggunaan mati di tablet** | `page.tsx:314` `lg:grid-cols-[0.9fr_1.1fr]` + `lg:order-*` | Ritme kiri-kanan bergantian — ide desain utama seksi ini — **tidak terlihat sama sekali di bawah 1024px**. Di iPad potret jadi satu kolom, menggandakan tinggi seksi yang sudah ~1.000px. |
| C.2.6 | **TOC legal tetap versi mobile** | `LegalDocPage.tsx:147,159` `lg:` | Di 768–1023px ada ~250px ruang tidak terpakai, tapi pembaca tetap dapat kartu TOC bertumpuk, bukan sidebar sticky. |
| C.2.7 | **Kartu harga sticky terlalu dini** | `md:sticky md:top-36`, lebar **344px** | Aktif mulai 768px, di mana kolom sebelahnya juga hanya 344px. |
| C.2.8 | Tinggi beranda | **9.992px** (naik dari 8.641px di desktop) | — |

**Catatan penting untuk C.2.1:** masalah ini **hanya di versi EN**. Diukur di JA, label yang sama (`移動介助`, `口腔ケア`) muat satu baris di 152px. Layout diberi ukuran menurut panjang teks Jepang, lalu teks Inggris dimasukkan tanpa menyesuaikan breakpoint.

### C.3 Mobile (375×812)

| # | Item | Hasil ukur | Masalah |
|---|---|---|---|
| C.3.1 | **Panjang beranda** | **13.378px = 16,5 layar** (EN); 11.757px (JA) | Tidak ada navigasi dalam-halaman, tidak ada "kembali ke atas", tidak ada CTA lengket. |
| C.3.2 | **Hero > satu layar** | Seksi hero **854px** (EN) / **731px** (JA) vs viewport 812px | H1 EN + isi + 2 CTA + 3 pil trust. Di iPhone SE (667px) risikonya lebih besar lagi. |
| C.3.3 | **`grid-cols-2` tidak pernah turun ke 1 kolom** | 4 daftar cakupan tetap **2 kolom di 375px** | `page.tsx:279` — `grid-cols-2` **tanpa prefix apa pun**. Kolom ~151px berisi teks 18px `leading-snug`. Item EN seperti `"Assistance to and from medical appointments"` jadi 3–4 baris. |
| C.3.4 | **Menu mobile** | Item **20px** tinggi, font 14px | `Navbar.tsx:297` — `block text-sm`, **tanpa padding sama sekali**. Minimum 44px. |
| C.3.5 | **Tanpa kunci scroll** | `body.overflow` = `visible` | Halaman ikut menggulir di belakang menu. |
| C.3.6 | **TOC dokumen legal** | Tinggi **625px**, `position: static` | Pembaca ponsel harus menggulir melewati 625px daftar isi. **Sticky TOC hanya ada di ≥1024px**, jadi setelah layar pertama tidak ada navigasi dalam-dokumen sama sekali. |
| C.3.7 | **Kolom label `/company`** | `grid-cols-[6.5rem_1fr]` = 104px | `"Representative"` (~107px) dan `"Group companies"` (~115px) **melebihi kolom** → membungkus 2 baris, hanya di EN, hanya di mobile. Nilai `whitespace-pre-line` tanpa `break-words` → sel ~8 baris. |
| C.3.8 | **Kolom waktu jadwal** | `w-[7.5rem]` (120px) `shrink-0` | Konten `"13:00〜14:00"` @18px bold ≈ **117px** → sisa **3px**. `shrink-0` berarti meluap, bukan membungkus. |
| C.3.9 | **Piramida** | `max-w-[56%]` = 183px di 375px | `"Resolving your anxieties and problems"` (36 karakter) → ~4 baris **di dalam segitiga yang menyempit ke bawah**. Penengahan `pb-[18%]` disetel untuk kasus JA 1 baris. |
| C.3.10 | Overflow horizontal | `scrollWidth` = 375 di semua halaman, kedua bahasa | ✅ Bersih |

### C.4 Tabel tanpa penanganan overflow

| Lokasi | Penanganan | Verdict |
|---|---|---|
| **`/fees` `SupporterRateTable`** (`fees:29–62`) | `overflow-x-auto` membungkus `<table className="w-full">` **tanpa `min-width`** | ❌ **`overflow-x-auto` tidak akan pernah aktif.** Tabel selalu menyusut mengikuti kontainer. Di 375px: 271px dibagi 3 kolom. Header EN `"Care supporter"` dan label `"Basic rate (per hour)"` masing-masing membungkus 3–4 baris. `px-7` juga ada **di kontainer scroll**, jadi kalau scroll aktif padding kanan akan hilang. |
| **Tabel dokumen legal** (`globals.css:184–200`) | `.table-wrap { overflow-x: auto }` + `table { min-width: 30rem }` + `tabIndex={0}` | ✅ **Pola yang benar** — punya `min-width` yang justru tidak dimiliki `/fees` |
| **`/company` `<dl>`** | tidak ada | ⚠️ Lihat C.3.7 |

### C.5 Yang sudah benar

- **Nol overflow horizontal** di 3 viewport × 2 bahasa × 12 rute. Ini kerja teliti.
- `min-h-[calc(100dvh-81px)]` memakai `dvh`, bukan `vh` — benar untuk Safari iOS.
- Header shell tinggi tetap dengan bar yang menyusut di dalamnya — mencegah lompatan layout dengan cara yang benar.
- Tidak ada `truncate` / `line-clamp` di mana pun, jadi tidak ada teks yang diam-diam terpotong — **kecuali** satu tempat (lihat F.7).

---

## D. Navigasi & Arsitektur Informasi

### D.1 Empat halaman yatim — temuan IA paling serius

Diverifikasi dengan grep menyeluruh `href=` / `href:` di `app/`, `components/`, `constants/`.

| Rute | Navbar | Footer | Tautan di badan teks | Status |
|---|---|---|---|---|
| `/`, `/pricing`, `/service-flow` | ✅ | ✅ | ✅ | reachable |
| `/company`, `/privacy`, `/tokushoho`, `/terms` | ❌ | ✅ | — | reachable |
| `/cancellation-policy` | ❌ | ❌ | hanya dari **badan dokumen tokushoho** (`legal.ts:229,255`) | ⚠️ semi-yatim |
| **`/use-case`** | ❌ | ❌ | ❌ **tidak ada** | ❌ **YATIM** |
| **`/fees`** | ❌ | ❌ | ❌ **tidak ada** | ❌ **YATIM** |
| **`/compensation`** | ❌ | ❌ | ❌ **tidak ada** | ❌ **YATIM** |
| **`/quasi-mandate`** | ❌ | ❌ | ❌ **tidak ada** | ❌ **YATIM** |

`/use-case` adalah kerugian terbesar: halaman konten penuh dengan 4 skenario panjang, `generateMetadata` khusus, canonical + hreflang, dan entri sitemap — **nol tautan masuk**.

`/fees` adalah tabel gaji untuk rekrutmen tanpa pintu masuk — padahal beranda punya **banner rekrutmen staf khusus** (`page.tsx:457`) yang justru mengarah ke `#contact`.

**Drift dokumentasi:** komentar di `copy.ts:815–818` menyatakan ketiga halaman legal itu *"masih ditautkan dari teks terms"*. **Salah dua kali:** `/compensation` dan `/quasi-mandate` tidak ditautkan dari mana pun, dan `/cancellation-policy` ditautkan dari **tokushoho**, bukan terms.

### D.2 Semua CTA "daftar/pesan" mendarat di halaman informasi

| Lokasi | Tujuan sebenarnya | Ada mekanisme di sana? |
|---|---|---|
| `page.tsx:72` hero primer | `/service-flow` | Tidak ada form |
| `page.tsx:78` hero sekunder | `/pricing` | Tidak ada form |
| `page.tsx:451` banner pelanggan | `#contact` | Nomor telepon |
| `page.tsx:459` banner staf | `#contact` (**sama**) | Nomor telepon |
| `page.tsx:492` di dalam seksi Kontak | `/service-flow` | — |
| `service-flow:49` | `/pricing` | Tidak ada form |
| `use-case:88` | `/pricing` | Tidak ada form |

**Nol `<form>`, `<input>`, `<textarea>`, `<select>` di seluruh basis kode.** Satu-satunya jalur konversi adalah `tel:0120-001-224`. Tidak ada rute kontak sama sekali — `#contact` hanyalah anchor di beranda.

**Rekomendasi (tanpa mengubah kata):** ubah **tujuan**-nya, bukan labelnya. Minimal: `"Contact us"` di `page.tsx:492` diarahkan ke `tel:` atau ke `#contact`, bukan ke `/service-flow`.

### D.3 Duplikasi konten antar rute

**a) Alur — duplikasi verbatim.** `home.flow.steps` dan `serviceFlow.steps` berisi 4 langkah dengan `title` + `body` **byte-identical di kedua bahasa**:

| Langkah | `home.flow` | `serviceFlow` |
|---|---|---|
| ご登録 / Registration | `copy.ts:494` | `copy.ts:691` |
| ご予約の確定 | `copy.ts:503` | `copy.ts:698` |
| サービス開始 | `copy.ts:512` | `copy.ts:705` |
| 終了ご報告 | `copy.ts:521` | `copy.ts:712` |

Headingnya juga identik (`copy.ts:487` === `copy.ts:681`). Dan **rendering-nya juga diduplikasi** — beranda menulis timeline-nya sendiri (`page.tsx:405–440`) alih-alih memakai `StepFlow`.

**b) Harga — angka sama, format berbeda.**

| Fakta | Beranda | `/pricing` | `/fees` |
|---|---|---|---|
| Care siang | headline **`3,400円`** (48px, belum pajak); `3,740円` kecil di bawah | headline **`¥3,740`** (36px) | `¥3,740` |
| Nursing siang | headline **`6,000円`**; `6,600円` kecil | **`¥6,600`** | `¥6,600` |
| Tarif malam | **tidak ada sama sekali** | `¥4,488` / `¥7,920` | `¥4,488` / `¥7,920` |
| Format mata uang | `円` (suffix, JA-native) | `¥` prefix — **bahkan dalam bahasa Jepang** (`formatYen`, `pricing.ts:14`) | `¥` prefix |

Pengunjung yang membaca beranda melihat "3,400" sebagai angka utama, lalu menemukan "¥3,740" sebagai angka utama di `/pricing`. **Kursus yang sama terlihat punya dua harga.** Ini keputusan *angka mana yang jadi headline* dan *format apa yang dipakai* — bukan keputusan kata.

Enam angka juga diduplikasi sebagai literal di dua tempat `pricing.ts` (`:62` vs `:147`, `:88` vs `:168`, `:94` vs `:174`, `:69` vs `:153`, `:75` vs `:157`) — bisa berbeda diam-diam.

**c) Foto dipakai untuk dua makna berbeda.** `/images/use-case-1..4.webp` dipakai di beranda untuk **4 kategori layanan** (`page.tsx:271`) dan di `/use-case` untuk **4 skenario hidup** (`use-case:57`). Alt text-nya berbeda untuk file yang sama — misalnya `use-case-1.webp`: `"ご自宅で高齢女性に寄り添う介護スタッフ"` (beranda) vs `"退院後にご自宅で休む高齢男性に付き添うスタッフ"` (use-case). **Salah satunya pasti tidak menggambarkan foto yang sebenarnya** — masalah aksesibilitas, bukan sekadar wording.

### D.4 Landmark navigasi tidak diberi label

- **2 `<nav>` per halaman, keduanya tanpa `aria-label`** (`Navbar.tsx:254`/`:286`, `Footer.tsx:25`). Pembaca layar mengumumkan "navigation" dua kali tanpa pembeda. `TableOfContents.tsx:53` **sudah** punya label — jadi polanya sudah ada, tinggal diterapkan.
- `Footer.tsx:42` — daftar tautan legal **tidak dibungkus `<nav>`**, tidak konsisten dengan menu utama di `:25`.
- `LegalDocPage.tsx:159` `<aside>` tanpa label.
- `global-not-found.tsx:26–56` — **tidak ada `header`, `nav`, `main`, atau `footer` sama sekali**; konten langsung di `<body>`.

### D.5 "You are here" hilang di beranda

`Navbar.tsx:166–168` menghitung `activeHref = pathname + "#" + activeSectionId` ketika sebuah seksi aktif. Efeknya: begitu `#service-details` masuk ke pita deteksi, pil **"ホーム / Home" kehilangan state aktifnya** — dan tidak ada indikator "Anda di sini" sama sekali.

Terkait: `Navbar.tsx:267` memakai `aria-current="page"` untuk target hash. Pil mengumumkan "halaman saat ini" padahal pengguna hanya menggulir melewati sebuah seksi. `TableOfContents.tsx:66` memakai `aria-current="location"` — nilai yang benar untuk kasus ini.

### D.6 Tidak ada skip-link

Elemen fokusabel pertama adalah logo. **8 tautan chrome** harus dilewati dengan Tab sebelum mencapai konten, di setiap halaman. `<main>` juga tidak punya `id`.

### D.7 TOC bukan tautan sungguhan

`TableOfContents.tsx:63` memakai `<button onClick>` + `window.scrollTo`, bukan `<a href="#id">`. Konsekuensinya: tidak bisa klik-tengah, tidak bisa salin tautan, tidak ada target keyboard yang terlihat.

Anchor-nya juga `sec-${i}` dari **indeks blok per bahasa** (`LegalDocPage.tsx:137,109`) — jadi `/ja/privacy#sec-42` dan `/en/privacy#sec-42` menunjuk ke seksi berbeda. **Deep link tidak portabel antar bahasa.**

### D.8 Halaman 404 membuang bahasa pengguna

`global-not-found.tsx:48` menautkan ke **`/ja` yang di-hardcode**. Pengunjung EN yang kena 404 dilempar ke bahasa Jepang, tanpa navbar/footer/toggle bahasa untuk kembali.

---

## E. Konversi & CTA

### E.1 Dua belas gaya tombol; empat di antaranya aksi primer yang sama

| Varian | Lokasi | Padding | Ukuran | Berat | Ekstra |
|---|---|---|---|---|---|
| A1 | `page.tsx:73` (hero) | `px-8 py-3` | 16px | `font-medium` | `shadow-lg shadow-primary/20` |
| A2 | `page.tsx:493`, `use-case:89`, `error:39`, `not-found:50` | `px-8 py-3` | 16px | `font-medium` | tanpa shadow |
| A3 | `service-flow:50` | `px-8 py-4` | **18px** | **`font-bold`** | — |
| A4 | `Navbar.tsx:229` | `px-6 py-2.5` | **14px** | `font-medium` | `min-h-11 min-w-36` |

Tombol yang secara tekstual sama ("料金を見る / View pricing") tampil 14px di navbar dan 16px di hero. "Book a free consultation" tampil 16px di beranda dan 18px bold di `/service-flow`.

Ditambah: outline (`page.tsx:79`), banner (`ApplyBanner`), pil nav **2 gaya berbeda** antara Navbar dan Footer (tint hover `/60` vs penuh), toggle bahasa, hamburger, item TOC.

### E.2 Kontras teks tombol — akar masalahnya di token, bukan di komponen

| Pasangan | Rasio | Dipakai di | Ambang | Status |
|---|---|---|---|---|
| Putih di `--color-primary` #2b7ec1 | **4,32:1** | CTA navbar 14px, hero 16px, kontak 16px, use-case 16px, error, 404 | 4,5 | ❌ |
| Putih di `--color-primary-mid` #4a7fb5 | **4,20:1** | **state hover semua tombol primer** | 4,5 | ❌ |
| Putih di `--color-accent` #c94f7c | **4,29:1** | badge kursus, banner | 4,5 | ❌ |
| `--color-primary` di `--color-primary-light` | **3,85:1** | **pil nav aktif** 14px | 4,5 | ❌ |
| `--color-primary` di `--color-bg` | **4,18:1** | CTA outline hero; **tautan inline dokumen legal** | 4,5 | ❌ |
| `--color-accent` di `--color-accent-light` | **3,82:1** | label jadwal contoh penggunaan | 4,5 | ❌ |

**Akarnya satu:** `--color-primary` dan `--color-accent` dua-duanya duduk di ~4,3:1 terhadap putih. Keduanya **tidak pernah** lolos AA untuk teks normal.

Yang penting dicatat: perbaikan sesi-sesi sebelumnya yang menaikkan teks ke **18px bold** **tetap gagal** — ambang teks besar adalah **18,66px** bold, jadi 18px meleset 0,66px. Ini berlaku untuk:
- `service-flow:50` CTA — 18px bold di primary = **4,32:1, gagal**
- `page.tsx:163` badge nursing — 18px bold di accent = **4,29:1, gagal**
- `page.tsx:226` badge care — 18px bold di primary = **4,32:1, gagal**
- `CourseRateCard.tsx:51,58` label — 18px bold muted = **2,84:1, gagal**

Yang **lolos** justru yang sudah dinaikkan ke 20px+: pil highlight `/pricing` (20px bold ✅), eyebrow ApplyBanner (20px ✅), label ApplyBanner (24/30px ✅), nama kursus `CourseRateCard:46` (24px ✅), angka harga `:63` (36px ✅), numeral `StepFlow:42` (24px ✅).

**Rekomendasi konkret — perbaiki di token, bukan dengan menaikkan ukuran terus:**

| Token baru | Nilai | Rasio di putih |
|---|---|---|
| `--color-primary-text` | **`#20679f`** | ≈**5,9:1** ✅ |
| `--color-accent-text` | **`#b03c67`** | ≈**5,4:1** ✅ |
| `--color-primary-mid` (hover) | `#4a7fb5` → **`#356d9e`** | 4,20 → **5,4:1** ✅ |

Warna asli tetap dipakai sebagai **fill** (latar tombol dengan teks besar, aksen dekoratif); varian gelap dipakai saat warna itu menjadi **teks**.

### E.3 `--color-muted` gagal di 20 dari 20 penggunaan

Tidak ada satu pun yang lolos, di ukuran mana pun.

| Konteks | Rasio | Lokasi |
|---|---|---|
| Catatan ISMS di kartu kontak | **2,53:1** ← terburuk di situs | `page.tsx:519` (12px di primary-light) |
| taxNote kursus nursing | **2,61:1** | `page.tsx:175,182` (18px di accent-light/60) |
| taxNote kursus care | **2,68:1** | `page.tsx:237` (18px di primary-light/50) |
| Label jadwal, hours | **2,75:1** | `page.tsx:331,351,358` (18px, sebagian **bold**) |
| Tautan legal footer, copyright | **2,84:1** | `Footer.tsx:47,58` (12px) |
| Label `CourseRateCard` | **2,84:1** | `:51,58` (18px bold) |
| Catatan `/pricing`, `/fees` | **2,84:1** | `pricing:99`, `fees:48,118` |
| `ClockIcon` (grafis) | **2,75:1** | `page.tsx:743` — gagal juga WCAG 1.4.11 (butuh 3:1) |

**Rekomendasi:** gelapkan `--color-muted` dari `#8a9bb0` ke sekitar **`#5f7183`** (≈5,2:1 di putih).

### E.4 Kontras di header transparan — kegagalan "teks di atas foto" yang sebenarnya

Kabar baik: **teks hero di atas foto LULUS.** Scrim di `page.tsx:43–45` bekerja. Diukur di pita tempat copy berada: h1 antara **13,23:1 dan 12,56:1**, body **7,97:1–7,56:1**, kasus terburuk (5% piksel tergelap) heading masih **6,36:1**.

Kegagalannya ada di tempat lain — **bar header yang tembus pandang**. `Navbar.tsx:194–198` memakai `bg-surface/45` saat diam dan `/65` saat mengecil, dengan piksel hero di belakangnya:

| Overlay | LangToggle muted 12px | Pil nav 14px | Telepon 24px | Pemisah "/" |
|---|---|---|---|---|
| `bg-surface/45` (diam) | **2,01:1** ❌ | 6,37:1 ✅ | 10,58:1 ✅ | **1,10:1** ❌ |
| `bg-surface/65` (mengecil) | **2,29:1** ❌ | 7,26:1 ✅ | 12,05:1 ✅ | **1,04:1** ❌ |

`LangToggle.tsx:46` — pemisah `"/"` memakai `text-border` `#d8e4f0`: **1,29:1 di putih, 1,04:1 di atas header yang tergulir.** Ini teks nyata dan tidak `aria-hidden`.

`LangToggle.tsx:38` — border `#d8e4f0` di putih = **1,29:1**, dan itu **satu-satunya batas visual kontrol ini** → gagal WCAG 1.4.11 (butuh 3:1).

### E.5 Label "STEP" 8px

`page.tsx:422–423` — `text-[8px]` putih dengan `opacity-80` → efektif `#d5e5f3` di primary = **3,36:1**. Ukuran 8px, kontras 3,36:1, dan teksnya literal `"STEP"` dalam bahasa Inggris di halaman Jepang. Tiga masalah dalam satu elemen 8 piksel.

---

## F. Aksesibilitas

### F.1 Nol indikator fokus — temuan paling serius

Diverifikasi dua cara:
- `grep -rE "focus:|focus-visible|outline" app components` → **0 kecocokan**
- Pemindaian semua stylesheet runtime → **`focusRuleCount: 0`**

Tidak ada juga yang *menghapus* outline (preflight Tailwind v4 hanya menyetel `:-moz-focusring`), jadi cincin bawaan browser masih ada. Tapi 22 kelompok kontrol — logo, telepon, toggle bahasa ×3, CTA ×8, pil nav ×8, hamburger, tombol TOC (hingga 11 per halaman legal), tombol reset error, tautan inline legal — semuanya bergantung penuh pada default UA.

Untuk audiens lansia — yang paling mungkin bernavigasi dengan keyboard — ini kegagalan paling langsung terasa di seluruh dokumen ini.

Yang memperburuk: pil nav aktif memakai `bg-primary-light` (biru sangat muda); cincin fokus default Chrome di atas latar itu nyaris tidak terlihat.

**Masalah tambahan (WCAG 2.4.11 Focus Not Obscured):** header `sticky top-0 z-50` setinggi 81/130px. Tab mundur ke konten di bawahnya akan menempatkan cincin fokus **di belakang header**. `scroll-mt-36` hanya mengompensasi lompatan hash, bukan fokus.

### F.2 Target sentuh di bawah 44px

| Elemen | Tinggi | Lokasi | Kurang |
|---|---|---|---|
| **Item menu mobile ×4** | **20px** | `Navbar.tsx:297` — tanpa padding | −24px |
| **Tautan legal footer ×4** | **16px** | `Footer.tsx:47` — `text-xs` tanpa padding | −28px |
| **Toggle EN/JP di footer** | **26px** | `Footer.tsx:59` — dirender **tanpa** `HIT_AREA` | −18px |
| **Pil nav footer ×4** | **32px** | `Footer.tsx:32` — tanpa `HIT_AREA` | −12px |
| **Tombol TOC** (hingga 11/halaman) | **33,9px** | `TableOfContents.tsx:67` | −10px |
| **Telepon di seksi kontak** | **36px** | `page.tsx:485` | −8px |
| **Tautan inline dokumen legal** | **30,6px** | `LegalDocPage.tsx:32` | −13px |
| **Logo saat header mengecil** | **42,1px** | `Navbar.tsx:218` `scale-[0.78]` | −2px |
| Pil nav navbar | 32px visual | `Navbar.tsx:268` | ✅ ditambal `HIT_AREA` |
| Toggle EN/JP navbar | 26px visual | `Navbar.tsx:226,237` | ✅ ditambal `HIT_AREA` |

Perhatikan asimetrinya: `LangToggle` yang **sama persis** mendapat area sentuh 44px di navbar tetapi **tidak** di footer. Bug ini didokumentasikan di komentar komponennya sendiri (`LangToggle.tsx:8–10`) tapi tidak pernah diperbaiki. Pola yang sama berlaku untuk pil nav: navbar ditambal, kembarannya di footer tidak.

### F.3 Menu mobile tidak memenuhi pola dialog

Diuji langsung dengan membuka menu dan membaca state:

| Perilaku | Hasil |
|---|---|
| Kunci scroll body | ❌ `body.overflow` = `visible` |
| Pindahkan fokus ke panel | ❌ `activeElement` tetap `BODY` |
| Perangkap fokus | ❌ tidak ada |
| Tutup dengan Escape | ❌ tidak ada handler `keydown` |
| Kembalikan fokus ke tombol | ❌ tidak ada ref |
| `inert`/`aria-hidden` di belakang | ❌ `grep inert` → 0 |
| `aria-controls` di tombol | ❌ panel tidak punya `id` |
| Tutup saat klik di luar / ganti rute | ❌ tidak ada |
| `aria-expanded` | ✅ `:242` |
| Tutup saat klik tautan | ✅ `:293`, `:309` |

Catatan struktural: panel dirender **di dalam** shell header `sticky` yang tingginya `h-[81px]`, tanpa `max-height` dan tanpa `overflow-y`. Di viewport pendek, menu yang lebih panjang tidak punya cara untuk digulir.

Terkait: `LangToggle` mobile (`:237`) berada **di luar** menu. Kalau menu terbuka lalu pengguna ganti bahasa, `router.push` berjalan tapi `open` tetap `true`.

### F.4 Hierarki heading & semantik

| Halaman | Outline | Verdict |
|---|---|---|
| `/[lang]` | h1 → h2 → h3 → h2 → h3 → h2 → h3 → h2 → h3 → h2 | ✅ |
| `/pricing`, `/fees`, `/use-case`, `/company`, 6 legal | h1 → h2 | ✅ |
| **`/service-flow`** | h1 (`:39`) → **h3** (`StepFlow.tsx:46`) | ❌ **Lompat h1 → h3** |
| `error.tsx` | h1 (JA) + **h2** (EN) | ❌ Heading EN adalah *saudara terjemahan*, bukan subseksi |
| `global-not-found.tsx` | h1 (JA) + **h2** (EN) | ❌ Sama |

Lainnya:
- **`page.tsx:114–129`** — sembilan item "お困りごと" adalah `<div class="grid">` berisi `<div>`, bukan `<ul>`. Kumpulan homogen tanpa semantik daftar; jumlahnya tidak diumumkan.
- **`fees/page.tsx:30–62`** — `<th>` tanpa `scope`; ada **`<th>` kosong**; header baris ditulis sebagai `<td>`, bukan `<th scope="row">`; tanpa `<caption>`. Bandingkan dengan tabel legal (`LegalDocPage.tsx:79`) yang memakai `scope="col"` dengan benar.
- **`LegalDocPage.tsx:78`** — `.table-wrap` `tabIndex={0}` (bagus untuk scroll keyboard) tapi **tanpa `role="region"` dan tanpa nama aksesibel** → titik Tab tanpa nama.
- **`Footer.tsx:13–19`** — logo footer punya alt bermakna tapi **bukan tautan**; seharusnya `alt=""`.
- **`Navbar.tsx:206–221`** — `<Link>` dan `<Image>` di dalamnya memakai string yang sama, jadi nama tautan jadi "Care 24 Japan logo", bukan "Home".
- **`page.tsx:513`** — alt badge ISO di-hardcode dalam **bahasa Jepang**, disajikan ke pembaca EN di dalam `<html lang="en">`.
- **`LangToggle.tsx:41`** — WCAG 2.5.3 *Label in Name*: teks terlihat `EN / JP`, nama aksesibel `"Switch to English"`. Tidak ada kata yang sama. Perintah suara "klik EN JP" tidak akan bekerja. Selain itu string aria selalu dalam bahasa **berlawanan** dengan `<html lang>` tanpa atribut `lang`, jadi pembaca layar salah lafal.
- **`ui.menuToggleLabel`** statis "メニュー"/"Menu" — tidak pernah mencerminkan buka/tutup.

### F.5 Yang sudah benar di lapisan semantik

- Tepat satu `h1` per halaman di semua rute ✅
- **Semua 12 SVG dekoratif `aria-hidden="true"` — tanpa satu pun kelewat** ✅
- `<dl>`/`<dt>`/`<dd>` dipakai benar di `/company`, `CourseRateCard`, dan tabel biaya beranda ✅
- Landmark `header`/`nav`/`main`/`footer` lengkap di `AppShell` ✅
- `aria-current="page"` di pil nav aktif; `aria-current="location"` di TOC ✅
- Blok telepon punya `aria-label` gabungan catatan + nomor ✅
- **Tidak ada satu pun afordans hover-only** — nol tooltip, nol `group-hover:block`. Semua hover hanya perubahan warna/transform ✅
- Semua tautan eksternal punya `rel="noopener noreferrer"` bersyarat ✅

Fondasi semantiknya kuat. Kegagalannya ada di lapisan **interaksi** (fokus, target sentuh, dialog), bukan struktur.

### F.6 Reduced motion — satu kebocoran yang benar-benar penting

`globals.css:244–250` menonaktifkan `animation` untuk semua elemen → seluruh 23 `animate-fade-up` terlindungi ✅. `Navbar.tsx:22–23` memakai `motion-safe:` untuk seluruh transisi header — sumber gerak terbesar di situs, **sudah ditangani** ✅. `ApplyBanner` memakai `motion-reduce:transition-none` ✅.

Yang masih berjalan:

| Prioritas | Item | Sifat |
|---|---|---|
| **TINGGI** | `TableOfContents.tsx:44` — `window.scrollTo({ behavior: "smooth" })` | **Tidak bisa dihentikan CSS apa pun.** Setiap klik entri TOC di 6 halaman legal menghasilkan smooth-scroll satu halaman penuh, terlepas dari preferensi pengguna. `grep matchMedia` → **0 kecocokan**. Ini pemicu vertigo vestibular yang paling sering dilaporkan. |
| **SEDANG** | `TableOfContents.tsx:73` — `transition-all duration-300` pada `h-0 → h-6` | **Gerak geometris nyata** — pil indikator *tumbuh* dari 0 ke 24px setiap kali item aktif berubah karena scroll. Dipicu scroll, bukan hover, jadi berulang terus selama membaca. |
| RENDAH | 15 `transition` polos (tombol, pil nav, tautan footer, toggle bahasa) + `TableOfContents:67,78` | Hanya perubahan warna — dampak rendah, bisa diterima |

### F.7 Satu-satunya teks yang bisa terpotong diam-diam

`Navbar.tsx:147` — kotak klip `overflow-hidden` + `max-h-5` (20px) membungkus catatan telepon yang `whitespace-nowrap` (`:151`). Catatan JA ≈261px, EN ≈258px, dalam kotak 288px → sisa **~27px**. Mode gagalnya senyap: kalau catatan melebar, teks **terpotong, bukan membungkus**, dan baris kedua juga akan terpotong.

---

## G. Motion, Aset & Performa

### G.1 Empat irama stagger dalam satu situs

| Increment | Lokasi |
|---|---|
| 60ms | `page.tsx:119` |
| 80ms + offset 120ms | `page.tsx:91` — satu-satunya yang punya offset dasar |
| 100ms | `page.tsx:315`, `:412`, `:690`; `use-case:52`; `StepFlow:32` |
| 120ms | `page.tsx:268`, `:186` |

Tiga dari empat di halaman yang sama. `page.tsx:186` juga satu-satunya yang memakai sintaks `[animation-delay:120ms]`; sisanya `style` inline. **Rekomendasi:** kunci **100ms** — sudah dipakai di 6 dari 9 tempat.

### G.2 Durasi transisi

15 `transition` polos memakai default 150ms; `ApplyBanner` dan Navbar 200ms; indikator TOC 300ms. Tiga irama untuk situs dengan `MOTION_INTENSITY: 3`.

### G.3 Aset gambar

| Aset | Sumber | Dirender | Masalah |
|---|---|---|---|
| `hero.webp` | **800×764**, 29 KB | **1440×770** desktop | ❌ Upscale **1,8×** (3,6× efektif retina). Gambar LCP setiap kunjungan pertama. Butuh sumber ≥2560px. |
| `logo.png` | **5600×2101**, **407 KB** | 144×54 | ⚠️ 38× lebih besar dari kebutuhan. Next.js meresize saat serve → tidak berdampak runtime, tapi membebani repo dan waktu build. |
| `logo.svg` | **542 KB** | **tidak pernah dirujuk** | ⚠️ SVG 542 KB hampir pasti berisi raster tertanam. Hapus. |
| `hero.jpg`, `use-case-1..4.jpg` | ~200 KB total | **tidak pernah dirujuk** | ⚠️ Semua kode memakai kembaran `.webp`. Aset yatim. |
| `use-case-*.webp` | 40–127 KB | ✅ | ✅ `loading="lazy"` aktif |

### G.4 Yang sudah benar

- `priority` + `fetchPriority="high"` + `sizes="100vw"` di hero ✅
- `loading="lazy"` otomatis di semua gambar bawah lipatan ✅
- Kotak logo lebar/tinggi tetap (`h-16 w-40`, `h-16 w-16`) → nol CLS ✅
- Header memakai `IntersectionObserver` + sentinel, bukan listener scroll — nol biaya per frame ✅ **implementasi yang sangat baik**
- Font via `next/font` ✅

Catatan tidak konsisten: `TableOfContents.tsx:35` justru memakai **listener `scroll`** dan menjalankan `getBoundingClientRect()` untuk setiap item di setiap frame — persis pendekatan yang `Navbar.tsx:33–38` tolak secara eksplisit dengan alasan yang ditulis di komentarnya sendiri.

---

## H. Kode Mati & Drift

### H.1 Ekspor yang tidak pernah dipakai

| Ekspor | Lokasi | Catatan |
|---|---|---|
| `TabPanel` + `type Tab` | `components/ui/TabPanel.tsx` | 97 baris, implementasi WAI-ARIA tabs lengkap dengan roving tabindex. **Nol import.** Docstring-nya masih mengklaim *"satu-satunya komponen interaktif di app"* — salah tiga kali (`Navbar`, `LangToggle`, `TableOfContents` semuanya client component) sekaligus salah karena dirinya sendiri tidak dipakai. |
| `auth` (33 baris, ~17 pasang string) | `copy.ts:75–108` | Kosakata modal login/register lengkap untuk fitur yang **tidak ada**. |
| `staffPricing` | `copy.ts:723–735` | `hero.body` dan `note`-nya **byte-identical** dengan `pricing.hero.body`/`pricing.note`. Blok copy tergantikan yang tertinggal. |
| `ui.tabSwitchLabel` | `copy.ts:68` | Mati bersama `TabPanel`. |

### H.2 Kunci copy yang tidak pernah dirender

| Kunci | Lokasi | Catatan |
|---|---|---|
| `home.values.heading` | `copy.ts:152` | Judul untuk trust strip — strip-nya tampil tanpa judul |
| `home.values.items[].body` ×3 | `copy.ts:156–173` | 6 string; `page.tsx:104` hanya membaca `.title` |
| `home.examples.hoursLabel` | `copy.ts:364` | `servicesLabel` dan `scheduleLabel` **dirender**, yang ini tidak — satu dari tiga label hilang |
| `home.contact.hours` | `copy.ts:556–559` | **`[wording — di luar lingkup]`** Isinya "【受付時間】平日 9:00〜18:00", bertentangan dengan heading "24時間365日" di atasnya. Dicatat sebagai informasi; keputusan bisnis, bukan keputusan UI. |
| `home.flow.steps[].icon` ×4 | `copy.ts:491–518` | Tidak pernah dibaca. Komentar di `page.tsx:401–403` masih menjanjikan *"ikon line-art mengambang di kanan"* — ikonnya dihapus, datanya dan komentarnya tertinggal |
| `footer.legal.en` | `copy.ts:825` | `Footer.tsx:58` **meng-hardcode `footer.legal.ja`**, melewati `t()` sepenuhnya. Kedua string kebetulan identik hari ini, jadi tidak terlihat — tapi akses-nya salah dan akan bocor begitu string EN berubah. **Ini bug akses, bukan wording.** |

### H.3 Komentar kode yang faktual salah

| Lokasi | Klaim | Kenyataan |
|---|---|---|
| `copy.ts:815–818` | "/cancellation-policy, /compensation, /quasi-mandate masih ditautkan dari teks terms" | Dua tidak ditautkan dari mana pun; satu ditautkan dari **tokushoho** |
| `copy.ts:800–802` | "Halaman yang dokumennya belum dikirim menampilkan 'coming soon'" | Tidak ada string "coming soon" di mana pun; keenam dokumen legal punya konten penuh |
| `copy.ts:544` | merujuk `app/page.tsx` | File itu tidak ada; rutenya `app/[lang]/page.tsx` |
| `page.tsx:401–403` | "ikon line-art mengambang di kanan" | Ikon sudah dihapus |
| `TabPanel.tsx:9` | "satu-satunya komponen interaktif di app" | Salah, dan komponennya sendiri mati |
| `pricing/page.tsx:72` | "putih di isian ini 4,0:1" | Sebenarnya **4,29:1** |

### H.4 Drift fungsional

| Lokasi | Masalah |
|---|---|
| `page.tsx:23` | `staffHrefIsExternal` = `/^https?:\/\//.test("#contact")` → **selalu `false`**. Cabang `target="_blank"` di `:689` tidak pernah tercapai. |
| `JsonLd.tsx:38–39` | `headOffice` dan `established` dicari dari `company.rows` tapi **nilainya tidak pernah dipakai** — hanya jadi penjaga truthiness untuk literal hardcoded di `:51–58`. Komentar di `:33–37` mengklaim data *"bersumber langsung dari `company.rows`"* — bukan itu yang dilakukan kodenya. Kalau alamat diedit di `copy.ts`, JSON-LD diam-diam tetap yang lama. |
| `LegalDocPage.tsx:8,29` | Regex `\[label\]\(href\)` dengan grup href **tanpa validasi**. `javascript:` atau `//evil.com` akan diteruskan ke `localizeHref`, yang secara eksplisit meloloskan href ber-skema (`i18n.ts:44–51`). Konten ditulis in-repo jadi tidak eksploitabel sekarang, tapi tidak ada penjaga. |
| `app/[lang]/error.tsx` | Tidak ada `not-found.tsx` saudara. `notFound()` dipanggil di 13 tempat dan jatuh ke `global-not-found.tsx`, yang **melewati layout sepenuhnya** — tanpa navbar, footer, atau toggle bahasa. |
| `page.tsx:215–216` | Dua string digabung **tanpa pemisah**. EN render `outings.This course` (tanpa spasi). Pola identik di `:168` dan `:230` aman hanya karena `copy.ts:212,311` menyisipkan spasi di awal nilai. **Ini bug render, bukan pilihan kata** — perbaikannya menambahkan pemisah di JSX. |
| `CourseRateCard.tsx:28–31` | Uji "apakah baris berlabel sama?" hanya membandingkan **`row.label.ja`**. Kalau label EN berbeda sementara JA sama, kartu EN akan mencetak satu label bersama di atas dua sel berbeda. |

### H.5 Paritas i18n struktural

| Dokumen | Blok JA | Blok EN | Masalah |
|---|---|---|---|
| `privacy` | 8/10/14/37/**1 tabel** | 8/10/13/49/**0 tabel** | ❌ **Tabel alat pelacakan JA (`legal.ts:105`, 8 baris × 4 kolom) tidak punya padanan EN.** Data yang sama diratakan jadi 7 string `<li>` berpemisah pipa (`legal.ts:181–187`, mis. `"AWS \| Grasping user usage status… \| …"`). Pembaca EN mendapat tabel palsu tanpa baris header. |
| `compensation` | tabel pakai emulasi row-span (sel kosong, `legal.ts:415`) | tabel mengulang kategori penuh di setiap baris (`:446`) | ⚠️ Bentuk tabel berbeda untuk data yang sama |
| `terms`, `cancellation` | 45 / 17 | 45 / 17 | ✅ paritas |

Juga: `home.examples.cases[].schedule[].time` adalah **`string` biasa, bukan `Bilingual`** — `"9:00〜10:00"` dengan gelombang lebar-penuh JA, dirender apa adanya ke pembaca EN (`page.tsx:385`) dan di-parse dengan memecah `"〜"` (`page.tsx:15–18`). Sementara `page.tsx:356` merender `{dayStart}–{dayEnd}` dengan en-dash. **Tiga pemisah rentang berbeda di satu halaman.** *(Perbaikannya struktural — jadikan `Bilingual` atau normalkan pemisah — bukan mengubah kata.)*

### H.6 `app/sitemap.ts`

Mendaftarkan 12 rute × 2 bahasa = 24 URL. Empat di antaranya (`/use-case`, `/fees`, `/compensation`, `/quasi-mandate`) **nol tautan masuk di UI** — sitemap adalah satu-satunya jalur penemuan. Sebaliknya `/#service-details`, item nav kelas satu, tidak bisa jadi entri sitemap. Sitemap dan nav hanya berbagi 3 dari entri mereka.

---

## I. Evaluasi Heuristik (Nielsen, 10 Heuristik)

Severity: **0** tidak masalah · **1** kosmetik · **2** minor · **3** major · **4** katastrofik

| # | Heuristik | Sev | Temuan | Bukti |
|---|---|---|---|---|
| 1 | **Visibilitas status sistem** | **3** | Nol indikator fokus di seluruh situs | `focusRuleCount: 0` |
| | | **3** | Pil "Home" kehilangan state aktif begitu seksi tergulir — tidak ada "Anda di sini" | `Navbar.tsx:166–168` |
| | | 2 | Pil nav aktif ada tapi kontrasnya 3,85:1 | E.2 |
| 2 | **Kecocokan sistem ↔ dunia nyata** | **3** | "Contact us" di dalam seksi Kontak menuju `/service-flow` | `page.tsx:492` |
| | | **3** | "Register here" (pelamar kerja) mendarat di telepon konsultasi pelanggan | `copy.ts:545` |
| | | **3** | Kursus yang sama menampilkan dua harga berbeda sebagai headline | D.3b |
| | | 2 | `formatYen` memakai `¥` prefix bahkan di halaman Jepang | `pricing.ts:14` |
| 3 | **Kontrol & kebebasan pengguna** | **3** | Menu mobile tidak bisa ditutup dengan Escape maupun klik di luar | F.3 |
| | | **3** | 404 melempar pengguna EN ke `/ja` tanpa navigasi untuk kembali | `global-not-found.tsx:48` |
| | | 2 | Beranda 16,5 layar di ponsel tanpa "kembali ke atas" | 13.378px |
| | | 2 | Smooth-scroll TOC tanpa guard reduced-motion | `TableOfContents.tsx:44` |
| 4 | **Konsistensi & standar** | **3** | 12 gaya tombol; 4 untuk aksi primer yang sama | E.1 |
| | | **3** | Lantai 18px berlaku di 3 halaman, tidak di 5 lainnya | B.1 |
| | | **3** | Alur yang sama dirender dua kali, verbatim, dengan skala berbeda | D.3a |
| | | 2 | 3 ukuran H1; 3 perlakuan judul seksi di satu halaman; 3 lebar kontainer | B.3, C.1 |
| | | 2 | Pil nav navbar ditambal `HIT_AREA`, kembarannya di footer tidak | F.2 |
| | | 1 | `bg-white` vs `bg-surface` untuk warna identik | A.2 |
| 5 | **Pencegahan kesalahan** | 2 | Nol form → nol kesalahan input, tapi juga nol jalur konversi selain telepon | D.2 |
| | | 1 | Regex href dokumen legal tanpa validasi skema | H.4 |
| 6 | **Recognition over recall** | **3** | Empat halaman tidak bisa ditemukan dari UI | D.1 |
| | | 2 | `/pricing` menampilkan 4 harga tanpa penanda rekomendasi | 4 × `text-4xl` |
| | | 2 | Tarif malam hanya ada di `/pricing` dan `/fees`; beranda tidak menyebut keberadaannya | D.3b |
| 7 | **Fleksibilitas & efisiensi** | **3** | Tidak ada skip-link; 8 tautan chrome di-Tab di setiap halaman | D.6 |
| | | 2 | Dua `<nav>` tanpa `aria-label` | D.4 |
| | | 2 | Entri TOC bukan tautan sungguhan — tidak bisa klik-tengah atau salin tautan | D.7 |
| | | 2 | Deep link dokumen legal tidak portabel antar bahasa | D.7 |
| 8 | **Desain estetis & minimalis** | 2 | TOC legal 625px mendahului dokumen di ponsel | C.3.6 |
| | | 2 | Hero mobile 854px > viewport 812px | C.3.2 |
| | | 2 | Seksi contoh penggunaan kehilangan ide desainnya sepenuhnya di tablet | C.2.5 |
| | | 1 | 16 nilai `gap-*`, 13 langkah `mt-*` | A.5 |
| 9 | **Kenali & pulih dari kesalahan** | 2 | `error.tsx` dan `global-not-found.tsx` memodelkan judul EN sebagai `h2` | F.4 |
| | | 2 | `global-not-found` tanpa landmark sama sekali | D.4 |
| | | 1 | Keduanya tetap menyediakan jalan pulang ✅ | — |
| 10 | **Bantuan & dokumentasi** | **3** | 4 dari 8 halaman utama berakhir tanpa langkah berikutnya | D.1 |
| | | 2 | `DESIGN_SYSTEM.md` menggambarkan situs yang sudah tidak ada | A.1 |

**Rekap severity:** **15 major (3)** · 17 minor (2) · 5 kosmetik (1). Tidak ada yang katastrofik — situs berfungsi, tidak ada yang rusak. Masalahnya **akumulasi gesekan**, bukan kerusakan.

---

## J. Prioritas Perbaikan

Tidak ada yang menyentuh wording.

### Tahap 1 — Aksesibilitas & konversi (dampak tertinggi, upaya rendah)

| # | Tindakan | File | Estimasi |
|---|---|---|---|
| 1 | Gaya `focus-visible` global (ring 2px `--color-primary` + offset 2px) | `globals.css` | 10 mnt |
| 2 | Skip-link ke `#main` + beri `id="main"` | `AppShell.tsx` | 10 mnt |
| 3 | Padding item menu mobile → ≥44px | `Navbar.tsx:297` | 5 mnt |
| 4 | Kunci scroll + Escape + kembalikan fokus + `aria-controls` di menu mobile | `Navbar.tsx` | 30 mnt |
| 5 | Oper `HIT_AREA` ke `LangToggle` footer dan pil nav footer | `Footer.tsx:32,59` | 5 mnt |
| 6 | Tautan legal footer → `text-sm` + `py-2` | `Footer.tsx:47` | 5 mnt |
| 7 | **Tautkan 4 halaman yatim** — minimal `/use-case` dan `/fees` ke navbar atau footer | `copy.ts` `nav`/`footerLinks` | 15 mnt |
| 8 | Tambah CTA di akhir `/pricing`, `/fees`, `/company` (pakai string `cta.*` yang sudah ada) | 3 file | 20 mnt |
| 9 | `aria-label` di dua `<nav>`; bungkus daftar legal footer dengan `<nav>` | `Navbar.tsx`, `Footer.tsx` | 5 mnt |
| 10 | `guard matchMedia` untuk smooth-scroll TOC | `TableOfContents.tsx:44` | 10 mnt |
| 11 | Arahkan `"Contact us"` ke `#contact` atau `tel:`, bukan `/service-flow` | `page.tsx:492` | 2 mnt |

### Tahap 2 — Token warna (satu perubahan, memperbaiki ~30 kegagalan kontras)

| # | Token | Dari | Ke | Efek |
|---|---|---|---|---|
| 12 | `--color-primary-text` (baru) | — | `#20679f` | 4,18 → **5,9:1** |
| 13 | `--color-accent-text` (baru) | — | `#b03c67` | 4,29 → **5,4:1** |
| 14 | `--color-muted` | `#8a9bb0` | `#5f7183` | 2,53–2,84 → **≈5,2:1** |
| 15 | `--color-primary-mid` (hover) | `#4a7fb5` | `#356d9e` | 4,20 → **5,4:1** |
| 16 | Pemisah `"/"` LangToggle: `text-border` → `text-muted`, dan border kontrol → ≥3:1 | — | — | 1,04 → lolos 1.4.11 |
| 17 | Naikkan bar header saat diam `bg-surface/45` → `/75` | `Navbar.tsx:197` | — | LangToggle 2,01 → lolos |

### Tahap 3 — Tablet

| # | Tindakan | File |
|---|---|---|
| 18 | Kartu masalah `md:grid-cols-3` → `lg:grid-cols-3` | `page.tsx:114` |
| 19 | Kartu kursus pricing `lg:grid-cols-2` → `md:grid-cols-2` | `pricing/page.tsx:89` |
| 20 | Band kursus care `lg:flex-row` → `md:flex-row` (samakan dengan `<dl>` di dalamnya) | `page.tsx:224` |
| 21 | Seksi contoh penggunaan `lg:grid-cols-*` → `md:grid-cols-*` | `page.tsx:314,318,349` |
| 22 | Sidebar TOC legal `lg:` → `md:` | `LegalDocPage.tsx:147,150,159` |
| 23 | Daftar cakupan `grid-cols-2` → `sm:grid-cols-2` (1 kolom di ponsel) | `page.tsx:279` + 3 tempat |
| 24 | Ganti `w-72` tetap di `PhoneBlock` dengan lebar responsif | `Navbar.tsx:136` |
| 25 | Kartu harga sticky: `md:` → `lg:` | `page.tsx:162` |
| 26 | Kolom label `/company` `6.5rem` → `min-content` atau tumpuk di mobile | `company/page.tsx:41` |
| 27 | Beri `min-width` pada tabel `/fees` agar `overflow-x-auto` benar-benar bekerja; pindahkan `px-7` keluar dari kontainer scroll | `fees/page.tsx:29` |

### Tahap 4 — Konsistensi

| # | Tindakan |
|---|---|
| 28 | Terapkan lantai 18px di `/use-case` (30 elemen) dan `/company` (seluruh `<dl>`) |
| 29 | Pakai `StepFlow` di beranda — hapus timeline duplikat 14px/8px |
| 30 | Beri `Section` varian ukuran untuk H1 vs H2 |
| 31 | Perbaiki lompatan heading `/service-flow` (h1 → h3) |
| 32 | Bungkus warna `page.tsx:301` dengan `<span>` seperti pola `CourseRateCard.tsx:41–44` |
| 33 | Ubah 9 kartu masalah jadi `<ul>`/`<li>` |
| 34 | Perbaiki semantik tabel `/fees` (`scope`, `<th scope="row">`, `<caption>`) |
| 35 | Beri `role="region"` + nama pada `.table-wrap` |
| 36 | Kunci skala radius; audit 41 kemunculan |
| 37 | Konsolidasi 12 gaya tombol jadi 3 (primer / sekunder / banner) |
| 38 | Satukan 7 offset header jadi satu token `--header-offset` |
| 39 | Kunci stagger di 100ms |
| 40 | Perluas guard reduced-motion ke indikator TOC (`transition-all` tinggi) |
| 41 | `bg-white` → `bg-surface` (4 tempat); 3 `rgba()` literal → `color-mix()` dari token |
| 42 | Perbaiki `footer.legal.ja` → `t(footer.legal, lang)` |
| 43 | Tambahkan pemisah di `page.tsx:215–216` (bug `outings.This`) |
| 44 | Jadikan `schedule[].time` `Bilingual`, atau normalkan pemisah rentang `〜` vs `–` |
| 45 | `CourseRateCard.tsx:28–31` bandingkan JA **dan** EN |

### Tahap 5 — Aset, kode mati & dokumen

| # | Tindakan |
|---|---|
| 46 | Ganti `hero.webp` dengan sumber ≥2560px |
| 47 | Kecilkan `logo.png` (5600 → 1200px); hapus `logo.svg` (542 KB, tidak dirujuk) |
| 48 | Hapus 5 `.jpg` yatim di `public/images` |
| 49 | Hapus `components/ui/TabPanel.tsx` + `ui.tabSwitchLabel` |
| 50 | Hapus `auth` (33 baris) dan `staffPricing` dari `copy.ts` |
| 51 | Hapus `home.flow.steps[].icon` dan komentar usang `page.tsx:401–403` |
| 52 | Perbaiki 6 komentar kode yang faktual salah (H.3) |
| 53 | Perbaiki `JsonLd.tsx:38–39` agar benar-benar memakai nilai dari `company.rows` |
| 54 | Tambahkan validasi skema pada regex href `LegalDocPage.tsx:8` |
| 55 | Jadikan anchor TOC stabil antar bahasa (slug dari teks, bukan indeks blok) |
| 56 | Beri tabel EN pada `privacy` agar setara dengan versi JA |
| 57 | Tulis ulang `DESIGN_SYSTEM.md` dari kode nyata, atau hapus |
| 58 | Putuskan tujuan banner "登録はこちらから" — atau tampilkan satu banner saja sampai URL tersedia |

### Di luar lingkup (dicatat, tidak direkomendasikan)

- **`[wording]`** `home.contact.hours` ("平日 9:00〜18:00") bertentangan dengan heading "24時間365日". Keputusan bisnis.
- **`[wording]`** Label nav EN "How to Use Our Services" vs h1 halaman "How it works"; "Usage Fees" vs "Pricing for users".
- **`[wording]`** Alt text badge ISO dalam bahasa Jepang untuk pembaca EN — *tapi ini juga bug aksesibilitas; kalau diizinkan, cukup pindahkan ke `Bilingual` tanpa mengubah kata Jepangnya.*
- **`[wording]`** Alt text foto `use-case-1..4` berbeda di beranda vs `/use-case` — salah satu tidak menggambarkan fotonya. *Ini juga bug a11y.*

---

## K. Yang Sudah Benar — Jangan Diubah

1. **Nol overflow horizontal** di 3 viewport × 2 bahasa × 12 rute. Kerja teliti.
2. **Header sticky dua tier** — shell tinggi tetap dengan bar menyusut di dalamnya, `IntersectionObserver` + sentinel alih-alih listener scroll. Implementasi terbaik di basis kode ini.
3. **Struktur semantik** — satu `h1` per halaman, `aria-current` benar, **12 dari 12 SVG dekoratif `aria-hidden` tanpa satu pun kelewat**, `<dl>` dipakai benar, semua `alt` deskriptif.
4. **Nol afordans hover-only.** Tidak ada informasi yang hanya muncul saat hover. Ini sering gagal di situs lain.
5. **Arsitektur i18n** — `t()` konsisten, `Bilingual` type-safe, `hreflang` lengkap di semua `generateMetadata`.
6. **Reduced-motion di header** — `motion-safe:` menutup sumber gerak terbesar di situs dengan benar.
7. **Konten legal aman** — dirender sebagai elemen React dari AST bertipe, bukan `dangerouslySetInnerHTML`. React meng-escape semuanya. **Desain yang tepat.**
8. **Tipografi dokumen legal** (`globals.css:66–241`) — relasional, `text-wrap: pretty`, `hyphens: auto` khusus EN, penanda daftar berwarna merek, zebra pada tabel. Bagian tipografi terbaik di situs.
9. **Penanganan tabel legal** — `.table-wrap` + `min-width: 30rem` + `tabIndex={0}`. Trade-off yang tepat untuk ponsel, dan justru pola inilah yang perlu ditiru `/fees`.
10. **Teks hero di atas foto LULUS** — scrim tiga lapis bekerja; kasus terburuk masih 6,36:1.
11. **`/pricing`, `/fees`, `/service-flow`** — bersih, disiplin, nol teks di bawah 18px. **Ketiganya adalah standar yang seharusnya diikuti sisa situs**, bukan sebaliknya.
12. **`dvh` bukan `vh`** untuk tinggi hero.
13. **Komentar kode** — hampir setiap keputusan tidak biasa dijelaskan alasannya. Jarang, dan sangat membantu audit ini. (Enam di antaranya sudah usang — lihat H.3 — yang justru menunjukkan betapa kode ini biasanya dijaga.)

---

*Tidak ada file sumber yang diubah dalam pembuatan laporan ini. Seluruh angka diukur atau dihitung pada 13 Agustus 2026.*
