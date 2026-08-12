import LegalDocPage from "@/components/LegalDocPage";
import { legalDocs } from "@/constants/legal";

export default function TermsPage() {
  return <LegalDocPage doc={legalDocs.terms} />;
}
