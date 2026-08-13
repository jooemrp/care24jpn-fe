# copy-proposals — draft teks untuk FASE 4 (F-04, F-05, F-06, F-10, F-13, F-16, F-20, F-21, F-22)

Sub-task: `draft-copy-proposals` · run `2026-08-12-seo-aeo-fix` · 2026-08-12

## Status dokumen

**Ini draft, bukan implementasi.** Tidak ada satu pun file di `marketing-web/` yang disentuh oleh
sub-task ini. Semua teks di bawah harus ditinjau klien (dan idealnya penutur asli JA yang paham
istilah layanan care) sebelum masuk ke `constants/copy.ts` / `constants/legal.ts`.

## Aturan yang dipakai saat menulis

1. **Nol klaim baru.** Setiap angka, nama, tanggal, dan kualifikasi di draft ini sudah ada di
   `constants/copy.ts`, `constants/legal.ts`, atau `constants/pricing.ts`. Setiap blok mencantumkan
   `Fakta sumber:` dengan `file:baris`. Kalau sebuah kalimat butuh fakta yang tidak ada di codebase,
   fakta itu **tidak diisi** — ditandai `[BUTUH DATA DARI KLIEN: …]` dan diringkas lagi di bagian
   akhir dokumen.
2. **Tone mengikuti copy yang sudah ada:** 丁寧語 (〜です／〜ます／〜いたします), sapaan
   お客様・ご利用者様・ケアサポーター, catatan dengan 「※」, tanpa superlatif tanpa dasar. Tidak
   memakai gaya marketing agresif ("業界No.1", "圧倒的", "選ばれ続けて") karena tidak ada satu pun
   pola seperti itu di copy existing.
3. **Baris yang dikutip sebagai "Teks saat ini" sudah diverifikasi terhadap file live per 2026-08-12**
   (nomor baris di `SEO-AEO-AUDIT.md` sebagian sudah bergeser karena sub-task lain di run ini;
   yang dipakai di dokumen ini adalah nomor baris aktual saat ini).
4. **Catatan penamaan brand:** codebase memakai dua bentuk — `Care 24 Japan` (dengan spasi) di
   `constants/copy.ts:23` dan `Care24Japan` (tanpa spasi) di dokumen legal
   (`constants/legal.ts:260`, `263`, `361`, `404`, `408`). Draft di bawah memakai `Care 24 Japan`
   untuk halaman marketing dan `Care24Japan` bila mengutip konteks legal, serta menuliskan
   `Care 24 Japan（Care24Japan）` **satu kali** di `/company` agar kedua bentuk terikat sebagai satu
   entitas. Keputusan final bentuk kanonik → klien.

---

## Ringkasan fakta yang dipakai berulang (rujukan cepat)

| Fakta | Nilai | Sumber |
|---|---|---|
| Nama brand | Care 24 Japan | `constants/copy.ts:23` |
| Nama platform di dokumen legal | Care24Japan | `constants/legal.ts:260,263,361,404,408` |
| Perusahaan pengoperasi | メディカルインフォマティクス株式会社 | `constants/copy.ts:858`, `constants/legal.ts:209` |
| Sifat layanan | 医療保険や介護保険を利用しない介護・看護のご支援サービス／保険外在宅支援マッチングプラットフォーム | `constants/copy.ts:133`, `constants/legal.ts:263,408` |
| 介護コース 基本料金（9:00〜18:00） | ¥3,740／時間（税込） | `constants/pricing.ts:239-241` |
| 介護コース 夜間（18:00〜9:00） | ¥4,488／時間（税込） | `constants/pricing.ts:244-247` |
| 看護コース 基本料金（9:00〜18:00） | ¥6,600／時間（税込） | `constants/pricing.ts:267-269` |
| 看護コース 夜間（18:00〜9:00） | ¥7,920／時間（税込） | `constants/pricing.ts:272-275` |
| 指名料 | ¥330／時間（税込）／定期の方は無料 | `constants/pricing.ts:251-252`, `constants/copy.ts:241-242` |
| 交通費 | ¥990（税込） | `constants/pricing.ts:256-257`, `constants/copy.ts:246` |
| 最低利用時間 | 2時間から | `constants/copy.ts:237`, `796` |
| 入会金・登録料 | 無料 | `constants/copy.ts:792`, `773` |
| ケアサポーター報酬（介護） | ¥2,000／時間（日中）・¥2,200／時間（夜間） | `constants/pricing.ts:156,163` |
| ケアサポーター報酬（看護） | ¥3,300／時間（日中）・¥3,630／時間（夜間） | `constants/pricing.ts:188,195` |
| キャンセル料 | 3日前15:00以降50%／前々日15:00以降75%／前日15:00以降100%／それ以前は無料 | `constants/legal.ts:367-368` |
| 支払い方法 | クレジットカード決済または口座振込 | `constants/legal.ts:219` |
| 4ステップの流れ | ご登録→ご予約の確定→サービス開始→終了ご報告 | `constants/copy.ts:703-732` |
| 会社設立・資本金 | 2002年10月18日／1億円 | `constants/copy.ts:875,879` |
| 本社所在地 | 〒100-0005 東京都千代田区丸の内二丁目1番1号 明治生命館4階 | `constants/copy.ts:865-866` |
| ISMS | ISO27001取得（メディカルインフォマティクス株式会社） | `constants/copy.ts:577` |

---

### [F-04] Klarifikasi audiens `/fees` (calon ケアサポーター) vs `/pricing` (calon ご利用者様)

**Lokasi saat ini:**
`constants/copy.ts:757-767` (`actionPlan.hero` → H1 & body `/fees`) ·
`app/fees/layout.tsx:5-9` (title & description `/fees`) ·
`constants/copy.ts:782-789` (`pricing.hero` → H1 & body `/pricing`)

**Teks saat ini:**

- `/fees` H1 (`copy.ts:760`): 「ケアサポーターの時給・給与体系」
- `/fees` body (`copy.ts:764`): 「1時間単価・税込み表記です。」
- `/fees` title (`app/fees/layout.tsx:6`, sesudah sub-task fix-metadata): 「ケアサポーターの時給・報酬体系一覧」（+ template 「| Care 24 Japan」）
- `/pricing` H1 (`copy.ts:784`): 「ご利用者様向け料金」
- `/pricing` body (`copy.ts:786`): 「わかりやすい料金体系で、安心してご利用いただけます。すべて税込価格です。」

