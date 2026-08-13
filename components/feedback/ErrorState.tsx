import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function ErrorState() {
  return (
    <Card className="feedback-state">
      <span className="feedback-state__icon feedback-state__icon--danger"><CircleAlert aria-hidden /></span>
      <h2>تعذر عرض الصفحة التجريبية</h2>
      <p>هذه حالة مرئية للاختبار فقط، ولا يوجد طلب بيانات حقيقي.</p>
      <Button>إعادة المحاولة</Button>
    </Card>
  );
}
