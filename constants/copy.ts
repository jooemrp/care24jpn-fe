/**
 * Care 24 Japan — All site copy lives here.
 *
 * RULES:
 * - Japanese (`jp`) is primary; English (`en`) renders beneath as a small
 *   uppercase secondary label.
 * - Never hardcode copy inside components — import from this file.
 * - All values below are EDITABLE PLACEHOLDERS. Replace with final copy.
 */

export type Bilingual = {
  jp: string;
  en: string;
};

/** Brand-level strings. */
export const brand = {
  name: "Care 24 Japan",
  logoAlt: {
    jp: "ケア24ジャパン ロゴ",
    en: "Care 24 Japan logo",
  } satisfies Bilingual,
  tagline: {
    jp: "ご自宅で、心安らぐ24時間の在宅ケアを",
    en: "Premium 24-hour in-home care",
  } satisfies Bilingual,
};

/** Primary navigation links. `href` must match the App Router routes. */
export const nav: { href: string; label: Bilingual }[] = [
  { href: "/", label: { jp: "ホーム", en: "Home" } },
  { href: "/service-details", label: { jp: "サービス内容", en: "Service Details" } },
  { href: "/pricing", label: { jp: "料金", en: "Pricing" } },
  { href: "/fees", label: { jp: "料金", en: "Fees" } },
];

/** Shared call-to-action buttons reused across pages. */
export const cta = {
  primary: { jp: "無料相談を予約する", en: "Book a free consultation" } satisfies Bilingual,
  secondary: { jp: "料金を見る", en: "View pricing" } satisfies Bilingual,
  contact: { jp: "お問い合わせ", en: "Contact us" } satisfies Bilingual,
};

/* ------------------------------------------------------------------ */
/* Homepage                                                            */
/* ------------------------------------------------------------------ */

