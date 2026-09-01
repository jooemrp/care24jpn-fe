"use client";

import { useId, useState, type FormEvent } from "react";
import { contactPage } from "@/constants/contact";
import { t, type Lang } from "@/features/lang/i18n";

type ContactFormProps = {
  lang: Lang;
};

const fieldClassName =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-body " +
  "placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const labelClassName = "block text-sm font-semibold text-heading";

function buildMailtoUrl(
  lang: Lang,
  values: {
    categoryLabel: string;
    name: string;
    phone: string;
    email: string;
    message: string;
  },
): string {
  const subject =
    lang === "ja"
      ? `[${values.categoryLabel}] お問い合わせ — ${values.name}`
      : `[${values.categoryLabel}] Inquiry — ${values.name}`;

  const bodyLines =
    lang === "ja"
      ? [
          `${t(contactPage.fields.category, lang)}: ${values.categoryLabel}`,
          `${t(contactPage.fields.name, lang)}: ${values.name}`,
          `${t(contactPage.fields.phone, lang)}: ${values.phone}`,
          `${t(contactPage.fields.email, lang)}: ${values.email}`,
          "",
          `${t(contactPage.fields.message, lang)}:`,
          values.message,
        ]
      : [
          `${t(contactPage.fields.category, lang)}: ${values.categoryLabel}`,
          `${t(contactPage.fields.name, lang)}: ${values.name}`,
          `${t(contactPage.fields.phone, lang)}: ${values.phone}`,
          `${t(contactPage.fields.email, lang)}: ${values.email}`,
          "",
          `${t(contactPage.fields.message, lang)}:`,
          values.message,
        ];

  const params = new URLSearchParams({
    subject,
    body: bodyLines.join("\n"),
  });

  return `mailto:${contactPage.mailto}?${params.toString()}`;
}

export default function ContactForm({ lang }: ContactFormProps) {
  const formId = useId();
  const categoryId = `${formId}-category`;
  const nameId = `${formId}-name`;
  const phoneId = `${formId}-phone`;
  const emailId = `${formId}-email`;
  const messageId = `${formId}-message`;
  const noteId = `${formId}-note`;

  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const selectedCategory = contactPage.categories.find((item) => item.value === category);
    if (!selectedCategory) {
      form.reportValidity();
      return;
    }

    window.location.href = buildMailtoUrl(lang, {
      categoryLabel: t(selectedCategory.label, lang),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      message: message.trim(),
    });
  }

  const categoryPlaceholder =
    lang === "ja" ? "選択してください" : "Please select";

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-2xl flex-col gap-6"
      aria-describedby={noteId}
    >
      <p id={noteId} className="text-sm leading-relaxed text-muted">
        {t(contactPage.requiredNote, lang)}
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor={categoryId} className={labelClassName}>
          {t(contactPage.fields.category, lang)}
        </label>
        <select
          id={categoryId}
          name="category"
          required
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className={fieldClassName}
          aria-required="true"
        >
          <option value="" disabled>
            {categoryPlaceholder}
          </option>
          {contactPage.categories.map((item) => (
            <option key={item.value} value={item.value}>
              {t(item.label, lang)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={nameId} className={labelClassName}>
          {t(contactPage.fields.name, lang)}
        </label>
        <input
          id={nameId}
          name="name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={fieldClassName}
          aria-required="true"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={phoneId} className={labelClassName}>
          {t(contactPage.fields.phone, lang)}
        </label>
        <input
          id={phoneId}
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={fieldClassName}
          aria-required="true"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={emailId} className={labelClassName}>
          {t(contactPage.fields.email, lang)}
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={fieldClassName}
          aria-required="true"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={messageId} className={labelClassName}>
          {t(contactPage.fields.message, lang)}
        </label>
        <textarea
          id={messageId}
          name="message"
          required
          rows={6}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={`${fieldClassName} min-h-36 resize-y`}
          aria-required="true"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-mid sm:w-auto"
        >
          {t(contactPage.fields.submit, lang)}
        </button>
      </div>
    </form>
  );
}
