import { AlertTriangle, LoaderCircle, RefreshCcw, WifiOff } from "lucide-react";

export function DashboardSkeleton() {
  return <div className="dashboard-skeleton" aria-label="جارٍ تحميل لوحة التحكم" aria-busy="true"><div /><div className="dashboard-skeleton__metrics">{Array.from({ length: 4 }, (_, index) => <span key={index} />)}</div><div className="dashboard-skeleton__panels"><span /><span /><span /><span /></div></div>;
}

export function DashboardEmptyState() {
  return <section className="dashboard-state"><span><AlertTriangle size={24} /></span><h2>لا توجد بيانات ضمن هذا النطاق</h2><p>جرّب تغيير الفترة أو الفرع أو نوع النشاط.</p></section>;
}

export function DashboardErrorState({ onRetry }: { onRetry: () => void }) {
  return <section className="dashboard-state dashboard-state--error"><span><AlertTriangle size={24} /></span><h2>تعذر تحميل لوحة التحكم</h2><p>حدث خطأ تجريبي أثناء تجهيز البيانات.</p><button type="button" onClick={onRetry}><RefreshCcw size={16} />إعادة المحاولة</button></section>;
}

export function DashboardOfflineState() {
  return <div className="dashboard-offline" role="status"><WifiOff size={17} /><span>أنت غير متصل — تُعرض آخر بيانات محفوظة للتجربة</span></div>;
}

export function DashboardLoadingInline() {
  return <span className="dashboard-loading-inline"><LoaderCircle size={16} />جارٍ التحديث</span>;
}
