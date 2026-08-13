import Navbar from "./Navbar";
import Footer from "./Footer";
import type { ReactNode } from "react";
import type { Lang } from "@/features/lang/i18n";

export default function AppShell({
  children,
  lang,
}: {
  children: ReactNode;
  lang: Lang;
}) {
  return (
    <>
      <Navbar lang={lang} />
      <main className="flex-1">{children}</main>
      <Footer lang={lang} />
    </>
  );
}
