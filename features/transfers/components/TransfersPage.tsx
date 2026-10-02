"use client";
import Link from "next/link";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { useProducts } from "@/features/products/hooks/use-products";
import { useTransfers } from "../hooks/use-transfers";
import {
  allowedTransferTypes,
  canCreateTransfer,
  canManageTransfers,
  canViewAllTransfers,
  canViewTransfers,
  isRentalBranchOperator,
  isSalesBranchRequester,
  isTechnicianWorkshopTransferVisible,
} from "../permissions";
import {
  buildTransferLocationOptions,
  resolveTransferLocationName,
} from "../services/transfer-location-options";
import {
  transferStatusLabels,
  transferTone,
  transferTypeLabels,
} from "./transfer-labels";
export function TransfersPage() {
  const { roles, activeBranch, availableBranches } = useShell();
  const { transfers } = useTransfers();
  const employees = useEmployees();
  const branches = useBranches();
  const { products } = useProducts();
  const transferLocations = buildTransferLocationOptions(branches);
  const locationName = (locationId: string) =>
    resolveTransferLocationName(locationId, transferLocations);
  const saleToyIds = new Set(
    products
      .filter((product) => product.type === "sale_toy")
      .map((product) => product.id),
  );
  if (!canViewTransfers(roles)) return <PermissionDeniedState />;
  const salesRequester = isSalesBranchRequester(roles);
  const rentalBranchOperator = isRentalBranchOperator(roles);
  const manager = canManageTransfers(roles);
  const ownerReadOnly = roles.includes("owner") && !manager;
  const allowedBranches = new Set(
    availableBranches
      .filter((item) => item.id !== "all")
      .map((item) => item.id),
  );
  const types = new Set(allowedTransferTypes(roles));
  const visible = transfers
    .filter((item) => types.has(item.transferType))
    .filter((item) =>
      salesRequester
        ? item.transferType === "branch_stock" &&
          (item.sourceLocationId === activeBranch.id ||
            item.destinationLocationId === activeBranch.id) &&
          item.items.every(
            (line) =>
              line.itemType === "stock_product" &&
              Boolean(line.productId) &&
              (line.productId ? saleToyIds.has(line.productId) : false),
          )
        : rentalBranchOperator
          ? [
              "rental_asset",
              "maintenance_to_workshop",
              "maintenance_return",
            ].includes(item.transferType) &&
            (item.sourceLocationId === activeBranch.id ||
              item.destinationLocationId === activeBranch.id)
          : canViewAllTransfers(roles) ||
            isTechnicianWorkshopTransferVisible(roles, item) ||
            allowedBranches.has(item.sourceLocationId) ||
            allowedBranches.has(item.destinationLocationId),
    );
  const employeeMap = new Map(employees.map((item) => [item.id, item.name]));
  const counts = (statuses: string[]) =>
    visible.filter((item) => statuses.includes(item.status)).length;
  return (
    <div className="transfers-page">
      <header className="transfers-header">
        <div>
          <span>
            {ownerReadOnly || manager
              ? "الإدارة"
              : salesRequester
                ? "مخزون الفرع"
                : rentalBranchOperator
                  ? "ألعاب التأجير"
                  : "التحويلات"}
          </span>
          <h2>
            {ownerReadOnly
              ? "متابعة التحويلات"
              : manager
                ? "إدارة التحويلات"
                : salesRequester
                  ? "تحويلات فرعك"
                  : rentalBranchOperator
                    ? "تحويلات ألعاب فرعك"
                    : "طلبات التحويل"}
          </h2>
          <p>
            {ownerReadOnly
              ? "تابع التحويلات بين الفروع وحالتها والفروقات دون تنفيذ إجراءات تشغيلية."
              : manager
                ? "راجع الطلبات واعتمدها وتابع الإرسال والاستلام والفروقات حتى الإغلاق."
                : salesRequester
                  ? "تابع التحويلات الواردة لفرعك وأكد الاستلام عند وصولها."
                  : rentalBranchOperator
                    ? "تابع الألعاب الواردة لفرعك وأكد الاستلام عند وصولها."
                    : "المصدر ينقص عند الإرسال، والوجهة لا تزيد إلا بعد تأكيد الاستلام."}
          </p>
        </div>
        {canCreateTransfer(roles) ? (
          <Link
            className="ui-button ui-button--primary ui-button--md"
            href={
              rentalBranchOperator
                ? "/inventory/transfers/new?type=rental_asset"
                : "/inventory/transfers/new"
            }
          >
            {salesRequester
              ? "طلب تزويد الفرع"
              : rentalBranchOperator
                ? "طلب نقل لعبة"
                : "إنشاء طلب تحويل"}
          </Link>
        ) : null}
      </header>
      <section className="transfer-summary">
        <Card>
          <span>تنتظر موافقة</span>
          <strong>{counts(["pending_approval"])}</strong>
        </Card>
        <Card>
          <span>قيد التجهيز</span>
          <strong>{counts(["approved", "preparing"])}</strong>
        </Card>
        <Card>
          <span>في الطريق</span>
          <strong>{counts(["dispatched", "in_transit"])}</strong>
        </Card>
        <Card>
          <span>فروقات للمراجعة</span>
          <strong>{counts(["partially_received", "difference_review"])}</strong>
        </Card>
        <Card>
          <span>مكتملة</span>
          <strong>{counts(["completed"])}</strong>
        </Card>
      </section>
      <Card className="transfer-list">
        <div className="transfer-table-wrap">
          <table>
            <thead>
              <tr>
                <th>التحويل</th>
                <th>النوع</th>
                <th>المصدر</th>
                <th>الوجهة</th>
                <th>العناصر</th>
                <th>الحالة</th>
                <th>مقدم الطلب</th>
                <th>التاريخ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.transferNumber}</strong>
                  </td>
                  <td>
                    {salesRequester && item.transferType === "branch_stock"
                      ? "تزويد ألعاب بيع"
                      : rentalBranchOperator
                        ? item.transferType === "rental_asset"
                          ? "نقل لعبة تأجير"
                          : item.transferType === "maintenance_to_workshop"
                            ? "تسليم للورشة"
                            : "استلام من الورشة"
                        : transferTypeLabels[item.transferType]}
                  </td>
                  <td>{locationName(item.sourceLocationId)}</td>
                  <td>{locationName(item.destinationLocationId)}</td>
                  <td>{item.items.length}</td>
                  <td>
                    <Badge tone={transferTone(item.status)}>
                      {transferStatusLabels[item.status]}
                    </Badge>
                  </td>
                  <td>
                    {employeeMap.get(item.requestedByEmployeeId) ??
                      item.requestedByEmployeeId}
                  </td>
                  <td>
                    {new Date(item.createdAt).toLocaleDateString(
                      "ar-EG-u-nu-latn",
                    )}
                  </td>
                  <td>
                    <Link href={`/inventory/transfers/${item.id}`}>عرض</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="transfer-mobile-list">
          {visible.map((item) => (
            <Link
              href={`/inventory/transfers/${item.id}`}
              className="transfer-mobile-card"
              key={item.id}
            >
              <header>
                <strong>{item.transferNumber}</strong>
                <Badge tone={transferTone(item.status)}>
                  {transferStatusLabels[item.status]}
                </Badge>
              </header>
              <h3>
                {salesRequester && item.transferType === "branch_stock"
                  ? "تزويد ألعاب بيع"
                  : rentalBranchOperator
                    ? item.transferType === "rental_asset"
                      ? "نقل لعبة تأجير"
                      : item.transferType === "maintenance_to_workshop"
                        ? "تسليم للورشة"
                        : "استلام من الورشة"
                    : transferTypeLabels[item.transferType]}
              </h3>
              <p>
                {locationName(item.sourceLocationId)} ←{" "}
                {locationName(item.destinationLocationId)} ·{" "}
                {item.items.length} عنصر
              </p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
