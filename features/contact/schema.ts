/**
 * Shared Zod schemas for the marketing contact form.
 *
 * Mirrors backend/internal/contact/dto/contact.go field rules so the browser
 * and app/api/contact reject the same shapes before the Go usecase. Message
 * strings on issues are stable *keys* (not user copy); map them with
 * `fieldErrorMessage` + `contactPage.errors`.
 */
import { z } from "zod";

export const contactCategories = ["services", "recruitment", "other"] as const;

const phonePattern = /^[0-9+\-() \u3000]+$/;

export const contactFormValuesSchema = z.object({
  // Draft input may be "" (empty select); refine narrows output to the enum.
  category: z
    .string()
    .min(1, { message: "category" })
    .refine(
      (value): value is (typeof contactCategories)[number] =>
        (contactCategories as readonly string[]).includes(value),
      { message: "category" },
    ),
  name: z
    .string()
    .trim()
    .min(1, { message: "required" })
    .max(120, { message: "nameMax" }),
  phone: z
    .string()
    .trim()
    .min(8, { message: "phone" })
    .max(24, { message: "phone" })
    .regex(phonePattern, { message: "phone" }),
  email: z
    .string()
    .trim()
    .min(1, { message: "required" })
    .email({ message: "email" })
    .max(254, { message: "email" }),
  message: z
    .string()
    .trim()
    .min(10, { message: "messageMin" })
    .max(4000, { message: "messageMax" }),
  // Always required strings (forms send ""; API clients must send strings too).
  company: z.string().max(120),
  company_name: z.string().max(120),
});

export const contactPayloadSchema = contactFormValuesSchema.extend({
  form_load_at: z.number().int().positive(),
});

export type ContactFormValues = z.infer<typeof contactFormValuesSchema>;
/** Form draft / defaultValues shape (category may be empty before submit). */
export type ContactFormInput = z.input<typeof contactFormValuesSchema>;
export type ContactPayload = z.infer<typeof contactPayloadSchema>;

export type ContactFieldErrorTable = {
  required: { ja: string; en: string };
  category: { ja: string; en: string };
  email: { ja: string; en: string };
  phone: { ja: string; en: string };
  messageMin: { ja: string; en: string };
  messageMax: { ja: string; en: string };
  nameMax: { ja: string; en: string };
};

const ERROR_KEYS = new Set([
  "required",
  "category",
  "email",
  "phone",
  "messageMin",
  "messageMax",
  "nameMax",
]);

/**
 * Maps a Zod issue `message` key to bilingual copy. Unknown keys fall back
 * to `required` so the UI never shows raw Zod English.
 */
export function fieldErrorMessage(
  key: string,
  lang: "ja" | "en",
  table: ContactFieldErrorTable,
): string {
  const safeKey = ERROR_KEYS.has(key) ? (key as keyof ContactFieldErrorTable) : "required";
  return table[safeKey][lang];
}
