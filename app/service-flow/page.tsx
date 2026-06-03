import { getBilingualPage } from "@/features/cms/actions";
import ServiceFlowView from "@/features/cms/components/ServiceFlowView";

export default async function ServiceFlowPage() {
  const result = await getBilingualPage("service-flow");
  const data = result.success ? result.data : undefined;
  return <ServiceFlowView data={data} />;
}
