"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { resolvePreviewEmployee } from "@/features/employees/fixtures";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { useProducts } from "@/features/products/hooks/use-products";
import { useSales } from "../hooks/use-sales";
import { canAccessSaleBranch, canViewSales } from "../permissions";
import { createSaleReturn } from "../services/sales-store";
import type { ReturnedItemCondition, SaleReturnKind } from "../types";

const returnKindLabels: Record<SaleReturnKind, string> = {
  partial: "مرتجع جزئي",
  full: "مرتجع كامل",
  exchange: "استبدال",
};

const money = (value: number) =>
  `${value.toLocaleString("ar-EG-u-nu-latn", { maximumFractionDigits: 2 })} ج.م`;

export function SaleReturnPage() {
  const { roles, availableBranches } = useShell();
  const { invoices, returns } = useSales();
  const { products } = useProducts();
  const employees = useEmployees();
  const params = useSearchParams();
  const allowedBranchIds = availableBranches.map((item) => item.id);
  const eligible = invoices.filter(
    (invoice) =>
      ["completed", "partially_returned"].includes(invoice.status) &&
      canAccessSaleBranch(roles, invoice.branchId, allowedBranchIds),
  );
  const [invoiceId, setInvoiceId] = useState(
    params.get("invoice") ?? eligible[0]?.id ?? "",
  );
  const invoice = eligible.find((item) => item.id === invoiceId);
  const [lineId, setLineId] = useState(
    invoice?.lines.find((line) => line.quantity > line.returnedQuantity)?.id ??
      "",
  );
  const [quantity, setQuantity] = useState(1);
  const [kind, setKind] = useState<SaleReturnKind>(
    params.get("mode") === "exchange" ? "exchange" : "partial",
  );
  const [condition, setCondition] =
    useState<ReturnedItemCondition>("resellable");
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState<
    "cash" | "original_method" | "customer_credit"
  >("original_method");
  const [replacement, setReplacement] = useState("");
  const [approval, setApproval] = useState("");
  const [notice, setNotice] = useState("");

  if (!canViewSales(roles)) return <PermissionDeniedState />;

  const employee = resolvePreviewEmployee(roles, employees);
  const returnedValue = returns.reduce(
    (total, item) => total + item.refundAmount,
    0,
  );

  function selectInvoice(nextInvoiceId: string) {
    setInvoiceId(nextInvoiceId);
    const selected = eligible.find((item) => item.id === nextInvoiceId);
    setLineId(
      selected?.lines.find((line) => line.quantity > line.returnedQuantity)
        ?.id ?? "",
    );
    setQuantity(1);
    setNotice("");
  }

  function submit() {
    const result = createSaleReturn({
      invoiceId,
      invoiceLineId: lineId,
      quantity,
      condition,
      kind,
      reason,
      refundMethod: refund,
      replacementProductId: replacement,
      employeeId: employee.id,
      approvalReason: approval,
    });
    setNotice(result.message);
  }

  return (
    <div className="sales-page sale-return-page">
      <header className="sales-header sale-return-header">
        <div>
          <span>المبيعات</span>
          <h2>المرتجعات والاستبدال</h2>
          <p>سجّل الحركة مع الاحتفاظ بالفاتورة الأصلية وسجلها كاملًا.</p>
        </div>
        <div>
          <Link
            className="ui-button ui-button--secondary ui-button--md"
            href="/sales/invoices"
          >
            فواتير المبيعات
          </Link>
        </div>
      </header>

      <section className="sale-return-summary" aria-label="ملخص المرتجعات">
        <Card>
          <span>فواتير قابلة للمرتجع</span>
          <strong>{eligible.length.toLocaleString("ar-EG-u-nu-latn")}</strong>
        </Card>
        <Card>
          <span>حركات مرتجع مسجلة</span>
          <strong>{returns.length.toLocaleString("ar-EG-u-nu-latn")}</strong>
        </Card>
        <Card>
          <span>إجمالي المبالغ المردودة</span>
          <strong>{money(returnedValue)}</strong>
        </Card>
      </section>

      <Card className="sale-return-workspace">
        <header>
          <div>
            <span>تسجيل حركة جديدة</span>
            <h3>اختر الفاتورة والمنتج</h3>
          </div>
          <small>تظهر الفواتير المكتملة التي ما زال بها أصناف قابلة للمرتجع.</small>
        </header>

        {eligible.length ? (
          <div className="sale-return-layout">
            <div className="sale-return-picker">
              <label>
                <span>الفاتورة المكتملة</span>
                <select
                  value={invoiceId}
                  onChange={(event) => selectInvoice(event.target.value)}
                >
                  <option value="">اختر فاتورة</option>
                  {eligible.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.invoiceNumber} · {money(item.totalAmount)}
                    </option>
                  ))}
                </select>
              </label>

              {invoice ? (
                <div className="return-lines">
                  <span className="sale-return-section-label">اختر المنتج</span>
                  {invoice.lines.map((line) => (
                    <label key={line.id}>
                      <input
                        type="radio"
                        name="return-line"
                        checked={lineId === line.id}
                        onChange={() => setLineId(line.id)}
                        disabled={line.quantity === line.returnedQuantity}
                      />
                      <span>
                        <strong>{line.name}</strong>
                        مباع {line.quantity} · مرتجع سابقًا {line.returnedQuantity} ·
                        متاح {line.quantity - line.returnedQuantity}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="sale-return-selection-empty">
                  اختر فاتورة لعرض المنتجات المتاحة للمرتجع.
                </div>
              )}
            </div>

            {invoice ? (
              <div className="sale-return-form">
                <div className="sale-return-fields">
                  <label>
                    <span>الكمية</span>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(event) => setQuantity(Number(event.target.value))}
                    />
                  </label>
                  <label>
                    <span>نوع الحركة</span>
                    <select
                      value={kind}
                      onChange={(event) =>
                        setKind(event.target.value as SaleReturnKind)
                      }
                    >
                      <option value="partial">مرتجع جزئي</option>
                      <option value="full">مرتجع كامل</option>
                      <option value="exchange">استبدال</option>
                    </select>
                  </label>
                  <label>
                    <span>حالة المنتج</span>
                    <select
                      value={condition}
                      onChange={(event) =>
                        setCondition(event.target.value as ReturnedItemCondition)
                      }
                    >
                      <option value="resellable">صالح للبيع — يعود للرصيد</option>
                      <option value="needs_inspection">يحتاج فحصًا</option>
                      <option value="damaged">تالف</option>
                    </select>
                  </label>
                  {kind === "exchange" ? (
                    <label>
                      <span>منتج الاستبدال</span>
                      <select
                        value={replacement}
                        onChange={(event) => setReplacement(event.target.value)}
                      >
                        <option value="">اختر المنتج</option>
                        {products
                          .filter(
                            (product) =>
                              product.active &&
                              product.id !==
                                invoice.lines.find((line) => line.id === lineId)
                                  ?.productId,
                          )
                          .map((product) => (
                            <option value={product.id} key={product.id}>
                              {product.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  ) : (
                    <label>
                      <span>طريقة رد المبلغ</span>
                      <select
                        value={refund}
                        onChange={(event) =>
                          setRefund(event.target.value as typeof refund)
                        }
                      >
                        <option value="original_method">نفس طريقة الدفع</option>
                        <option value="cash">رد نقدي</option>
                        <option value="customer_credit">رصيد للعميل — موافقة</option>
                      </select>
                    </label>
                  )}
                </div>

                <label>
                  <span>سبب المرتجع *</span>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
                <label>
                  <span>سبب الموافقة أو التجاوز</span>
                  <textarea
                    rows={2}
                    value={approval}
                    onChange={(event) => setApproval(event.target.value)}
                  />
                </label>
                {notice ? <p role="alert">{notice}</p> : null}
                <Button variant="primary" onClick={submit}>
                  تسجيل المرتجع
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="sale-return-empty">
            <strong>لا توجد فواتير قابلة للمرتجع حاليًا</strong>
            <span>ستظهر هنا الفاتورة بعد إتمام عملية بيع.</span>
          </div>
        )}
      </Card>

      <Card className="sale-return-records">
        <header>
          <div>
            <span>السجل</span>
            <h3>آخر المرتجعات والاستبدالات</h3>
          </div>
          <strong>{returns.length.toLocaleString("ar-EG-u-nu-latn")}</strong>
        </header>
        {returns.length ? (
          <div className="sale-return-record-list">
            {returns.map((item) => (
              <div key={item.id}>
                <div>
                  <strong>{item.returnNumber}</strong>
                  <span>{returnKindLabels[item.kind]}</span>
                </div>
                <p>{item.reason}</p>
                <strong>{money(item.refundAmount)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="sale-return-record-empty">
            لا توجد حركات مرتجع أو استبدال مسجلة.
          </div>
        )}
      </Card>
    </div>
  );
}