export const home = {
  hero: {
    badge: {
      jp: "完全\nオーダーメイド型\n看護で",
      en: "Complete\nPersonalized\nNursing Care",
    } satisfies Bilingual,
    resolve: {
      jp: "不安やお困りごとをすべて解消",
      en: "We will resolve all your anxieties and concerns.",
    } satisfies Bilingual,
    heading: {
      jp: "公的介護保険を使わない、在宅介護の家事支援サービス",
      en: "Home care and household support services that do not use public long-term care insurance.",
    } satisfies Bilingual,
    body: {
      jp: "",
      en: "",
    } satisfies Bilingual,
    imageAlt: {
      jp: "窓辺で介護スタッフと穏やかに過ごす高齢の女性",
      en: "An elderly woman resting calmly by a window with a care professional",
    } satisfies Bilingual,
  },

  values: {
    heading: { jp: "選ばれる理由", en: "Why families choose us" } satisfies Bilingual,
    items: [
      {
        title: { jp: "24時間の安心", en: "24-hour presence" } satisfies Bilingual,
        body: {
          jp: "昼夜を問わず、必要なときにすぐ対応できる体制を整えています。",
          en: "Care available day and night, whenever it is needed.",
        } satisfies Bilingual,
      },
      {
        title: { jp: "専門スタッフ", en: "Trained professionals" } satisfies Bilingual,
        body: {
          jp: "国家資格を持つ介護福祉士・看護師が、お一人おひとりに合わせてケアします。",
          en: "Certified caregivers and nurses tailored to each individual.",
        } satisfies Bilingual,
      },
      {
        title: { jp: "ご家族との連携", en: "Family partnership" } satisfies Bilingual,
        body: {
          jp: "ケアの記録を共有し、ご家族と一緒に最適な暮らしを考えます。",
          en: "Shared care records and close communication with your family.",
        } satisfies Bilingual,
      },
    ],
  },

  problems: {
    heading: {
      jp: "このようなお困りごとはありませんか？",
      en: "Are you experiencing any of these problems?",
    } satisfies Bilingual,
    items: [
      { jp: "一人で生活しているため何かあったら不安", en: "I live alone and worry about what might happen." } satisfies Bilingual,
      { jp: "介護保険がなかなかおりない", en: "Long-term care insurance payments are often delayed." } satisfies Bilingual,
      { jp: "ショッピングや映画に外出をしたいが一人では行けないので誰か一緒に行ってほしい", en: "I want to go out but can't go alone." } satisfies Bilingual,
      { jp: "話し相手がほしい", en: "I want someone to talk to." } satisfies Bilingual,
      { jp: "家事や掃除など手伝ってほしい", en: "I need help with housework and cleaning." } satisfies Bilingual,
      { jp: "離れて暮らす親の様子が心配だが、仕事があって休み以外は見に行けない", en: "I'm worried about my parents who live far away." } satisfies Bilingual,
      { jp: "家族が不在の時に見守りをしてほしい", en: "I'd like someone to watch over them when family is away." } satisfies Bilingual,
      { jp: "施設や病院では対応できないことを個別に対応してほしい", en: "I need individual care beyond what facilities offer." } satisfies Bilingual,
      { jp: "もしもの時の対応をプロにお願いしたい", en: "I want a professional to handle emergencies." } satisfies Bilingual,
    ],
  },

  careCourse: {
    leadIn: {
      jp: "介護保険では対応できない\n介護・生活支援を一流の介護士がサポート",
      en: "Top-class caregivers support the nursing and daily-living care that long-term care insurance cannot cover.",
    } satisfies Bilingual,
    badge: { jp: "介護コース", en: "Caregiving course" } satisfies Bilingual,
    tagline: {
      jp: "介護も家事もまるっとお任せ",
      en: "Leave both caregiving and housework entirely to us.",
    } satisfies Bilingual,
    price: {
      label: { jp: "日中基本料金", en: "Daytime base rate" } satisfies Bilingual,
      hours: { jp: "（9:00〜18:00）", en: "(9:00–18:00)" } satisfies Bilingual,
      amount: { jp: "3,200円", en: "¥3,200" } satisfies Bilingual,
      unit: { jp: "/時間", en: "/hour" } satisfies Bilingual,
      taxNote: { jp: "税抜", en: "excl. tax" } satisfies Bilingual,
      taxIncluded: { jp: "税込価格 3,520円", en: "Tax included ¥3,520" } satisfies Bilingual,
    },
    fees: [
      {
        label: { jp: "最低利用時間", en: "Minimum usage" } satisfies Bilingual,
        value: { jp: "2時間から", en: "From 2 hours" } satisfies Bilingual,
      },
      {
        label: { jp: "指名料", en: "Nomination fee" } satisfies Bilingual,
        value: { jp: "330円/時間", en: "¥330/hour" } satisfies Bilingual,
        note: { jp: "※定期の方は指名無料", en: "*Free for regular clients" } satisfies Bilingual,
      },
      {
        label: { jp: "往復交通費", en: "Round-trip transport" } satisfies Bilingual,
        value: { jp: "別途990円", en: "¥990 separately" } satisfies Bilingual,
      },
    ],
    cards: [
      {
        title: { jp: "ご自宅内の介護", en: "In-home caregiving" } satisfies Bilingual,
        imageAlt: {
          jp: "ご自宅で高齢女性に寄り添う介護スタッフ",
          en: "A caregiver assisting an elderly woman at home",
        } satisfies Bilingual,
        items: [
          { jp: "移動介助", en: "Mobility assistance" } satisfies Bilingual,
          { jp: "食事介助", en: "Meal assistance" } satisfies Bilingual,
          { jp: "入浴・清拭介助", en: "Bathing and wiping assistance" } satisfies Bilingual,
          { jp: "口腔ケア", en: "Oral care" } satisfies Bilingual,
          { jp: "排泄介助", en: "Toileting assistance" } satisfies Bilingual,
          { jp: "着替えのお手伝い", en: "Help with dressing" } satisfies Bilingual,
          { jp: "服薬の管理", en: "Medication management" } satisfies Bilingual,
          { jp: "ケアマネジャーとの連携", en: "Coordination with care managers" } satisfies Bilingual,
        ],
      },
      {
        title: { jp: "ご自宅内の家事", en: "In-home housework" } satisfies Bilingual,
        imageAlt: {
          jp: "ご自宅でリビングを掃除するスタッフ",
          en: "A staff member cleaning a living room at home",
        } satisfies Bilingual,
        items: [
          { jp: "掃除", en: "Cleaning" } satisfies Bilingual,
          { jp: "洗濯", en: "Laundry" } satisfies Bilingual,
          { jp: "話し相手", en: "Companionship" } satisfies Bilingual,
          { jp: "調理", en: "Cooking" } satisfies Bilingual,
          { jp: "ペットの世話", en: "Pet care" } satisfies Bilingual,
          { jp: "庭の手入れ", en: "Garden care" } satisfies Bilingual,
          { jp: "窓拭き", en: "Window cleaning" } satisfies Bilingual,
        ],
      },
    ],
  },

  closing: {
    heading: {
      jp: "まずは、お話を聞かせてください。",
      en: "Let's talk about what you need",
    } satisfies Bilingual,
    body: {
      jp: "ご相談は無料です。専門スタッフが丁寧にお伺いし、最適なプランをご提案します。",
      en: "Consultations are free. We'll listen carefully and propose the right plan.",
    } satisfies Bilingual,
  },
};