**Usulan teks baru (JA):**

**(a) `/fees` — H1 (`actionPlan.hero.heading.ja`)**

> ケアサポーター向け 時給・報酬体系（お仕事をお探しの方へ）

**(b) `/fees` — body / paragraf pembuka (`actionPlan.hero.body.ja`)**

> このページは、Care 24 Japan にケアサポーターとしてご登録いただく方向けの、時給・報酬体系のご案内です。介護業務の報酬は1時間あたり2,000円（9:00〜18:00）、18:00〜9:00の時間帯は2,200円、看護業務は1時間あたり3,300円（9:00〜18:00）、18:00〜9:00の時間帯は3,630円で、いずれも税込表記です。このほかに指名手当1時間あたり330円と交通費990円をお支払いします。ご登録料は無料です。
> **※サービスをご利用になるお客様の料金をお探しの方は、「ご利用者様向け料金」ページをご覧ください。**

**(c) `/fees` — metadata title & description (`app/fees/layout.tsx:6-8`)**

> title: `ケアサポーター向け 時給・報酬体系（お仕事をお探しの方へ）`
> description: `Care 24 Japan にケアサポーターとしてご登録いただく方向けの時給・報酬体系。介護業務は1時間2,000円、看護業務は1時間3,300円（いずれも9:00〜18:00・税込）。ご利用者様向けの料金は料金ページをご覧ください。`

**(d) `/pricing` — kalimat penghubung ke `/fees` (tambahan di bawah tabel, dekat `pricing.note`, `copy.ts:800-803`)**

> ※このページは、サービスをご利用になるお客様向けの料金表です。ケアサポーターとしてお仕事をお探しの方は、「ケアサポーター向け 時給・報酬体系」ページをご覧ください。

**Terjemahan EN (referensi, bukan untuk dipakai langsung — versi EN situs ini perlu ditulis terpisah kalau usulan ini di-apply):**

> (a) Hourly Pay & Remuneration for Care Supporters (for those looking for work)
> (b) This page explains the hourly pay and remuneration structure for those registering with Care 24 Japan as a care supporter. Caregiving work is paid ¥2,000 per hour (9:00–18:00) and ¥2,200 per hour between 18:00 and 9:00; nursing work is paid ¥3,300 per hour (9:00–18:00) and ¥3,630 per hour between 18:00 and 9:00. All figures include tax. A nomination allowance of ¥330 per hour and a transport allowance of ¥990 are paid in addition. Registration is free. *If you are looking for the prices customers pay, please see the "Pricing for users" page.*
> (d) *This page lists the prices paid by customers using the service. If you are looking for work as a care supporter, please see the "Hourly Pay & Remuneration for Care Supporters" page.*

**Fakta sumber:**
`constants/pricing.ts:156` (介護 supporter ¥2,000) · `:163` (¥2,200) · `:188` (看護 supporter ¥3,300) ·
`:195` (¥3,630) · `constants/legal.ts:418` (指名手当 ¥330/時間) · `:419` (交通費 ¥990/訪問) ·
`constants/copy.ts:773` (「登録料は無料です」) · `:769-770` (kolom お客様／ケアサポーター) ·
`:784` (nama halaman 「ご利用者様向け料金」) · `:554` (「お仕事を希望される方」 — dasar tekstual bahwa
`/fees` memang untuk calon pekerja).

**Kenapa ini memperbaiki F-04:** H1, body, dan title `/fees` sekarang menyebut audiensnya secara
eksplisit di kalimat pertama, sehingga retrieval leksikal atas query "Care24 料金/費用" tidak lagi
menemukan halaman yang angka menonjolnya ¥2,000 tanpa penanda bahwa itu upah pekerja. Dua kalimat
penghubung timbal-balik memberi crawler dan pembaca jalur eksplisit ke halaman yang benar, dan
menegaskan bahwa `/pricing` adalah sumber tunggal harga pelanggan.

> **Catatan implementasi (bukan copy):** setelah (a)–(d) di-apply, `/fees` tetap menampilkan kolom
> 「お客様」 (¥3,740 dst.) dari `supporterRates`. Itu boleh tetap ada — konteksnya kini jelas — tetapi
> kalau tim ingin memutus kanibalisasi sepenuhnya, keputusan menghapus kolom お客様 dari `/fees`
> adalah **keputusan produk untuk klien**, bukan keputusan copywriting. Draft ini tidak mengasumsikan
> penghapusan itu.

---

### [F-05] Satu paragraf harga yang bisa dikutip utuh (brand + layanan + harga + unit + pajak)

**Lokasi saat ini:**
`app/pricing/page.tsx:21-24` (hero body `/pricing`, sumber `constants/copy.ts:785-788`) ·
cerminan homepage: `app/page.tsx:206-233` + `constants/copy.ts:226-248`

**Teks saat ini:**

- `/pricing` (`copy.ts:786`): 「わかりやすい料金体系で、安心してご利用いただけます。すべて税込価格です。」 — nol angka.
- Homepage: harga terpecah ke enam `<span>` (`copy.ts:226-232`: label／hours／amount「3,400円」／unit「/時間」／taxNote「税抜」／taxIncluded「税込価格 3,740円」) — tidak pernah menjadi kalimat.

**Usulan teks baru (JA) — paragraf penuh untuk `/pricing`, ditempatkan tepat di bawah H1 dan di atas tabel:**

> Care 24 Japan（運営：メディカルインフォマティクス株式会社）は、医療保険・介護保険を利用しない保険外の在宅介護・訪問看護サービスで、介護コースの基本料金は1時間あたり3,740円（税込）、看護コースの基本料金は1時間あたり6,600円（税込）です。いずれも9:00〜18:00の料金で、18:00〜9:00の時間帯は介護コースが1時間あたり4,488円、看護コースが1時間あたり7,920円（いずれも税込）となります。ご利用は2時間からで、入会金・登録料はいただきません。このほかに、指名料が1時間あたり330円、交通費が1回990円（いずれも税込）別途かかります。

**Cerminan pendek untuk seksi harga homepage (1 kalimat, ditempatkan sebagai paragraf di atas chip harga):**

