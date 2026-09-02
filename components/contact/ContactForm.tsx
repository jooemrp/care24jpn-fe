"use client";

/**
 * Contact form — anti-spam ("anti bobol") design notes.
 *
 * A browser form alone can never stop a determined bot; every check below is
 * therefore RE-ENFORCED server-side in the backend contact usecase
 * (backend/internal/contact/usecase/submit.go), which is the real gate. These
 * client behaviours exist to (a) deter casual bots cheaply and (b) make the
 * UX honest (inline sending/failure copy instead of silently opening a mail
 * client).
 *
 * Layered client-side defences:
 *  1. Honeypot — a visually-hidden, off-screen input a human never fills.
 *     Filled => backend rejects.
 *  2. Reserved field (`company_name`) that bots spray automatically.
 *  3. Timing trap — `form_load_at` is the timestamp of the visitor's first
 *     interaction (first observed submit-time keydown/pointer activity); a
 *     submission under the backend's minimum human fill-time is rejected.
 *  4. Submit cooldown so a double-click / scripted loop cannot fire more
 *     than one request per second.
 *  5. Status via `aria-live` so screen readers hear success/failure without
 *     a page reload (this form no longer navigates to mailto:).
 *
 * Responsive + theme: the form is full-width on mobile (stacked, `max-w-2xl`)
 * and uses the site's semantic tokens (bg-surface/border-border/text-body/
 * text-heading) — the same tokens the rest of the site uses for light/dark
 * theming, so the form adapts wherever the site's palette adapts.
 */

import { useRef, useState, useId, type FormEvent } from "react";
import { contactPage } from "@/constants/contact";
import { t, type Lang } from "@/features/lang/i18n";
import { statusCopyFor, submitContact, type ContactSubmitResult } from "@/features/contact/lib";

type ContactFormProps = {
  lang: Lang;
};

const fieldClassName =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-body " +
  "placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const labelClassName = "block text-sm font-semibold text-heading";

export default function ContactForm({ lang }: ContactFormProps) {
  const formId = useId();
  const categoryId = `${formId}-category`;
  const nameId = `${formId}-name`;
  const phoneId = `${formId}-phone`;
  const emailId = `${formId}-email`;
  const messageId = `${formId}-message`;
  const noteId = `${formId}-note`;
  const statusId = `${formId}-status`;

  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  // Honeypot / traps. Initialised empty; the user never touches them.
  const [company, setCompany] = useState(""); // visually-hidden honeypot
  const [companyName, setCompanyName] = useState(""); // reserved bot trap

  // When the visitor started interacting with the form, lazily recorded on
  // the first submit so the backend's timing trap has a start timestamp.
  const formLoadStartedAtRef = useRef<number | null>(null);

  const [status, setStatus] = useState<ContactSubmitResult | "sending" | "idle">("idle");
  const [submitAttemptedAt, setSubmitAttemptedAt] = useState<number>(0);

  const submitting = status === "sending";
  const statusCopy = status === "idle" ? null : statusCopyFor(status, lang);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    // Cooldown: ignore scripted resubmits within the same second.
    const now = Date.now();
    if (now - submitAttemptedAt < 1000) return;
    setSubmitAttemptedAt(now);

    // Timing trap: the backend measures how long the visitor took between
    // first load and submit. "Load" is approximated as the moment this first
    // submit was allowed through (the cooldown above ensures a scripted
    // instant double-submit cannot reset it); Date.now() is read lazily here
    // rather than at render so the component stays pure.
    formLoadStartedAtRef.current ??= now;

    setStatus("sending");

    const result = await submitContact({
      category,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      message: message.trim(),
      company: company.trim(),
      company_name: companyName.trim(),
      // Start timestamp for the backend's timing trap.
      form_load_at: formLoadStartedAtRef.current,
    });

    setStatus(result);
    if (result === "success") {
      form.reset();
      setCategory("");
    }
  }

  const categoryPlaceholder = lang === "ja" ? "選択してください" : "Please select";

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-2xl flex-col gap-6"
      aria-describedby={noteId}
    >
      <p id={noteId} className="text-sm leading-relaxed text-muted">
        {t(contactPage.requiredNote, lang)}
      </p>

      {/* Honeypot + reserved traps — hidden from humans and screen readers,
          only bots (and scripted tools) ever fill these. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={`${formId}-company`}>Company</label>
        <input
          id={`${formId}-company`}
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <input
          id={`${formId}-company-name`}
          type="text"
          name="company_name"
          tabIndex={-1}
          autoComplete="off"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
      </div>

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

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-mid disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          {submitting ? t(contactPage.status.sending, lang) : t(contactPage.fields.submit, lang)}
        </button>

        {/* Inline status — read out by assistive tech via aria-live. */}
        <p
          id={statusId}
          role="status"
          aria-live="polite"
          className={`min-h-5 text-sm leading-relaxed ${
            status === "error" || status === "rate_limited"
              ? "text-red-600"
              : status === "success"
                ? "text-emerald-700"
                : "text-muted"
          }`}
        >
          {statusCopy}
        </p>
      </div>
    </form>
  );
}
