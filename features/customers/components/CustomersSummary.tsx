import { Card } from "@/components/ui/Card";
import type { CustomerSummaryData } from "../types";

export function CustomersSummary({ data }: { data: CustomerSummaryData }) {
  const items = [
    ["العملاء في النطاق", data.total],
    ["العملاء النشطون", data.active],
    ["يحتاجون مراجعة", data.needsReview],
  ];

  return (
    <section className="customers-summary" aria-label="ملخص العملاء">
      {items.map(([label, value]) => (
        <Card className="customers-summary__card" key={label}>
          <span>{label}</span><strong>{value}</strong>
        </Card>
      ))}
    </section>
  );
}
