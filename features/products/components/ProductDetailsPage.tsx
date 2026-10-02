"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Pencil } from "lucide-react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { ProductForm } from "../forms/ProductForm";
import { useProducts } from "../hooks/use-products";
import {
  canManageProducts,
  canViewProductCost,
  canViewProducts,
} from "../permissions";
export function ProductDetailsPage({ productId }: { productId: string }) {
  const { roles, availableBranches } = useShell();
  const { products, stocks, movements } = useProducts();
  const branches = useBranches();
  const [edit, setEdit] = useState(false);
  if (!canViewProducts(roles)) return <PermissionDeniedState />;
  const product = products.find((item) => item.id === productId);
  if (!product)
    return (
      <Card className="products-state">
        <h2>المنتج غير موجود</h2>
      </Card>
    );
  const allowed = new Set(
    availableBranches
      .filter((item) => item.id !== "all")
      .map((item) => item.id),
  );
  const scopedStocks = stocks.filter(
    (item) =>
      item.productId === product.id &&
      (roles.includes("owner") ||
        roles.includes("manager") ||
        allowed.has(item.branchId)),
  );
  return (
    <div className="product-details-page">
      <Link href="/products" className="product-back">
        <ArrowRight size={16} />
        العودة إلى المنتجات
      </Link>
      <Card className="product-profile">
        <div>
          <span>{product.sku}</span>
          <h2>{product.name}</h2>
          <p>{product.description}</p>
        </div>
        <div>
          <Badge tone={product.type === "sale_toy" ? "accent" : "info"}>
            {product.type === "sale_toy" ? "لعبة للبيع" : "قطعة غيار"}
          </Badge>
          <Badge tone={product.active ? "success" : "neutral"}>
            {product.active ? "نشط" : "غير نشط"}
          </Badge>
          {canManageProducts(roles) ? (
            <Button icon={<Pencil size={16} />} onClick={() => setEdit(true)}>
              تعديل
            </Button>
          ) : null}
        </div>
      </Card>
      <section className="product-detail-grid">
        <Card>
          <h3>التسعير</h3>
          <dl>
            <div>
              <dt>سعر البيع</dt>
              <dd>{product.salePrice.toLocaleString("ar-EG-u-nu-latn")} ج.م</dd>
            </div>
            {canViewProductCost(roles) ? (
              <>
                <div>
                  <dt>تكلفة الشراء</dt>
                  <dd>
                    {product.costSnapshot.toLocaleString("ar-EG-u-nu-latn")} ج.م
                  </dd>
                </div>
                <div>
                  <dt>هامش الربح</dt>
                  <dd>
                    {(product.salePrice - product.costSnapshot).toLocaleString(
                      "ar-EG-u-nu-latn",
                    )}{" "}
                    ج.م
                  </dd>
                </div>
              </>
            ) : null}
            <div>
              <dt>الضريبة</dt>
              <dd>{product.taxRate}%</dd>
            </div>
            <div>
              <dt>الضمان</dt>
              <dd>{product.warrantyDays} يومًا</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h3>تعريف المنتج</h3>
          <dl>
            <div>
              <dt>Barcode</dt>
              <dd dir="ltr">{product.barcode || "—"}</dd>
            </div>
            <div>
              <dt>الفئة</dt>
              <dd>{product.category}</dd>
            </div>
            <div>
              <dt>العلامة</dt>
              <dd>{product.brand || "—"}</dd>
            </div>
          </dl>
        </Card>
      </section>
      <Card className="product-stock">
        <h3>الرصيد حسب الفرع</h3>
        {scopedStocks.map((stock) => (
          <div key={stock.branchId}>
            <strong>
              {branches.find((branch) => branch.id === stock.branchId)?.name}
            </strong>
            <span>
              متاح {stock.quantityAvailable.toLocaleString("ar-EG-u-nu-latn")}
            </span>
            <span>
              محجوز {stock.quantityReserved.toLocaleString("ar-EG-u-nu-latn")}
            </span>
            <span>
              الحد الأدنى {stock.minimumStock.toLocaleString("ar-EG-u-nu-latn")}
            </span>
          </div>
        ))}
      </Card>
      <Card className="product-timeline">
        <h3>حركة المنتج</h3>
        {movements
          .filter(
            (item) =>
              item.productId === product.id &&
              (roles.includes("owner") ||
                roles.includes("manager") ||
                allowed.has(item.branchId)),
          )
          .slice(0, 8)
          .map((movement) => (
            <div key={movement.id}>
              <strong>{movement.reason}</strong>
              <span>
                {movement.reference} ·{" "}
                {movement.quantity.toLocaleString("ar-EG-u-nu-latn")}
              </span>
            </div>
          ))}
      </Card>
      <Drawer
        open={edit}
        onOpenChange={setEdit}
        title="تعديل منتج البيع"
        description="تحديث بيانات المنتج المعروضة في النظام."
        variant="auxiliary"
      >
        <ProductForm
          product={product}
          branches={branches}
          stocks={stocks}
          onCancel={() => setEdit(false)}
          onSaved={() => setEdit(false)}
        />
      </Drawer>
    </div>
  );
}