> Care 24 Japan は、医療保険・介護保険を利用しない保険外の在宅介護・訪問看護サービスで、介護コースの基本料金は1時間あたり3,740円（税込・9:00〜18:00）、看護コースは1時間あたり6,600円（税込・9:00〜18:00）、最低2時間からご利用いただけます。

**Terjemahan EN (referensi, bukan untuk dipakai langsung):**

> Care 24 Japan (operated by MedicalInformatics Co., Ltd.) is a non-insurance in-home caregiving and visiting-nursing service: the caregiving course costs ¥3,740 per hour (tax included) and the nursing course ¥6,600 per hour (tax included). Both rates apply from 9:00 to 18:00; between 18:00 and 9:00 the caregiving course is ¥4,488 per hour and the nursing course ¥7,920 per hour (tax included). Bookings start from 2 hours, and there is no membership or registration fee. A nomination fee of ¥330 per hour and a transport fee of ¥990 per visit apply separately (tax included).

**Fakta sumber:**
`constants/copy.ts:23` (brand) · `:858` (perusahaan pengoperasi) · `:133` (「医療保険や介護保険を利用しない、介護・看護のご支援サービス」) ·
`constants/legal.ts:408` (「保険外訪問看護・訪問介護マッチングプラットフォーム」 — dasar istilah 保険外) ·
`constants/pricing.ts:239-241` (¥3,740 · 9:00〜18:00) · `:244-247` (¥4,488 · 18:00〜9:00) ·
`:267-269` (¥6,600) · `:272-275` (¥7,920) · `:251-252` (指名料 ¥330) · `:256-257` (交通費 ¥990) ·
`constants/copy.ts:796` (「最低利用2時間から」) · `:792` (「入会金・登録料無料」) ·
`constants/pricing.ts:229-231` (komentar: seluruh `courseRates` adalah **tax-included**).

**Kenapa ini memperbaiki F-05:** kalimat pertama sendirian sudah memuat kelima unsur (nama brand,
jenis layanan, angka, unit per jam, status pajak), sehingga tetap bisa dikutip walau chunker
memotong sesudah kalimat itu. Tabel tidak diubah sama sekali; ini murni penambahan permukaan
tekstual di posisi paling sering diambil (paragraf pertama di bawah H1).

> **Catatan konsistensi pajak (F-04 langkah 3):** homepage saat ini menonjolkan angka **税抜**
> (「3,400円」 besar, `copy.ts:229`) sementara `constants/pricing.ts` hanya menyimpan angka **税込**.
> Draft di atas seluruhnya memakai 税込 sesuai rekomendasi audit. Kalau usulan ini di-apply,
> `copy.ts:226-232` (dan padanannya di 看護コース `copy.ts:323-331`, 「6,000円」税抜／「6,600円」税込)
> perlu diseragamkan ke 税込 sebagai angka utama — itu **perubahan tampilan angka**, jadi harus
> dikonfirmasi klien, bukan diputuskan di sini.

---

### [F-06] "Care24" satu-satunya di halaman non-legal justru merujuk entitas lain

**Lokasi saat ini:**
`constants/copy.ts:895-900` (`company.rows` → baris 「グループ企業」, dirender di `app/company/page.tsx:19-21`) ·
`app/company/page.tsx:11-24` (halaman `/company` langsung `<dl>`, tanpa paragraf pembuka)

**Teks saat ini:**

- `copy.ts:898`: 「Aegis Care Advisors Pvt.ltd (Care24)、PT. SIPS Edutech Indonesia、EvoCare Japan株式会社」
- `/company` tidak punya kalimat pembuka apa pun; H2/H1 「運営会社」 langsung diikuti daftar `<dl>`.

**Usulan teks baru (JA):**

**(a) Paragraf pembuka `/company`, tepat di bawah judul halaman:**

> Care 24 Japan（サービス名称：Care24Japan）は、メディカルインフォマティクス株式会社が運営する、医療保険・介護保険を利用しない保険外の在宅介護・訪問看護マッチングサービスです。同社は2002年10月18日に設立され、資本金は1億円、本社は東京都千代田区丸の内二丁目1番1号 明治生命館4階にあります。情報セキュリティマネジメントシステム（ISMS）の国際規格「ISO27001」を取得しています。

**(b) Perbaikan baris 「グループ企業」 (`company.rows` value, `copy.ts:897-899`):**

> Aegis Care Advisors Pvt.ltd（グループ企業。同社の呼称「Care24」は、本サービス「Care 24 Japan」を運営するメディカルインフォマティクス株式会社とは別の法人を指します）、PT. SIPS Edutech Indonesia、EvoCare Japan株式会社

**(c) Penyebutan brand di body copy halaman utama** — sudah tercakup di draft F-05 (paragraf
`/pricing` dan cerminan homepage) dan F-10 (paragraf hero homepage). Ketiganya menyebut
「Care 24 Japan」 berdampingan dengan jenis layanan dan angka harga, yang saat ini nol.

**Terjemahan EN (referensi, bukan untuk dipakai langsung):**

> (a) Care 24 Japan (service name: Care24Japan) is a non-insurance in-home caregiving and visiting-nursing matching service operated by MedicalInformatics Co., Ltd. The company was established on October 18, 2002, has capital of ¥100 million, and its head office is at Meiji Seimei Building 4F, 2-1-1 Marunouchi, Chiyoda-ku, Tokyo. It holds ISO27001, the international standard for information security management systems (ISMS).
> (b) Aegis Care Advisors Pvt. Ltd. (a group company; its designation "Care24" refers to a separate legal entity from MedicalInformatics Co., Ltd., which operates this "Care 24 Japan" service), PT. SIPS Edutech Indonesia, EvoCare Japan Co., Ltd.

**Fakta sumber:**
`constants/copy.ts:23` (「Care 24 Japan」) · `:858` (商号 メディカルインフォマティクス株式会社) ·
`:865-866` (本社) · `:875` (設立 2002年10月18日) · `:879` (資本金 1億円) · `:577` (ISO27001／ISMS) ·
`:898` (daftar グループ企業 apa adanya) · `constants/legal.ts:263` (「Care24Japan」 dioperasikan oleh
メディカルインフォマティクス株式会社, definisi 保険外在宅支援マッチングプラットフォーム) · `:209` (提供事業者名 di tokushoho).

