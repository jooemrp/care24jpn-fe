import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Noto_Sans_JP } from "next/font/google";
import "../../styles/globals.css";
import AppShell from "@/components/AppShell";
import JsonLd, { organizationJsonLd } from "@/components/JsonLd";
import { brand } from "@/constants/copy";
import { SITE_URL } from "@/constants/site";
import { isLang } from "@/features/lang/i18n";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-sans-jp",
});

export async function generateStaticParams() {
  return [{ lang: "ja" }, { lang: "en" }];
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${brand.name} — ${brand.tagline[lang]}`,
      template: `%s | ${brand.name}`,
    },
    description: brand.tagline[lang],
    alternates: {
      // "ja" is the default, prefix-less language (see features/lang/i18n.ts).
      canonical: lang === "ja" ? "/" : `/${lang}`,
      languages: {
        ja: "/",
        en: "/en",
      },
    },
    openGraph: {
      type: "website",
      locale: lang === "ja" ? "ja_JP" : "en_US",
      siteName: brand.name,
    },
    icons: {
      icon: "/care24jpn.ico",
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <html
      lang={lang}
      className={`${notoSansJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-body">
        <JsonLd data={organizationJsonLd} />
        <AppShell lang={lang}>{children}</AppShell>
      </body>
    </html>
  );
}
