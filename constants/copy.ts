/**
 * Care 24 Japan — All site copy lives here.
 *
 * RULES:
 * - Japanese (`ja`) is primary; English (`en`) renders beneath as a small
 *   uppercase secondary label.
 * - Never hardcode copy inside components — import from this file.
 * - All values below are the live, client-reviewed copy. Edit here — never
 *   inline in components.
 */

export type Bilingual = {
  ja: string;
  en: string;
};

/** Brand-level strings. */
export const brand = {
  name: "Care 24 Japan",
  logoAlt: {
    ja: "ケア24ジャパン ロゴ",
    en: "Care 24 Japan logo",
  } satisfies Bilingual,
  tagline: {
    ja: "ご自宅で、心安らぐ24時間の在宅ケアを",
    en: "Premium 24-hour in-home care",
  } satisfies Bilingual,
};

/** Primary navigation links. `href` must match the App Router routes. */
export const nav: { href: string; label: Bilingual }[] = [
  { href: "/", label: { ja: "ホーム", en: "Home" } },
  { href: "/#service-details", label: { ja: "サービス内容", en: "Service Details" } },
  {
    href: "/service-flow",
    label: { ja: "ご利用の流れ", en: "How to Use Our Services" },
  },
  // Label per the client update sheet (0727), row J4: 「ご利用料金」 / "Usage Fees".
  { href: "/pricing", label: { ja: "ご利用料金", en: "Usage Fees" } },
];

/**
 * Contact number shown in the header (and reused in the footer).
 * Rendered on two lines: the number large and prominent, the note beneath.
 */
export const contactPhone = {
  display: "0120-001-224",
  tel: "0120001224",
  /**
   * Kept to a single line in both languages so the header block is the same
   * height in JA and EN — the number never moves when the language changes.
   */
  note: {
    ja: "24時間365日、お気軽にお問い合わせください。",
    en: "Contact us 24 hours a day, 365 days a year.",
  } satisfies Bilingual,
};

/** Shared call-to-action buttons reused across pages. */
export const cta = {
  primary: { ja: "無料相談を予約する", en: "Book a free consultation" } satisfies Bilingual,
  secondary: { ja: "料金を見る", en: "View pricing" } satisfies Bilingual,
  contact: { ja: "お問い合わせ", en: "Contact us" } satisfies Bilingual,
};

/**
 * Labels for non-visible UI chrome (aria-labels) that still need both
 * languages.
 *
 * `langToggleLabel` is DIRECTIONAL, not per-language: it describes the
 * language you're switching TO, not the language you're currently reading.
 * `LangToggle.tsx` renders it via `t(ui.langToggleLabel, lang)`, and `t()`
 * indexes by the CURRENT `lang` — so to reproduce the live site (JA page
 * shows "Switch to English", EN page shows "日本語に切り替える") the keys
 * are intentionally swapped: `.ja` holds the English prompt shown on the JA
 * page, `.en` holds the Japanese prompt shown on the EN page. Do not
 * "correct" this to same-language values — that would flip both aria-labels.
 */
export const ui = {
  menuToggleLabel: { ja: "メニュー", en: "Menu" } satisfies Bilingual,
  langToggleLabel: { ja: "Switch to English", en: "日本語に切り替える" } satisfies Bilingual,
  // LegalDocPage.tsx's table-of-contents heading. Verbatim from the ternary
  // it used to hold inline (`lang === "ja" ? "目次" : "Table of Contents"`).
  tocLabel: { ja: "目次", en: "Table of Contents" } satisfies Bilingual,
  /**
   * LangToggle.tsx always renders BOTH short labels side by side (one bold,
   * one muted, depending on the current `lang`) — these are not a message
   * translated per language, they are the two options' own abbreviations, so
   * they are plain strings rather than a `Bilingual` pair. `langShortJa` is
   * deliberately "JP", not "JA" — the audit flagged this as not matching the
   * `ja` locale code, but changing it would move the rendered HTML; the CMS
   * field lets the client change it later without a deploy.
   */
  langShortJa: "JP",
  langShortEn: "EN",
};

/**
 * `app/[lang]/error.tsx`'s copy — the route-segment error boundary Next
 * renders when something below `app/[lang]/layout.tsx` throws (a Server or
 * Client Component render error, not a layout failure — see that file's own
 * doc comment for why the layout is guaranteed to have already succeeded
 * whenever this renders). Verbatim from the JSX that used to hardcode this
 * per-`lang` inline; this is now both the live text AND the fallback used
 * when Atlas is unreachable.
 */
export const errorPage = {
  title: { ja: "エラーが発生しました", en: "Something went wrong" } satisfies Bilingual,
  body: {
    ja: "しばらくしてから再度お試しください。",
    en: "Please try again in a moment.",
  } satisfies Bilingual,
  retryLabel: { ja: "再試行", en: "Try again" } satisfies Bilingual,
};

/**
 * `app/global-not-found.tsx`'s copy — the 404 page. Verbatim from the JSX
 * that used to hardcode it; this is now both the seed source for the
 * `site_not_found_labels` block and the fallback when Atlas is unreachable,
 * exactly like `errorPage` above.
 *
 * `eyebrow` is NOT bilingual on purpose: "404" is the HTTP status, the same
 * three digits in both locales, and the field is non-localizable in
 * `scripts/atlas/schema.ts` to match.
 *
 * `metaDescription` is a separate field rather than being derived from
 * `title`, because the rendered heading and the `<meta name="description">`
 * differ by one character today (`…見つかりません` vs `…見つかりません。`)
 * and the EN halves are different sentences outright. Deriving one from the
 * other would silently rewrite copy this migration is supposed to preserve.
 * `global-not-found.tsx` joins the two locales with " / " — the page has no
 * `[lang]` param to choose with, same constraint the body copy has.
 */
export const notFoundPage = {
  eyebrow: "404",
  title: {
    ja: "お探しのページが見つかりません",
    en: "Page not found",
  } satisfies Bilingual,
  body: {
    ja: "このページは移動または削除された可能性があります。",
    en: "The page you are looking for may have been moved or removed.",
  } satisfies Bilingual,
  homeLabel: { ja: "トップページへ", en: "Back to home" } satisfies Bilingual,
  metaDescription: {
    ja: "お探しのページが見つかりません。",
    en: "The page you are looking for does not exist.",
  } satisfies Bilingual,
};

