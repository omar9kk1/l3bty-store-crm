import { Card } from "@/components/ui/Card";
import type { CustomerSummaryData } from "../types";

export function CustomersSummary({ data, showFinancial }: { data: CustomerSummaryData; showFinancial: boolean }) {
  const items = showFinancial
    ? [
        ["العملاء في النطاق", data.total],
        ["العملاء النشطون", data.active],
        ["لديهم مديونية", data.withDebt],
        ["يحتاجون مراجعة", data.needsReview],
      ]
    : [
        ["العملاء المسندون", data.total],
        ["العملاء النشطون", data.active],
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
