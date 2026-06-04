import { getBilingualPage } from "@/features/cms/actions";
import PricingView from "@/features/cms/components/PricingView";

export default async function PricingPage() {
  const result = await getBilingualPage("pricing-user");
  const data = result.success ? result.data : undefined;
  return <PricingView data={data} />;
}
