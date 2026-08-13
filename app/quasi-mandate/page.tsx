import type { Metadata } from "next";
import LegalDocPage from "@/components/LegalDocPage";
import { legalDocs } from "@/constants/legal";
import { brand } from "@/constants/copy";

const doc = legalDocs.quasiMandate;

export const metadata: Metadata = {
  title: doc.heading.ja,
  description: `${doc.heading.ja} | ${doc.heading.en} — ${brand.name}`,
};

export default function QuasiMandatePage() {
  return <LegalDocPage doc={legalDocs.quasiMandate} />;
}
