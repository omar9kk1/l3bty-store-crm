import { Badge } from "@/components/ui/Badge";
import type { CustomerFlag } from "../types";

const flagLabels: Record<CustomerFlag, { label: string; tone: "warning" | "danger" | "info" }> = {
  debt: { label: "مديونية", tone: "warning" },
  rental_ban: { label: "ممنوع من التأجير", tone: "danger" },
  needs_review: { label: "يحتاج مراجعة", tone: "info" },
};

export function CustomerFlags({ flags, compact = false }: { flags: CustomerFlag[]; compact?: boolean }) {
  if (flags.length === 0) return compact ? null : <span className="customers-muted">لا توجد تنبيهات</span>;
  return (
    <div className="customer-flags" aria-label="تنبيهات العميل">
      {flags.map((flag) => (
        <Badge key={flag} tone={flagLabels[flag].tone}>{flagLabels[flag].label}</Badge>
      ))}
    </div>
  );
}
