/**
 * Care 24 Japan — FAQ dataset (bilingual).
 *
 * Source: "【English explanation】Care 24 Japan Webpage revision 26th Aug 2026.pdf"
 * Section 5 — FAQ Accordion Implementation Specification & Dataset.
 *
 * Seed input only — runtime FAQ HTML comes from Atlas (`scripts/atlas/seed-faq.ts`).
 *
 * LOCKED values (do NOT change without a documented content decision):
 * - Q5 answer: minimum **2 hours** / 最低2時間
 * - Q16 answer: minimum **2 hours** / 最低2時間
 *
 * Structure:
 * - faqPage / hero chrome (heading, intro, view-more labels)
 * - faqCategories: 6 buckets (01–05 + scenarios)
 * - faqItems:      29 items (Q1–Q24 + S1–S5)
 * - scenariosHeading: section label for the S1–S5 block
 */

import type { Bilingual } from "./copy";

export type FaqCategory = {
  /** Short key used to group items. "01"–"05" for main, "scenarios" for S-block. */
  id: string;
  label: Bilingual;
};

export type FaqItem = {
  /** e.g. "Q1", "Q2", …, "Q24", "S1", …, "S5" */
  id: string;
  /** Matches a FaqCategory.id */
  category: string;
  question: Bilingual;
  answer: Bilingual;
};

// ---------------------------------------------------------------------------
// Page chrome (page-hero + faq-page) — duplicated heading/intro match live Atlas
// ---------------------------------------------------------------------------

export const faqHero: {
  heading: Bilingual;
  body: Bilingual;
} = {
  heading: { ja: "よくあるご質問", en: "FAQ" },
  body: {
    ja: "Care24Japanのサービスについてよくいただくご質問をまとめました。",
    en: "Find answers to the most common questions about Care24Japan's services.",
  },
};

/** Labels on the `faq-page` config block (scenarios heading + accordion chrome). */
export const faqPage: {
  heading: Bilingual;
  intro: Bilingual;
  scenariosHeading: Bilingual;
  viewMoreLabel: Bilingual;
  collapseLabel: Bilingual;
} = {
  heading: faqHero.heading,
  intro: faqHero.body,
  scenariosHeading: {
    ja: "こんな場合でも利用できますか？",
    en: "Can I use in these cases?",
  },
  viewMoreLabel: { ja: "もっと見る", en: "View More" },
  collapseLabel: { ja: "閉じる", en: "Show Less" },
};

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const faqCategories: FaqCategory[] = [
  {
    id: "01",
    label: {
      ja: "サービスについて",
      en: "About the Service",
    },
  },
  {
    id: "02",
    label: {
      ja: "ケアサポーターについて",
      en: "Care Supporters",
    },
  },
  {
    id: "03",
    label: {
      ja: "看護・医療ケアについて",
      en: "Nursing & Medical Care",
    },
  },
  {
    id: "04",
    label: {
      ja: "料金・お支払いについて",
      en: "Pricing & Payment",
    },
  },
  {
    id: "05",
    label: {
      ja: "ご予約・マッチングについて",
      en: "Reservation & Matching",
    },
  },
  {
    id: "scenarios",
    label: {
      ja: "こんな場合でも利用できますか？",
      en: "Can I use in these cases?",
    },
  },
];

// ---------------------------------------------------------------------------
// Scenarios section heading (rendered separately from category label)
// ---------------------------------------------------------------------------

/** Alias of `faqPage.scenariosHeading` for existing imports/tests. */
export const scenariosHeading: Bilingual = faqPage.scenariosHeading;

// ---------------------------------------------------------------------------
// FAQ items — Q1–Q24, then S1–S5
// ---------------------------------------------------------------------------

