import { ShieldX } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function PermissionDeniedState() {
  return (
    <Card className="feedback-state" role="alert">
      <span className="feedback-state__icon"><ShieldX aria-hidden /></span>
      <h2>لا تملك صلاحية لعرض هذا القسم</h2>
      <p>غيّر الدور من أداة المعاينة لمراجعة توزيع الصلاحيات.</p>
    </Card>
  );
}
