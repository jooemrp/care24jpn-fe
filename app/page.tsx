import { getBilingualPage } from "@/features/cms/actions";
import HomeView from "@/features/cms/components/HomeView";

export default async function HomePage() {
  const result = await getBilingualPage("main");
  const data = result.success ? result.data : undefined;
  return <HomeView data={data} />;
}
