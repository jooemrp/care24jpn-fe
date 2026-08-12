import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "../styles/globals.css";
import AppShell from "@/components/AppShell";
import { Providers } from "@/components/providers";
import { brand } from "@/constants/copy";
import { HtmlLangSync } from "@/features/lang/HtmlLangSync";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-sans-jp",
});

export const metadata: Metadata = {
  title: {
    default: `${brand.name} — ${brand.tagline.en}`,
    template: `%s | ${brand.name}`,
  },
  description: brand.tagline.en,
  icons: {
    icon: "/care24jpn.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSansJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-body">
        <HtmlLangSync />
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
