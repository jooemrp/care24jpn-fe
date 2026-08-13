import type { Metadata } from "next";
import type { ReactNode } from "react";

// SEO title recommended by the client sheet for the /fees URL.
export const metadata: Metadata = {
  title: "ケアサポーターの時給・報酬体系一覧｜Care24",
  description:
    "Care24Japan ケアサポーターの時給・給与体系。介護コース・看護コースの1時間単価（税込）をご案内します。",
};

export default function FeesLayout({ children }: { children: ReactNode }) {
  return children;
}
