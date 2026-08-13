"use client";

import { useState } from "react";
import { useShell } from "@/components/shell/ShellContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { resolvePreviewEmployee } from "@/features/employees/fixtures";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { useSales } from "../hooks/use-sales";
import { canManageSaleOverrides } from "../permissions";
import { cancelSaleInvoice } from "../services/sales-store";

export function SaleCancelAction({ invoiceId }: { invoiceId: string }) {
  const { roles } = useShell();
  const employees = useEmployees();
  const { invoices } = useSales();
  const invoice = invoices.find((item) => item.id === invoiceId);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  if (!canManageSaleOverrides(roles) || !invoice) return null;
  if (invoice.status === "cancelled") return <Card className="sale-cancel"><p role="alert">تم إلغاء الفاتورة وتسجيل الحركات العكسية دون حذفها.</p></Card>;
  if (!["completed", "partially_returned"].includes(invoice.status)) return null;
  const employee = resolvePreviewEmployee(roles, employees);
  return (
    <Card className="sale-cancel">
      <div><h3>إلغاء الفاتورة</h3><p>إجراء إداري موثق يعيد الكميات المتبقية بحركات عكسية ولا يحذف الفاتورة.</p></div>
      <label><span>سبب الإلغاء *</span><textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      {notice ? <p role="alert">{notice}</p> : null}
      <Button variant="danger" onClick={() => { if (!window.confirm("تأكيد إلغاء الفاتورة وتسجيل الحركات العكسية؟")) return; setNotice(cancelSaleInvoice(invoiceId, roles, employee.id, reason).message); }}>إلغاء الفاتورة</Button>
    </Card>
  );
}