/* ------------------------------------------------------------------ */
/* Use cases                                                           */
/* ------------------------------------------------------------------ */

export const useCase = {
  hero: {
    heading: { jp: "ご利用シーン", en: "Use cases" } satisfies Bilingual,
    body: {
      jp: "Care 24 Japan は、さまざまな暮らしの場面に寄り添います。",
      en: "Care 24 Japan adapts to the moments that matter most.",
    } satisfies Bilingual,
  },
  cases: [
    {
      slug: "after-hospital-discharge",
      title: { jp: "退院後のサポート", en: "After hospital discharge" } satisfies Bilingual,
      body: {
        jp: "入院後のご自宅での生活を、看護と介護の両面で支えます。",
        en: "Nursing and daily-living support during recovery at home.",
      } satisfies Bilingual,
      detail: {
        jp: "入院中は医療スタッフに囲まれた環境で過ごされますが、退院後はご自宅でのリハビリや生活支援が重要になります。Care 24 Japan では、退院直後から看護師と介護福祉士が連携し、服薬管理・創傷ケア・食事・入浴・移動など、回復期に必要なあらゆるサポートをご提供します。ご家族の不安を和らげながら、安心して在宅療養できる環境を整えます。",
        en: "Leaving hospital can feel daunting. Care 24 Japan deploys a coordinated team of nurses and certified caregivers from day one — covering medication management, wound care, meals, bathing, and mobility support. We work closely with your family and discharging hospital to ensure a seamless, safe transition back to the comfort of home.",
      } satisfies Bilingual,
      highlights: [
        { jp: "退院当日からの対応が可能", en: "Available from the day of discharge" } satisfies Bilingual,
        { jp: "看護師・介護福祉士の連携チーム", en: "Coordinated nurse and caregiver team" } satisfies Bilingual,
        { jp: "服薬・処置管理のサポート", en: "Medication and wound-care management" } satisfies Bilingual,
        { jp: "リハビリ支援・歩行練習の同行", en: "Rehabilitation and mobility support" } satisfies Bilingual,
        { jp: "ご家族への定期的な状況報告", en: "Regular updates to family members" } satisfies Bilingual,
      ],
      imageAlt: {
        jp: "退院後にご自宅で休む高齢男性に付き添うスタッフ",
        en: "A caregiver assisting an elderly man recovering at home",
      } satisfies Bilingual,
    },
    {
      slug: "dementia-care",
      title: { jp: "認知症のケア", en: "Dementia care" } satisfies Bilingual,
      body: {
        jp: "見守りと声かけを大切に、穏やかな日常をお守りします。",
        en: "Gentle supervision and companionship for peace of mind.",
      } satisfies Bilingual,
      detail: {
        jp: "認知症のご本人が住み慣れた環境で穏やかに過ごせるよう、専門トレーニングを受けたスタッフが寄り添います。徘徊防止の見守り、日常的な声かけ・回想法の実践、服薬・食事のサポートなど、ご本人の尊厳を第一に考えたケアをご提供します。ご家族の精神的な負担を軽減することも、私たちの大切な役割です。",
        en: "Our specially trained caregivers provide compassionate, person-centred dementia care at home. We focus on familiar routines, gentle reminders, reminiscence activities, and safe supervision — helping maintain dignity and reduce anxiety. We also keep family members closely informed, so everyone feels supported.",
      } satisfies Bilingual,
      highlights: [
        { jp: "認知症ケア専門スタッフが対応", en: "Dementia-trained specialist caregivers" } satisfies Bilingual,
        { jp: "24時間見守りプランあり", en: "24-hour supervision plans available" } satisfies Bilingual,
        { jp: "回想法・コミュニケーション支援", en: "Reminiscence and communication support" } satisfies Bilingual,
        { jp: "服薬・食事管理のサポート", en: "Medication and meal management" } satisfies Bilingual,
        { jp: "ご家族への定期報告と相談対応", en: "Family updates and counselling support" } satisfies Bilingual,
      ],
      imageAlt: {
        jp: "高齢女性と一緒にアルバムを眺める介護スタッフ",
        en: "A care professional looking at a photo album with an elderly woman",
      } satisfies Bilingual,
    },
    {
      slug: "respite-care",
      title: { jp: "ご家族の休息（レスパイト）", en: "Respite for families" } satisfies Bilingual,
      body: {
        jp: "介護をされるご家族が休息できるよう、一時的にケアを引き継ぎます。",
        en: "Temporary cover so family caregivers can rest.",
      } satisfies Bilingual,
      detail: {
        jp: "日々介護を担うご家族は、心身ともに大きな負担を抱えています。Care 24 Japan のレスパイトケアでは、数時間から数日間、ご家族に代わって専門スタッフがご自宅でのケアを引き受けます。ご家族がリフレッシュし、自分自身の時間を持てるよう、安心してお任せいただける体制を整えています。",
        en: "Family caregivers give everything — and they deserve to rest. Care 24 Japan steps in for a few hours or several days, providing the same high-quality care your loved one is used to. Whether you need a short break, a medical appointment, or a holiday, we ensure continuity of care so you can recharge with complete peace of mind.",
      } satisfies Bilingual,
      highlights: [
        { jp: "数時間から数日間まで柔軟に対応", en: "Flexible from a few hours to several days" } satisfies Bilingual,
        { jp: "普段と変わらないケアの継続", en: "Seamless continuity of existing care routines" } satisfies Bilingual,
        { jp: "緊急時の迅速対応体制", en: "Rapid response in case of emergency" } satisfies Bilingual,
        { jp: "ケア記録の共有で安心の引き継ぎ", en: "Shared care records for smooth handover" } satisfies Bilingual,
        { jp: "定期・スポット両プランに対応", en: "Available as regular or spot bookings" } satisfies Bilingual,
      ],
      imageAlt: {
        jp: "笑顔で会話する高齢者と訪問スタッフ",
        en: "A visiting caregiver chatting warmly with an older client",
      } satisfies Bilingual,
    },
    {
      slug: "end-of-life-care",
      title: { jp: "終末期の在宅ケア", en: "End-of-life home care" } satisfies Bilingual,
      body: {
        jp: "ご本人とご家族の希望に寄り添い、住み慣れた場所での時間を支えます。",
        en: "Compassionate support to spend final days at home.",
      } satisfies Bilingual,
      detail: {
        jp: "人生の最終段階を、住み慣れたご自宅で穏やかに過ごしたいというご本人・ご家族の願いに、Care 24 Japan は全力で寄り添います。痛みや不快感を最小限にする身体ケア、精神的なサポート、そしてご家族が大切な時間を共に過ごせる環境づくりをお手伝いします。医療機関とも連携し、安心できる看取りの場を整えます。",
        en: "When the time comes, most people wish to be at home — surrounded by those they love. Care 24 Japan provides dignified, gentle end-of-life care that prioritises comfort and respects the wishes of the individual and their family. We coordinate closely with palliative care teams and GPs to ensure pain is managed and every moment is as peaceful as possible.",
      } satisfies Bilingual,
      highlights: [
        { jp: "緩和ケアチームとの医療連携", en: "Coordination with palliative care teams" } satisfies Bilingual,
        { jp: "苦痛の緩和と身体ケアの提供", en: "Pain management and physical comfort care" } satisfies Bilingual,
        { jp: "ご本人・ご家族の精神的サポート", en: "Emotional support for client and family" } satisfies Bilingual,
        { jp: "24時間体制での見守りと対応", en: "Round-the-clock presence and response" } satisfies Bilingual,
        { jp: "ご家族が寄り添える環境づくり", en: "Space for family to be present and grieve" } satisfies Bilingual,
      ],
      imageAlt: {
        jp: "手を取り合う高齢者と介護スタッフ",
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
    heading: { jp: "ご利用の流れ", en: "How it works" } satisfies Bilingual,
    body: {
      jp: "お問い合わせからケア開始まで、4つのステップで進みます。",
      en: "From first contact to care, in four simple steps.",
    } satisfies Bilingual,
  },
  steps: [
    {
      title: { jp: "お問い合わせ", en: "Get in touch" } satisfies Bilingual,
      body: {
        jp: "お電話またはフォームから、お気軽にご相談ください。",
        en: "Reach out by phone or our contact form — no obligation.",
      } satisfies Bilingual,
    },
    {
      title: { jp: "無料アセスメント", en: "Free assessment" } satisfies Bilingual,
      body: {
        jp: "専門スタッフがご自宅に伺い、必要なケアを丁寧に確認します。",
        en: "A professional visits your home to assess care needs.",
      } satisfies Bilingual,
    },
    {
      title: { jp: "ケアプランのご提案", en: "Personalized plan" } satisfies Bilingual,
      body: {
        jp: "ご希望とご予算に合わせた最適なケアプランをご提案します。",
        en: "We propose a plan tailored to your wishes and budget.",
      } satisfies Bilingual,
    },
    {
      title: { jp: "ケアの開始", en: "Care begins" } satisfies Bilingual,
      body: {
        jp: "担当スタッフが決まり、安心のケアがスタートします。",
        en: "Your dedicated caregiver begins, and support starts.",
      } satisfies Bilingual,
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

export const pricing = {
  hero: {
    heading: { jp: "料金", en: "Pricing" } satisfies Bilingual,
    body: {
      jp: "わかりやすい料金体系で、安心してご利用いただけます。すべて税込価格です。",
      en: "Transparent, all-inclusive pricing. Prices include tax.",
    } satisfies Bilingual,
  },
  note: {
    jp: "※ 表示価格はすべて税込です。ご利用内容により変動する場合があります。",
    en: "All prices include tax and may vary based on care requirements.",
  } satisfies Bilingual,
};

/* ------------------------------------------------------------------ */
/* Staff pricing                                                       */
/* ------------------------------------------------------------------ */

export const staffPricing = {
  hero: {
    heading: { jp: "スタッフ料金", en: "Staff rates" } satisfies Bilingual,
    body: {
      jp: "資格や対応内容に応じたスタッフごとの時間単価です。",
      en: "Hourly rates by caregiver qualification and scope of care.",
    } satisfies Bilingual,
  },
  note: {
    jp: "※ 深夜・早朝（22:00〜6:00）は割増料金となります。",
    en: "Night and early-morning hours (22:00–6:00) are charged at a premium.",
  } satisfies Bilingual,
};

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

export const footer = {
  description: {
    jp: "Care 24 Japan は、ご自宅での24時間プレミアム在宅介護を提供します。",
    en: "Premium 24-hour in-home elderly care across Japan.",
  } satisfies Bilingual,
  columns: [
    {
      title: { jp: "サービス", en: "Service" } satisfies Bilingual,
      links: [
        { href: "/use-case", label: { jp: "ご利用シーン", en: "Use cases" } },
        { href: "/service-flow", label: { jp: "ご利用の流れ", en: "Service flow" } },
        { href: "/pricing", label: { jp: "料金", en: "Pricing" } },
        { href: "/staff-pricing", label: { jp: "スタッフ料金", en: "Staff pricing" } },
      ],
    },
  ],
  contact: {
    title: { jp: "お問い合わせ", en: "Contact" } satisfies Bilingual,
    phoneLabel: { jp: "電話", en: "Phone" } satisfies Bilingual,
    phone: "0120-000-000",
    hoursLabel: { jp: "受付時間", en: "Hours" } satisfies Bilingual,
    hours: { jp: "24時間 365日対応", en: "24/7, 365 days" } satisfies Bilingual,
    addressLabel: { jp: "所在地", en: "Address" } satisfies Bilingual,
    address: { jp: "東京都千代田区0-0-0", en: "0-0-0 Chiyoda, Tokyo" } satisfies Bilingual,
  },
  legal: {
    jp: "© 2026 Care 24 Japan. All rights reserved.",
    en: "© 2026 Care 24 Japan. All rights reserved.",
  } satisfies Bilingual,
};
