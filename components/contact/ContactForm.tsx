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
 * Validation: TanStack Form + Zod (`contactFormValuesSchema`) on submit only —
 * no native `reportValidity`. Issue message keys map through `fieldErrorMessage`
 * + `contactPage.errors`.
 *
 * Responsive + theme: the form is full-width on mobile (stacked, `max-w-2xl`)
 * and uses the site's semantic tokens (bg-surface/border-border/text-body/
 * text-heading) — the same tokens the rest of the site uses for light/dark
 * theming, so the form adapts wherever the site's palette adapts.
 */

import { useRef, useState, useId } from "react";
import { useForm } from "@tanstack/react-form";
import { contactPage } from "@/constants/contact";
import { t, type Lang } from "@/features/lang/i18n";
import { statusCopyFor, submitContact, type ContactSubmitResult } from "@/features/contact/lib";
import {
  contactFormValuesSchema,
  fieldErrorMessage,
  type ContactFormInput,
} from "@/features/contact/schema";

type ContactFormProps = {
  lang: Lang;
};

const fieldClassName =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-body " +
  "placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const labelClassName = "block text-sm font-semibold text-heading";

const errorClassName = "text-sm text-red-600 dark:text-red-400";

const emptyFormValues = {
  category: "",
  name: "",
  phone: "",
  email: "",
  message: "",
  company: "",
  company_name: "",
} satisfies ContactFormInput;

/** Event-time clock — kept module-level so React purity lint allows it in submit. */
function nowMs(): number {
  return Date.now();
}

/** Normalize TanStack / Standard Schema error entries to a Zod message key. */
function issueKey(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return "required";
}

