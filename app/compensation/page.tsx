import LegalDocPage from "@/components/LegalDocPage";
import { legalDocs } from "@/constants/legal";

export default function CompensationPage() {
  return <LegalDocPage doc={legalDocs.compensation} />;
}
