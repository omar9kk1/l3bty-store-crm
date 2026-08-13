import { Card } from "@/components/ui/Card";

export function LoadingState() {
  return (
    <Card className="feedback-state" role="status" aria-label="جارٍ التحميل">
      <div className="skeleton skeleton--icon" />
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--line" />
      <span className="sr-only">جارٍ تحميل المحتوى</span>
    </Card>
  );
}