**Kenapa ini memperbaiki F-06:** kemunculan pertama "Care 24 Japan" di `/company` kini berada di
kalimat yang mengikatnya ke entitas operasi Jepang, bukan ke Aegis. Kurung penjelas di baris
グループ企業 memutus pembacaan "(Care24)" sebagai alias diri sendiri. Perhatikan: draft **tidak**
menyebut negara asal Aegis — codebase tidak pernah menyatakannya, jadi klaim itu tidak dibuat.

---

### [F-10] Paragraf answer-first 40-60 kata di bawah judul, 5 halaman non-legal

**Lokasi saat ini:**
`app/page.tsx:49-55` (hero) & `app/page.tsx` seksi problems (`constants/copy.ts:194-198`) ·
`app/pricing/page.tsx:21-24` · `app/fees/page.tsx:67-70` · `app/service-flow/page.tsx:14-17` ·
`app/company/page.tsx:11-24`

**Teks saat ini:** kelima posisi paragraf-pertama diisi slogan atau langsung melompat ke widget —
`copy.ts:137` 「介護保険の「できない」を、家族の「当たり前」に変えていく。」 (hero, 1 kalimat slogan),
`copy.ts:196` 「このようなお困りごとはありませんか？」 (langsung 9 bullet),
`copy.ts:786` (13 kata tanpa angka), `copy.ts:764` 「1時間単価・税込み表記です。」 (6 kata),
`copy.ts:699` 「ご登録からサービス終了まで、4つのステップで進みます。」 (paling dekat lolos),
`/company` nol paragraf.

**Usulan teks baru (JA):**

**(a) Homepage — di bawah H1 (`copy.ts:132-135`), slogan `copy.ts:136-139` tetap dipertahankan di bawahnya:**

> Care 24 Japan は、医療保険・介護保険を利用しない保険外の在宅介護・訪問看護サービスです。国家資格を持つ介護福祉士・看護師が、ご自宅・病院・施設でのお世話から、通院や外出の付き添いまでをお引き受けします。介護コースは1時間あたり3,740円（税込・9:00〜18:00）、看護コースは1時間あたり6,600円（税込・9:00〜18:00）、ご利用は2時間からです。

**(b) Homepage — seksi 「お困りごと」, paragraf jawaban sebelum 9 bullet (judul lihat F-16/F-22):**

> 次のようなご相談は、介護保険や医療保険の給付では対応が難しく、保険外のサービスをご利用いただく必要があります。Care 24 Japan では、見守り・家事・話し相手・買い物や通院の付き添いなどを、介護コース1時間あたり3,740円（税込・9:00〜18:00）、最低2時間からお引き受けしています。

**(c) `/pricing`** — lihat draft F-05 (paragraf penuh). Tidak diulang di sini.

**(d) `/fees`** — lihat draft F-04 (b). Tidak diulang di sini.

**(e) `/service-flow` — memperluas `serviceFlow.hero.body` (`copy.ts:698-701`):**

> Care 24 Japan のご利用は、「ご登録」「ご予約の確定」「サービス開始」「終了ご報告」の4つのステップで進みます。まず会員登録をしていただき、ケアサポーターのマッチングができ次第、メールやLINE等でご予約確定のご連絡を差し上げます。ご予約の日時にケアサポーターがご自宅へお伺いし、サービス終了後はご報告レポートをお送りします。ご利用は2時間からで、入会金・登録料はいただきません。

**(f) `/company`** — lihat draft F-06 (a). Tidak diulang di sini.

**Terjemahan EN (referensi, bukan untuk dipakai langsung):**

> (a) Care 24 Japan is a non-insurance in-home caregiving and visiting-nursing service. Nationally certified care workers and nurses provide support at home, in hospital, and in care facilities, as well as accompaniment to medical appointments and outings. The caregiving course is ¥3,740 per hour (tax included, 9:00–18:00) and the nursing course ¥6,600 per hour (tax included, 9:00–18:00), with bookings from 2 hours.
> (b) The requests below are difficult to cover under long-term care or medical insurance benefits, and require a non-insurance service. Care 24 Japan handles supervision, housework, companionship, shopping, and accompaniment to appointments from ¥3,740 per hour (caregiving course, tax included, 9:00–18:00), with a 2-hour minimum.
> (e) Using Care 24 Japan involves four steps: registration, reservation confirmation, service start, and the completion report. After you register, we notify you by email or LINE once a care supporter has been matched. The care supporter visits your home at the reserved date and time, and sends a report after the service ends. Bookings start from 2 hours, with no membership or registration fee.

**Fakta sumber:**
`constants/copy.ts:168` (「国家資格を持つ介護福祉士・看護師」) · `:251-313` (cakupan ご自宅内の介護／家事／病院・施設内／通院・外出の付き添い) ·
`:214` (「介護保険では対応できない介護・生活支援」) · `:200-209` (9 item お困りごと: 見守り・家事・話し相手・買い物・通院付き添い) ·
`:703-732` (4 langkah + isi tiap langkah, termasuk 「メール・LINE等」 di `:714` dan ご報告レポート di `:728`) ·
`:237` (2時間から) · `:792` (入会金・登録料無料) · `constants/pricing.ts:241` (¥3,740) · `:269` (¥6,600).

**Kenapa ini memperbaiki F-10:** posisi paragraf-pertama di lima halaman kini ditempati proposisi
faktual yang bisa dinilai benar/salah dan berdiri sendiri sebagai jawaban, bukan slogan. Slogan
tidak dihapus — hanya turun satu posisi, sehingga suara merek tetap utuh.

---

### [F-13] Blok FAQ — 9 pasang tanya-jawab, semua jawaban terlacak ke angka yang sudah ada

**Lokasi saat ini:** tidak ada. Grep 「よくある質問」 / "FAQ" di `constants/copy.ts` (897 baris) dan
`constants/legal.ts` (530 baris) = kosong.

**Teks saat ini:** —

**Usulan teks baru (JA):**

**Judul seksi:** 「よくあるご質問」（EN: Frequently asked questions）
Ditempatkan di `/pricing` (Q1–Q7) dan, versi ringkas 3 pertanyaan pertama, di homepage.
Q9 ditempatkan di `/fees`.

---

**Q1.** 訪問介護・訪問看護の料金は1時間いくらですか？

