"use client";

import { BellRing, CheckCheck, Clock3 } from "lucide-react";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Branch } from "@/features/branches/types";
import type { Customer } from "@/features/customers/types";
import type { RentalAsset } from "@/features/rental-assets/types";
import { getSettingsSnapshot } from "@/features/settings/services/settings-store";
import { useRentalReminderEvaluation } from "../hooks/use-rental-reminders";
import { currentRentalActorId } from "../permissions";
import { MOCK_SERVER_TIME } from "../services/rental-rules";
import { remainingRentalSeconds } from "../services/rental-reminder-service";
import { recordRentalReminderOutcome } from "../services/rental-store";
import type { Rental } from "../types";
import { RentalWhatsAppAction } from "./RentalWhatsAppAction";

export function RentalReminderPanel({ rental, asset, customer, branch, compact = false }: { rental: Rental; asset: RentalAsset; customer: Customer; branch: Branch; compact?: boolean }) {
  useRentalReminderEvaluation();
  const { roles } = useShell();
  const remaining = remainingRentalSeconds(rental, MOCK_SERVER_TIME.referenceIso);
  const visibleStatuses = ["due", "opened", "failed_to_open", "customer_phone_missing"];
  if (rental.durationType === "open_time" || remaining === null || remaining <= 0 || remaining > getSettingsSnapshot().settings.reminderMinutes * 60 || !visibleStatuses.includes(rental.reminderStatus)) return null;

  return (
    <Card className={`rental-reminder${compact ? " rental-reminder--compact" : ""}`}>
      <div className="rental-reminder__heading">
        <BellRing size={18} />
        <div><strong>اقترب انتهاء التأجير</strong><span>{asset.name} · {customer.name}</span></div>
        <Badge tone="warning">متبقي 5 دقائق</Badge>
      </div>
      <div className="rental-reminder__actions">
        <RentalWhatsAppAction rental={rental} asset={asset} customer={customer} branch={branch} kind="reminder" compact={compact} />
        {rental.reminderStatus === "opened" ? (
          <Button size="sm" icon={<CheckCheck size={15} />} onClick={() => recordRentalReminderOutcome(rental.id, "sent_manually", currentRentalActorId(roles))}>
            تأكيد الإرسال يدويًا
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" icon={<Clock3 size={15} />} onClick={() => recordRentalReminderOutcome(rental.id, "skipped", currentRentalActorId(roles))}>تخطي</Button>
      </div>
    </Card>
  );
}
