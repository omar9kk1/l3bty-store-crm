"use client";

import Link from "next/link";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { money, paymentMethodLabels, paymentSourceLabels } from "@/features/finance/components/finance-labels";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { useFinance } from "@/features/finance/hooks/use-finance";
import { useShifts } from "../hooks/use-shifts";
import { canUseFinancialShift, currentMockEmployeeId, isShiftAdmin } from "../permissions";
import { forceCloseShift, reviewShiftDifference } from "../services/shift-store";
import { shiftStatusLabels, shiftTone } from "./shift-labels";

const eventLabels: Readonly<Record<string, string>> = {
  opened: "تم فتح الخزنة وبدء الوردية",
  closed: "تم إغلاق الخزنة دون فرق",
  difference_recorded: "تم تسجيل فرق وإرساله للمراجعة",
  review_accepted: "اعتمد المدير فرق الخزنة",
  review_rejected: "رفض المدير تسوية الفرق",
  review_needs_information: "طلب المدير معلومات إضافية",
  force_closed: "تم إغلاق الخزنة إداريًا",
};

export function ShiftDetailsPage({ shiftId }: { shiftId: string }) {
  const { roles, activeEmployee } = useShell();
  const { shifts } = useShifts();
  const finance = useFinance();
  const branches = useBranches();
  const employees = useEmployees();
  if (!canUseFinancialShift(roles)) return <PermissionDeniedState />;
  const shift = shifts.find((item) => item.id === shiftId);
  const admin = isShiftAdmin(roles);
  const currentEmployeeId = activeEmployee?.id ?? currentMockEmployeeId(roles);
  if (!shift || (!admin && shift.employeeId !== currentEmployeeId)) return <PermissionDeniedState />;
  const related = finance.payments.filter((item) => item.shiftId === shift.id);
  const employeeName = employees.find((item) => item.id === shift.employeeId)?.name ?? "موظف غير متاح";
  const branchName = branches.find((item) => item.id === shift.branchId)?.name ?? "فرع غير متاح";
  const cashboxName = finance.cashboxes.find((item) => item.id === shift.cashboxId)?.name ?? "خزنة الفرع";

  return <div className="shifts-page">
    <header className="shifts-header"><div><span>تفاصيل وردية الخزنة</span><h2 dir="ltr">{shift.shiftNumber}</h2><p>{employeeName} · {branchName} · {cashboxName}</p></div><Badge tone={shiftTone(shift.status)}>{shiftStatusLabels[shift.status]}</Badge></header>

    <section className="shift-details-grid">
      <Card><h3>ملخص حركة الخزنة</h3><dl><div><dt>مبلغ بداية الوردية</dt><dd>{money(shift.openingBalance)}</dd></div><div><dt>إجمالي التحصيل</dt><dd>{money(shift.totalCollections)}</dd></div><div><dt>المرتجعات</dt><dd>{money(shift.totalRefunds)}</dd></div><div><dt>المبالغ الخارجة</dt><dd>{money(shift.totalOutgoing)}</dd></div></dl></Card>
      <Card><h3>مطابقة المبالغ عند الإغلاق</h3><dl><div><dt>النقدي: المتوقع / الفعلي / الفرق</dt><dd>{money(shift.expectedCash)} / {shift.countedCash === null ? "—" : money(shift.countedCash)} / {money(shift.cashDifference)}</dd></div><div><dt>البطاقات: المتوقع / الفعلي / الفرق</dt><dd>{money(shift.expectedCard)} / {shift.countedCard === null ? "—" : money(shift.countedCard)} / {money(shift.cardDifference)}</dd></div><div><dt>المحافظ: المتوقع / الفعلي / الفرق</dt><dd>{money(shift.expectedWallet)} / {shift.countedWallet === null ? "—" : money(shift.countedWallet)} / {money(shift.walletDifference)}</dd></div></dl></Card>
    </section>

    {shift.differenceReview ? <Card className="shift-difference"><h3>فرق الخزنة: {shift.cashDifference < 0 ? "عجز" : "زيادة"}</h3><p>{shift.differenceReview.reason}</p><strong>{money(shift.cashDifference)}</strong>{admin ? <div><Button variant="primary" onClick={() => reviewShiftDifference(shift.id, "employee-manager", "accepted", "قبول الفرق بعد مراجعة العمليات")}>اعتماد الفرق</Button><Button onClick={() => reviewShiftDifference(shift.id, "employee-manager", "needs_information", "طلب معلومات إضافية من الموظف")}>طلب توضيح من الموظف</Button><Button variant="danger" onClick={() => reviewShiftDifference(shift.id, "employee-manager", "rejected", "رفض الإغلاق وإعادة المراجعة")}>رفض التسوية</Button></div> : null}<small>فرق الخزنة لا يخصم من راتب الموظف تلقائيًا.</small></Card> : null}

    <Card className="shift-payments"><h3>التحصيلات المسجلة أثناء الوردية</h3>{related.length ? related.map((item) => <div key={item.id}><Link href="/finance/payments">{item.paymentNumber}</Link><span>{paymentSourceLabels[item.sourceType]}</span><span>{paymentMethodLabels[item.method]}</span><strong>{money(item.amount)}</strong></div>) : <p className="shift-empty-row">لا توجد تحصيلات مسجلة على هذه الوردية.</p>}</Card>

    <Card className="shift-timeline"><h3>سجل الوردية</h3>{shift.events.slice().reverse().map((item) => <div key={item.id}><span>{new Date(item.at).toLocaleString("ar-EG-u-nu-latn")}</span><strong>{eventLabels[item.type] ?? "تم تحديث الوردية"}</strong>{item.reason ? <p>{item.reason}</p> : null}</div>)}</Card>

    {admin && ["open", "closing_review"].includes(shift.status) ? <Button variant="danger" onClick={() => forceCloseShift(shift.id, "employee-manager", "إغلاق إداري موثق بعد مراجعة وردية الخزنة")}>إغلاق الخزنة إداريًا</Button> : null}
  </div>;
}