> Care 24 Japan の介護コースは1時間あたり3,740円（税込）、看護コースは1時間あたり6,600円（税込）です。いずれも9:00〜18:00の基本料金で、18:00〜9:00の時間帯は介護コースが4,488円、看護コースが7,920円（いずれも1時間あたり・税込）になります。
> — 出典: `constants/pricing.ts:241,247,269,275`

**Q2.** 最低何時間から利用できますか？

> ご利用は2時間からお申し込みいただけます。入会金・登録料はいただきません。
> — 出典: `constants/copy.ts:237,792,796`

**Q3.** 介護保険は使えますか？

> Care 24 Japan は、医療保険・介護保険を利用しない保険外のサービスです。そのため料金は全額自己負担となりますが、保険の給付では対応が難しい見守り・家事・話し相手・買い物や外出の付き添いなども、内容を限定せずご依頼いただけます。
> — 出典: `constants/copy.ts:133,214`, `constants/legal.ts:263,408`

**Q4.** 料金のほかに、指名料や交通費はかかりますか？

> 基本料金のほかに、指名料が1時間あたり330円（税込）、交通費が1回990円（税込）かかります。なお、定期的にご利用のお客様は指名料が無料です。
> — 出典: `constants/pricing.ts:252,257`, `constants/copy.ts:241-242,246`

**Q5.** 予約をキャンセルした場合、キャンセル料はかかりますか？

> ご予約日の3日前の15:00より前にお申し出いただいた場合、キャンセル料はかかりません。3日前の15:00以降は予約料金の50％、前々日の15:00以降は75％、前日の15:00以降は100％のキャンセル料を申し受けます。指名予約のキャンセルでは、基本料金のキャンセル料が50％または75％の場合でも、指名手数料（1時間あたり330円）は全額が加算されます。事前にキャンセルされた場合、交通費990円は発生しません。当社またはケアサポーターの都合でご提供できなくなった場合は、キャンセル料は一切いただきません。
> — 出典: `constants/legal.ts:367-368,374,376,378`

**Q6.** たん吸引や経管栄養などの医療的なケアもお願いできますか？

> 看護コースでご対応いたします。看護師・准看護師などの有効な国家資格を持つケアサポーターが、バイタル測定・健康状態の管理、医療処置（たん吸引や経管栄養）、お薬の管理・相談、終末期ケア・緩和ケア、医療機関との連携などを行います。医療行為は、主治医が発行した有効な「訪問看護指示書」の記載内容および指示の範囲内に限って実施します。看護コースの基本料金は1時間あたり6,600円（税込・9:00〜18:00）です。
> — 出典: `constants/copy.ts:342-367`, `constants/legal.ts:276-278`, `constants/pricing.ts:269`

**Q7.** 支払い方法を教えてください。

> クレジットカード決済または口座振込のうち、お客様がお選びになった方法でお支払いいただけます。クレジットカード決済の場合は、ご予約成立時に決済が行われます。口座振込の場合は、当社指定の期日までにお振込みいただき、入金確認をもってご予約成立となります。なお、銀行振込をご利用の場合、振込手数料はお客様のご負担となります。
> — 出典: `constants/legal.ts:219,222,224-225`

**Q8.** 申し込みから当日までの流れを教えてください。

> 「ご登録」「ご予約の確定」「サービス開始」「終了ご報告」の4つのステップで進みます。会員登録をしていただいたあと、ケアサポーターのマッチングができ次第、メールやLINE等でご予約確定のご連絡を差し上げます。ご予約の日時にケアサポーターがご自宅へお伺いし、サービス終了後にご報告レポートをお送りして終了となります。
> — 出典: `constants/copy.ts:703-732`

**Q9.**（`/fees` 用）ケアサポーターとして働く場合、時給はいくらですか？

> 介護業務は1時間あたり2,000円（9:00〜18:00）、18:00〜9:00の時間帯は2,200円、看護業務は1時間あたり3,300円（9:00〜18:00）、18:00〜9:00の時間帯は3,630円です（いずれも税込）。このほかに、指名を受けて業務を行った場合は指名手当1時間あたり330円、交通費は1回の訪問につき一律990円をお支払いします。ご登録料は無料です。なお、ケアサポーターは独立した個人事業主として、ご利用者様との準委任契約に基づき業務を行っていただきます。
> — 出典: `constants/pricing.ts:156,163,188,195`, `constants/legal.ts:418-419`, `constants/copy.ts:773`, `constants/legal.ts:266-267,410`

---

**Terjemahan EN (referensi, bukan untuk dipakai langsung — cuplikan):**

> Q1. How much does home care / visiting nursing cost per hour? — Care 24 Japan's caregiving course is ¥3,740 per hour (tax included) and the nursing course ¥6,600 per hour (tax included). Both are the 9:00–18:00 base rates; between 18:00 and 9:00 the rates are ¥4,488 and ¥7,920 per hour respectively (tax included).
> Q5. Is there a cancellation fee? — No fee applies if you notify us before 15:00 three days prior to the reservation date. After 15:00 three days prior, 50% of the reservation fee applies; after 15:00 two days prior, 75%; after 15:00 the day before, 100%. For nomination reservations, the ¥330-per-hour nomination fee is charged in full even when the base cancellation fee is 50% or 75%. The ¥990 transport fee does not apply to advance cancellations. No cancellation fee applies if the Company or the care supporter cannot provide the service.

**Kenapa ini memperbaiki F-13:** semua pertanyaan ditulis dalam bentuk yang benar-benar diketik orang
Jepang mencari layanan ini (料金は1時間いくら／最低何時間／介護保険は使えますか／キャンセル料), dan tiap
jawaban berdiri sendiri sebagai chunk yang memuat brand atau angka. Setelah blok ini benar-benar
terlihat di halaman, `FAQPage` JSON-LD menjadi sah untuk ditambahkan — sebelum itu tidak
(lihat F-07 dan project rule di manifest).