/* ------------------------------------------------------------------ */
/* Homepage                                                            */
/* ------------------------------------------------------------------ */

export const home = {
  hero: {
    badge: {
      ja: "完全オーダーメイドで",
      en: "Completely custom-made",
    } satisfies Bilingual,
    resolve: {
      ja: "不安やお困りごとを解消",
      en: "Resolving your anxieties and problems",
    } satisfies Bilingual,
    assist: {
      ja: "ご希望に合わせて、家事から身の回りのお世話までお手伝いします",
      en: "We will assist you with everything from housework to personal care, according to your needs.",
    } satisfies Bilingual,
    heading: {
      ja: "医療保険や介護保険を利用しない、介護・看護のご支援サービス",
      en: "Care and nursing support services that do not utilize medical insurance or long-term care insurance.",
    } satisfies Bilingual,
    body: {
      ja: "介護保険の「できない」を、家族の「当たり前」に変えていく。",
      en: 'We\'re transforming the "impossible" aspects of long-term care insurance into "normal" for families.',
    } satisfies Bilingual,
    /** Hero-only CTA labels — the shared `cta` block still drives the header. */
    ctaPrimary: {
      ja: "お申込みはこちら",
      en: "Apply here",
    } satisfies Bilingual,
    ctaSecondary: {
      ja: "まずは無料登録",
      en: "Register for free first.",
    } satisfies Bilingual,
    imageAlt: {
      ja: "窓辺で介護スタッフと穏やかに過ごす高齢の女性",
      en: "An elderly woman resting calmly by a window with a care professional",
    } satisfies Bilingual,
    // Verbatim from app/[lang]/page.tsx:98,104 — non-localizable relative
    // paths, resolved through `localizeHref()` at render time same as before.
    // The audit flagged the primary CTA's destination as mismatched with its
    // own label (お申込みはこちら points at the how-it-works page, not a
    // registration form) — moving it to the CMS is the fix; changing WHERE it
    // points is a content decision that belongs to the client, not this task.
    ctaPrimaryHref: "/service-flow",
    ctaSecondaryHref: "/pricing",
  },

  values: {
    heading: { ja: "選ばれる理由", en: "Why families choose us" } satisfies Bilingual,
    items: [
      {
        title: { ja: "24時間の安心", en: "24-hour presence" } satisfies Bilingual,
        body: {
          ja: "昼夜を問わず、必要なときにすぐ対応できる体制を整えています。",
          en: "Care available day and night, whenever it is needed.",
        } satisfies Bilingual,
      },
      {
        title: { ja: "専門スタッフ", en: "Trained professionals" } satisfies Bilingual,
        body: {
          ja: "国家資格を持つ介護福祉士・看護師が、お一人おひとりに合わせてケアします。",
          en: "Certified caregivers and nurses tailored to each individual.",
        } satisfies Bilingual,
      },
      {
        title: { ja: "ご家族との連携", en: "Family partnership" } satisfies Bilingual,
        body: {
          ja: "ケアの記録を共有し、ご家族と一緒に最適な暮らしを考えます。",
          en: "Shared care records and close communication with your family.",
        } satisfies Bilingual,
      },
    ],
  },

  problems: {
    heading: {
      ja: "このようなお困りごとはありませんか？",
      en: "Are you experiencing any of these problems?",
    } satisfies Bilingual,
    items: [
      { ja: "一人で生活しているため何かあったら不安", en: "I live alone and worry about what might happen." } satisfies Bilingual,
      { ja: "介護保険がなかなかおりない", en: "Long-term care insurance payments are often delayed." } satisfies Bilingual,
      { ja: "ショッピングや映画に外出をしたいが一人では行けないので誰か一緒に行ってほしい", en: "I want to go out but can't go alone." } satisfies Bilingual,
      { ja: "話し相手がほしい", en: "I want someone to talk to." } satisfies Bilingual,
      { ja: "家事や掃除など手伝ってほしい", en: "I need help with housework and cleaning." } satisfies Bilingual,
      { ja: "離れて暮らす親の様子が心配だが、仕事があって休み以外は見に行けない", en: "I'm worried about my parents who live far away." } satisfies Bilingual,
      { ja: "家族が不在の時に見守りをしてほしい", en: "I'd like someone to watch over them when family is away." } satisfies Bilingual,
      { ja: "施設や病院では対応できないことを個別に対応してほしい", en: "I need individual care beyond what facilities offer." } satisfies Bilingual,
      { ja: "もしもの時の対応をプロにお願いしたい", en: "I want a professional to handle emergencies." } satisfies Bilingual,
    ],
  },

  careCourse: {
    leadIn: {
      ja: "介護保険では対応できない\n介護・生活支援を一流の介護士がサポート",
      en: "Top-class caregivers support the nursing and daily-living care that long-term care insurance cannot cover.",
    } satisfies Bilingual,
    badge: { ja: "介護コース", en: "Caregiving course" } satisfies Bilingual,
    tagline: {
      ja: "介護士資格を保有したスタッフが身の回りのケアや見守り、外出の付き添いなど",
      en: "Staff members holding caregiving qualifications provide personal care, supervision, and accompany residents on outings.",
    } satisfies Bilingual,
    taglineSub: {
      ja: "幅広くサポートするコースです。",
      en: "This course provides comprehensive support.",
    } satisfies Bilingual,
    // ST-U2 Tugas 3: ¥ -> JPY for EN readers (user decision "en ya en" —
    // matches `formatYen`'s EN output on the rates table, ST-U1). Synced
    // with the same 2 fields' Atlas values (home page, home-care-course
    // block, en.price_amount / en.price_tax_included). JA amounts are
    // untouched — this is an EN-reader-facing decision only.
    price: {
      label: { ja: "日中基本料金", en: "Daytime base rate" } satisfies Bilingual,
      hours: { ja: "（9:00〜18:00）", en: " (9:00–18:00)" } satisfies Bilingual,
      amount: { ja: "3,400円", en: "JPY 3,400" } satisfies Bilingual,
      unit: { ja: "/時間", en: "/hour" } satisfies Bilingual,
      taxNote: { ja: "税抜", en: "excl. tax" } satisfies Bilingual,
      taxIncluded: { ja: "税込価格 3,740円", en: "Tax included JPY 3,740" } satisfies Bilingual,
    },
    fees: [
      {
        label: { ja: "最低利用時間", en: "Minimum usage" } satisfies Bilingual,
        value: { ja: "2時間から", en: "From 2 hours" } satisfies Bilingual,
      },
      {
        label: { ja: "指名料", en: "Nomination fee" } satisfies Bilingual,
        // ST-U2 Tugas 3: ¥ -> JPY for EN readers (user decision "en ya en"),
        // synced with the same field's Atlas value (home page,
        // home-care-course-fee block, en.value).
        value: { ja: "330円/時間", en: "JPY 330/hour" } satisfies Bilingual,
        note: { ja: "※定期の方は指名無料", en: "*Free for regular clients" } satisfies Bilingual,
      },
      {
        label: { ja: "往復交通費", en: "Round-trip transport" } satisfies Bilingual,
        value: { ja: "別途990円", en: "JPY 990 separately" } satisfies Bilingual,
      },
    ],
    cards: [
      {
        title: { ja: "ご自宅内の介護", en: "In-home caregiving" } satisfies Bilingual,
        imageAlt: {
          ja: "ご自宅で高齢女性に寄り添う介護スタッフ",
          en: "A caregiver assisting an elderly woman at home",
        } satisfies Bilingual,
        items: [
          { ja: "移動介助", en: "Mobility assistance" } satisfies Bilingual,
          { ja: "食事介助", en: "Meal assistance" } satisfies Bilingual,
          { ja: "入浴・清拭介助", en: "Bathing and wiping assistance" } satisfies Bilingual,
          { ja: "口腔ケア", en: "Oral care" } satisfies Bilingual,
          { ja: "排泄介助", en: "Toileting assistance" } satisfies Bilingual,
          { ja: "着替えのお手伝い", en: "Help with dressing" } satisfies Bilingual,
          { ja: "服薬の管理", en: "Medication management" } satisfies Bilingual,
          { ja: "ケアマネジャーとの連携", en: "Coordination with care managers" } satisfies Bilingual,
        ],
      },
      {
        title: { ja: "ご自宅内の家事", en: "In-home housework" } satisfies Bilingual,
        imageAlt: {
          ja: "ご自宅でリビングを掃除するスタッフ",
          en: "A staff member cleaning a living room at home",
        } satisfies Bilingual,
        items: [
          { ja: "掃除", en: "Cleaning" } satisfies Bilingual,
          { ja: "洗濯", en: "Laundry" } satisfies Bilingual,
          { ja: "話し相手", en: "Companionship" } satisfies Bilingual,
          { ja: "調理", en: "Cooking" } satisfies Bilingual,
          { ja: "ペットの世話", en: "Pet care" } satisfies Bilingual,
          { ja: "庭の手入れ", en: "Garden care" } satisfies Bilingual,
          { ja: "窓拭き", en: "Window cleaning" } satisfies Bilingual,
        ],
      },
      {
        title: { ja: "病院・施設内の介護", en: "Hospital and facility caregiving" } satisfies Bilingual,
        imageAlt: {
          ja: "施設で車椅子の高齢男性に寄り添う介護スタッフ",
          en: "A caregiver assisting an elderly man in a wheelchair at a facility",
        } satisfies Bilingual,
        items: [
          { ja: "日中の居室介護支援", en: "Daytime in-room care support" } satisfies Bilingual,
          { ja: "施設内外の移動介助", en: "Mobility assistance in and out of the facility" } satisfies Bilingual,
          { ja: "夜間の見守り", en: "Overnight supervision" } satisfies Bilingual,
          { ja: "話し相手", en: "Companionship" } satisfies Bilingual,
          { ja: "入浴サポート", en: "Bathing support" } satisfies Bilingual,
          { ja: "居室のお掃除", en: "Room cleaning" } satisfies Bilingual,
          { ja: "買い物代行", en: "Shopping on your behalf" } satisfies Bilingual,
        ],
      },
      {
        title: { ja: "通院・外出の付き添い", en: "Hospital-visit and outing accompaniment" } satisfies Bilingual,
        imageAlt: {
          ja: "車椅子の高齢女性の外出に付き添う介護スタッフ",
          en: "A caregiver accompanying an elderly woman in a wheelchair on an outing",
        } satisfies Bilingual,
        items: [
          { ja: "通院の行き帰りの介助", en: "Assistance to and from medical appointments" } satisfies Bilingual,
          { ja: "診察内容の聞き取り", en: "Noting down consultation details" } satisfies Bilingual,
          { ja: "薬の受け取り", en: "Picking up medication" } satisfies Bilingual,
          { ja: "お散歩", en: "Walks" } satisfies Bilingual,
          { ja: "イベントへの出席", en: "Attending events" } satisfies Bilingual,
          { ja: "買い物", en: "Shopping" } satisfies Bilingual,
        ],
      },
    ],
  },

  nursingCourse: {
    leadIn: {
      ja: "医療行為が必要な方に対しては、\n看護師の手配が可能です",
      en: "For those who require medical care, we can arrange a registered nurse.",
    } satisfies Bilingual,
    badge: { ja: "看護コース", en: "Nursing course" } satisfies Bilingual,
    // ST-U2 Tugas 3: ¥ -> JPY for EN readers (same decision as
    // careCourse.price above). Synced with Atlas (home page,
    // home-nursing-course block, en.price_amount / en.price_tax_included).
    price: {
      label: { ja: "日中基本料金", en: "Daytime base rate" } satisfies Bilingual,
      // Rendered inline after the label. JA needs no space (the bracket is
      // full-width); EN carries its own leading space.
      hours: { ja: "（9:00〜18:00）", en: " (9:00–18:00)" } satisfies Bilingual,
      amount: { ja: "6,000円", en: "JPY 6,000" } satisfies Bilingual,
      unit: { ja: "/時間", en: "/hour" } satisfies Bilingual,
      taxNote: { ja: "税抜", en: "excl. tax" } satisfies Bilingual,
      taxIncluded: { ja: "税込価格 6,600円", en: "Tax included JPY 6,600" } satisfies Bilingual,
    },
    note: {
      ja: "※詳しくは料金表をご覧ください。",
      en: "*Please see the price list for details.",
    } satisfies Bilingual,
    panel: {
      heading: {
        ja: "看護師の資格を保有したスタッフが医療ケアが必要な場合のケアや\nなにかあったときに安心のコースです。",
        en: "This course provides peace of mind, as staff with nursing qualifications will provide care when medical attention is needed and in case of any emergencies.",
      } satisfies Bilingual,
      items: [
        {
          icon: "vitals",
          label: { ja: "バイタル測定・健康状態の管理", en: "Vital checks and health monitoring" } satisfies Bilingual,
        },
        {
          icon: "procedure",
          label: { ja: "医療処置（たん吸引や経管栄養）", en: "Medical procedures (suctioning, tube feeding)" } satisfies Bilingual,
        },
        {
          icon: "medication",
          label: { ja: "お薬の管理・相談", en: "Medication management and consultation" } satisfies Bilingual,
        },
        {
          icon: "consult",
          label: { ja: "療養生活の相談・支援", en: "Recuperation guidance and support" } satisfies Bilingual,
        },
        {
          icon: "palliative",
          label: { ja: "終末期ケア・緩和ケア", en: "End-of-life and palliative care" } satisfies Bilingual,
        },
        {
          icon: "hospital",
          label: { ja: "医療機関との連携", en: "Coordination with medical institutions" } satisfies Bilingual,
        },
      ],
    },
  },

  examples: {
    leadIn: {
      ja: "お客様に合わせたプランニングが可能",
      en: "Planning tailored to each customer",
    } satisfies Bilingual,
    heading: {
      ja: "ご利用事例",
      en: "Examples of use",
    } satisfies Bilingual,
    hoursLabel: { ja: "ご利用時間", en: "Usage time" } satisfies Bilingual,
    servicesLabel: { ja: "ご利用内容", en: "Services provided" } satisfies Bilingual,
    scheduleLabel: { ja: "1日の流れ", en: "Schedule" } satisfies Bilingual,
    /** Three usage cases — JA wording is the client's official copy (Aug 2026 sheet). */
    cases: [
      {
        label: { ja: "ケース1", en: "Case 1" } satisfies Bilingual,
        tone: "primary",
        title: {
          ja: "日中の見守り中心のご利用例",
          en: "Example of use: primarily daytime monitoring",
        } satisfies Bilingual,
        request: {
          ja: "「仕事に行っている間、見守りをお願いしたい」",
          en: "“I would like you to look after them while I am at work.”",
        } satisfies Bilingual,
        services: [
          { ja: "話し相手", en: "Conversation partner" } satisfies Bilingual,
          { ja: "近隣の散歩", en: "Neighborhood walks" } satisfies Bilingual,
          { ja: "自宅の掃除", en: "House cleaning" } satisfies Bilingual,
          { ja: "買い物付き添い", en: "Shopping assistance" } satisfies Bilingual,
        ],
        hours: { ja: "8時間", en: "8 hours" } satisfies Bilingual,
        schedule: [
          {
            time: "9:00〜10:00",
            activity: { ja: "ご挨拶、お話、近隣のお散歩、休憩", en: "Greetings, conversations, walks around the neighborhood, and rest" } satisfies Bilingual,
          },
          {
            time: "10:00〜12:00",
            activity: { ja: "お食事サポート", en: "Meal support" } satisfies Bilingual,
          },
          {
            time: "12:00〜13:00",
            activity: { ja: "お掃除", en: "Cleaning" } satisfies Bilingual,
          },
          {
            time: "13:00〜14:00",
            activity: { ja: "買い物付き添い", en: "Shopping escort" } satisfies Bilingual,
          },
          {
            time: "14:00〜16:00",
            activity: { ja: "お話", en: "Conversation" } satisfies Bilingual,
          },
          {
            time: "16:00〜17:00",
            activity: { ja: "夕飯見守り", en: "Watching over dinner" } satisfies Bilingual,
          },
        ],
      },
      {
        label: { ja: "ケース2", en: "Case 2" } satisfies Bilingual,
        tone: "accent",
        title: {
          ja: "医療＋介護の見守りでのご利用例",
          en: "Example of use: medical and nursing care monitoring",
        } satisfies Bilingual,
        request: {
          ja: "「胃瘻の主人の見守り」",
          en: "“Watching over the patient with a gastrostomy tube.”",
        } satisfies Bilingual,
        services: [
          { ja: "経管栄養", en: "Tube feeding" } satisfies Bilingual,
          { ja: "見守り", en: "Monitoring" } satisfies Bilingual,
          { ja: "おむつ交換", en: "Diaper changes" } satisfies Bilingual,
        ],
        hours: { ja: "5時間", en: "5 hours" } satisfies Bilingual,
        schedule: [
          {
            time: "9:00〜10:00",
            activity: { ja: "おむつ交換・経管栄養の準備", en: "Diaper change and tube-feeding preparation" } satisfies Bilingual,
          },
          {
            time: "10:00〜12:00",
            activity: { ja: "経管栄養（胃ろう）の実施と食後の見守り", en: "Tube feeding (gastrostomy) and post-meal monitoring" } satisfies Bilingual,
          },
          {
            time: "12:00〜13:00",
            activity: { ja: "おむつ交換と見守り", en: "Diaper changing and supervision" } satisfies Bilingual,
          },
          {
            time: "13:00〜14:00",
            activity: { ja: "状態確認・記録作成とご家族への報告", en: "Condition check, record keeping, and report to family" } satisfies Bilingual,
          },
        ],
      },
      {
        label: { ja: "ケース3", en: "Case 3" } satisfies Bilingual,
        tone: "primary",
        title: {
          ja: "外出同行でのご利用例",
          en: "Example of use: accompanying someone on an outing",
        } satisfies Bilingual,
        request: {
          ja: "「病院の付き添いでバスで移動・診察の同行をしてほしい」",
          en: "“I need someone to accompany me to the hospital by bus and to the doctor's appointment.”",
        } satisfies Bilingual,
        services: [
          { ja: "着替え介助", en: "Help with changing clothes" } satisfies Bilingual,
          { ja: "歩行見守り", en: "Walking supervision" } satisfies Bilingual,
          { ja: "通院付き添い", en: "Accompaniment to appointments" } satisfies Bilingual,
          { ja: "トイレ介助", en: "Toilet assistance" } satisfies Bilingual,
        ],
        hours: { ja: "3時間", en: "3 hours" } satisfies Bilingual,
        schedule: [
          {
            time: "13:00〜14:00",
            activity: { ja: "ご挨拶、お着換え、トイレ介助", en: "Greetings, changing clothes, toilet assistance" } satisfies Bilingual,
          },
          {
            time: "14:00〜15:30",
            activity: { ja: "歩行見守り、バス乗車、診察", en: "Walking supervision, bus boarding, medical examination" } satisfies Bilingual,
          },
          {
            time: "15:30〜16:00",
            activity: { ja: "ご自宅到着、お着替え", en: "Arriving home, changing clothes" } satisfies Bilingual,
          },
        ],
      },
    ],
  },

  flow: {
    heading: { ja: "ご利用の流れ", en: "How it works" } satisfies Bilingual,
    // Verbatim from app/[lang]/page.tsx:465 — the small badge label stacked
    // above each step number. Same text in both locales today (it renders
    // unchanged regardless of `lang`), so `en` is intentionally identical to
    // `ja` rather than a placeholder.
    stepLabel: { ja: "STEP", en: "STEP" } satisfies Bilingual,
    steps: [
      {
        number: "01",
        icon: "register",
        title: { ja: "ご登録", en: "Registration" } satisfies Bilingual,
        body: {
          ja: "お客様の情報をご入力いただき、サービス利用のための会員登録を頂きます。",
          en: "Please enter your information to register as a member in order to use the service.",
        } satisfies Bilingual,
      },
      {
        number: "02",
        icon: "confirm",
        title: { ja: "ご予約の確定", en: "Confirmation of your reservation" } satisfies Bilingual,
        body: {
          ja: "ケアサポーターのマッチングができ次第、ご予約確定となりメール・LINE等でご連絡します。",
          en: "Once a care supporter has been matched with you, your reservation will be confirmed and you will be notified via email, LINE, etc.",
        } satisfies Bilingual,
      },
      {
        number: "03",
        icon: "start",
        title: { ja: "サービス開始", en: "Service Start" } satisfies Bilingual,
        body: {
          ja: "ご予約の日時にケアサポーターがご自宅へお伺いします。",
          en: "A care supporter will visit your home at the scheduled date and time.",
        } satisfies Bilingual,
      },
      {
        number: "04",
        icon: "report",
        title: { ja: "終了ご報告", en: "Completion Report" } satisfies Bilingual,
        body: {
          ja: "サービス終了後、ケアサポーターよりご報告レポートをお送りし終了となります。",
          en: "After the service is completed, the care supporter will send you a report, and the service will be finished.",
        } satisfies Bilingual,
      },
    ],
  },

  apply: {
    user: {
      eyebrow: {
        ja: "サービスをご利用されたい方",
        en: "For those who wish to use our service",
      } satisfies Bilingual,
      label: { ja: "お申込みはこちらから", en: "Apply here" } satisfies Bilingual,
      // Verbatim from app/[lang]/page.tsx:458 — the user-registration portal
      // this banner already links to.
      href: "https://portal.care24.jp/register",
    },
    staff: {
      eyebrow: {
        ja: "お仕事を希望される方",
        en: "For those seeking employment",
      } satisfies Bilingual,
      label: { ja: "登録はこちらから", en: "Register here" } satisfies Bilingual,
      // Verbatim from app/[lang]/page.tsx:465 — the caregiver-registration
      // portal this banner already links to. This fallback previously said
      // "/fees" (the wage table), which was never what the page rendered;
      // that mismatch is why `staffHrefIsExternal` (page.tsx:25) needs this
      // value to be the real, absolute portal URL to compute correctly once
      // this field is wired to the CMS. Swap for a different destination
      // only if the client's real registration URL changes.
      href: "https://portal.care24.jp/caregiver",
    },
  },

  contact: {
    leadIn: { ja: "ご相談は無料です", en: "Consultations are free of charge." } satisfies Bilingual,
    // Verbatim from app/[lang]/page.tsx:522-523 — the ＼ … ／ ornament wrapped
    // around `leadIn`, previously hardcoded JA punctuation rendered on the EN
    // locale too. Fallback `en` is deliberately identical to `ja` so today's
    // HTML does not move; the client can clear it for `en` later from the
    // dashboard without a deploy (that is the whole point of the audit's
    // finding — not a decision to change today's output).
    leadInOrnamentStart: { ja: "＼", en: "＼" } satisfies Bilingual,
    leadInOrnamentEnd: { ja: "／", en: "／" } satisfies Bilingual,
    heading: {
      ja: "24時間365日お気軽にご相談ください",
      en: "Please feel free to contact us anytime, 24 hours a day, 365 days a year.",
    } satisfies Bilingual,
    phone: contactPhone.display,
    hours: {
      ja: "【受付時間】平日 9:00〜18:00",
      en: "[Reception Hours] Weekdays 9:00 AM – 6:00 PM",
    } satisfies Bilingual,
    isms: {
      ja: "メディカルインフォマティクス株式会社は情報セキュリティマネジメントシステム（ISMS）の国際規格である「ISO27001」を取得しております。",
      en: "MedicalInformatics Co.,Ltd. has obtained ISO27001, the international standard for information security management systems (ISMS).",
    } satisfies Bilingual,
    // Verbatim from app/[lang]/page.tsx:511. Already language-neutral (a
    // company name + Latin abbreviation), so en === ja is not a placeholder.
    micsLogoAlt: {
      ja: "mics — MedicalInformatics Co.,Ltd.",
      en: "mics — MedicalInformatics Co.,Ltd.",
    } satisfies Bilingual,
    // Verbatim from app/[lang]/page.tsx:520. `en` is deliberately identical
    // to `ja` for now — writing a real English alt is new copy, which is out
    // of scope here; this field is what lets the client supply one later
    // from the dashboard without a deploy.
    isoLogoAlt: {
      ja: "BSI ISMS-AC ISO27001 認証マーク（IS 793656）",
      en: "BSI ISMS-AC ISO27001 認証マーク（IS 793656）",
    } satisfies Bilingual,
    // Verbatim from app/[lang]/page.tsx:541 — non-localizable relative path,
    // resolved through `localizeHref()` at render time same as before.
    ctaHref: "/service-flow",
  },
};

