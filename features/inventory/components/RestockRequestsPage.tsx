"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { resolvePreviewEmployee } from "@/features/employees/fixtures";
import { useProducts } from "@/features/products/hooks/use-products";
import { useInventory } from "../hooks/use-inventory";
import {
  canManageInventory,
  isInventoryAdmin,
} from "../permissions";
import { reviewSparePartRestockRequest } from "../services/inventory-service";
import type { SparePartRestockRequest } from "../types";
import { inventoryRestockItemLabel } from "./inventory-labels";

function shortRequestNumber(value: string) {
  const sequence = Number(value.split("-").at(-1));
  return Number.isFinite(sequence) ? `REQ-${sequence}` : value;
}

function requestLabel(status: SparePartRestockRequest["status"]) {
  if (status === "requested") return "بانتظار الإدارة";
  if (status === "approved") return "معتمد";
  if (status === "ordered") return "تم الطلب";
  if (status === "received") return "تم الاستلام";
  return "مرفوض";
}

export function RestockRequestsPage() {
  const { roles } = useShell();
  const { restockRequests } = useInventory();
  const { products } = useProducts();
  const [message, setMessage] = useState("");
  const manager = canManageInventory(roles);
  const technician = roles.includes("maintenance_technician") && !isInventoryAdmin(roles);
  const actor = resolvePreviewEmployee(roles).id;

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 10_000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  if (!isInventoryAdmin(roles) && !technician) {
    return <PermissionDeniedState />;
  }

  const visibleRequests = isInventoryAdmin(roles)
    ? restockRequests
    : restockRequests.filter((item) => item.requestedByEmployeeId === actor);
  const productMap = new Map(products.map((item) => [item.id, item]));
  const count = (statuses: SparePartRestockRequest["status"][]) =>
    visibleRequests.filter((item) => statuses.includes(item.status)).length;

  function review(
    id: string,
    status: "approved" | "ordered" | "rejected",
    note: string,
  ) {
    const result = reviewSparePartRestockRequest(id, actor, status, note);
    setMessage(result.message);
  }

  return (
    <div className="inventory-page">
      <header className="inventory-header">
        <div>
          <span>المخزون</span>
          <h2>طلبات التزويد</h2>
          <p>
            {manager
              ? "راجع طلبات قطع الغيار واعتمدها أو ارفضها، ثم تابع التوريد حتى الاستلام."
              : roles.includes("owner")
                ? "تابع طلبات قطع الغيار وحالتها دون تنفيذ إجراءات تشغيلية."
                : "تابع طلبات قطع الغيار التي أرسلتها وحالة كل طلب."}
          </p>
        </div>
        <Link className="ui-button ui-button--secondary ui-button--md" href="/inventory">
          رجوع إلى المخزون
        </Link>
      </header>

      {message ? (
        <p className="inventory-feedback" role="status">
          {message}
        </p>
      ) : null}

      <nav
        className="inventory-tabs inventory-tabs--section-nav"
        aria-label="أقسام المخزون"
      >
        {!technician ? <Link href="/inventory">الأرصدة</Link> : null}
        <Link className="is-active" href="/inventory/restock-requests">
          طلبات التزويد
        </Link>
        <Link href="/inventory/movements">الحركات</Link>
      </nav>

      <section className="inventory-summary">
        <Card>
          <span>بانتظار الإدارة</span>
          <strong>{count(["requested"]).toLocaleString("ar-EG-u-nu-latn")}</strong>
        </Card>
        <Card>
          <span>قيد التوفير</span>
          <strong>{count(["approved", "ordered"]).toLocaleString("ar-EG-u-nu-latn")}</strong>
        </Card>
        <Card>
          <span>تم الاستلام</span>
          <strong>{count(["received"]).toLocaleString("ar-EG-u-nu-latn")}</strong>
        </Card>
        <Card>
          <span>مرفوضة</span>
          <strong>{count(["rejected"]).toLocaleString("ar-EG-u-nu-latn")}</strong>
        </Card>
      </section>

      <Card className="inventory-restock-panel">
        <header>
          <div>
            <strong>كل طلبات التزويد</strong>
            <span>{visibleRequests.length.toLocaleString("ar-EG-u-nu-latn")} طلب</span>
          </div>
        </header>
        {visibleRequests.length ? (
          <div className="inventory-request-list">
            {visibleRequests.map((request) => {
              const product = request.productId
                ? productMap.get(request.productId)
                : undefined;
              return (
                <article key={request.id}>
                  <div>
                    <strong>{shortRequestNumber(request.requestNumber)}</strong>
                    <span>
                      {inventoryRestockItemLabel(request.partName, product?.name)} ·{" "}
                      {request.requestedQuantity.toLocaleString("ar-EG-u-nu-latn")} قطعة
                    </span>
                  </div>
                  <Badge
                    tone={
                      request.status === "rejected"
                        ? "danger"
                        : request.status === "received"
                          ? "success"
                          : request.priority === "urgent"
                            ? "danger"
                            : "warning"
                    }
                  >
                    {requestLabel(request.status)}
                  </Badge>
                  <p>{request.reason}</p>
                  {manager ? (
                    <div className="inventory-request-actions">
                      {request.status === "requested" ? (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => review(request.id, "approved", "تم اعتماد طلب التزويد")}
                          >
                            اعتماد
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => review(request.id, "rejected", "تعذر توفير القطعة حاليًا")}
                          >
                            رفض
                          </Button>
                        </>
                      ) : null}
                      {request.status === "approved" ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => review(request.id, "ordered", "تم إرسال طلب الشراء أو التوريد")}
                        >
                          تسجيل أنه تم الطلب
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="inventory-state">
            <h3>لا توجد طلبات تزويد حاليًا</h3>
            <p>ستظهر هنا الطلبات التي يرسلها فني الصيانة.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