> **Pertanyaan yang SENGAJA tidak dibuat karena datanya tidak ada di codebase:**
> - 「対応エリアはどこですか？」 — **[BUTUH DATA DARI KLIEN: daftar 対応エリア／都道府県・市区町村.
>   Codebase hanya punya alamat kantor pusat (`copy.ts:865-866`), yang bukan area layanan.]**
> - 「どのくらい前に予約が必要ですか？」 — **[BUTUH DATA DARI KLIEN: lead time pemesanan minimum.
>   `legal.ts:415` menyebut 「当日予約（緊急募集案件）」 dengan tarif ¥4,862/¥8,580, jadi same-day mungkin,
>   tapi tarif itu tidak pernah tampil di `/pricing` maupun `/fees` — perlu keputusan klien apakah
>   tier 当日予約 dipublikasikan ke pelanggan.]**
> - 「スタッフは何人いますか／どのくらいで来てもらえますか？」 — **[BUTUH DATA DARI KLIEN: jumlah staf
>   dan SLA waktu respons. Tidak ada satu pun angka staf/SLA di codebase.]**

---

### [F-16] Chunk yang bergantung pada antesenden di luar dirinya

**Lokasi saat ini:** `constants/copy.ts:196` · `constants/copy.ts:334` · `constants/copy.ts:377,382` ·
`constants/legal.ts:414` (dan pola yang sama di `constants/legal.ts:367`)

**Teks saat ini:**

- `copy.ts:196`: 「このようなお困りごとはありませんか？」 — demonstratif tanpa subjek.
- `copy.ts:334`: 「※詳しくは料金表をご覧ください。」 — merujuk 「料金表」 tanpa href di data.
- `copy.ts:377` 「ご利用事例」 / `copy.ts:382` 「1日の流れ」 — baris jadwal seperti `copy.ts:410` 「お食事サポート」 tidak menyebut kasus/layanan/penyedia.
- `legal.ts:414`: 「提供する業務区分（介護、看護、リハビリ）および時間帯等に応じたケアサポーター向け報酬単価は以下の通りとする（金額はすべて税込表示）。」 — bertumpu pada definisi 「当社」/「本サービス」 di `legal.ts:408`.

**Usulan teks baru (JA):**

**(a) `copy.ts:196` — judul seksi menyebut subjeknya:**

> ご自宅での介護・見守りについて、このようなお困りごとはありませんか？

**(b) `copy.ts:333-336` — catatan 看護コース menyebut halaman tujuannya:**

> ※看護コースの料金の詳細は、「ご利用者様向け料金」ページ（/pricing）をご覧ください。

**(c) `copy.ts:376-379` — judul seksi ご利用事例 menyebut brand dan skala:**

> Care 24 Japan のご利用事例（3時間・5時間・8時間のケース）

**(d) `copy.ts:382` — label jadwal menyebut konteksnya:**

> ご利用当日の1日の流れ

**(e) `constants/legal.ts:414` — menyisipkan ulang nama entitas di tengah dokumen (pola yang sama dianjurkan untuk `legal.ts:367`, `legal.ts:421`, `legal.ts:423`):**

> メディカルインフォマティクス株式会社が運営する「Care24Japan」において提供する業務区分（介護、看護、リハビリ）および時間帯等に応じたケアサポーター向け報酬単価は以下の通りとする（金額はすべて税込表示）。

dan untuk `legal.ts:367` (キャンセルポリシー第2条):

> 「Care24Japan」の利用者の都合により予約業務をキャンセルまたは変更する場合、予約日時を基準とした以下のタイミングに応じてキャンセル料が発生するものとする。なお、判定基準となる時刻はすべて「15:00」を区切りとする。

**Terjemahan EN (referensi, bukan untuk dipakai langsung):**

> (a) Do you have any of these concerns about caregiving or supervision at home?
> (b) *For details of the nursing course rates, please see the "Pricing for users" page (/pricing).*
> (c) Care 24 Japan usage examples (3-hour, 5-hour and 8-hour cases)
> (d) The flow of a service day
> (e) The remuneration unit prices for care supporters on "Care24Japan", operated by MedicalInformatics Co., Ltd., according to service category (caregiving, nursing, rehabilitation) and time zone, are as follows (all amounts include tax).

**Fakta sumber:**
`constants/copy.ts:200-209` (isi 9 bullet: seluruhnya soal 在宅の介護・見守り — dasar penambahan subjek di (a)) ·
`:784` (nama halaman 「ご利用者様向け料金」) · `constants/legal.ts:217` (route `/pricing` sudah dipakai sebagai
link di tokushoho, jadi target di (b) memang ada) · `constants/copy.ts:483,446,402` (3時間／5時間／8時間) ·
`:858` + `constants/legal.ts:408` (entitas + nama platform untuk (e)) · `constants/legal.ts:365` (definisi 当社／本サービス di Pasal 1 キャンセルポリシー).

**Kenapa ini memperbaiki F-16:** tiap chunk kini membawa subjeknya sendiri. Chunk berisi tabel tarif
report dari Pasal 4 報酬規程 tidak lagi menyebut 「当社」 tanpa nama, sehingga kutipan yang diambil
sendirian tidak bisa salah-atribusi ke penyedia lain.

---

### [F-20] Heading berupa penggal kalimat, bukan judul

**Lokasi saat ini:**
`constants/copy.ts:317-321` (`home.nursingCourse.leadIn`, dirender sebagai `<h2>` di `app/page.tsx:140-142`) ·
`constants/copy.ts:337-341` (`home.nursingCourse.panel.heading`, dirender sebagai `<h3>` di `app/page.tsx:171-173`) ·
pola yang sama: `constants/copy.ts:212-216` (`home.careCourse.leadIn` → `<h2>` di `app/page.tsx:191-193`)

**Teks saat ini:**

- `copy.ts:319` (h2): 「医療行為が必要な方に対しては、\n看護師の手配が可能です」 — baris pertama berakhir 「、」.
- `copy.ts:339` (h3): 「看護師の資格を保有したスタッフが医療ケアが必要な場合のケアや\nなにかあったときに安心のコースです。」 — kalimat penuh dipakai sebagai heading.
- `copy.ts:214` (h2): 「介護保険では対応できない\n介護・生活支援を一流の介護士がサポート」.

**Usulan teks baru (JA):**

**(a) `<h2>` 看護コース (`copy.ts:317-321`) — judul ringkas berdiri sendiri:**

> 医療行為が必要な方への看護コース

paragraf di bawahnya (teks yang dipindahkan dari heading, ditambah fakta yang sudah ada):

> 医療行為が必要な方には、看護師の手配が可能です。看護師の資格を持つスタッフが、医療ケアが必要な場合の対応や、なにかあったときの備えを担います。基本料金は1時間あたり6,600円（税込・9:00〜18:00）です。

