import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ContactForm from "@/components/contact/ContactForm";
import Section from "@/components/ui/Section";
import { getContact } from "@/features/cms/contact";
import { t, isLang } from "@/features/lang/i18n";
import { pageMetadata } from "@/features/seo/pageMetadata";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return pageMetadata({ key: "contact", lang });
}

export default async function ContactPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  // CMS-sourced — the contact page data comes from Atlas (no constants).
  // When the page data is unavailable, getContact() throws and this route
  // surfaces an error rather than stale copy.
  const contact = await getContact();
  const phoneTel = contact.phone.number.replace(/-/g, "");

  return (
    <>
      <Section heading={contact.hero.heading} level="h1" lang={lang}>
        <p className="max-w-3xl text-base leading-relaxed text-body md:text-lg">
          {t(contact.hero.body, lang)}
        </p>
      </Section>

      <Section surface lang={lang}>
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          {/* Phone card — Visual Ref 7 */}
          <div className="rounded-2xl bg-primary px-6 py-8 text-white sm:px-8">
            <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
              {t(contact.phone.badge, lang)}
            </span>
            <h2 className="mt-4 text-2xl font-bold">{t(contact.phone.title, lang)}</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/90 md:text-base">
              {t(contact.phone.body, lang)}
            </p>
            <a
              href={`tel:${phoneTel}`}
              className="mt-6 block rounded-xl bg-primary-deep/40 px-5 py-4 transition hover:bg-primary-deep/55"
            >
              <p className="text-xs font-semibold tracking-[0.2em] text-white/80">
                {t(contact.phone.telLabel, lang)}
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums md:text-4xl">
                {contact.phone.number}
              </p>
              <p className="mt-2 text-sm text-white/85">
                {t(contact.phone.hours, lang)}
              </p>
            </a>
            <ul className="mt-6 space-y-2 text-sm text-white/90">
              {contact.phone.bullets.map((bullet) => (
                <li key={bullet.ja} className="flex gap-2">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/80" />
                  <span>{t(bullet, lang)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-border bg-surface px-5 py-7 sm:px-7 sm:py-8">
            <span className="inline-flex rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary">
              {t(contact.form.badge, lang)}
            </span>
            <h2 className="mt-4 text-2xl font-bold text-heading">
              {t(contact.form.title, lang)}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-body md:text-base">
              {t(contact.form.body, lang)}
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-body">
              {contact.form.bullets.map((bullet) => (
                <li key={bullet.ja} className="flex gap-2">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{t(bullet, lang)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <ContactForm
                lang={lang}
                fields={contact.form.fields}
                requiredNote={contact.form.requiredNote}
                mailto={contact.mailto}
                categories={contact.categories}
              />
            </div>
            <p className="mt-5 rounded-xl bg-primary-light px-4 py-3 text-sm leading-relaxed text-body">
              {t(contact.form.followUp, lang)}
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}