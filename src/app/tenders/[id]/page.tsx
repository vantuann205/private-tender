import { TenderDetail } from "@/features/tenders/tender-detail";
export default async function DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TenderDetail id={id} />;
}
