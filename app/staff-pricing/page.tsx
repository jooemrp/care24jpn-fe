import { getBilingualPage } from "@/features/cms/actions";
import StaffPricingView from "@/features/cms/components/StaffPricingView";

export default async function StaffPricingPage() {
  const result = await getBilingualPage("pricing-giver");
  const data = result.success ? result.data : undefined;
  return <StaffPricingView data={data} />;
}