/* ------------------------------------------------------------------ */
/* Use cases                                                           */
/* ------------------------------------------------------------------ */

export const useCase = {
  hero: {
    heading: { ja: "ご利用シーン", en: "Use cases" } satisfies Bilingual,
    body: {
      ja: "Care 24 Japan は、さまざまな暮らしの場面に寄り添います。",
      en: "Care 24 Japan adapts to the moments that matter most.",
    } satisfies Bilingual,
    // Verbatim from app/[lang]/use-case/page.tsx's closing CTA — non-localizable
    // relative path, resolved through `localizeHref()` at render time same as
    // before. Not part of the page's actual hero visually (the button sits at
    // the bottom of the page), but it rides on the `page_hero` block because
    // that is the one block this page has a schema field to add it to.
    ctaHref: "/pricing",
  },
  cases: [
    {
      slug: "after-hospital-discharge",
      title: { ja: "退院後のサポート", en: "After hospital discharge" } satisfies Bilingual,
      body: {
        ja: "入院後のご自宅での生活を、看護と介護の両面で支えます。",
        en: "Nursing and daily-living support during recovery at home.",
      } satisfies Bilingual,
      detail: {
        ja: "入院中は医療スタッフに囲まれた環境で過ごされますが、退院後はご自宅でのリハビリや生活支援が重要になります。Care 24 Japan では、退院直後から看護師と介護福祉士が連携し、服薬管理・創傷ケア・食事・入浴・移動など、回復期に必要なあらゆるサポートをご提供します。ご家族の不安を和らげながら、安心して在宅療養できる環境を整えます。",
        en: "Leaving hospital can feel daunting. Care 24 Japan deploys a coordinated team of nurses and certified caregivers from day one — covering medication management, wound care, meals, bathing, and mobility support. We work closely with your family and discharging hospital to ensure a seamless, safe transition back to the comfort of home.",
      } satisfies Bilingual,
      highlights: [
        { ja: "退院当日からの対応が可能", en: "Available from the day of discharge" } satisfies Bilingual,
        { ja: "看護師・介護福祉士の連携チーム", en: "Coordinated nurse and caregiver team" } satisfies Bilingual,
        { ja: "服薬・処置管理のサポート", en: "Medication and wound-care management" } satisfies Bilingual,
        { ja: "リハビリ支援・歩行練習の同行", en: "Rehabilitation and mobility support" } satisfies Bilingual,
        { ja: "ご家族への定期的な状況報告", en: "Regular updates to family members" } satisfies Bilingual,
      ],
      imageAlt: {
        ja: "退院後にご自宅で休む高齢男性に付き添うスタッフ",
        en: "A caregiver assisting an elderly man recovering at home",
      } satisfies Bilingual,
    },
    {
      slug: "dementia-care",
      title: { ja: "認知症のケア", en: "Dementia care" } satisfies Bilingual,
      body: {
        ja: "見守りと声かけを大切に、穏やかな日常をお守りします。",
        en: "Gentle supervision and companionship for peace of mind.",
      } satisfies Bilingual,
      detail: {
        ja: "認知症のご本人が住み慣れた環境で穏やかに過ごせるよう、専門トレーニングを受けたスタッフが寄り添います。徘徊防止の見守り、日常的な声かけ・回想法の実践、服薬・食事のサポートなど、ご本人の尊厳を第一に考えたケアをご提供します。ご家族の精神的な負担を軽減することも、私たちの大切な役割です。",
        en: "Our specially trained caregivers provide compassionate, person-centred dementia care at home. We focus on familiar routines, gentle reminders, reminiscence activities, and safe supervision — helping maintain dignity and reduce anxiety. We also keep family members closely informed, so everyone feels supported.",
      } satisfies Bilingual,
      highlights: [
        { ja: "認知症ケア専門スタッフが対応", en: "Dementia-trained specialist caregivers" } satisfies Bilingual,
        { ja: "24時間見守りプランあり", en: "24-hour supervision plans available" } satisfies Bilingual,
        { ja: "回想法・コミュニケーション支援", en: "Reminiscence and communication support" } satisfies Bilingual,
        { ja: "服薬・食事管理のサポート", en: "Medication and meal management" } satisfies Bilingual,
        { ja: "ご家族への定期報告と相談対応", en: "Family updates and counselling support" } satisfies Bilingual,
      ],
      imageAlt: {
        ja: "高齢女性と一緒にアルバムを眺める介護スタッフ",
        en: "A care professional looking at a photo album with an elderly woman",
      } satisfies Bilingual,
    },
    {
      slug: "respite-care",
      title: { ja: "ご家族の休息（レスパイト）", en: "Respite for families" } satisfies Bilingual,
      body: {
        ja: "介護をされるご家族が休息できるよう、一時的にケアを引き継ぎます。",
        en: "Temporary cover so family caregivers can rest.",
      } satisfies Bilingual,
      detail: {
        ja: "日々介護を担うご家族は、心身ともに大きな負担を抱えています。Care 24 Japan のレスパイトケアでは、数時間から数日間、ご家族に代わって専門スタッフがご自宅でのケアを引き受けます。ご家族がリフレッシュし、自分自身の時間を持てるよう、安心してお任せいただける体制を整えています。",
        en: "Family caregivers give everything — and they deserve to rest. Care 24 Japan steps in for a few hours or several days, providing the same high-quality care your loved one is used to. Whether you need a short break, a medical appointment, or a holiday, we ensure continuity of care so you can recharge with complete peace of mind.",
      } satisfies Bilingual,
      highlights: [
        { ja: "数時間から数日間まで柔軟に対応", en: "Flexible from a few hours to several days" } satisfies Bilingual,
        { ja: "普段と変わらないケアの継続", en: "Seamless continuity of existing care routines" } satisfies Bilingual,
        { ja: "緊急時の迅速対応体制", en: "Rapid response in case of emergency" } satisfies Bilingual,
        { ja: "ケア記録の共有で安心の引き継ぎ", en: "Shared care records for smooth handover" } satisfies Bilingual,
        { ja: "定期・スポット両プランに対応", en: "Available as regular or spot bookings" } satisfies Bilingual,
      ],
      imageAlt: {
        ja: "笑顔で会話する高齢者と訪問スタッフ",
        en: "A visiting caregiver chatting warmly with an older client",
      } satisfies Bilingual,
    },
    {
      slug: "end-of-life-care",
      title: { ja: "終末期の在宅ケア", en: "End-of-life home care" } satisfies Bilingual,
      body: {
        ja: "ご本人とご家族の希望に寄り添い、住み慣れた場所での時間を支えます。",
        en: "Compassionate support to spend final days at home.",
      } satisfies Bilingual,
      detail: {
        ja: "人生の最終段階を、住み慣れたご自宅で穏やかに過ごしたいというご本人・ご家族の願いに、Care 24 Japan は全力で寄り添います。痛みや不快感を最小限にする身体ケア、精神的なサポート、そしてご家族が大切な時間を共に過ごせる環境づくりをお手伝いします。医療機関とも連携し、安心できる看取りの場を整えます。",
        en: "When the time comes, most people wish to be at home — surrounded by those they love. Care 24 Japan provides dignified, gentle end-of-life care that prioritises comfort and respects the wishes of the individual and their family. We coordinate closely with palliative care teams and GPs to ensure pain is managed and every moment is as peaceful as possible.",
      } satisfies Bilingual,
      highlights: [
        { ja: "緩和ケアチームとの医療連携", en: "Coordination with palliative care teams" } satisfies Bilingual,
        { ja: "苦痛の緩和と身体ケアの提供", en: "Pain management and physical comfort care" } satisfies Bilingual,
        { ja: "ご本人・ご家族の精神的サポート", en: "Emotional support for client and family" } satisfies Bilingual,
        { ja: "24時間体制での見守りと対応", en: "Round-the-clock presence and response" } satisfies Bilingual,
        { ja: "ご家族が寄り添える環境づくり", en: "Space for family to be present and grieve" } satisfies Bilingual,
      ],
      imageAlt: {
        ja: "手を取り合う高齢者と介護スタッフ",
        en: "A caregiver holding the hand of an elderly client",
      } satisfies Bilingual,
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Service flow                                                        */
/* ------------------------------------------------------------------ */

export const serviceFlow = {
  hero: {
    heading: { ja: "ご利用の流れ", en: "How it works" } satisfies Bilingual,
    body: {
      ja: "ご登録からサービス終了まで、4つのステップで進みます。",
      en: "From registration to completion, in four simple steps.",
    } satisfies Bilingual,
    // Verbatim from app/[lang]/service-flow/page.tsx's closing CTA — same
    // shape and same reasoning as `useCase.hero.ctaHref` above.
    ctaHref: "/pricing",
  },
  // `number` is verbatim from components/ui/StepFlow.tsx's old `{i + 1}` —
  // plain "1".."4", not the zero-padded "01".."04" `home.flow.steps` uses:
  // the two lists feed two different renderers (StepFlow's numeral badge vs.
  // the home page's flow badge) and always rendered differently, so this
  // fallback reproduces THIS page's own prior output, not the home page's.
  steps: [
    {
      number: "1",
      title: { ja: "ご登録", en: "Registration" } satisfies Bilingual,
      body: {
        ja: "お客様の情報をご入力いただき、サービス利用のための会員登録を頂きます。",
        en: "Please enter your information to register as a member in order to use the service.",
      } satisfies Bilingual,
    },
    {
      number: "2",
      title: { ja: "ご予約の確定", en: "Confirmation of your reservation" } satisfies Bilingual,
      body: {
        ja: "ケアサポーターのマッチングができ次第、ご予約確定となりメール・LINE等でご連絡します。",
        en: "Once a care supporter has been matched with you, your reservation will be confirmed and you will be notified via email, LINE, etc.",
      } satisfies Bilingual,
    },
    {
      number: "3",
      title: { ja: "サービス開始", en: "Service Start" } satisfies Bilingual,
      body: {
        ja: "ご予約の日時にケアサポーターがご自宅へお伺いします。",
        en: "A care supporter will visit your home at the scheduled date and time.",
      } satisfies Bilingual,
    },
    {
      number: "4",
      title: { ja: "終了ご報告", en: "Completion Report" } satisfies Bilingual,
      body: {
        ja: "サービス終了後、ケアサポーターよりご報告レポートをお送りし終了となります。",
        en: "After the service is completed, the care supporter will send you a report, and the service will be finished.",
      } satisfies Bilingual,
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Action plan pricing                                                 */
/* ------------------------------------------------------------------ */

export const actionPlan = {
  hero: {
    heading: {
      ja: "ケアサポーターの時給・給与体系",
      en: "Hourly wage/salary system for care supporters",
    } satisfies Bilingual,
    body: {
      ja: "1時間単価・税込み表記です。",
      en: "Hourly rates, tax included.",
    } satisfies Bilingual,
  },
  columns: {
    // Empty on purpose: app/[lang]/fees/page.tsx:34 renders this as a bare
    // `<th />` today (the row-label column has no header text). Empty
    // strings reproduce that exactly while giving the client a field to
    // fill in from the dashboard without a deploy.
    service: { ja: "", en: "" } satisfies Bilingual,
    customer: { ja: "お客様", en: "Customer" } satisfies Bilingual,
    supporter: { ja: "ケアサポーター", en: "Care supporter" } satisfies Bilingual,
  },
  note: {
    ja: "※ 表示価格はすべて税込です。登録料は無料です。",
    en: "All prices include tax. Registration is free.",
  } satisfies Bilingual,
  // Verbatim from app/[lang]/fees/page.tsx's closing CTA. Non-localizable
  // relative path, resolved through `localizeHref()` at render time same as
  // before. The client's real registration URL is still pending — this
  // points at the home page's contact block, same as today — but it is now
  // editable from the dashboard the moment that URL exists, no deploy
  // required.
  ctaHref: "/#contact",
};

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

export const pricing = {
  hero: {
    heading: { ja: "ご利用者様向け料金", en: "Pricing for users" } satisfies Bilingual,
    body: {
      ja: "わかりやすい料金体系で、安心してご利用いただけます。すべて税込価格です。",
      en: "Transparent, all-inclusive pricing. Prices include tax.",
    } satisfies Bilingual,
  },
  highlights: [
    {
      ja: "入会金・登録料無料",
      en: "No membership or registration fee",
    } satisfies Bilingual,
    {
      ja: "最低利用2時間から",
      en: "Minimum usage time: 2 hours",
    } satisfies Bilingual,
  ],
  note: {
    ja: "※ 表示価格はすべて税込です。ご利用内容により変動する場合があります。",
    en: "All prices include tax and may vary based on care requirements.",
  } satisfies Bilingual,
};

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

export const footer = {
  description: {
    ja: "Care 24 Japan は、ご自宅での24時間プレミアム在宅介護を提供します。",
    en: "Premium 24-hour in-home elderly care across Japan.",
  } satisfies Bilingual,
  /**
   * Legal / company links.
   *
   * The client update sheet (0727) lists seven entries here; the client later
   * asked for the last three to be taken out of the UI while keeping the pages
   * live. This list is therefore five items on purpose — see the note at the
   * end of the array before adding any back. (It was four items until the
   * client's PPTX dated 20260819 asked for the single 利用規約 entry to be
   * split into two: one for users, one for Care Supporters.)
   */
  legalLinks: [
    { href: "/company", label: { ja: "運営会社", en: "Operating Company" } },
    { href: "/privacy", label: { ja: "プライバシーポリシー", en: "Privacy Policy" } },
    {
      href: "/tokushoho",
      // Label sourced from legalDocs.tokushoho.heading (constants/legal.ts)
      // so the footer label can never drift from the page heading again.
      // Resolved by Footer.tsx at render time (Footer is a Server Component,
      // so importing legal.ts there doesn't push its bundle to the client).
      key: "tokushoho",
    },
    {
      href: "/terms-for-users",
      label: { ja: "利用規約（ご利用者様向け）", en: "Terms & Conditions (For Users)" },
    },
    {
      href: "/terms-for-care-supporters",
      label: { ja: "利用規約（ケアサポーター向け）", en: "Terms & Conditions (For Care Supporters)" },
    },
    // /cancellation-policy, /compensation and /quasi-mandate are omitted at
    // the client's request: the pages stay live and are kept in the sitemap,
    // they just must not appear in the UI. Note this leaves /compensation and
    // /quasi-mandate with no inbound link anywhere on the site; only
    // /cancellation-policy is still reached from the tokushoho document body
    // (constants/legal.ts). Do not "fix" that by re-adding them here.
  ] satisfies (
    | { href: string; label: Bilingual }
    | { href: string; key: "tokushoho" }
  )[],
  legal: {
    ja: "© 2026 Care 24 Japan. All rights reserved.",
    en: "© 2026 Care 24 Japan. All rights reserved.",
  } satisfies Bilingual,
};

/* ------------------------------------------------------------------ */
/* Operating company (/company — content from mics.tokyo/company)      */
/* ------------------------------------------------------------------ */

/**
 * `key` is each row's STABLE identity, and is never rendered. It exists
 * because `features/seo/organization.ts` needs three specific rows —
 * trade name, head office, established — to build the Organization
 * JSON-LD's `legalName`, `address` and `foundingDate`. It used to find them
 * by matching `label.en` against the literals "Trade name" / "Head office" /
 * "Established", which made an ordinary content edit (renaming a row label
 * in the dashboard) silently drop those three facts from the site's
 * structured data. Mirrored in Atlas as `company_row.row_key`
 * (scripts/atlas/schema.ts), the same role `course_key`/`row_key` already
 * play for `rate_row`.
 */
export const company = {
  heading: { ja: "運営会社", en: "Operating Company" } satisfies Bilingual,
  rows: [
    {
      key: "trade-name",
      label: { ja: "商号", en: "Trade name" } satisfies Bilingual,
      value: {
        ja: "メディカルインフォマティクス株式会社\nMedicalInformatics Co.,Ltd.",
        en: "MedicalInformatics Co.,Ltd.",
      } satisfies Bilingual,
    },
    {
      key: "head-office",
      label: { ja: "本社", en: "Head office" } satisfies Bilingual,
      value: {
        ja: "〒100-0005\n東京都千代田区丸の内二丁目1番1号 明治生命館4階",
        en: "Meiji Seimei Building 4F, 2-1-1 Marunouchi, Chiyoda-ku, Tokyo 100-0005",
      } satisfies Bilingual,
    },
    {
      key: "tel",
      label: { ja: "Tel", en: "Tel" } satisfies Bilingual,
      value: { ja: "03-5733-6600", en: "03-5733-6600" } satisfies Bilingual,
    },
    {
      key: "established",
      label: { ja: "設立", en: "Established" } satisfies Bilingual,
      value: { ja: "2002年10月18日", en: "October 18, 2002" } satisfies Bilingual,
    },
    {
      key: "capital",
      label: { ja: "資本金", en: "Capital" } satisfies Bilingual,
      // ST-U2 Tugas 3: ¥ -> JPY for EN readers (user decision "en ya en").
      // Synced with Atlas (company page, company-row block, en.value).
      value: { ja: "1億円", en: "JPY 100 million" } satisfies Bilingual,
    },
    {
      key: "representative",
      label: { ja: "代表者", en: "Representative" } satisfies Bilingual,
      value: {
        ja: "代表取締役 佐々木 美樹",
        en: "Representative Director: Miki Sasaki",
      } satisfies Bilingual,
    },
    {
      key: "shareholders",
      label: { ja: "株主構成", en: "Shareholders" } satisfies Bilingual,
      value: {
        ja: "Social Impact Solutions株式会社 100％",
        en: "Social Impact Solutions Inc. 100%",
      } satisfies Bilingual,
    },
    {
      key: "group-companies",
      label: { ja: "グループ企業", en: "Group companies" } satisfies Bilingual,
      value: {
        ja: "Aegis Care Advisors Pvt.ltd (Care24)、PT. SIPS Edutech Indonesia、EvoCare Japan株式会社",
        en: "Aegis Care Advisors Pvt. Ltd. (Care24), PT. SIPS Edutech Indonesia, EvoCare Japan Co., Ltd.",
      } satisfies Bilingual,
    },
  ],
};
