import { getBilingualPage } from "@/features/cms/actions";
import UseCaseView from "@/features/cms/components/UseCaseView";

export default async function UseCasePage() {
  const result = await getBilingualPage("use-case");
  const data = result.success ? result.data : undefined;
  return <UseCaseView data={data} />;
}
