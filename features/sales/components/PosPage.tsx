"use client";

import { Minus, Plus, ReceiptText, ShoppingCart, Trash2, WifiOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { createCustomer } from "@/features/customers/services/customer-store";
import { QuickCustomerForm } from "@/features/customers/forms/QuickCustomerForm";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import { resolvePreviewEmployee } from "@/features/employees/fixtures";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { useProducts } from "@/features/products/hooks/use-products";
import { useShifts } from "@/features/shifts/hooks/use-shifts";
import { findOpenShiftForBranch } from "@/features/shifts/services/shift-store";
import { toBranchOption } from "@/mock-data/branches";
import { PERMISSION_KEYS } from "@/permissions/keys";
import { useSales } from "../hooks/use-sales";
import {
  canManageSaleOverrides,
  canOperatePointOfSale,
  canViewSales,
} from "../permissions";
import {
  addProductToCart,
  calculateCartTotals,
  checkoutSale,
  clearSaleCart,
  removeCartLine,
  setInvoiceDiscount,
  setSaleCartBranch,
  setSaleCustomer,
  updateCartLine,
} from "../services/sales-store";
import { getPosCatalogItems, getPosStockLabel } from "../services/pos-catalog";
import type { SalePaymentMethod } from "../types";
import { SaleWhatsAppAction } from "./SaleWhatsAppAction";
import { SalesManagementOverview } from "./SalesManagementOverview";

const money = (value: number) => `${value.toLocaleString("ar-EG-u-nu-latn", { maximumFractionDigits: 2 })} ج.م`;

export function PosPage() {
  const { roles, permissions } = useShell();
  if (!permissions.has(PERMISSION_KEYS.sales) || !canViewSales(roles)) return <PermissionDeniedState />;
  if (!canOperatePointOfSale(roles)) return <SalesManagementOverview />;
  return <PosContent />;
}

function PosContent() {
  const { roles, activeBranch } = useShell();
  const params = useSearchParams();
  const state = params.get("state") ?? "normal";
  const { products, stocks } = useProducts();
  const sales = useSales();
  const { cart } = sales;
  const customers = useCustomers();
  const branches = useBranches();
  const { shifts } = useShifts();
  const employees = useEmployees();
  const employee = resolvePreviewEmployee(roles, employees);
  const branchId = activeBranch.id === "all" ? employee.primaryBranchId : activeBranch.id;
  const branch = branches.find((item) => item.id === branchId);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("cash");
  const [paidValue, setPaidValue] = useState("");
  const [approvalReason, setApprovalReason] = useState("");
  const [managerApproved, setManagerApproved] = useState(false);
  const [allowDebt, setAllowDebt] = useState(false);
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(1);
  const [createdId, setCreatedId] = useState("");

  useEffect(() => setSaleCartBranch(branchId), [branchId]);

  const visible = getPosCatalogItems({ products, stocks, branchId, type, query });
  const totals = calculateCartTotals();
  const created = sales.invoices.find((item) => item.id === createdId);
  const customer = customers.find((item) => item.id === (created?.customerId ?? cart.customerId));
  const admin = canManageSaleOverrides(roles);
  const shiftOpen = branch?.type === "branch" && Boolean(findOpenShiftForBranch(shifts, branchId));

  function checkout() {
    if (state === "offline") {
      setNotice("إنشاء الفاتورة معطل دون اتصال، ولا توجد Offline Queue.");
      return;
    }
    const paid = paidValue === "" ? totals.totalAmount : Number(paidValue);
    const payments =
      paymentMethod === "mixed"
        ? [
            { method: "cash" as const, amount: Math.round((paid / 2) * 100) / 100, reference: "MIX-CASH" },
            { method: "card" as const, amount: paid - Math.round((paid / 2) * 100) / 100, reference: "MIX-CARD" },
          ]
        : [{ method: paymentMethod as "cash" | "card" | "wallet", amount: paid, reference: "POS-MOCK" }];
    const result = checkoutSale({
      customerId: cart.customerId,
      branchId,
      employeeId: employee.id,
      roles,
      payments,
      invoiceDiscountPercent: cart.invoiceDiscountPercent,
      approvalReason,
      managerApproved,
      allowDebt,
      idempotencyKey: `pos-${branchId}-${attempt}`,
    });
    setNotice(result.message);
    if (result.valid && "invoice" in result && result.invoice) {
      setCreatedId(result.invoice.id);
      setAttempt((value) => value + 1);
      setPaidValue("");
    }
  }

  if (state === "loading") return <div className="sale-skeleton">جار تجهيز نقطة البيع…</div>;
  if (state === "error")
    return (
      <Card className="sale-state">
        <h2>تعذر فتح نقطة البيع</h2>
        <p>Reference: POS-MOCK-503</p>
      </Card>
    );

  return (
    <div className="pos-page">
      {state === "offline" ? (
        <div className="sales-offline"><WifiOff size={17} />دون اتصال — الكتالوج متاح للقراءة وإتمام البيع معطل.</div>
      ) : null}
      <header className="pos-header">
        <div><span>المبيعات</span><h2>نقطة البيع</h2><p>{branch?.name} · {employee.name}</p></div>
        <div>
          <Badge tone={shiftOpen ? "success" : "danger"}>{shiftOpen ? "الوردية المالية مفتوحة" : "لا توجد وردية مفتوحة"}</Badge>
          <Link className="ui-button ui-button--secondary ui-button--md" href="/sales/invoices"><ReceiptText size={16} />فواتير المبيعات</Link>
          <Link className="ui-button ui-button--secondary ui-button--md" href="/sales/returns?mode=return">المرتجعات</Link>
          <Link className="ui-button ui-button--secondary ui-button--md" href="/sales/returns?mode=exchange">الاستبدال</Link>
        </div>
      </header>
      {created && customer && branch ? (
        <Card className="sale-success">
          <div><strong>تم إصدار {created.invoiceNumber}</strong><span>الإجمالي {money(created.totalAmount)}</span></div>
          <Link href={`/sales/invoices/${created.id}`}>فتح الإيصال</Link>
          <SaleWhatsAppAction invoice={created} customer={customer} branch={branch} />
        </Card>
      ) : null}
      <div className="pos-layout">
        <section className="pos-catalog">
          <Card className="pos-search">
            <input type="search" aria-label="البحث في نقطة البيع" placeholder="الاسم أو SKU أو Barcode" value={query} onChange={(event) => setQuery(event.target.value)} />
            <div role="tablist" aria-label="فئات نقطة البيع">
              <button role="tab" aria-selected={type === "all"} onClick={() => setType("all")}>الكل</button>
              <button role="tab" aria-selected={type === "sale_toy"} onClick={() => setType("sale_toy")}>ألعاب للبيع</button>
              <button role="tab" aria-selected={type === "spare_part"} onClick={() => setType("spare_part")}>قطع الغيار</button>
            </div>
          </Card>
          {state === "empty" || !visible.length ? <Card className="sale-state"><h3>لا توجد منتجات مطابقة</h3></Card> : (
            <div className="pos-product-grid">
              {visible.map((product) => (
                <Card className={`pos-product-card${product.availableStock === 0 ? " pos-product-card--unavailable" : ""}`} key={product.id}>
                  {product.imageMockKey.startsWith("data:image/") ? (
                    <div className="pos-product-card__image">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product.imageMockKey} alt={product.name} />
                    </div>
                  ) : (
                    <div className="pos-product-card__mock">{product.type === "sale_toy" ? "لعبة للبيع" : "قطعة غيار"}</div>
                  )}
                  <h3>{product.name}</h3><span>الباركود: {product.barcode || product.sku}</span>
                  <div><strong>{money(product.salePrice)}</strong><Badge tone={product.availableStock === 0 ? "danger" : product.availableStock === 1 || product.availableStock <= (product.stock?.minimumStock ?? 0) ? "warning" : "neutral"}>{getPosStockLabel(product.availableStock)}</Badge></div>
                  <Button disabled={product.availableStock === 0} onClick={() => { const result = addProductToCart(product.id, branchId); setNotice(result.message); }} icon={<Plus size={16} />}>إضافة إلى السلة</Button>
                </Card>
              ))}
            </div>
          )}
        </section>
        <aside className="pos-cart">
          <Card>
            <header><div><ShoppingCart size={19} /><h3>السلة</h3><Badge>{cart.lines.length.toLocaleString("ar-EG-u-nu-latn")}</Badge></div>{cart.lines.length ? <Button size="sm" variant="ghost" onClick={() => { if (window.confirm("تفريغ السلة؟")) clearSaleCart(); }}>تفريغ</Button> : null}</header>
            <div className="pos-customer">
              <label><span>العميل *</span><select value={cart.customerId} onChange={(event) => setSaleCustomer(event.target.value)}><option value="">اختر العميل</option>{customers.filter((item) => item.status === "active" && !item.deletedAt).map((item) => <option value={item.id} key={item.id}>{item.name} · {item.primaryPhone}</option>)}</select></label>
              <Button size="sm" onClick={() => setCustomerOpen(true)}>إضافة عميل سريعًا</Button>
            </div>
            <div className="cart-lines">
              {cart.lines.length ? cart.lines.map((line) => (
                <div className="cart-line" key={line.productId}>
                  <div><strong>{line.name}</strong><button aria-label={`حذف ${line.name}`} onClick={() => removeCartLine(line.productId)}><Trash2 size={15} /></button></div>
                  <div className="cart-line__quantity"><button aria-label={`تقليل ${line.name}`} onClick={() => updateCartLine(line.productId, { quantity: line.quantity - 1 })}><Minus size={15} /></button><span>{line.quantity}</span><button aria-label={`زيادة ${line.name}`} onClick={() => updateCartLine(line.productId, { quantity: line.quantity + 1 })}><Plus size={15} /></button><small>من {line.availableStock}</small></div>
                  <label><span>السعر</span><input type="number" min="0" disabled={!admin} value={line.unitPrice} onChange={(event) => updateCartLine(line.productId, { unitPrice: Number(event.target.value) })} /></label>
                  <label><span>خصم السطر %</span><input type="number" min="0" max="100" value={line.discount} onChange={(event) => updateCartLine(line.productId, { discount: Number(event.target.value) })} /></label>
                  {admin && line.unitPrice !== line.originalUnitPrice ? <input aria-label={`سبب تعديل سعر ${line.name}`} placeholder="سبب تعديل السعر" value={line.priceOverrideReason} onChange={(event) => updateCartLine(line.productId, { priceOverrideReason: event.target.value })} /> : null}
                  <b>{money(line.lineTotal)}</b>
                </div>
              )) : <div className="cart-empty"><ShoppingCart /><p>السلة فارغة</p></div>}
            </div>
            <div className="checkout-panel">
              <label><span>خصم الفاتورة %</span><input type="number" min="0" max="100" value={cart.invoiceDiscountPercent} onChange={(event) => setInvoiceDiscount(Number(event.target.value))} /></label>
              <dl><div><dt>الإجمالي قبل الخصم</dt><dd>{money(totals.subtotal)}</dd></div><div><dt>خصومات السطور</dt><dd>{money(totals.lineDiscountTotal)}</dd></div><div><dt>خصم الفاتورة</dt><dd>{money(totals.invoiceDiscountAmount)}</dd></div><div><dt>الضريبة</dt><dd>{money(totals.taxTotal)}</dd></div><div><dt>الإجمالي</dt><dd>{money(totals.totalAmount)}</dd></div></dl>
              <label><span>طريقة الدفع</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as SalePaymentMethod)}><option value="cash">نقدي</option><option value="card">بطاقة</option><option value="wallet">محفظة إلكترونية</option><option value="mixed">دفع مختلط</option></select></label>
              <label><span>المبلغ المدفوع</span><input type="number" min="0" placeholder={String(totals.totalAmount)} value={paidValue} onChange={(event) => setPaidValue(event.target.value)} /></label>
              {admin ? <label className="pos-check"><input type="checkbox" checked={allowDebt} onChange={(event) => setAllowDebt(event.target.checked)} /><span>السماح بمبلغ متبقٍ بموافقة الإدارة</span></label> : <label className="pos-check"><input type="checkbox" checked={managerApproved} onChange={(event) => setManagerApproved(event.target.checked)} /><span>تمت موافقة الإدارة على التجاوز</span></label>}
              <label><span>سبب الخصم أو الموافقة</span><textarea rows={2} value={approvalReason} onChange={(event) => setApprovalReason(event.target.value)} /></label>
              {notice ? <p role="alert">{notice}</p> : null}
              <Button size="lg" variant="primary" disabled={state === "offline" || !shiftOpen} onClick={checkout}>تأكيد البيع وإصدار الفاتورة</Button>
            </div>
          </Card>
        </aside>
      </div>
      <Drawer open={customerOpen} onOpenChange={setCustomerOpen} title="إضافة عميل سريعًا" description="أدخل اسم العميل ورقم هاتفه فقط." variant="auxiliary">
        <QuickCustomerForm customers={customers.filter((customer) => !customer.deletedAt)} branches={branches.filter((item) => item.type === "branch").map(toBranchOption)} offline={state === "offline"} fixedBranchId={branchId} essentialFieldsOnly onSave={(values) => { const newCustomer = createCustomer(values, "sales"); setSaleCustomer(newCustomer.id); setCustomerOpen(false); }} />
      </Drawer>
    </div>
  );
}
