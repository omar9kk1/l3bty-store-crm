import { WifiOff } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function OfflineState() {
  return (
    <Card className="feedback-state">
      <span className="feedback-state__icon feedback-state__icon--warning"><WifiOff aria-hidden /></span>
      <h2>أنت غير متصل الآن</h2>
      <p>لن تُنفذ عمليات حقيقية في هذا النموذج، وسيظهر ملخص الاتصال في الرأس.</p>
    </Card>
  );
}