**(b) `<h3>` 看護コースの内容 (`copy.ts:337-341`) — judul, bukan kalimat:**

> 看護コースでできること

**(c) `<h2>` 介護コース (`copy.ts:212-216`) — judul ringkas (sekaligus menghapus superlatif, lihat F-21):**

> 介護保険では対応できない介護・生活支援（介護コース）

paragraf di bawahnya:

> 介護保険では対応できない介護・生活支援を、国家資格を持つ介護福祉士がサポートします。基本料金は1時間あたり3,740円（税込・9:00〜18:00）、最低2時間からご利用いただけます。

**Terjemahan EN (referensi, bukan untuk dipakai langsung):**

> (a) The nursing course, for those who need medical care — *body:* For those who require medical care, we can arrange a registered nurse. Staff holding nursing qualifications handle care when medical attention is needed and provide reassurance in case of emergencies. The base rate is ¥6,600 per hour (tax included, 9:00–18:00).
> (b) What the nursing course covers
> (c) Caregiving and daily-living support that insurance cannot cover (caregiving course) — *body:* Nationally certified care workers provide the caregiving and daily-living support that long-term care insurance cannot cover. The base rate is ¥3,740 per hour (tax included, 9:00–18:00), with bookings from 2 hours.

**Fakta sumber:**
`constants/copy.ts:319` (teks asli yang dipecah) · `:339` (teks asli h3) · `:214` (teks asli h2 介護コース) ·
`:168` (「国家資格を持つ介護福祉士・看護師」 — pengganti terlacak untuk 「一流の介護士」) ·
`constants/pricing.ts:241,269` (¥3,740 / ¥6,600) · `constants/copy.ts:237` (2時間から).

**Kenapa ini memperbaiki F-20:** heading tidak lagi berakhir dengan partikel penghubung 「、」 dan
tidak lagi memecah satu kalimat menjadi dua elemen struktural. Chunker yang memotong di heading kini
mendapat label yang utuh, dan kalimat aslinya tetap utuh di dalam satu paragraf.

> **Catatan render (bukan copy):** `app/page.tsx:140` dan `:191` memakai `whitespace-pre-line`
> untuk menghormati `\n` di dalam string. Kalau usulan ini di-apply, `\n` di ketiga string itu hilang
> dan class `whitespace-pre-line` pada `<h2>` menjadi tidak diperlukan — perubahan render, bukan copy.

---

### [F-21] Klaim kabur mendominasi prosa; klaim spesifik hanya ada di tabel

**Lokasi saat ini:**
`constants/copy.ts:159,161` · `:166` · `:173,175` · `:214` · `:743` · `:786` · `:568` vs `:573`

**Teks saat ini:**

| Baris | Teks | Masalah |
|---|---|---|
| `copy.ts:159` | 「24時間の安心」 | tanpa SLA/jam |
| `copy.ts:166` | 「専門スタッフ」 | tanpa kualifikasi (padahal body `:168` sudah punya) |
| `copy.ts:173,175` | 「ご家族との連携」／「ケアの記録を共有し…」 | tanpa mekanisme konkret |
| `copy.ts:214` | 「一流の介護士」 | superlatif tanpa tolok ukur |
| `copy.ts:786` & `:743` | 「わかりやすい料金体系で、安心してご利用いただけます。」 | diulang identik di 2 tempat, nol angka |
| `copy.ts:568` vs `:573` | 「24時間365日お気軽にご相談ください」 vs 「【受付時間】平日 9:00〜18:00」 | **kontradiksi internal** |

**Usulan teks baru (JA):**

**(a) `values.items[0]` (`copy.ts:158-164`)**

> title: 夜間・早朝も対応
> body: 18:00〜9:00の時間帯もご利用いただけます。この時間帯の基本料金は、介護コースが1時間あたり4,488円、看護コースが1時間あたり7,920円（いずれも税込）です。

**(b) `values.items[1]` (`copy.ts:165-171`)**

> title: 国家資格を持つスタッフ
> body: 国家資格を持つ介護福祉士・看護師が、お一人おひとりに合わせてケアします。（body 現行のまま）

**(c) `values.items[2]` (`copy.ts:172-178`)**

> title: ご家族との連携
> body: サービス終了後、ケアサポーターからご報告レポートをお送りします。ケアの記録を共有し、ご家族と一緒に最適な暮らしを考えます。

**(d) `careCourse.leadIn` (`copy.ts:214`)** — lihat F-20 (c): 「一流の介護士」 → 「国家資格を持つ介護福祉士」.

**(e) `pricing.hero.body` (`copy.ts:786`)** — diganti paragraf F-05.
`staffPricing` (`copy.ts:739-751`) adalah **dead code** (tidak ada route `/staff-pricing`); kalimat
kembar di `:743` sebaiknya dihapus bersama blok itu, bukan ditulis ulang — itu keputusan kode, bukan copy.

**(f) Kontradiksi 受付時間** — **[BUTUH DATA DARI KLIEN: yang benar mana — 「24時間365日」
(`copy.ts:57-58`, `:568`) atau 「平日 9:00〜18:00」 (`copy.ts:573`)? Kemungkinan besar telepon
0120-001-224 diterima 24 jam sementara kantor buka hari kerja 9:00〜18:00, tapi codebase tidak
menyatakan itu, jadi draft tidak menebaknya.]** Sebelum jawaban klien masuk, jangan menambahkan
klaim ketersediaan apa pun ke paragraf answer-first mana pun.

**Terjemahan EN (referensi, bukan untuk dipakai langsung):**

> (a) Night and early-morning cover — Service is also available between 18:00 and 9:00. The base rate for that time band is ¥4,488 per hour for the caregiving course and ¥7,920 per hour for the nursing course (tax included).
> (b) Nationally certified staff — (body unchanged)
> (c) Family partnership — After the service ends, the care supporter sends you a report. We share care records and work with your family to find the best arrangement.

**Fakta sumber:**
`constants/pricing.ts:247` (¥4,488 · 18:00〜9:00) · `:275` (¥7,920) · `constants/copy.ts:168`
(kualifikasi) · `:728` / `:537` (「ご報告レポートをお送りし」) · `:175` (teks 現行 yang dipertahankan) ·
`:57-58,568,573` (kedua klaim jam yang bertabrakan).

