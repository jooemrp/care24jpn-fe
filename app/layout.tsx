import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "../styles/globals.css";
import AppShell from "@/components/AppShell";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";
import { brand } from "@/constants/copy";

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
        <AuthProvider>
          <LanguageProvider>
            <AppShell>{children}</AppShell>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
