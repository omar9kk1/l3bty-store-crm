import { Card } from "@/components/ui/Card";
import type { BranchSummaryData } from "../types";

export function BranchesSummary({ data }: { data: BranchSummaryData }) {
  const items = [["الفروع النشطة", data.active], ["المواقع غير النشطة", data.inactive], ["الموظفون المسندون", data.employees], ["الورديات المفتوحة", data.openShifts], ["طلبات الصيانة المفتوحة", data.openMaintenance]];
  return <section className="branches-summary" aria-label="ملخص الفروع">{items.map(([label, value]) => <Card className="branches-summary__card" key={label}><span>{label}</span><strong>{Number(value).toLocaleString("ar-EG-u-nu-latn")}</strong></Card>)}</section>;
}
