"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { useShell } from "@/components/shell/ShellContext";
import { Button } from "@/components/ui/Button";
import type { Branch } from "@/features/branches/types";
import type { Customer } from "@/features/customers/types";
import type { RentalAsset } from "@/features/rental-assets/types";
import { canSendRentalWhatsApp, currentRentalActorId } from "../permissions";
import { recordInvoiceWhatsAppOpened, recordRentalReminderOutcome } from "../services/rental-store";
import { browserRentalWhatsAppService } from "../services/rental-whatsapp-service";
import type { Rental } from "../types";
import { durationLabels } from "./rental-labels";

interface RentalWhatsAppActionProps {
  rental: Rental;
  asset: RentalAsset;
  customer: Customer;
  branch: Branch;
  kind: "invoice" | "reminder";
  compact?: boolean;
}

export function RentalWhatsAppAction({ rental, asset, customer, branch, kind, compact = false }: RentalWhatsAppActionProps) {
  const { roles } = useShell();
  const [notice, setNotice] = useState("");

  if (!canSendRentalWhatsApp(roles)) return null;

  const durationLabel = rental.durationType === "open_time"
    ? durationLabels.open_time
    : `${rental.durationMinutes ?? 0} دقيقة`;
  const preview = kind === "invoice"
    ? browserRentalWhatsAppService.buildInvoiceLink({
        customerName: customer.name,
        customerPhone: customer.primaryPhone,
        assetName: asset.name,
        rentalNumber: rental.rentalNumber,
        branchName: branch.name,
        startedAt: rental.startedAt,
        endedAt: rental.closedAt ?? rental.expectedEndAt,
        durationLabel,
        totalAmount: rental.currentAmount,
        paidAmount: rental.paidAmount,
      })
    : rental.expectedEndAt
      ? browserRentalWhatsAppService.buildReminderLink({
          customerName: customer.name,
          customerPhone: customer.primaryPhone,
          assetName: asset.name,
          assetNumber: asset.assetNumber,
          branchName: branch.name,
          expectedEndAt: rental.expectedEndAt,
        })
      : { valid: false, href: null, message: "التأجير المفتوح لا يملك موعد انتهاء", internationalPhone: null };

  if (!preview.valid) {
    return (
      <div className="rental-whatsapp-action rental-whatsapp-action--invalid">
        <Button size={compact ? "sm" : "md"} disabled icon={<MessageCircle size={16} />}>
          {kind === "invoice" ? "إرسال الفاتورة عبر واتساب" : "تذكير العميل على واتساب"}
        </Button>
        <small>لا يوجد رقم واتساب صالح لهذا العميل</small>
        <Link href={`/customers/${customer.id}`}>فتح ملف العميل وتعديل الرقم</Link>
      </div>
    );
  }

  function openWhatsApp() {
    const result = kind === "invoice"
      ? browserRentalWhatsAppService.buildInvoiceLink({
          customerName: customer.name,
          customerPhone: customer.primaryPhone,
          assetName: asset.name,
          rentalNumber: rental.rentalNumber,
          branchName: branch.name,
          startedAt: rental.startedAt,
          endedAt: rental.closedAt ?? rental.expectedEndAt,
          durationLabel,
          totalAmount: rental.currentAmount,
          paidAmount: rental.paidAmount,
          receiptUrl: `${window.location.origin}/rentals/${rental.id}`,
        })
      : preview;
    const outcome = browserRentalWhatsAppService.open(result);
    const actor = currentRentalActorId(roles);
    if (kind === "reminder") recordRentalReminderOutcome(rental.id, outcome, actor);
    else if (outcome === "opened") recordInvoiceWhatsAppOpened(rental.id, actor);
    setNotice(
      outcome === "opened"
        ? "فُتح واتساب بالرسالة الجاهزة؛ الإرسال يتم يدويًا."
        : outcome === "failed_to_open"
          ? "تعذر فتح واتساب. اسمح بالنوافذ المنبثقة وحاول مجددًا."
          : "لا يوجد رقم واتساب صالح لهذا العميل",
    );
  }

  return (
    <div className={`rental-whatsapp-action${compact ? " rental-whatsapp-action--compact" : ""}`}>
      <Button size={compact ? "sm" : "md"} icon={<MessageCircle size={16} />} onClick={openWhatsApp}>
        {kind === "invoice" ? "إرسال الفاتورة عبر واتساب" : "تذكير العميل على واتساب"}
      </Button>
      {notice ? <small role="status">{notice}</small> : null}
    </div>
  );
}
