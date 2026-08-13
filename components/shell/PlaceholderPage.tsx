import { Hammer } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { NavigationItem } from "@/permissions/types";

export function PlaceholderPage({ page }: { page: NavigationItem }) {
  return (
    <div className="placeholder-page">
      <nav className="breadcrumbs" aria-label="مسار الصفحة">
        <span>مساحة العمل</span><span aria-hidden>‹</span><span>{page.section}</span><span aria-hidden>‹</span><strong>{page.labelAr}</strong>
      </nav>
      <div className="page-heading">
        <div><span className="page-heading__section">{page.section}</span><h2>{page.labelAr}</h2><p>{page.descriptionAr}</p></div>
        <Badge tone="neutral">قيد البناء</Badge>
      </div>
      <Card className="placeholder-card">
        <span className="placeholder-card__icon"><Hammer aria-hidden /></span>
        <div><h3>هذه الصفحة ضمن الهيكل المعتمد</h3><p>تم تفعيل الرابط والسياق والصلاحية فقط. ستُبنى وظائف الوحدة في مهمة مستقلة لاحقًا.</p></div>
      </Card>
    </div>
  );
}
