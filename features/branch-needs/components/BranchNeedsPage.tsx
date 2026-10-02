"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { PERMISSION_KEYS } from "@/permissions/keys";
import { useBranchNeeds } from "../hooks/use-branch-needs";
import {
  createBranchNeed,
  reviewBranchNeed,
} from "../services/branch-needs-store";
import type { BranchNeedRequest, BranchNeedStatus } from "../types";
import { branchNeedBranchLabel } from "./branch-needs-labels";

const statusLabel: Record<BranchNeedStatus, string> = {
  pending: "بانتظار الإدارة",
  approved: "تم الاعتماد",
  rejected: "مرفوض",
  fulfilled: "تم التوفير",
};

const statusTone: Record<
  BranchNeedStatus,
  "warning" | "info" | "danger" | "success"
> = {
  pending: "warning",
  approved: "info",
  rejected: "danger",
  fulfilled: "success",
};

export function BranchNeedsPage() {
  const { roles, permissions, activeEmployee, activeBranch } = useShell();
  const { requests } = useBranchNeeds();
  const branches = useBranches();
  const employees = useEmployees();
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewing, setReviewing] = useState<BranchNeedRequest | null>(null);
  const [message, setMessage] = useState("");
  const admin = roles.includes("owner") || roles.includes("manager");
  const manager = roles.includes("manager");
  const ownerReadOnly = roles.includes("owner") && !manager;
  const salesEmployee = roles.includes("sales_employee") && !admin;
  const rentalEmployee =
    roles.includes("rental_maintenance_employee") && !admin;

  if (!permissions.has(PERMISSION_KEYS.branchNeedsView))
    return <PermissionDeniedState />;

  const branchMap = new Map(branches.map((branch) => [branch.id, branch.name]));
  const employeeMap = new Map(
    employees.map((employee) => [employee.id, employee.name]),
  );
  const visible = requests.filter(
    (request) => admin || request.requestedByEmployeeId === activeEmployee?.id,
  );
  const canCreate =
    permissions.has(PERMISSION_KEYS.branchNeedsCreate) &&
    Boolean(activeEmployee) &&
    activeBranch.id !== "all" &&
    (salesEmployee || rentalEmployee);
  const counts = (status: BranchNeedStatus) =>
    visible.filter((request) => request.status === status).length;

  function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeEmployee) return;
    const form = new FormData(event.currentTarget);
    const result = createBranchNeed({
      kind: salesEmployee ? "sales_item" : "rental_game",
      branchId: activeBranch.id,
      requestedByEmployeeId: activeEmployee.id,
      itemName: String(form.get("itemName") ?? ""),
      quantity: Number(form.get("quantity") ?? 0),
      priority: form.get("priority") === "urgent" ? "urgent" : "normal",
      reason: String(form.get("reason") ?? ""),
    });
    setMessage(result.message);
    if (result.valid) {
      event.currentTarget.reset();
      setCreateOpen(false);
    }
  }

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewing) return;
    const form = new FormData(event.currentTarget);
    const action = String(form.get("action")) as "approved" | "rejected";
    const actor =
      activeEmployee?.id ?? (roles.includes("owner") ? "owner" : "manager");
    const result = reviewBranchNeed(
      reviewing.id,
      action,
      actor,
      String(form.get("note") ?? ""),
    );
    setMessage(result.message);
    if (result.valid) setReviewing(null);
  }

  return (
    <div className="branch-needs-page">
      <header className="branch-needs-header">
        <div>
          <span>
            {ownerReadOnly || manager ? "الإدارة" : "احتياجات التشغيل"}
          </span>
          <h2>
            {ownerReadOnly
              ? "متابعة احتياجات الفروع"
              : manager
                ? "إدارة احتياجات الفروع"
                : "طلبات احتياجات الفرع"}
          </h2>
          <p>
            {ownerReadOnly
              ? "تابع ما تحتاجه الفروع وما تم اعتماده أو توفيره دون اتخاذ إجراء."
              : manager
                ? "راجع الطلب، اعتمده أو ارفضه، ثم أنشئ التحويل للطلب المعتمد."
                : salesEmployee
                  ? "اطلب أي منتج أو حاجة ناقصة في المبيعات، والإدارة هتتابع طلبك."
                  : "اطلب أي لعبة ناقصة أو مطلوبة للتأجير، والإدارة هتتابع طلبك."}
          </p>
        </div>
        {canCreate ? (
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            طلب حاجة ناقصة
          </Button>
        ) : null}
      </header>

      {message ? (
        <p className="branch-needs-feedback" role="status">
          {message}
        </p>
      ) : null}

      <section className="branch-needs-summary">
        <Card>
          <span>بانتظار الإدارة</span>
          <strong>{counts("pending")}</strong>
        </Card>
        <Card>
          <span>تم اعتمادها</span>
          <strong>{counts("approved")}</strong>
        </Card>
        <Card>
          <span>تم توفيرها</span>
          <strong>{counts("fulfilled")}</strong>
        </Card>
        <Card>
          <span>مرفوضة</span>
          <strong>{counts("rejected")}</strong>
        </Card>
      </section>

      {visible.length ? (
        <section className="branch-needs-list">
          {visible.map((request) => (
            <Card className="branch-need-card" key={request.id}>
              <header>
                <div>
                  <strong>{request.itemName}</strong>
                  <small>{request.requestNumber}</small>
                </div>
                <Badge tone={statusTone[request.status]}>
                  {statusLabel[request.status]}
                </Badge>
              </header>
              <div className="branch-need-details">
                <span>
                  {request.kind === "rental_game"
                    ? "لعبة للتأجير"
                    : "احتياج للمبيعات"}
                </span>
                <span>
                  الكمية: {request.quantity.toLocaleString("ar-EG-u-nu-latn")}
                </span>
                <span>
                  {branchNeedBranchLabel(branchMap.get(request.branchId))}
                </span>
                <span>
                  {employeeMap.get(request.requestedByEmployeeId) ??
                    request.requestedByEmployeeId}
                </span>
              </div>
              <p>{request.reason}</p>
              {request.managementNote ? (
                <small className="branch-need-note">
                  ملاحظة الإدارة: {request.managementNote}
                </small>
              ) : null}
              <footer>
                <span>
                  {request.priority === "urgent" ? "عاجل" : "عادي"} ·{" "}
                  {new Date(request.createdAt).toLocaleDateString(
                    "ar-EG-u-nu-latn",
                  )}
                </span>
                {manager && request.status === "pending" ? (
                  <Button size="sm" onClick={() => setReviewing(request)}>
                    مراجعة الطلب
                  </Button>
                ) : null}
                {manager &&
                request.status === "approved" &&
                !request.transferId ? (
                  <Link
                    className="ui-button ui-button--primary ui-button--sm"
                    href={`/inventory/transfers/new?needId=${request.id}`}
                  >
                    إنشاء تحويل
                  </Link>
                ) : null}
                {request.transferId ? (
                  <Link
                    className="ui-button ui-button--secondary ui-button--sm"
                    href={`/inventory/transfers/${request.transferId}`}
                  >
                    متابعة التحويل
                  </Link>
                ) : null}
              </footer>
            </Card>
          ))}
        </section>
      ) : (
        <Card className="branch-needs-empty">
          <strong>لا توجد طلبات احتياجات حاليًا</strong>
          <p>
            {admin
              ? "أي طلب جديد من موظفي التأجير أو المبيعات هيظهر هنا."
              : "لما تحتاج لعبة أو منتج ناقص، أرسل الطلب من الزر بالأعلى."}
          </p>
        </Card>
      )}

      <Drawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="طلب حاجة ناقصة"
        description={
          salesEmployee
            ? "اكتب المنتج أو الحاجة الناقصة في المبيعات."
            : "اكتب اللعبة الناقصة أو المطلوبة للتأجير."
        }
        variant="auxiliary"
      >
        <form className="branch-needs-form" onSubmit={submitRequest}>
          <div className="branch-needs-fixed">
            <span>الفرع</span>
            <strong>{activeBranch.nameAr}</strong>
          </div>
          <label>
            {salesEmployee ? "اسم المنتج أو الحاجة" : "اسم اللعبة المطلوبة"}
            <input
              name="itemName"
              required
              placeholder={
                salesEmployee
                  ? "مثال: سيارات ريموت صغيرة"
                  : "مثال: سكوتر كهربائي للأطفال"
              }
            />
          </label>
          <label>
            الكمية
            <input
              name="quantity"
              type="number"
              min="1"
              step="1"
              defaultValue="1"
              required
            />
          </label>
          <label>
            الأولوية
            <select name="priority" defaultValue="normal">
              <option value="normal">عادية</option>
              <option value="urgent">عاجلة</option>
            </select>
          </label>
          <label>
            سبب الاحتياج
            <textarea
              name="reason"
              required
              placeholder="وضح ليه الفرع محتاجها"
            />
          </label>
          <Button type="submit" variant="primary">
            إرسال الطلب للإدارة
          </Button>
        </form>
      </Drawer>

      <Drawer
        open={Boolean(reviewing)}
        onOpenChange={(open) => {
          if (!open) setReviewing(null);
        }}
        title="مراجعة الطلب"
        description={
          reviewing ? `${reviewing.itemName} · ${reviewing.requestNumber}` : ""
        }
        variant="auxiliary"
      >
        <form className="branch-needs-form" onSubmit={submitReview}>
          <label>
            قرار الإدارة
            <select name="action" defaultValue="approved">
              <option value="approved">اعتماد الطلب</option>
              <option value="rejected">رفض الطلب</option>
            </select>
          </label>
          <label>
            ملاحظة الإدارة
            <textarea
              name="note"
              placeholder="اكتب سبب الرفض أو ملاحظة للطلب إن وجدت"
            />
          </label>
          <Button type="submit" variant="primary">
            حفظ القرار
          </Button>
        </form>
      </Drawer>
    </div>
  );
}