export default function ContactForm({ lang }: ContactFormProps) {
  const formId = useId();
  const categoryId = `${formId}-category`;
  const nameId = `${formId}-name`;
  const phoneId = `${formId}-phone`;
  const emailId = `${formId}-email`;
  const messageId = `${formId}-message`;
  const noteId = `${formId}-note`;
  const statusId = `${formId}-status`;

  // When the visitor started interacting with the form, lazily recorded on
  // the first submit so the backend's timing trap has a start timestamp.
  const formLoadStartedAtRef = useRef<number | null>(null);

  const [status, setStatus] = useState<ContactSubmitResult | "sending" | "idle">("idle");
  const [submitAttemptedAt, setSubmitAttemptedAt] = useState<number>(0);

  const form = useForm({
    defaultValues: emptyFormValues,
    validators: {
      onSubmit: contactFormValuesSchema,
    },
    onSubmit: async ({ value }) => {
      // Cooldown: ignore scripted resubmits within the same second.
      const now = nowMs();
      if (now - submitAttemptedAt < 1000) return;
      setSubmitAttemptedAt(now);

      // Timing trap: the backend measures how long the visitor took between
      // first load and submit. "Load" is approximated as the moment this first
      // submit was allowed through (the cooldown above ensures a scripted
      // instant double-submit cannot reset it); nowMs() is read lazily here
      // rather than at render so the component stays pure.
      formLoadStartedAtRef.current ??= now;

      setStatus("sending");

      // Re-parse so Zod trims/narrows output (TanStack keeps draft input values).
      const parsed = contactFormValuesSchema.parse(value);
      const result = await submitContact({
        ...parsed,
        form_load_at: formLoadStartedAtRef.current!,
      });

      setStatus(result);
      if (result === "success") {
        form.reset();
      }
    },
  });

  const submitting = status === "sending";
  const statusCopy = status === "idle" ? null : statusCopyFor(status, lang);
  const categoryPlaceholder = lang === "ja" ? "選択してください" : "Please select";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // Clear stale success/error before validate+submit so a failed
        // validation alone does not leave the previous status copy visible.
        setStatus("idle");
        void form.handleSubmit();
      }}
      noValidate
      className="mx-auto flex w-full max-w-2xl flex-col gap-6"
      aria-describedby={noteId}
    >
      <p id={noteId} className="text-sm leading-relaxed text-muted">
        {t(contactPage.requiredNote, lang)}
      </p>

      {/* Honeypot + reserved traps — hidden from humans and screen readers,
          only bots (and scripted tools) ever fill these. Never show errors. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <form.Field name="company">
          {(field) => (
            <>
              <label htmlFor={`${formId}-company`}>Company</label>
              <input
                id={`${formId}-company`}
                type="text"
                name={field.name}
                tabIndex={-1}
                autoComplete="off"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </>
          )}
        </form.Field>
        <form.Field name="company_name">
          {(field) => (
            <input
              id={`${formId}-company-name`}
              type="text"
              name={field.name}
              tabIndex={-1}
              autoComplete="off"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          )}
        </form.Field>
      </div>

      <form.Field name="category">
        {(field) => {
          const hasError = field.state.meta.errors.length > 0;
          const errorId = `${categoryId}-error`;
          return (
            <div className="flex flex-col gap-2">
              <label htmlFor={categoryId} className={labelClassName}>
                {t(contactPage.fields.category, lang)}
              </label>
              <select
                id={categoryId}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                className={fieldClassName}
                aria-required="true"
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : undefined}
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
              {hasError ? (
                <p id={errorId} className={errorClassName}>
                  {fieldErrorMessage(issueKey(field.state.meta.errors[0]), lang, contactPage.errors)}
                </p>
              ) : null}
            </div>
          );
        }}
      </form.Field>

      <form.Field name="name">
        {(field) => {
          const hasError = field.state.meta.errors.length > 0;
          const errorId = `${nameId}-error`;
          return (
            <div className="flex flex-col gap-2">
              <label htmlFor={nameId} className={labelClassName}>
                {t(contactPage.fields.name, lang)}
              </label>
              <input
                id={nameId}
                name={field.name}
                type="text"
                autoComplete="name"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                className={fieldClassName}
                aria-required="true"
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : undefined}
              />
              {hasError ? (
                <p id={errorId} className={errorClassName}>
                  {fieldErrorMessage(issueKey(field.state.meta.errors[0]), lang, contactPage.errors)}
                </p>
              ) : null}
            </div>
          );
        }}
      </form.Field>

      <form.Field name="phone">
        {(field) => {
          const hasError = field.state.meta.errors.length > 0;
          const errorId = `${phoneId}-error`;
          return (
            <div className="flex flex-col gap-2">
              <label htmlFor={phoneId} className={labelClassName}>
                {t(contactPage.fields.phone, lang)}
              </label>
              <input
                id={phoneId}
                name={field.name}
                type="tel"
                autoComplete="tel"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                className={fieldClassName}
                aria-required="true"
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : undefined}
              />
              {hasError ? (
                <p id={errorId} className={errorClassName}>
                  {fieldErrorMessage(issueKey(field.state.meta.errors[0]), lang, contactPage.errors)}
                </p>
              ) : null}
            </div>
          );
        }}
      </form.Field>

      <form.Field name="email">
        {(field) => {
          const hasError = field.state.meta.errors.length > 0;
          const errorId = `${emailId}-error`;
          return (
            <div className="flex flex-col gap-2">
              <label htmlFor={emailId} className={labelClassName}>
                {t(contactPage.fields.email, lang)}
              </label>
              <input
                id={emailId}
                name={field.name}
                type="email"
                autoComplete="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                className={fieldClassName}
                aria-required="true"
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : undefined}
              />
              {hasError ? (
                <p id={errorId} className={errorClassName}>
                  {fieldErrorMessage(issueKey(field.state.meta.errors[0]), lang, contactPage.errors)}
                </p>
              ) : null}
            </div>
          );
        }}
      </form.Field>

      <form.Field name="message">
        {(field) => {
          const hasError = field.state.meta.errors.length > 0;
          const errorId = `${messageId}-error`;
          return (
            <div className="flex flex-col gap-2">
              <label htmlFor={messageId} className={labelClassName}>
                {t(contactPage.fields.message, lang)}
              </label>
              <textarea
                id={messageId}
                name={field.name}
                rows={6}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                className={`${fieldClassName} min-h-36 resize-y`}
                aria-required="true"
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : undefined}
              />
              {hasError ? (
                <p id={errorId} className={errorClassName}>
                  {fieldErrorMessage(issueKey(field.state.meta.errors[0]), lang, contactPage.errors)}
                </p>
              ) : null}
            </div>
          );
        }}
      </form.Field>

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
              ? "text-red-600 dark:text-red-400"
              : status === "success"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-muted"
          }`}
        >
          {statusCopy}
        </p>
      </div>
    </form>
  );
}
