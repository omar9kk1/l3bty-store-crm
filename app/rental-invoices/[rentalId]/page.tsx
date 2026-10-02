import { RentalInvoicePage } from "@/features/rentals/components/RentalInvoicePage";

export default async function Page({ params }: { params: Promise<{ rentalId: string }> }) {
  const { rentalId } = await params;
  return <RentalInvoicePage rentalId={rentalId} />;
}
