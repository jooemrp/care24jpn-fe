import LegalDocPage from "@/components/LegalDocPage";
import { legalDocs } from "@/constants/legal";

export default function QuasiMandatePage() {
  return <LegalDocPage doc={legalDocs.quasiMandate} />;
}
