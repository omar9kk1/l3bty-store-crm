"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { QuickCustomerForm } from "@/features/customers/forms/QuickCustomerForm";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import { createCustomer } from "@/features/customers/services/customer-store";
import type { CustomerFormValues } from "@/features/customers/types";
import { useRentals } from "@/features/rentals/hooks/use-rentals";
import { useMaintenance } from "../hooks/use-maintenance";
import { canIntakeMaintenance } from "../permissions";
import { maintenanceIntakeHref } from "../services/maintenance-navigation";
import { createMaintenanceIntake } from "../services/maintenance-store";
import { buildMaintenanceWhatsAppUrl } from "../services/maintenance-whatsapp-service";
import type { FaultReport, MaintenanceSubjectType } from "../types";

export function MaintenanceIntakePage({
  initialSubjectType = "internal_asset",
  initialReceiptOrderId,
}: {
  initialSubjectType?: MaintenanceSubjectType;
  initialReceiptOrderId?: string;
}) {
  const router = useRouter();
  const { roles, activeBranch, availableBranches } = useShell();
  const branchId =
    activeBranch.id === "all"
      ? (availableBranches.find((item) => item.id !== "all")?.id ?? "main")
      : activeBranch.id;
  const customers = useCustomers();
  const { assets } = useRentals();
  const { faults, orders } = useMaintenance();
  const [type, setType] = useState<MaintenanceSubjectType>(initialSubjectType);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [result, setResult] = useState<{
    valid: boolean;
    message?: string;
    fault?: FaultReport;
    order?: { id: string; orderNumber: string };
  } | null>(null);
  const [key, setKey] = useState(() => `maintenance-intake-${Date.now()}`);

  if (!canIntakeMaintenance(roles)) return <PermissionDeniedState />;

  function addCustomer(values: CustomerFormValues) {
    createCustomer(values, "maintenance");
    setCustomerOpen(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const output = createMaintenanceIntake({
      subjectType: type,
      branchId,
      reportedByEmployeeId: "employee-rental",
      rentalAssetId: String(data.get("rentalAssetId") ?? ""),
      customerId: String(data.get("customerId") ?? ""),
      itemName: String(data.get("itemName") ?? ""),
      itemDescription: "",
      brandModel: "",
      serialNumber: "",
      color: "",
      faultDescription: String(data.get("faultDescription") ?? ""),
      intakeCondition: String(data.get("intakeCondition") ?? ""),
      accessories: String(data.get("accessories") ?? "")
        .split("،")
        .map((item) => item.trim())
        .filter(Boolean),
      priority: "normal",
      stoppedOperating: data.get("stoppedOperating") === "on",
      expectedInspectionAt: "",
      notes: "",
      assignedTechnicianId: null,
      attachmentNames: [],
      idempotencyKey: key,
    });
    setResult(output);
    if (output.valid && output.order) {
      setKey(`maintenance-intake-${Date.now()}-next`);
      router.replace(maintenanceIntakeHref(type, output.order.id), { scroll: false });
    }
  }

  const savedOrder = initialReceiptOrderId ? orders.find((item) => item.id === initialReceiptOrderId) : undefined;
  const savedFault = savedOrder ? faults.find((item) => item.id === savedOrder.faultReportId) : undefined;
  const completedOrder = result?.valid && result.order ? result.order : savedOrder;
  const completedFault = result?.valid && result.fault ? result.fault : savedFault;

  if (completedOrder && completedFault) {
    const receiptType = completedFault.subjectType;
    const customer = customers.find((item) => item.id === completedFault.customerId);
    const whatsAppUrl = customer
      ? buildMaintenanceWhatsAppUrl(
          customer.primaryPhone,
          "fault_registered",
          completedFault.faultNumber,
          completedFault.itemName,
        )
      : null;

    return (
      <Card className="maintenance-receipt">
        <span>{receiptType === "customer_item" ? "تم تسجيل اللعبة للصيانة" : "تم تسجيل بلاغ العطل"}</span>
        <p>رقم العطل</p>
        <h2 dir="ltr">{completedFault.faultNumber}</h2>
        <p>
          {receiptType === "customer_item"
            ? "سيتم فحص اللعبة والتواصل مع العميل بعد تحديد العطل."
            : "أُرسل البلاغ للمتابعة الفنية داخل الفرع."}
        </p>
        <div>
          <Link
            className="ui-button ui-button--primary ui-button--md"
            href={`/maintenance/orders/${completedOrder.id}`}
          >
            فتح أمر الصيانة
          </Link>
          <Button onClick={() => { setResult(null); router.replace(maintenanceIntakeHref(receiptType), { scroll: false }); }}>استلام جديد</Button>
          {receiptType === "customer_item" ? (
            whatsAppUrl ? (
              <a
                className="ui-button ui-button--secondary ui-button--md"
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle aria-hidden size={17} />
                إرسال رقم العطل عبر واتساب
              </a>
            ) : (
              <Button disabled>رقم العميل غير صالح للواتساب</Button>
            )
          ) : null}
        </div>
      </Card>
    );
  }

  return (
    <div className="maintenance-page">
      <header className="maintenance-page__header">
        <div>
          <span>الصيانة</span>
          <h2>{type === "internal_asset" ? "بلاغ عطل لعبة الفرع" : "استلام لعبة عميل للصيانة"}</h2>
          <p>
            {type === "internal_asset"
              ? "سجّل عطل لعبة موجودة في الفرع ليتابعها الفني حتى عودتها للتشغيل."
              : "سجّل اللعبة والعطل وحالتها وملحقاتها عند الاستلام."}
          </p>
        </div>
      </header>

      <div className="maintenance-type-choice">
        <button
          type="button"
          className={type === "internal_asset" ? "is-active" : ""}
          aria-pressed={type === "internal_asset"}
          onClick={() => setType("internal_asset")}
        >
          <strong>عطل أصل تأجير داخلي</strong>
          <span>بلاغ من الفرع لأصل تابع للنشاط</span>
        </button>
        <button
          type="button"
          className={type === "customer_item" ? "is-active" : ""}
          aria-pressed={type === "customer_item"}
          onClick={() => setType("customer_item")}
        >
          <strong>لعبة كهربائية للعميل</strong>
          <span>استلام لعبة مملوكة للعميل للصيانة</span>
        </button>
      </div>

      <Card>
        <form className="maintenance-form" onSubmit={submit}>
          <section>
            <h3>{type === "internal_asset" ? "بيانات لعبة الفرع" : "بيانات اللعبة"}</h3>
            <div className="maintenance-form-grid">
              {type === "internal_asset" ? (
                <label className="span-2">
                  أصل التأجير
                  <select name="rentalAssetId" required defaultValue="">
                    <option value="">اختر الأصل</option>
                    {assets
                      .filter((item) => item.branchId === branchId)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.assetNumber} · {item.name}
                        </option>
                      ))}
                  </select>
                </label>
              ) : (
                <>
                  <label>
                    العميل
                    <select name="customerId" required defaultValue="">
                      <option value="">اختر العميل</option>
                      {customers.filter((item) => !item.deletedAt).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.primaryPhone}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button
                    type="button"
                    className="maintenance-quick-customer"
                    onClick={() => setCustomerOpen(true)}
                  >
                    إضافة عميل سريع
                  </Button>
                  <label className="span-2">
                    اسم اللعبة
                    <input name="itemName" required />
                  </label>
                </>
              )}
            </div>
          </section>

          <section>
            <h3>العطل وحالة الاستلام</h3>
            <div className="maintenance-form-grid">
              <label className="span-2">
                وصف العطل
                <textarea name="faultDescription" required />
              </label>
              <label className="span-2">
                الحالة عند الاستلام
                <textarea name="intakeCondition" required />
              </label>
              <label className="span-2">
                الملحقات المستلمة
                <input name="accessories" placeholder="مثال: بطارية، شاحن، مفتاح" />
              </label>
              {type === "internal_asset" ? (
                <label className="check span-2">
                  <input type="checkbox" name="stoppedOperating" />
                  متوقفة عن التشغيل
                </label>
              ) : null}
            </div>
          </section>

          {result && !result.valid ? (
            <p className="maintenance-error" role="alert">
              {result.message}
            </p>
          ) : null}

          <div className="maintenance-form-actions">
            <Button type="submit" variant="primary">
              {type === "internal_asset" ? "إرسال بلاغ العطل" : "تسجيل استلام لعبة العميل"}
            </Button>
            <Link className="ui-button ui-button--secondary ui-button--md" href="/maintenance">
              إلغاء
            </Link>
          </div>
        </form>
      </Card>

      <Drawer
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        title="إضافة عميل سريع"
        description="أدخل اسم العميل ورقم هاتفه فقط."
        variant="auxiliary"
      >
        <QuickCustomerForm
          customers={customers.filter((customer) => !customer.deletedAt)}
          branches={availableBranches}
          fixedBranchId={branchId}
          essentialFieldsOnly
          onSave={addCustomer}
        />
      </Drawer>
    </div>
  );
}
