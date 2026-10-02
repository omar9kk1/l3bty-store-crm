"use client";
import Link from "next/link";
import { useState } from "react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { useProducts } from "@/features/products/hooks/use-products";
import { useInventory } from "../hooks/use-inventory";
import {
  canViewInventory,
  canViewInventoryCost,
  isInventoryAdmin,
} from "../permissions";
import {
  inventoryBranchLabel,
  inventoryMoney,
  inventoryMovementPerformerLabel,
  inventoryMovementReferenceLabel,
  movementLabels,
} from "./inventory-labels";
export function StockMovementsPage() {
  const { roles, availableBranches } = useShell();
  const { movements } = useInventory();
  const { products } = useProducts();
  const employees = useEmployees();
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const ownerReadOnly = roles.includes("owner") && !roles.includes("manager");
  const technician = roles.includes("maintenance_technician");
  const technicianOnly = technician && !isInventoryAdmin(roles);
  if (!canViewInventory(roles)) return <PermissionDeniedState />;
  const allowed = new Set(
    availableBranches
      .filter((item) => item.id !== "all")
      .map((item) => item.id),
  );
  const productMap = new Map(products.map((item) => [item.id, item]));
  const employeeMap = new Map(employees.map((item) => [item.id, item.name]));
  const branchMap = new Map(
    availableBranches.map((item) => [item.id, item.nameAr]),
  );
  const visible = movements
    .filter(
      (item) =>
        isInventoryAdmin(roles) ||
        allowed.has(item.branchId) ||
        (technician && item.branchId === "workshop"),
    )
    .filter((item) => {
      const product = productMap.get(item.productId);
      if (technician) return product?.type === "spare_part";
      if (
        roles.includes("rental_maintenance_employee") &&
        !roles.includes("sales_employee")
      )
        return (
          product?.type === "spare_part" &&
          [
            "maintenance_issue",
            "maintenance_return",
            "transfer_dispatch",
            "transfer_receive",
          ].includes(item.type)
        );
      return true;
    });
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = visible
    .filter((item) => branchFilter === "all" || item.branchId === branchFilter)
    .filter((item) =>
      directionFilter === "all"
        ? true
        : directionFilter === "in"
          ? item.quantity > 0
          : item.quantity < 0,
    )
    .filter((item) => {
      if (!normalizedQuery) return true;
      const product = productMap.get(item.productId);
      return `${item.movementNumber} ${item.referenceId} ${product?.name ?? ""}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  const additions = visible.filter((item) => item.quantity > 0).length;
  const deductions = visible.filter((item) => item.quantity < 0).length;
  const affectedProducts = new Set(visible.map((item) => item.productId)).size;
  return (
    <div className="inventory-page">
      <header className="inventory-header">
        <div>
          <span>المخزون</span>
          <h2>{ownerReadOnly ? "متابعة حركات المخزون" : "سجل حركات المخزون"}</h2>
          <p>{ownerReadOnly ? "كل الزيادة والنقص والتحويلات والتسويات المسجلة في الفروع." : "سجل ثابت؛ التصحيح يتم بحركة عكسية أو تسوية موثقة فقط."}</p>
        </div>
        <Link className="ui-button ui-button--secondary ui-button--md" href="/inventory">
          رجوع إلى المخزون
        </Link>
      </header>

      <nav
        className="inventory-tabs inventory-tabs--section-nav"
        aria-label="أقسام المخزون"
      >
        {!technicianOnly ? <Link href="/inventory">الأرصدة</Link> : null}
        {(isInventoryAdmin(roles) || technician) ? (
          <Link href="/inventory/restock-requests">طلبات التزويد</Link>
        ) : null}
        <Link className="is-active" href="/inventory/movements">
          الحركات
        </Link>
      </nav>

      <section className="inventory-summary">
        <Card>
          <span>إجمالي الحركات</span>
          <strong>{visible.length.toLocaleString("ar-EG-u-nu-latn")}</strong>
        </Card>
        <Card>
          <span>حركات إضافة</span>
          <strong>{additions.toLocaleString("ar-EG-u-nu-latn")}</strong>
        </Card>
        <Card>
          <span>حركات صرف</span>
          <strong>{deductions.toLocaleString("ar-EG-u-nu-latn")}</strong>
        </Card>
        <Card>
          <span>أصناف تحركت</span>
          <strong>{affectedProducts.toLocaleString("ar-EG-u-nu-latn")}</strong>
        </Card>
      </section>

      <Card className="inventory-filters">
        <input
          aria-label="البحث في الحركات"
          placeholder="ابحث باسم الصنف أو رقم الحركة أو المرجع"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="تصفية حسب الفرع"
          value={branchFilter}
          onChange={(event) => setBranchFilter(event.target.value)}
        >
          <option value="all">كل الفروع</option>
          {[...new Set(visible.map((item) => item.branchId))].map((branchId) => (
            <option value={branchId} key={branchId}>
              {inventoryBranchLabel(branchId, availableBranches)}
            </option>
          ))}
        </select>
        <select
          aria-label="تصفية حسب اتجاه الحركة"
          value={directionFilter}
          onChange={(event) => setDirectionFilter(event.target.value)}
        >
          <option value="all">كل الحركات</option>
          <option value="in">إضافة للمخزون</option>
          <option value="out">صرف من المخزون</option>
        </select>
      </Card>
      <Card
        className={`inventory-list${!filtered.length ? " inventory-list--empty" : ""}`}
      >
        <div className="inventory-table-wrap">
          <table>
            <thead>
              <tr>
                <th>رقم الحركة</th>
                <th>التاريخ</th>
                <th>المنتج</th>
                <th>النوع</th>
                <th>الفرع</th>
                <th>الكمية</th>
                <th>قبل</th>
                <th>بعد</th>
                <th>المرجع</th>
                <th>المنفذ</th>
                {canViewInventoryCost(roles) ? <th>التكلفة</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>{item.movementNumber}</td>
                  <td>
                    {new Date(item.occurredAt).toLocaleString(
                      "ar-EG-u-nu-latn",
                    )}
                  </td>
                  <td>{productMap.get(item.productId)?.name ?? "منتج غير معروف"}</td>
                  <td>
                    <Badge tone={item.quantity < 0 ? "warning" : "success"}>
                      {movementLabels[item.type]}
                    </Badge>
                  </td>
                  <td>{branchMap.get(item.branchId) ?? "فرع غير معروف"}</td>
                  <td>
                    {item.quantity > 0 ? `+${item.quantity}` : item.quantity}
                  </td>
                  <td>{item.quantityBefore}</td>
                  <td>{item.quantityAfter}</td>
                  <td>{inventoryMovementReferenceLabel(item.referenceId)}</td>
                  <td>
                    {inventoryMovementPerformerLabel(
                      item.performedByEmployeeId,
                      employeeMap.get(item.performedByEmployeeId),
                    )}
                  </td>
                  {canViewInventoryCost(roles) ? (
                    <td>{inventoryMoney(item.unitCost)}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="inventory-mobile-list">
          {filtered.map((item) => (
            <Card className="inventory-mobile-card" key={item.id}>
              <header>
                <strong>{item.movementNumber}</strong>
                <Badge tone={item.quantity < 0 ? "warning" : "success"}>
                  {item.quantity > 0 ? `+${item.quantity}` : item.quantity}
                </Badge>
              </header>
              <h3>{productMap.get(item.productId)?.name ?? "منتج غير معروف"}</h3>
              <p>
                {movementLabels[item.type]} · {branchMap.get(item.branchId) ?? "فرع غير معروف"} ·{" "}
                {inventoryMovementReferenceLabel(item.referenceId)}
              </p>
            </Card>
          ))}
        </div>
        {!filtered.length ? (
          <div className="inventory-state">
            <h3>{visible.length ? "لا توجد حركات مطابقة" : "لا توجد حركات مخزون حتى الآن"}</h3>
            <p>
              {visible.length
                ? "غيّر البحث أو الفلاتر لعرض حركات أخرى."
                : "ستظهر هنا أي إضافة أو صرف أو تحويل أو تسوية تُسجل على المخزون."}
            </p>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
