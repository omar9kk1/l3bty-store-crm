import { CustomerDetailsPage } from "@/features/customers/components/CustomerDetailsPage";

export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  return <CustomerDetailsPage customerId={customerId} />;
}
