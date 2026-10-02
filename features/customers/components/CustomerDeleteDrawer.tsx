"use client";

import { useState } from "react";
import type { Employee } from "@/features/employees/types";
import type { RoleId } from "@/permissions/types";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { deleteCustomerDirectly, requestCustomerDeletion } from "../services/customer-store";
import type { Customer } from "../types";

export function CustomerDeleteDrawer({ customer, roles, employee, branchId, onClose, onDone }: { customer?: Customer; roles: readonly RoleId[]; employee: Employee | null; branchId: string; onClose: () => void; onDone: (message: string) => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  if (!customer) return null;
  const direct = roles.includes("owner") || roles.includes("manager");

  function submit() {
    const actorRole: RoleId = roles.includes("owner") ? "owner" : roles.includes("manager") ? "manager" : roles[0] ?? "rental_maintenance_employee";
    const actorEmployeeId = employee?.id ?? `employee-${actorRole.replace("_maintenance_employee", "")}`;
    const result = direct
      ? deleteCustomerDirectly(customer!.id, { actorEmployeeId, actorRole, reason })
      : requestCustomerDeletion(customer!.id, {
          requestedByEmployeeId: actorEmployeeId,
          requestedByUserId: employee?.userId ?? actorEmployeeId.replace("employee-", "user-"),
          requestedByName: employee?.name ?? "الموظف الحالي",
          branchId: branchId === "all" ? customer!.branchIds[0] ?? "all" : branchId,
          reason,
        });
    if (!result.valid) { setError(result.message); return; }
    setReason("");
    onDone(result.message);
  }

  return <Drawer open onOpenChange={(open) => !open && onClose()} title={direct ? "حذف العميل" : "طلب حذف العميل"} description={direct ? "سيختفي العميل من القوائم الجديدة، وتظل عملياته القديمة محفوظة." : "لن يُحذف العميل قبل أن يراجع المدير الطلب ويوافق عليه."} variant="auxiliary">
    <div className="customer-delete-form">
      <div className="customer-delete-form__identity"><span>اسم العميل</span><strong>{customer.name}</strong><small>رقم العميل: <bdi dir="ltr">{customer.customerNumber}</bdi></small></div>
      <label><span>سبب {direct ? "الحذف" : "طلب الحذف"} *</span><textarea rows={4} value={reason} onChange={(event) => { setReason(event.target.value); setError(""); }} placeholder="اكتب سببًا واضحًا للمدير" /></label>
      {error ? <p role="alert" className="customer-delete-form__error">{error}</p> : null}
      <Button type="button" variant="danger" disabled={!reason.trim()} onClick={submit}>{direct ? "تأكيد حذف العميل" : "إرسال الطلب للمدير"}</Button>
      <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
    </div>
  </Drawer>;
}