**Kenapa ini memperbaiki F-21:** tiga judul 「選ばれる理由」 dan lead-in dua kursus berpindah dari
klaim yang tidak bisa dibuktikan salah ke fakta yang bisa dicek terhadap `constants/`. Distribusi
"100% klaim spesifik ada di tabel, 0% di prosa" pecah tanpa satu pun angka baru diciptakan.

---

### [F-22] Heading hampir tidak pernah berbentuk pertanyaan

**Lokasi saat ini:** ~10 heading utama di `/`, `/pricing`, `/service-flow`, `/company`, `/fees` —
`copy.ts:196` (satu-satunya bentuk pertanyaan, generik), `:503`/`:697` 「ご利用の流れ」,
`:784` 「ご利用者様向け料金」, `:760` 「ケアサポーターの時給・給与体系」, `:853` 「運営会社」.

**Teks saat ini:** semua label produk/proses, bukan bentuk query.

**Usulan teks baru (JA):** H1 tiap halaman **tetap** label produk (agar navigasi dan title tidak
pecah); yang diubah adalah **judul seksi (h2)** di posisi dengan maksud pencarian tertinggi.

| Halaman | Posisi | Heading baru (JA) | Paragraf di bawahnya |
|---|---|---|---|
| `/pricing` | h2 di atas tabel (`app/pricing/page.tsx:38`) | 在宅介護・訪問看護の料金は1時間いくらですか？ | paragraf F-05 |
| `/service-flow` | h2 seksi langkah | ご利用はどのような流れで進みますか？ | paragraf F-10 (e) |
| Homepage | seksi お困りごと (`copy.ts:196`) | ご自宅での介護・見守りについて、このようなお困りごとはありませんか？ | paragraf F-10 (b) |
| `/fees` | h2 di atas tabel | ケアサポーターの時給はいくらですか？ | paragraf F-04 (b) |
| `/pricing` & homepage | seksi FAQ | よくあるご質問（tiap Q sebagai h3, lihat F-13） | jawaban F-13 |

**Terjemahan EN (referensi, bukan untuk dipakai langsung):**

> How much does in-home care / visiting nursing cost per hour? · How does using the service work, step by step? · Do you have any of these concerns about caregiving or supervision at home? · How much is a care supporter paid per hour? · Frequently asked questions

**Fakta sumber:** tidak ada fakta baru — semua heading di atas hanyalah reformulasi label yang sudah
ada (`constants/copy.ts:196,697,760,784`) ke dalam bentuk pertanyaan, dan setiap paragraf di bawahnya
sudah punya sumbernya masing-masing di blok F-05/F-10/F-13/F-04 di atas.

**Kenapa ini memperbaiki F-22:** setelah perubahan ini minimal 4 heading utama berbentuk pertanyaan
(3 di antaranya berakhir 「か？」), sesuai kriteria verifikasi audit, dan tiap pertanyaan punya
kewajiban struktural untuk dijawab oleh paragraf 40-60 kata tepat di bawahnya — yang sekaligus
menutup F-10 di halaman yang sama.

---

## Daftar [BUTUH DATA DARI KLIEN] — konsolidasi

1. **[BUTUH DATA DARI KLIEN: 対応エリア]** — daftar wilayah layanan (都道府県／市区町村). Tidak ada di
   codebase; hanya ada alamat kantor pusat (`constants/copy.ts:865-866`), yang bukan area layanan.
   Memblokir FAQ 「対応エリアはどこですか？」 — pertanyaan yang hampir pasti ditanyakan.
2. **[BUTUH DATA DARI KLIEN: lead time pemesanan minimum]** — dan keputusan apakah tier
   「当日予約（緊急募集案件）」 (¥4,862 介護／¥8,580 看護, `constants/legal.ts:415`) dipublikasikan di
   `/pricing`. Saat ini tier itu hanya muncul di dokumen 報酬規程, tidak di halaman harga pelanggan.
3. **[BUTUH DATA DARI KLIEN: jumlah staf / rasio staf / SLA waktu respons]** — dibutuhkan kalau klaim
   「24時間の安心」 ingin dipertahankan dalam bentuk apa pun. Draft F-21 menggantinya dengan fakta jam
   dan tarif malam agar tidak perlu menunggu data ini.
4. **[BUTUH DATA DARI KLIEN: 受付時間 yang benar]** — kontradiksi antara 「24時間365日」
   (`constants/copy.ts:57-58`, `:568`) dan 「【受付時間】平日 9:00〜18:00」 (`constants/copy.ts:573`).
   Harus diselesaikan sebelum klaim ketersediaan mana pun dipakai di paragraf answer-first atau FAQ.
5. **[BUTUH DATA DARI KLIEN: bentuk kanonik nama brand]** — `Care 24 Japan` (marketing) vs
   `Care24Japan` (legal). Draft memakai keduanya secara sadar dan mengikatnya sekali di `/company`,
   tetapi keputusan final ada di klien (berpengaruh ke `Organization` JSON-LD di F-07).
6. **[BUTUH DATA DARI KLIEN: basis pajak yang ditonjolkan di homepage]** — homepage menampilkan 税抜
   (「3,400円」/「6,000円」, `constants/copy.ts:229,328`) sebagai angka besar, `constants/pricing.ts`
   hanya menyimpan 税込. Draft seluruhnya 税込; penyeragaman tampilan homepage butuh persetujuan klien.
7. **[BUTUH DATA DARI KLIEN: tanggal 制定 利用規約]** — placeholder 「2026年［〇］月［〇］日 制定」 masih
   kosong di `constants/legal.ts:308` (JA) dan `:356` (EN). Sesuai project rule, **tidak diisi** di sini.

## Yang TIDAK dilakukan dokumen ini

- Tidak mengedit satu pun file di `marketing-web/`.
- Tidak menulis versi EN untuk dipakai langsung — glos EN di atas hanya alat baca untuk reviewer.
  Kalau usulan ini di-apply, tiap field `Bilingual` butuh pasangan `en` yang ditulis terpisah dengan
  kualitas setara JA-nya.
- Tidak mengarang angka, tanggal, sertifikasi, jumlah staf, rating, atau testimoni.
- Tidak mengusulkan `FAQPage` JSON-LD — itu baru sah setelah blok FAQ F-13 benar-benar tampil di
  halaman (F-07 + project rule manifest).
