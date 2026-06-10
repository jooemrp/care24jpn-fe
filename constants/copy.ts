/**
 * Care 24 Japan — All site copy lives here.
 *
 * RULES:
 * - Japanese (`ja`) is primary; English (`en`) renders beneath as a small
 *   uppercase secondary label.
 * - Never hardcode copy inside components — import from this file.
 * - All values below are EDITABLE PLACEHOLDERS. Replace with final copy.
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
  { href: "/service-details", label: { ja: "サービス内容", en: "Service Details" } },
  { href: "/pricing", label: { ja: "料金 Page2", en: "Pricing" } },
  { href: "/fees", label: { ja: "料金 Giver", en: "Fees" } },
];

/** Shared call-to-action buttons reused across pages. */
export const cta = {
  primary: { ja: "無料相談を予約する", en: "Book a free consultation" } satisfies Bilingual,
  secondary: { ja: "料金を見る", en: "View pricing" } satisfies Bilingual,
  contact: { ja: "お問い合わせ", en: "Contact us" } satisfies Bilingual,
};

/* ------------------------------------------------------------------ */
/* Homepage                                                            */
/* ------------------------------------------------------------------ */

export const home = {
  hero: {
    badge: {
      ja: "完全\nオーダーメイド型\n看護で",
      en: "Complete\nPersonalized\nNursing Care",
    } satisfies Bilingual,
    resolve: {
      ja: "不安やお困りごとをすべて解消",
      en: "We will resolve all your anxieties and concerns.",
    } satisfies Bilingual,
    heading: {
      ja: "公的介護保険を使わない、在宅介護の家事支援サービス",
      en: "Home care and household support services that do not use public long-term care insurance.",
    } satisfies Bilingual,
    body: {
      ja: "",
      en: "",
    } satisfies Bilingual,
    imageAlt: {
      ja: "窓辺で介護スタッフと穏やかに過ごす高齢の女性",
      en: "An elderly woman resting calmly by a window with a care professional",
    } satisfies Bilingual,
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

  // Used only by the (currently CMS-driven, not yet live) HomeView fallback.
  closing: {
    heading: {
      ja: "まずは、お話を聞かせてください。",
      en: "Let's talk about what you need",
    } satisfies Bilingual,
    body: {
      ja: "ご相談は無料です。専門スタッフが丁寧にお伺いし、最適なプランをご提案します。",
      en: "Consultations are free. We'll listen carefully and propose the right plan.",
    } satisfies Bilingual,
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
      ja: "介護も家事もまるっとお任せ",
      en: "Leave both caregiving and housework entirely to us.",
    } satisfies Bilingual,
    price: {
      label: { ja: "日中基本料金", en: "Daytime base rate" } satisfies Bilingual,
      hours: { ja: "（9:00〜18:00）", en: "(9:00–18:00)" } satisfies Bilingual,
      amount: { ja: "3,200円", en: "¥3,200" } satisfies Bilingual,
      unit: { ja: "/時間", en: "/hour" } satisfies Bilingual,
      taxNote: { ja: "税抜", en: "excl. tax" } satisfies Bilingual,
      taxIncluded: { ja: "税込価格 3,520円", en: "Tax included ¥3,520" } satisfies Bilingual,
    },
    fees: [
      {
        label: { ja: "最低利用時間", en: "Minimum usage" } satisfies Bilingual,
        value: { ja: "2時間から", en: "From 2 hours" } satisfies Bilingual,
      },
      {
        label: { ja: "指名料", en: "Nomination fee" } satisfies Bilingual,
        value: { ja: "330円/時間", en: "¥330/hour" } satisfies Bilingual,
        note: { ja: "※定期の方は指名無料", en: "*Free for regular clients" } satisfies Bilingual,
      },
      {
        label: { ja: "往復交通費", en: "Round-trip transport" } satisfies Bilingual,
        value: { ja: "別途990円", en: "¥990 separately" } satisfies Bilingual,
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
    price: {
      label: { ja: "日中基本料金", en: "Daytime base rate" } satisfies Bilingual,
      hours: { ja: "（9:00〜18:00）", en: "(9:00–18:00)" } satisfies Bilingual,
      amount: { ja: "5,000円", en: "¥5,000" } satisfies Bilingual,
      unit: { ja: "/時間", en: "/hour" } satisfies Bilingual,
      taxNote: { ja: "税抜", en: "excl. tax" } satisfies Bilingual,
      taxIncluded: { ja: "税込価格 5,500円", en: "Tax included ¥5,500" } satisfies Bilingual,
    },
    note: {
      ja: "※詳しくは料金表をご覧ください。",
      en: "*Please see the price list for details.",
    } satisfies Bilingual,
    panel: {
      heading: {
        ja: "介護コースの内容に加えて\n医療行為に対応",
        en: "In addition to the caregiving course, medical care is provided.",
      } satisfies Bilingual,
      items: [
        { ja: "バイタル測定・健康状態の管理", en: "Vital checks and health monitoring" } satisfies Bilingual,
        { ja: "医療処置（たん吸引や経管栄養）", en: "Medical procedures (suctioning, tube feeding)" } satisfies Bilingual,
        { ja: "お薬の管理・相談", en: "Medication management and consultation" } satisfies Bilingual,
        { ja: "療養生活の相談・支援", en: "Recuperation guidance and support" } satisfies Bilingual,
        { ja: "終末期ケア・緩和ケア", en: "End-of-life and palliative care" } satisfies Bilingual,
        { ja: "医療機関との連携", en: "Coordination with medical institutions" } satisfies Bilingual,
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
    timelines: [
      {
        title: { ja: "介護コースの一日", en: "A day on the caregiving course" } satisfies Bilingual,
        steps: [
          {
            time: "10:00〜",
            icon: "care",
            label: { ja: "身のまわりの\nお世話・家事", en: "Personal care\nand housework" } satisfies Bilingual,
          },
          {
            time: "12:30〜",
            icon: "medication",
            label: { ja: "お食事・お薬の\nご用意", en: "Meal and\nmedication prep" } satisfies Bilingual,
          },
          {
            time: "13:30〜",
            icon: "outing",
            label: { ja: "散歩・お買い物", en: "Walks and shopping" } satisfies Bilingual,
          },
        ],
      },
      {
        title: { ja: "看護コースの一日", en: "A day on the nursing course" } satisfies Bilingual,
        steps: [
          {
            time: "10:00〜",
            icon: "outing",
            label: { ja: "通院サポート\n（診察のお付き添い）", en: "Hospital-visit support\n(accompanying consultations)" } satisfies Bilingual,
          },
          {
            time: "12:00〜",
            icon: "medication",
            label: { ja: "薬の管理", en: "Medication management" } satisfies Bilingual,
          },
          {
            time: "13:00〜",
            icon: "injection",
            label: { ja: "インシュリン注射\n食事介助", en: "Insulin injection\nand meal assistance" } satisfies Bilingual,
          },
          {
            time: "15:00〜",
            icon: "rehab",
            label: { ja: "散歩\nリハビリテーション", en: "Walks and\nrehabilitation" } satisfies Bilingual,
          },
        ],
      },
    ],
  },

  flow: {
    heading: { ja: "ご利用の流れ", en: "How it works" } satisfies Bilingual,
    steps: [
      {
        number: "01",
        icon: "contact",
        title: { ja: "お問い合わせ", en: "Inquiry" } satisfies Bilingual,
        body: {
          ja: "お電話やWEBからまずはお気軽にお問い合わせください。\nお客様のご質問・ご要望に丁寧にお答えします。",
          en: "Please feel free to contact us by phone or through our website. We will carefully answer your questions and requests.",
        } satisfies Bilingual,
        hasCta: true,
      },
      {
        number: "02",
        icon: "register",
        title: { ja: "ご登録", en: "Register" } satisfies Bilingual,
        body: {
          ja: "お客様のご要望やお体の状況をご入力いただき、最適なスタッフの選定を行います。",
          en: "Please enter your requests and physical condition, and we will select the most suitable staff member for you.",
        } satisfies Bilingual,
      },
      {
        number: "03",
        icon: "confirm",
        title: { ja: "ご予約の確定", en: "Reservation Confirmation" } satisfies Bilingual,
        body: {
          ja: "ご予約が確定しましたら、メール・お電話にてご連絡いたします。\n事前に指定の方法でご入金をお願いします。",
          en: "Once your reservation is confirmed, we will contact you by email or phone. Please make your payment using the method specified in advance.",
        } satisfies Bilingual,
      },
      {
        number: "04",
        icon: "start",
        title: { ja: "サービス開始", en: "Service Launch" } satisfies Bilingual,
        body: {
          ja: "ご予約の日時にスタッフがご自宅へお伺いします。",
          en: "A staff member will visit your home at the scheduled time.",
        } satisfies Bilingual,
      },
      {
        number: "05",
        icon: "report",
        title: { ja: "終了ご報告", en: "Completion Report" } satisfies Bilingual,
        body: {
          ja: "サービスが終了次第、スタッフよりサービス内容のご報告をお送りしますのでご感想などご入力ください。\n問題がなければ以上で終了となります。",
          en: "Once the service has ended, our staff will send you a report detailing the service, so please feel free to provide any feedback you may have. If there are no problems, this concludes the process.",
        } satisfies Bilingual,
      },
    ],
  },

  contact: {
    leadIn: { ja: "ご相談は無料です", en: "Consultations are free of charge." } satisfies Bilingual,
    heading: {
      ja: "お気軽にお問い合わせください",
      en: "Please feel free to contact us.",
    } satisfies Bilingual,
    phone: "0120-00-0000",
    hours: {
      ja: "【受付時間】平日 9:00〜18:00",
      en: "[Reception Hours] Weekdays 9:00 AM – 6:00 PM",
    } satisfies Bilingual,
    isms: {
      ja: "メディカルインフォグラフィックス株式会社は情報セキュリティマネジメントシステム（ISMS）の国際規格である「ISO27001」を取得しております。",
      en: "Medical Infographics Co., Ltd. has obtained ISO27001, the international standard for information security management systems (ISMS).",
    } satisfies Bilingual,
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
      ja: "お問い合わせからケア開始まで、4つのステップで進みます。",
      en: "From first contact to care, in four simple steps.",
    } satisfies Bilingual,
  },
  steps: [
    {
      title: { ja: "お問い合わせ", en: "Get in touch" } satisfies Bilingual,
      body: {
        ja: "お電話またはフォームから、お気軽にご相談ください。",
        en: "Reach out by phone or our contact form — no obligation.",
      } satisfies Bilingual,
    },
    {
      title: { ja: "無料アセスメント", en: "Free assessment" } satisfies Bilingual,
      body: {
        ja: "専門スタッフがご自宅に伺い、必要なケアを丁寧に確認します。",
        en: "A professional visits your home to assess care needs.",
      } satisfies Bilingual,
    },
    {
      title: { ja: "ケアプランのご提案", en: "Personalized plan" } satisfies Bilingual,
      body: {
        ja: "ご希望とご予算に合わせた最適なケアプランをご提案します。",
        en: "We propose a plan tailored to your wishes and budget.",
      } satisfies Bilingual,
    },
    {
      title: { ja: "ケアの開始", en: "Care begins" } satisfies Bilingual,
      body: {
        ja: "担当スタッフが決まり、安心のケアがスタートします。",
        en: "Your dedicated caregiver begins, and support starts.",
      } satisfies Bilingual,
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Staff pricing                                                       */
/* ------------------------------------------------------------------ */

export const staffPricing = {
  hero: {
    heading: { ja: "料金", en: "Pricing" } satisfies Bilingual,
    body: {
      ja: "わかりやすい料金体系で、安心してご利用いただけます。すべて税込価格です。",
      en: "Transparent, all-inclusive pricing. Prices include tax.",
    } satisfies Bilingual,
  },
  note: {
    ja: "※ 表示価格はすべて税込です。ご利用内容により変動する場合があります。",
    en: "All prices include tax and may vary based on care requirements.",
  } satisfies Bilingual,
};

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

export const pricing = {
  hero: {
    heading: { ja: "スタッフ料金", en: "Staff rates" } satisfies Bilingual,
    body: {
      ja: "資格や対応内容に応じたスタッフごとの時間単価です。",
      en: "Hourly rates by caregiver qualification and scope of care.",
    } satisfies Bilingual,
  },
  note: {
    ja: "※ 深夜・早朝（22:00〜6:00）は割増料金となります。",
    en: "Night and early-morning hours (22:00–6:00) are charged at a premium.",
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
  columns: [
    {
      title: { ja: "メニュー", en: "Menu" } satisfies Bilingual,
      links: [
        { href: "/", label: { ja: "ホーム", en: "Home" } },
        { href: "/service-details", label: { ja: "サービス内容", en: "Service Details" } },
        { href: "/service-flow", label: { ja: "ご利用の流れ", en: "Service flow" } },
        { href: "/pricing", label: { ja: "料金 Page2", en: "Pricing" } },
        { href: "/fees", label: { ja: "料金 Giver", en: "Fees" } },
      ],
    },
  ],
  contact: {
    title: { ja: "お問い合わせ", en: "Contact" } satisfies Bilingual,
    phoneLabel: { ja: "電話", en: "Phone" } satisfies Bilingual,
    phone: "0120-000-000",
    hoursLabel: { ja: "受付時間", en: "Hours" } satisfies Bilingual,
    hours: { ja: "24時間 365日対応", en: "24/7, 365 days" } satisfies Bilingual,
    addressLabel: { ja: "所在地", en: "Address" } satisfies Bilingual,
    address: { ja: "東京都千代田区0-0-0", en: "0-0-0 Chiyoda, Tokyo" } satisfies Bilingual,
  },
  legal: {
    ja: "© 2026 Care 24 Japan. All rights reserved.",
    en: "© 2026 Care 24 Japan. All rights reserved.",
  } satisfies Bilingual,
};
