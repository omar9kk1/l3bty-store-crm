"use client";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import {
  canCreateMaintenanceWorkshopTransfer,
  canCreateTransfer,
  isRentalBranchOperator,
  isSalesBranchRequester,
} from "../permissions";
import { CreateTransferWizard } from "../forms/CreateTransferWizard";
export function CreateTransferPage({
  initialType,
  initialOrderId,
  initialNeedId,
}: {
  initialType?: string;
  initialOrderId?: string;
  initialNeedId?: string;
}) {
  const { roles } = useShell();
  const salesRequester = isSalesBranchRequester(roles);
  const rentalBranchOperator = isRentalBranchOperator(roles);
  const technicianWorkshopPickup = canCreateMaintenanceWorkshopTransfer(
    roles,
    initialType,
    initialOrderId,
  );
  if (!canCreateTransfer(roles) && !technicianWorkshopPickup)
    return <PermissionDeniedState />;
  return (
    <div className="transfers-page">
      <header className="transfers-header">
        <div>
          <span>
            {salesRequester
              ? "مخزون الفرع"
              : rentalBranchOperator
                ? "ألعاب التأجير"
                : "التحويلات"}
          </span>
          <h2>
            {salesRequester
              ? "طلب تزويد الفرع"
              : rentalBranchOperator
                ? "طلب نقل لعبة تأجير"
                : initialNeedId
                  ? "إنشاء تحويل لطلب الفرع"
                  : "إنشاء طلب تحويل"}
          </h2>
          <p>
            {salesRequester
              ? "اطلب ألعاب البيع لفرعك الحالي، ثم تابع اعتماد الإدارة والتجهيز والاستلام."
              : rentalBranchOperator
                ? "اطلب لعبة من فرع آخر إلى فرعك، أو سلّم أمر صيانة للورشة من داخل أمر الصيانة."
                : "مسار كامل متعدد الخطوات؛ المنتجات بالكميات والأصول بأرقامها المنفردة."}
          </p>
        </div>
      </header>
      <CreateTransferWizard
        initialType={initialType}
        initialOrderId={initialOrderId}
        initialNeedId={initialNeedId}
      />
    </div>
  );
}
