import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { OfflineState } from "@/components/feedback/OfflineState";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";

export default function UiStatesPage() {
  return (
    <div className="ui-states-page">
      <div className="page-heading"><div><span className="page-heading__section">للتطوير فقط</span><h2>حالات الواجهة الأساسية</h2><p>معاينة بصرية للحالات العامة من دون بيانات أو طلبات حقيقية.</p></div></div>
      <div className="ui-states-grid">
        <section><h3>Loading</h3><LoadingState /></section>
        <section><h3>Empty</h3><EmptyState /></section>
        <section><h3>Error</h3><ErrorState /></section>
        <section><h3>Offline</h3><OfflineState /></section>
        <section><h3>Permission denied</h3><PermissionDeniedState /></section>
      </div>
    </div>
  );
}
