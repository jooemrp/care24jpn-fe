import LegalDocPage from "@/components/LegalDocPage";
import { legalDocs } from "@/constants/legal";

export default function PrivacyPage() {
  return <LegalDocPage doc={legalDocs.privacy} />;
}
