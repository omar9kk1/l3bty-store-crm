import { BranchDetailsPage } from "@/features/branches/components/BranchDetailsPage";

export default async function Page({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  return <BranchDetailsPage branchId={branchId} />;
}
