import { Inbox } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function EmptyState() {
  return (
    <Card className="feedback-state">
      <span className="feedback-state__icon"><Inbox aria-hidden /></span>
      <h2>لا توجد بيانات للعرض</h2>
      <p>ستظهر عناصر هذا القسم هنا بعد بناء الوحدة واعتماد بياناتها.</p>
    </Card>
  );
}