export const faqItems: FaqItem[] = [
  // ── 01 About Service ────────────────────────────────────────────────────
  {
    id: "Q1",
    category: "01",
    question: {
      ja: "Care24Japanとはどのようなサービスですか？",
      en: "What kind of service is Care24Japan?",
    },
    answer: {
      ja: "介護保険や医療保険では対応しきれない生活・介護・看護のニーズを、有資格者がサポートする保険外（自費）サービスです。",
      en: "It is a non-insurance (private-pay) service provided by qualified specialists to support daily living, care, and nursing needs that standard public nursing or medical insurance cannot fully cover.",
    },
  },
  {
    id: "Q2",
    category: "01",
    question: {
      ja: "介護保険サービスとの違いは何ですか？",
      en: "What is the difference from public long-term care insurance services?",
    },
    answer: {
      ja: "介護保険では利用できる内容や時間に制限があります。Care24Japanでは、保険ではカバーしきれない時間や生活上のご希望に柔軟に対応します。",
      en: "Public nursing care insurance has restrictions on service scope and duration. Care24Japan flexibly accommodates schedule preferences and lifestyle requests that public insurance cannot cover.",
    },
  },
  {
    id: "Q3",
    category: "01",
    question: {
      ja: "どのようなサービスを依頼できますか？",
      en: "What types of services can I request?",
    },
    answer: {
      ja: "見守り、食事・排泄・入浴介助、家事、通院・外出の付き添い、退院後の生活サポートなどをご利用いただけます。",
      en: "Services include companionship/monitoring, assistance with meals, toileting, bathing, housework, escorting to hospital visits or outings, and post-discharge recovery support.",
    },
  },
  {
    id: "Q4",
    category: "01",
    question: {
      ja: "どのようなことは依頼できませんか？",
      en: "What services cannot be requested?",
    },
    answer: {
      ja: "法令上禁止されている行為や、必要な資格・医師の指示等がないと対応できない行為はお受けできません。※医師の指示書がある場合、事前確認の上お電話にてお伺いします。",
      en: "We cannot perform acts prohibited by law or procedures that require specific qualifications or medical directives without doctor instructions. *If a doctor's written directive is available, we will consult with you by phone after verification.",
    },
  },
  {
    id: "Q5",
    category: "01",
    question: {
      ja: "1回だけの利用もできますか？",
      en: "Can I use the service for just a single occasion?",
    },
    // LOCKED: must say minimum 2 hours / 最低2時間
    answer: {
      ja: "はい、スポットでのご利用も可能です。必要なときに必要な時間だけご利用いただけます（※最低2時間からご利用可能です）。",
      en: "Yes, spot/one-time use is available. You can use our service whenever and for as long as you need (*Minimum booking is 2 hours).",
    },
  },
  {
    id: "Q6",
    category: "01",
    question: {
      ja: "家族が本人に代わって申し込めますか？",
      en: "Can family members apply on behalf of the user?",
    },
    answer: {
      ja: "はい、ご家族からのお申し込みも可能です。サービス利用には、ご本人の同意が必要となる場合があります。",
      en: "Yes, family members can apply. Please note that consent from the user receiving care may be required prior to service delivery.",
    },
  },
  {
    id: "Q7",
    category: "01",
    question: {
      ja: "介護認定を受けていなくても利用できますか？",
      en: "Can I use the service if I haven't received official nursing care certification?",
    },
    answer: {
      ja: "はい、ご利用いただけます。Care24Japanは介護保険を利用しない自費サービスです。",
      en: "Yes, absolutely. Care24Japan is a private service that does not require public long-term care insurance certification.",
    },
  },
  {
    id: "Q8",
    category: "01",
    question: {
      ja: "どの地域でも対応可能ですか？",
      en: "Is the service available in all regions?",
    },
    answer: {
      ja: "現在は港区・世田谷区を中心にサービスを提供しております。近隣エリアにお住まいの方もご対応できる場合がございますので、まずはお気軽にご相談ください。※対応エリアは随時拡大していく予定です。",
      en: "Currently, we primarily serve Minato and Setagaya Wards. Accommodation for nearby areas may also be possible, so please feel free to consult us. *Service areas will expand sequentially.",
    },
  },

  // ── 02 Care Supporters ──────────────────────────────────────────────────
  {
    id: "Q9",
    category: "02",
    question: {
      ja: "どのような人が対応しますか？",
      en: "What qualifications do the care staff have?",
    },
    answer: {
      ja: "看護師・介護士・リハビリ職など、資格や経験を確認したケアサポーターが対応します。",
      en: "Services are provided by verified, certified care supporters including registered nurses, professional caregivers, and rehabilitation specialists.",
    },
  },
  {
    id: "Q10",
    category: "02",
    question: {
      ja: "ケアサポーターの資格や経験は確認されていますか？",
      en: "Are the qualifications and background of care supporters verified?",
    },
    answer: {
      ja: "はい。登録時に資格・経験等を確認し、Care24Japan独自の品質基準に沿ってサービスを提供します。",
      en: "Yes. Qualifications and background experience are verified during registration, and services are provided according to Care24Japan's proprietary quality standards.",
    },
  },
  {
    id: "Q11",
    category: "02",
    question: {
      ja: "ケアサポーターはどのような教育を受けていますか？",
      en: "What training do care supporters receive?",
    },
    answer: {
      ja: "接遇・マナーや安全に関する基準を設け、Care24Japan Quality Standard（CQS）に基づいて品質管理を行っています。",
      en: "We maintain strict standards regarding etiquette, hospitality, and safety, managing service quality based on the Care24Japan Quality Standard (CQS).",
    },
  },
  {
    id: "Q12",
    category: "02",
    question: {
      ja: "希望するケアサポーターを選べますか？",
      en: "Can I select my preferred care supporter?",
    },
    answer: {
      ja: "はい。看護師・介護士・リハビリ職など、ご希望のケアサポーターをお選びいただけます。利用者とケアサポーター双方の承諾が得られると、マッチングが成立します。",
      en: "Yes. You can choose your preferred specialist type (nurses, caregivers, rehab staff). Matching is completed once mutual consent is established between user and supporter.",
    },
  },

  // ── 03 Nursing & Medical Care ────────────────────────────────────────────
  {
    id: "Q13",
    category: "03",
    question: {
      ja: "看護師に医療的なケアをお願いする場合、何が必要ですか？",
      en: "What is required when requesting medical care from a nurse?",
    },
    answer: {
      ja: "医療的ケアの内容によっては、医師からの具体的な指示が必要です。ご希望の内容をお電話で予約前にお知らせください。",
      en: "Depending on the nature of the medical care, specific written instructions from a physician are required. Please inform us of your requests by phone before booking.",
    },
  },
  {
    id: "Q14",
    category: "03",
    question: {
      ja: "訪問看護とCare24Japanの看護サービスは何が違いますか？",
      en: "How does Care24Japan nursing differ from standard home visit nursing?",
    },
    answer: {
      ja: "訪問看護は公的保険制度に基づくサービス、Care24Japanは保険外（自費）のサービスです。保険では対応しにくい時間や生活上のニーズにも対応します。",
      en: "Standard home nursing is bound by public insurance rules. Care24Japan is a private service that provides flexible support during hours and lifestyle scenarios difficult for public insurance to cover.",
    },
  },

  // ── 04 Pricing & Payment ─────────────────────────────────────────────────
  {
    id: "Q15",
    category: "04",
    question: {
      ja: "利用料金はいくらですか？",
      en: "How much does the service cost?",
    },
    answer: {
      // 0907 #22 — pricing URL lives in CMS answer markdown; FaqList resolves
      // `[label](/path)` via localizeHref (no hardcoded /pricing in faq-view).
      ja: "サービス内容、資格、利用時間などによって異なります。詳しくは[料金ページ](/pricing)をご確認ください。",
      en: "Rates vary depending on service content, specialist qualification, and duration. Please check our [Pricing Page](/pricing) for detailed rates.",
    },
  },
  {
    id: "Q16",
    category: "04",
    question: {
      ja: "最低利用時間はありますか？",
      en: "Is there a minimum booking duration?",
    },
    // LOCKED: must say minimum 2 hours / 最低2時間
    answer: {
      ja: "最低2時間からご利用可能です。",
      en: "Yes, services are available starting from a minimum of 2 hours.",
    },
  },
  {
    id: "Q17",
    category: "04",
    question: {
      ja: "料金はいつ支払いますか？",
      en: "When and how do I pay?",
    },
    answer: {
      ja: "お支払い方法・タイミングは予約時にご案内します。料金をご確認のうえ、お手続きをお願いします。",
      en: "Payment methods and timing instructions are provided at the time of reservation. Please proceed after confirming your booking details.",
    },
  },
  {
    id: "Q18",
    category: "04",
    question: {
      ja: "キャンセル料はかかりますか？",
      en: "Are there cancellation fees?",
    },
    answer: {
      ja: "キャンセルのタイミングによってはキャンセル料が発生します。詳しくはキャンセルポリシー（https://www.care24.jp/cancellation-policy）をご確認ください。",
      en: "Cancellation fees may apply depending on when the cancellation occurs. Please refer to our Cancellation Policy (https://www.care24.jp/cancellation-policy) for full details.",
    },
  },

  // ── 05 Reservation & Matching ────────────────────────────────────────────
  {
    id: "Q19",
    category: "05",
    question: {
      ja: "申し込みから利用までの流れを教えてください？",
      en: "What is the process from application to service delivery?",
    },
    answer: {
      ja: "ご希望のサービス・日時を登録 → ケアサポーターをマッチング → 内容を確認 → 予約成立 → サービス提供、という流れです。",
      en: "Register preferred service & schedule → Care supporter matching → Review details → Reservation confirmed → Service provided.",
    },
  },
  {
    id: "Q20",
    category: "05",
    question: {
      ja: "希望する日時に対応できる人が見つからない場合はどうなりますか？",
      en: "What happens if no supporter is available at my requested time?",
    },
    answer: {
      ja: "条件に合うケアサポーターが見つからない場合、予約を成立できないことがあります。日時や条件を変更することで対応できる場合があります。",
      en: "If no matching supporter is found, the reservation cannot be completed. Modifying your requested time frame or conditions may resolve this.",
    },
  },
  {
    id: "Q21",
    category: "05",
    question: {
      ja: "利用前にケアサポーターとサービス内容を確認できますか？",
      en: "Can I confirm details with the supporter before service begins?",
    },
    answer: {
      ja: "はい。予約成立後、ケアサポーターと事前面談をすることができます。お顔合わせや事前にお伝えしておきたいことを確認できます。",
      en: "Yes. Once the reservation is confirmed, an advance consultation/meeting can be arranged to introduce each other and verify special instructions.",
    },
  },
  {
    id: "Q22",
    category: "05",
    question: {
      ja: "サービス中に事故やトラブルが起きた場合はどうなりますか？",
      en: "What should be done if an accident or trouble occurs during service?",
    },
    answer: {
      ja: "まず安全確保を最優先に対応し、必要に応じてCare24Japanへご連絡ください（お電話：0120-001-224）。",
      en: "Ensuring immediate safety is top priority. As necessary, contact Care24Japan emergency line immediately (Phone: 0120-001-224).",
    },
  },
  {
    id: "Q23",
    category: "05",
    question: {
      ja: "当日利用は可能ですか？",
      en: "Is same-day service booking available?",
    },
    answer: {
      ja: "当日のご依頼は受け付けておりません。余裕をもってご依頼いただくと、より確実にサービスをご利用いただくことができます。",
      en: "We do not accept same-day service requests. Please book in advance to ensure successful care supporter assignment.",
    },
  },
  {
    id: "Q24",
    category: "05",
    question: {
      ja: "利用できない時間帯はありますか？",
      en: "Are there restricted hours when services cannot be used?",
    },
    answer: {
      ja: "サービスのご利用時間の制限は設けておりません。早朝や夜間のご利用には、時間外料金が加算されますので、ご注意ください。担当ヘルパーのスケジュールなどにより、ご利用いただけない場合もございます。ご了承ください。",
      en: "There are no fixed operational hour limits. Please note that surcharge fees apply for early morning or late-night services. Availability depends on supporter schedules.",
    },
  },

  // ── Scenarios S1–S5 ──────────────────────────────────────────────────────
  {
    id: "S1",
    category: "scenarios",
    question: {
      ja: "退院したばかりで、家族が仕事中の時間だけ見守ってほしいのですが？",
      en: "Can I request care during work hours right after hospital discharge?",
    },
    answer: {
      ja: "ご利用いただけます。退院直後の見守りや生活サポートなど、ご希望の時間・内容に合わせてご相談いただけます。",
      en: "Yes. We provide tailored monitoring and daily recovery support during specific hours while family members are at work.",
    },
  },
  {
    id: "S2",
    category: "scenarios",
    question: {
      ja: "母の通院に毎回付き添うのが難しいのですが？",
      en: "Is it possible to escort my mother to her regular hospital visits?",
    },
    answer: {
      ja: "通院時の付き添い、院内での移動や受付など、必要なサポートについてご相談いただけます。",
      en: "Yes. Care supporters can assist with travel accompaniment, hospital navigation, check-in, and waiting support.",
    },
  },
  {
    id: "S3",
    category: "scenarios",
    question: {
      ja: "介護保険の時間では足りない部分だけお願いできますか？",
      en: "Can I use Care24 for extra hours beyond my insurance allowance?",
    },
    answer: {
      ja: "ご利用いただけます。介護保険では対応できない時間や内容について、自費サービスとしてご利用いただけます。",
      en: "Yes. Care24 operates as a private fee service to cover extra hours or tasks restricted by public insurance limits.",
    },
  },
  {
    id: "S4",
    category: "scenarios",
    question: {
      ja: "家族が旅行に行く数日間だけ見守りをお願いできますか？",
      en: "Can you watch over my family member for a few days while we travel?",
    },
    answer: {
      ja: "ご希望の日時・内容に対応できるケアサポーターがいる場合、ご利用いただけます。",
      en: "Yes, provided a matching care supporter is available for your requested schedule and care requirements.",
    },
  },
  {
    id: "S5",
    category: "scenarios",
    question: {
      ja: "夜間に一人になる時間だけお願いできますか？",
      en: "Is night-time monitoring available when the user is alone?",
    },
    answer: {
      ja: "夜間の見守りなど、ご希望の時間帯に合わせたご依頼もご相談いただけます。",
      en: "Yes. Overnight or late-night monitoring requests can be tailored to your specific schedule (surcharge applies).",
    },
  },
];
