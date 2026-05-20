import DebtorWorkflowDetailClient from "@/components/informasi-debitur/DebtorWorkflowDetailClient";

type DetailDebiturPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DetailDebiturPage({ params }: DetailDebiturPageProps) {
  const { id } = await params;
  return <DebtorWorkflowDetailClient debtorId={id} />;
}
