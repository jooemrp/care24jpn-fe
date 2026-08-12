import LegalDocPage from "@/components/LegalDocPage";
import { legalDocs } from "@/constants/legal";

export default function CancellationPolicyPage() {
  return <LegalDocPage doc={legalDocs.cancellationPolicy} />;
}
