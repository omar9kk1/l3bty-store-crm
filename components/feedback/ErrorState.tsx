import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function ErrorState() {
  return (
    <Card className="feedback-state">
      <span className="feedback-state__icon feedback-state__icon--danger"><CircleAlert aria-hidden /></span>
      <h2>تعذر عرض الصفحة</h2>
      <p>حدث خطأ أثناء تحميل البيانات. حاول مرة أخرى.</p>
      <Button>إعادة المحاولة</Button>
    </Card>
  );
}
