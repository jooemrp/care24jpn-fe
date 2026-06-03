import { getBilingualPage } from "@/features/cms/actions";
import { useCase } from "@/constants/copy";
import UseCaseDetailView from "@/features/cms/components/UseCaseDetailView";

type Props = { params: Promise<{ slug: string }> };

export default async function UseCaseDetailPage({ params }: Props) {
  const { slug } = await params;

  const validSlugs = useCase.cases.map((c) => c.slug);
  if (!validSlugs.includes(slug)) {
    return <UseCaseDetailView data={undefined} slug={slug} />;
  }

  const result = await getBilingualPage(slug);
  const data = result.success ? result.data : undefined;
  return <UseCaseDetailView data={data} slug={slug} />;
}
