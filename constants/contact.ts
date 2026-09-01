/**
 * Care 24 Japan — Contact page copy & form configuration.
 *
 * Source: "【English explanation】Care 24 Japan Webpage revision 26th Aug 2026.pdf"
 * Section 6 — Contact page (mailto v1).
 *
 * RULES:
 * - Never hardcode contact form copy inside components — import from this file.
 * - `mailto` is the destination address for the mailto: handoff (no server endpoint).
 */

import type { Bilingual } from "./copy";

export type ContactCategory = {
  value: string;
  label: Bilingual;
};

export type ContactPageFields = {
  category: Bilingual;
  name: Bilingual;
  phone: Bilingual;
  email: Bilingual;
  message: Bilingual;
  submit: Bilingual;
};

export const contactPage = {
  heading: { ja: "お問い合わせ", en: "Contact us" } satisfies Bilingual,
  mailto: "info@care24.jp",
  categories: [
    { value: "services", label: { ja: "サービスについて", en: "About Services" } },
    {
      value: "recruitment",
      label: { ja: "ケアサポーターの採用について", en: "Care Supporter Recruitment" },
    },
    { value: "other", label: { ja: "その他", en: "Other" } },
  ] satisfies ContactCategory[],
  fields: {
    category: { ja: "問い合わせ種別", en: "Inquiry Category" },
    name: { ja: "氏名", en: "Full Name" },
    phone: { ja: "電話番号", en: "Phone Number" },
    email: { ja: "メールアドレス", en: "Email Address" },
    message: { ja: "問い合わせ内容", en: "Message / Details" },
    submit: { ja: "メールアプリで送信", en: "Send via email app" },
  } satisfies ContactPageFields,
  requiredNote: {
    ja: "すべて必須項目です。送信するとメールアプリが開きます。",
    en: "All fields are required. Submitting opens your email app.",
  } satisfies Bilingual,
};
