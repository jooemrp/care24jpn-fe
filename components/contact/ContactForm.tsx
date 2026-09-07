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
 *  1. Honeypot fields (`company` / `company_name`) exist only in the JSON
 *     payload — never as autofillable DOM inputs. Password managers and form
 *     fillers spray every text input (even renamed/hidden ones) and caused
 *     false rejects (backend: contact: honeypot triggered). Humans always
 *     send empty strings from JS; naive API spray bots that fill `company`
 *     are still rejected server-side.
 *  2. Timing trap — `form_load_at` is the form-mount timestamp (page render).
 *     The backend rejects submissions faster than its minimum human fill-time
 *     (~4s when enabled). Never stamp this at submit time — that always fails.
 *  3. Submit cooldown so a double-click / scripted loop cannot fire more
 *     than one request per second.
 *  4. Status via `aria-live` so screen readers hear success/failure without
 *     a page reload (this form no longer navigates to mailto:).
 *
 * Validation: TanStack Form + Zod (`contactFormValuesSchema`) on submit only —
 * no native `reportValidity`. Issue message keys map through `fieldErrorMessage`
 * + CMS-provided contact error copy.
 *
 * Responsive + semantic tokens: the form is full-width on mobile (stacked,
 * `max-w-2xl`) and uses the site's light palette (bg-surface/border-border/
 * text-body/text-heading) consistently with the rest of the site.
 */

import { useRef, useState, useId, useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import type { ContactPageContent } from "@/features/contact/content-contract";
import { t, type Lang } from "@/features/lang/i18n";
import { useContactMutation } from "@/features/contact/hooks";
import {
  isContactFailure,
  statusCopyFor,
  type ContactSubmitResult,
} from "@/features/contact/lib";
import {
  contactFormValuesSchema,
  fieldErrorMessage,
  type ContactFormInput,
} from "@/features/contact/schema";

type ContactFormProps = {
  lang: Lang;
  content: ContactPageContent;
};

const fieldClassName =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-body " +
  "placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const labelClassName = "block text-sm font-semibold text-heading";

const errorClassName = "text-sm text-red-600";

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

export default function ContactForm({ lang, content }: ContactFormProps) {
  const formId = useId();
  const categoryId = `${formId}-category`;
  const nameId = `${formId}-name`;
  const phoneId = `${formId}-phone`;
  const emailId = `${formId}-email`;
  const messageId = `${formId}-message`;
  const noteId = `${formId}-note`;
  const statusId = `${formId}-status`;

  // Backend timing trap: elapsed = now - form_load_at must be >= ~4s.
  // Stamp at mount (page render), never at submit — submit-time stamps always
  // fail because network RTT is far below the minimum fill window.
  const formLoadStartedAtRef = useRef<number | null>(null);
  useEffect(() => {
    formLoadStartedAtRef.current = Date.now();
  }, []);

  const [status, setStatus] = useState<ContactSubmitResult | "sending" | "idle">("idle");
  const [submitAttemptedAt, setSubmitAttemptedAt] = useState<number>(0);
  const contactMutation = useContactMutation();

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

      const formLoadAt = formLoadStartedAtRef.current ?? now;
      // Mirror backend minFormFill (~4s) so humans see a clear message instead
      // of an opaque upstream reject when autofill/submit is near-instant.
      if (now - formLoadAt < 4000) {
        setStatus({
          status: "error",
          code: "too_fast",
          message: "That was too fast. Please wait a few seconds and try again.",
        });
        return;
      }
      setStatus("sending");

      // Re-parse so Zod trims/narrows output (TanStack keeps draft input values).
      const parsed = contactFormValuesSchema.parse(value);
      try {
        const result = await contactMutation.mutateAsync({
          ...parsed,
          // Never trust DOM/autofill for honeypot fields — always empty from JS.
          // Backend still rejects non-empty company on direct API spam.
          company: "",
          company_name: "",
          form_load_at: formLoadAt,
        });

        setStatus(result);
        if (result.status === "success") {
          form.reset();
        }
      } catch {
        setStatus({
          status: "error",
          code: "unavailable",
          message: "Contact service unavailable, please try again later.",
        });
      }
    },
  });

  const submitting = status === "sending" || contactMutation.isPending;
  const statusCopy = status === "idle" ? null : statusCopyFor(status, lang, content.status);
  const categoryPlaceholder = t(content.categoryPlaceholder, lang);
  const statusIsFailure = status !== "idle" && status !== "sending" && isContactFailure(status);
  const statusIsSuccess = status !== "idle" && status !== "sending" && status.status === "success";

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
      className="mx-auto flex w-full max-w-2xl flex-col gap-6 md:gap-7"
      aria-describedby={noteId}
    >
      <p id={noteId} className="text-sm leading-relaxed text-muted">
        {t(content.requiredNote, lang)}
      </p>

      {/* Honeypot is payload-only (company/company_name forced "" on submit).
          No honeypot <input> in the DOM — autofill/form-fillers fill every
          text input and caused false backend honeypot rejects. */}

      <form.Field name="category">
        {(field) => {
          const hasError = field.state.meta.errors.length > 0;
          const errorId = `${categoryId}-error`;
          return (
            <div className="flex flex-col gap-2">
              <label htmlFor={categoryId} className={labelClassName}>
                {t(content.fields.category, lang)}
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
                {content.categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {t(item.label, lang)}
                  </option>
                ))}
              </select>
              {hasError ? (
                <p id={errorId} className={errorClassName}>
                  {fieldErrorMessage(issueKey(field.state.meta.errors[0]), lang, content.errors)}
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
                {t(content.fields.name, lang)}
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
                  {fieldErrorMessage(issueKey(field.state.meta.errors[0]), lang, content.errors)}
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
                {t(content.fields.phone, lang)}
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
                  {fieldErrorMessage(issueKey(field.state.meta.errors[0]), lang, content.errors)}
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
                {t(content.fields.email, lang)}
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
                  {fieldErrorMessage(issueKey(field.state.meta.errors[0]), lang, content.errors)}
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
                {t(content.fields.message, lang)}
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
                  {fieldErrorMessage(issueKey(field.state.meta.errors[0]), lang, content.errors)}
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
          {submitting ? t(content.status.sending, lang) : t(content.fields.submit, lang)}
        </button>

        {/* Inline status — read out by assistive tech via aria-live. */}
        <p
          id={statusId}
          role="status"
          aria-live="polite"
          className={`min-h-5 text-sm leading-relaxed ${
            statusIsFailure
              ? "text-red-600 dark:text-red-400"
              : statusIsSuccess
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-muted"
          }`}
          {...(status !== "idle" && status !== "sending" && status.status === "error"
            ? { "data-contact-error-code": status.code }
            : {})}
        >
          {statusCopy}
        </p>
      </div>
    </form>
  );
}
