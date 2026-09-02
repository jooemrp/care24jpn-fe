/**
 * Care 24 Japan — Contact page copy & form configuration.
 *
 * Source: "【English explanation】Care 24 Japan Webpage revision 26th Aug 2026.pdf"
 * Section 6 — Contact page + Image Ref 7 two-column layout.
 *
 * RULES:
 * - Never hardcode contact form copy inside components — import from this file.
 * - `mailto` (below) is informational only: the form no longer hands off to
 *   the visitor's mail client. Submissions POST to /api/contact, which the
 *   backend's contact module delivers to `info@care24.jp` by SMTP.
 */

import type { Bilingual } from "./copy";
import { contactPhone } from "./copy";

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

/** Copy for the inline submission status rendered inside ContactForm. */
export type ContactFormStatus = {
  sending: Bilingual;
  success: Bilingual;
  error: Bilingual;
  rateLimited: Bilingual;
};

export const contactPage = {
  heading: { ja: "お問い合わせ", en: "Contact us" } satisfies Bilingual,
  intro: {
    ja: "お急ぎの方はお電話をご利用ください。営業時間外や内容を整理してご相談されたい場合は、下記フォームをご利用いただけます。",
    en: "If you are in a hurry, please call us. Outside business hours, or if you prefer to organize your thoughts first, use the form below.",
  } satisfies Bilingual,
  mailto: "info@care24.jp",
  phone: {
    badge: { ja: "お急ぎの方へ", en: "For those in a hurry" } satisfies Bilingual,
    title: { ja: "お電話でのお問い合わせ", en: "Inquiry by phone" } satisfies Bilingual,
    body: {
      ja: "サービス利用のご相談や空き状況の確認など、お急ぎの場合はお電話がスムーズです。",
      en: "For service consultations or availability checks, calling is often the fastest option.",
    } satisfies Bilingual,
    telLabel: { ja: "TEL", en: "TEL" } satisfies Bilingual,
    number: contactPhone.display,
    hours: {
      ja: "受付時間：平日 9:00〜18:00",
      en: "Reception hours: Weekdays 9:00–18:00",
    } satisfies Bilingual,
    bullets: [
      {
        ja: "ご家族からのご相談も歓迎しています",
        en: "Consultations from family members are welcome",
      },
      {
        ja: "ケアマネジャー・相談員の皆さまからのご連絡も承っております",
        en: "We also accept calls from care managers and consultants",
      },
    ] satisfies Bilingual[],
  },
  form: {
    badge: { ja: "営業時間外も受付", en: "Accepted outside business hours" } satisfies Bilingual,
    title: { ja: "フォームでのお問い合わせ", en: "Inquiry by form" } satisfies Bilingual,
    body: {
      ja: "内容を整理して相談したい方や、営業時間外にご連絡されたい方はフォームをご利用ください。",
      en: "Use the form if you want to organize your details first, or contact us outside business hours.",
    } satisfies Bilingual,
    bullets: [
      { ja: "サービス利用についてのご相談", en: "Consultation about using the service" },
      { ja: "空き状況についてのお問い合わせ", en: "Availability inquiries" },
      { ja: "採用に関するお問い合わせ", en: "Recruitment inquiries" },
      { ja: "その他のご相談全般", en: "Other general inquiries" },
    ] satisfies Bilingual[],
    followUp: {
      ja: "送信内容を確認のうえ、担当者より折り返しご連絡いたします。",
      en: "After reviewing your message, a representative will get back to you.",
    } satisfies Bilingual,
  },
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
    submit: { ja: "送信する", en: "Send" },
  } satisfies ContactPageFields,
  // Submission status copy rendered inside the form after the user hits Send.
  // The mailto wording is gone: submissions now POST to the site's contact
  // proxy (/api/contact), which relays to the backend, which emails
  // info@care24.jp by SMTP.
  status: {
    sending: { ja: "送信中…", en: "Sending…" } satisfies Bilingual,
    success: {
      ja: "お問い合わせを受け付けました。担当者より折り返しご連絡いたします。",
      en: "Your inquiry was received. A representative will get back to you.",
    } satisfies Bilingual,
    error: {
      ja: "送信に失敗しました。しばらくしてから再度お試しください。",
      en: "Failed to send. Please try again in a moment.",
    } satisfies Bilingual,
    rateLimited: {
      ja: "短時間に送信が多すぎます。しばらくしてから再度お試しください。",
      en: "Too many submissions. Please try again later.",
    } satisfies Bilingual,
  },
  errors: {
    required: {
      ja: "必須項目です。",
      en: "This field is required.",
    },
    category: {
      ja: "問い合わせ種別を選択してください。",
      en: "Please select an inquiry category.",
    },
    email: {
      ja: "有効なメールアドレスを入力してください。",
      en: "Please enter a valid email address.",
    },
    phone: {
      ja: "電話番号は8〜24文字で、数字と一般的な記号のみ使用できます。",
      en: "Phone must be 8–24 characters using digits and common symbols only.",
    },
    messageMin: {
      ja: "問い合わせ内容は10文字以上で入力してください。",
      en: "Please enter at least 10 characters.",
    },
    messageMax: {
      ja: "問い合わせ内容が長すぎます。",
      en: "Message is too long.",
    },
    nameMax: {
      ja: "氏名が長すぎます。",
      en: "Name is too long.",
    },
  },
  requiredNote: {
    ja: "すべて必須項目です。",
    en: "All fields are required.",
  } satisfies Bilingual,
};
