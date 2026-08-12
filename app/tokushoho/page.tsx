import type { Metadata } from "next";
import LegalDocPage from "@/components/LegalDocPage";
import { legalDocs } from "@/constants/legal";
import { brand } from "@/constants/copy";

const doc = legalDocs.tokushoho;

export const metadata: Metadata = {
  title: doc.heading.ja,
  description: `${doc.heading.ja} | ${doc.heading.en} — ${brand.name}`,
};

export default function TokushohoPage() {
  return <LegalDocPage doc={legalDocs.tokushoho} />;
}
