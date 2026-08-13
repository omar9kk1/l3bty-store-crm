"use client";

import Link from "next/link";
import { useState } from "react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { useMaintenance } from "@/features/maintenance/hooks/use-maintenance";
import { resolvePreviewEmployee } from "@/features/employees/fixtures";
import { useProducts } from "@/features/products/hooks/use-products";
import { useRentalAssets } from "@/features/rental-assets/hooks/use-rental-assets";
import { useTransfers } from "../hooks/use-transfers";
import { allowedTransferTypes, canApproveTransfer, canDispatchTransfer, canReceiveTransfer, canViewTransfers, isRentalBranchOperator, isSalesBranchRequester, isTransferAdmin } from "../permissions";
import { approveTransfer, cancelTransfer, dispatchTransfer, receiveTransfer, resolveTransferDifferences } from "../services/transfer-store";
import { transferStatusLabels, transferTone, transferTypeLabels } from "./transfer-labels";

export function TransferDetailsPage({ transferId }: { transferId: string }) {
  const { roles, activeBranch, availableBranches } = useShell();
  const { transfers } = useTransfers();
  const { products } = useProducts();
  const assets = useRentalAssets();
  const { orders } = useMaintenance();
  const [panel, setPanel] = useState<"approval" | "receive" | "difference" | "cancel" | null>(null);
  const [message, setMessage] = useState("");
  if (!canViewTransfers(roles)) return <PermissionDeniedState />;
  const transfer = transfers.find((item) => item.id === transferId);
  if (!transfer) return <Card className="transfer-state"><h2>التحويل غير موجود</h2><Link href="/inventory/transfers">العودة</Link></Card>;
  const currentTransfer = transfer;
  const salesRequester = isSalesBranchRequester(roles);
  const rentalBranchOperator = isRentalBranchOperator(roles);
  const allowedBranches = new Set(salesRequester || rentalBranchOperator ? [activeBranch.id] : availableBranches.filter((item) => item.id !== "all").map((item) => item.id));
  const salesItemsInScope = !salesRequester || transfer.items.every((item) => item.itemType === "stock_product" && Boolean(item.productId) && products.some((product) => product.id === item.productId && product.type === "sale_toy"));
  const rentalTypeInScope = !rentalBranchOperator || ["rental_asset", "maintenance_to_workshop", "maintenance_return"].includes(transfer.transferType);
  const inScope = isTransferAdmin(roles) || (salesItemsInScope && rentalTypeInScope && allowedTransferTypes(roles).includes(transfer.transferType) && (allowedBranches.has(transfer.sourceLocationId) || allowedBranches.has(transfer.destinationLocationId) || roles.includes("maintenance_technician") && Boolean(transfer.relatedMaintenanceOrderId)));
  if (!inScope) return <PermissionDeniedState />;
  const productMap = new Map(products.map((item) => [item.id, item.name]));
  const assetMap = new Map(assets.map((item) => [item.id, `${item.assetNumber} · ${item.name}`]));
  const order = orders.find((item) => item.id === transfer.relatedMaintenanceOrderId);
  const actor = resolvePreviewEmployee(roles).id;
  const assignedOrder = !roles.includes("maintenance_technician") || !order?.assignedTechnicianId || order.assignedTechnicianId === actor;
  const cancellableStatuses = salesRequester || rentalBranchOperator ? ["requested", "pending_approval"] : ["requested", "pending_approval", "approved", "preparing"];
  const canCancel = isTransferAdmin(roles) || (transfer.requestedByEmployeeId === actor && cancellableStatuses.includes(transfer.status));
  const feedback = (result: { valid: boolean; message: string }) => { setMessage(result.message); if (result.valid) setPanel(null); };
  const approve = (approved: boolean) => feedback(approveTransfer(currentTransfer.id, roles, "employee-manager", approved ? "اعتماد إداري Mock" : "رفض إداري Mock", approved));
  function receive() {
    const quantities = Object.fromEntries(currentTransfer.items.map((item) => [item.id, Number((document.getElementById(`receive-${item.id}`) as HTMLInputElement)?.value ?? item.quantityDispatched)]));
    const conditions = Object.fromEntries(currentTransfer.items.map((item) => [item.id, (document.getElementById(`condition-${item.id}`) as HTMLInputElement)?.value ?? "سليم"]));
    const reason = (document.getElementById("difference-reason") as HTMLTextAreaElement)?.value ?? "";
    feedback(receiveTransfer(currentTransfer.id, quantities, conditions, actor, reason, roles, salesRequester || rentalBranchOperator ? activeBranch.id : undefined));
  }
  return <div className="transfers-page">
    <header className="transfers-header"><div><span>تفاصيل التحويل</span><h2>{transfer.transferNumber}</h2><p>{salesRequester && transfer.transferType === "branch_stock" ? "تزويد ألعاب بيع" : rentalBranchOperator ? transfer.transferType === "rental_asset" ? "نقل لعبة تأجير" : transfer.transferType === "maintenance_to_workshop" ? "تسليم للورشة" : "استلام من الورشة" : transferTypeLabels[transfer.transferType]} · {transfer.sourceLocationId} ← {transfer.destinationLocationId}</p></div><Badge tone={transferTone(transfer.status)}>{transferStatusLabels[transfer.status]}</Badge></header>
    {message ? <p className="transfer-feedback" role="status">{message}</p> : null}
    <section className="transfer-actions">
      {transfer.status === "pending_approval" && canApproveTransfer(roles) ? <Button variant="primary" onClick={() => setPanel("approval")}>مراجعة الاعتماد</Button> : null}
      {["approved", "preparing"].includes(transfer.status) && assignedOrder && canDispatchTransfer(roles, transfer, allowedBranches) ? <Button variant="primary" onClick={() => feedback(dispatchTransfer(transfer.id, actor, roles, rentalBranchOperator ? activeBranch.id : undefined))}>{rentalBranchOperator ? "تأكيد تسليم اللعبة" : "تأكيد الإرسال"}</Button> : null}
      {["in_transit", "dispatched", "partially_received"].includes(transfer.status) && assignedOrder && canReceiveTransfer(roles, transfer, allowedBranches) ? <Button variant="primary" onClick={() => setPanel("receive")}>{rentalBranchOperator ? "تأكيد استلام اللعبة" : "تأكيد الاستلام"}</Button> : null}
      {transfer.status === "difference_review" && canApproveTransfer(roles) ? <Button onClick={() => setPanel("difference")}>مراجعة الفروقات</Button> : null}
      {canCancel && !(["completed", "cancelled", "rejected"] as string[]).includes(transfer.status) ? <Button variant="danger" onClick={() => setPanel("cancel")}>إلغاء</Button> : null}
    </section>
    <div className="transfer-details-grid"><Card><h3>بيانات المسار</h3><dl><div><dt>المصدر</dt><dd>{transfer.sourceLocationId}</dd></div><div><dt>الوجهة</dt><dd>{transfer.destinationLocationId}</dd></div><div><dt>مقدم الطلب</dt><dd>{transfer.requestedByEmployeeId}</dd></div><div><dt>المعتمد</dt><dd>{transfer.approvedByEmployeeId ?? "—"}</dd></div><div><dt>المسلّم</dt><dd>{transfer.dispatchedByEmployeeId ?? "—"}</dd></div><div><dt>المستلم</dt><dd>{transfer.receivedByEmployeeId ?? "—"}</dd></div><div><dt>السبب</dt><dd>{transfer.reason}</dd></div></dl></Card>{salesRequester ? <Card><h3>متابعة التزويد</h3><p>الإدارة تعتمد الطلب وتجهزه وترسله.</p><p>موظف الفرع يؤكد الكمية والحالة عند الوصول.</p><p>لا يضاف الرصيد للفرع إلا بعد الاستلام المؤكد.</p></Card> : rentalBranchOperator ? <Card><h3>متابعة حركة اللعبة</h3><p>اعتماد الطلب والإرسال بين الفروع مسؤولية الإدارة أو الفرع المصدر.</p><p>موظف الفرع يسجل التسليم للورشة أو الاستلام عند عودة اللعبة.</p><p>مكان اللعبة لا يتغير إلا بعد تأكيد الحركة الفعلية.</p></Card> : <Card><h3>التكامل</h3><p>أمر الصيانة: {order?.orderNumber ?? "غير مرتبط"}</p><p>أصل التأجير: {transfer.relatedRentalAssetId ? assetMap.get(transfer.relatedRentalAssetId) : "غير مرتبط"}</p><p>الموقع لا يتغير للوجهة إلا بعد الاستلام المؤكد.</p></Card>}</div>
    <Card className="transfer-items"><h3>العناصر والكميات</h3>{transfer.items.map((item) => <div key={item.id}><strong>{item.productId ? productMap.get(item.productId) : item.rentalAssetId ? assetMap.get(item.rentalAssetId) : order?.orderNumber ?? "لعبة صيانة"}</strong><span>{salesRequester && item.itemType === "stock_product" ? "لعبة بيع" : rentalBranchOperator ? item.itemType === "rental_asset" ? "لعبة تأجير" : "لعبة صيانة" : item.itemType}</span><span>مطلوب {item.quantityRequested}</span><span>معتمد {item.quantityApproved}</span><span>مرسل {item.quantityDispatched}</span><span>مستلم {item.quantityReceived}</span><span>{item.conditionAtReceipt || item.conditionAtDispatch}</span></div>)}</Card>
    {transfer.differences.length ? <Card className="transfer-differences"><h3>الفروقات</h3>{transfer.differences.map((item) => <div key={item.id}><Badge tone="warning">{item.kind}</Badge><strong>الكمية: {item.quantity}</strong><p>{item.reason} · {item.decision || "بانتظار القرار"}</p></div>)}</Card> : null}
    <Card className="transfer-timeline"><h3>Timeline وAudit Mock</h3>{transfer.events.map((item) => <div key={item.id}><span>{new Date(item.at).toLocaleString("ar-EG-u-nu-latn")}</span><strong>{item.type}</strong><p>{item.reason}</p></div>)}</Card>
    <Drawer open={panel === "approval"} onOpenChange={(open) => setPanel(open ? "approval" : null)} title="اعتماد التحويل" description="قرار حساس للمالك والمدير مع سبب موثق." variant="auxiliary"><div className="transfer-drawer-form"><p>{transfer.transferNumber} · {transfer.reason}</p><Button variant="primary" onClick={() => approve(true)}>اعتماد</Button><Button variant="danger" onClick={() => approve(false)}>رفض</Button></div></Drawer>
    <Drawer open={panel === "receive"} onOpenChange={(open) => setPanel(open ? "receive" : null)} title="تسجيل الاستلام" description="أي اختلاف يحتاج سببًا ولا يغلق التحويل تلقائيًا." variant="auxiliary"><div className="transfer-drawer-form">{transfer.items.map((item) => <div key={item.id}><label>الكمية المستلمة<input id={`receive-${item.id}`} type="number" min="0" defaultValue={item.quantityDispatched} /></label><label>الحالة عند الاستلام<input id={`condition-${item.id}`} defaultValue="سليم" /></label></div>)}<label>سبب الفرق عند وجوده<textarea id="difference-reason" /></label><Button variant="primary" onClick={receive}>حفظ الاستلام</Button></div></Drawer>
    <Drawer open={panel === "difference"} onOpenChange={(open) => setPanel(open ? "difference" : null)} title="مراجعة فروقات التحويل" description="اعتماد إداري؛ لا تعدل حركة الإرسال الأصلية." variant="auxiliary"><div className="transfer-drawer-form"><Button variant="primary" onClick={() => feedback(resolveTransferDifferences(transfer.id, roles, "employee-manager", "accept_loss", "اعتماد الفرق كعجز موثق Mock"))}>اعتماد الفرق</Button><Button onClick={() => feedback(resolveTransferDifferences(transfer.id, roles, "employee-manager", "return_to_source", "إعادة الفرق للمصدر Mock"))}>إعادة للمصدر</Button></div></Drawer>
    <Drawer open={panel === "cancel"} onOpenChange={(open) => setPanel(open ? "cancel" : null)} title="إلغاء التحويل" description="لا يوجد حذف؛ يبقى المستند وسجل السبب." variant="auxiliary"><div className="transfer-drawer-form"><Button variant="danger" onClick={() => feedback(cancelTransfer(transfer.id, roles, actor, "إلغاء تشغيلي موثق Mock"))}>تأكيد الإلغاء</Button></div></Drawer>
  </div>;
}
