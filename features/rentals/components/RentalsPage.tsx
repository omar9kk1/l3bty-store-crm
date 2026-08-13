"use client";

import Link from "next/link";
import { AlertTriangle, Plus, WifiOff } from "lucide-react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBranches } from "@/features/branches/hooks/use-branches";
import type { Branch } from "@/features/branches/types";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import type { Customer } from "@/features/customers/types";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import type { RentalAsset } from "@/features/rental-assets/types";
import { PERMISSION_KEYS } from "@/permissions/keys";
import { useRentalClock } from "../hooks/use-rental-clock";
import { useRentalReminderEvaluation } from "../hooks/use-rental-reminders";
import { useRentals } from "../hooks/use-rentals";
import { canUseRentalAdministrativeFilters, canViewRentals } from "../permissions";
import type { Rental } from "../types";
import { calculateOpenAmount } from "../services/rental-rules";
import { getRentalTimerView } from "../services/rental-timer-view";
import { durationLabels, money, rentalStatusLabels, statusTone, time } from "./rental-labels";
import { RentalWhatsAppAction } from "./RentalWhatsAppAction";

export function RentalsPage() {
  const { roles, permissions } = useShell();
  if (!permissions.has(PERMISSION_KEYS.rentals) || !canViewRentals(roles)) return <PermissionDeniedState />;
  return <RentalsContent />;
}

const rentalStatusDescriptions: Record<Rental["status"], string> = {
  selecting: "ما زالت في مرحلة الاختيار والتجربة",
  active: "التأجيرة تعمل الآن",
  near_end: "اقترب موعد انتهاء التأجيرة",
  additional_time: "تجاوزت التأجيرة مدتها المحددة",
  completed: "انتهت التأجيرة وتم إغلاقها",
  cancelled: "أُلغيت قبل بدء التشغيل",
};

const rentalStatusPriority: Record<Rental["status"], number> = {
  additional_time: 0,
  near_end: 1,
  active: 2,
  selecting: 3,
  completed: 4,
  cancelled: 5,
};

function rentalLiveAmount(rental: Rental, referenceMs: number) {
  if (rental.durationType !== "open_time" || !rental.startedAt || !["active", "near_end", "additional_time"].includes(rental.status)) return rental.currentAmount;
  const seconds = Math.max(0, Math.floor((referenceMs - new Date(rental.startedAt).getTime()) / 1000));
  return calculateOpenAmount(seconds, rental.pricePerHour);
}
function RentalListTimer({ rental, referenceMs }: { rental: Rental; referenceMs: number }) {
  const timer = getRentalTimerView(rental, referenceMs);
  return (
    <div
      className={`rental-ring-timer rental-ring-timer--${timer.tone} rental-ring-timer--${timer.mode}`}
      aria-label={`${timer.label} ${timer.value}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(timer.progress)}
      data-progress={timer.progress.toFixed(2)}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="rental-ring-timer__track" cx="60" cy="60" r="52" pathLength="100" />
        <circle
          className="rental-ring-timer__value"
          cx="60"
          cy="60"
          r="52"
          pathLength="100"
          strokeDasharray="100"
          style={{ strokeDashoffset: 100 - timer.progress }}
        />
      </svg>
      <div className="rental-ring-timer__content">
        <span>{timer.label}</span>
        <strong dir="ltr">{timer.value}</strong>
      </div>
    </div>
  );
}
function RentalActions({ rental, asset, customer, branch }: { rental: Rental; asset?: RentalAsset; customer?: Customer; branch?: Branch }) {
  const reminderVisible = ["due", "opened", "failed_to_open", "customer_phone_missing"].includes(rental.reminderStatus);
  const active = ["active", "near_end", "additional_time"].includes(rental.status);
  return (
    <div className="rental-list-actions">
      {reminderVisible ? <Badge tone="warning">متبقي 5 دقائق</Badge> : null}
      {reminderVisible && asset && customer && branch ? <RentalWhatsAppAction rental={rental} asset={asset} customer={customer} branch={branch} kind="reminder" compact /> : null}
      {rental.status === "completed" && asset && customer && branch ? <RentalWhatsAppAction rental={rental} asset={asset} customer={customer} branch={branch} kind="invoice" compact /> : null}
      {active ? <a className="ui-button ui-button--primary ui-button--sm rental-list-actions__close" href={"/rentals/"+rental.id+"/close"}>إنهاء</a> : null}
      <Link className="ui-button ui-button--secondary ui-button--sm" href={`/rentals/${rental.id}`}>{"\u0639\u0631\u0636 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644"}</Link>
    </div>
  );
}


function RentalCard({ rental, asset, customer, branch, referenceMs }: { rental: Rental; asset?: RentalAsset; customer?: Customer; branch?: Branch; referenceMs: number }) {
  const live = ["active", "near_end", "additional_time"].includes(rental.status);
  return (
    <Card className={`rental-card${live ? " rental-card--live" : ""}`}>
      <header className="rental-card__header">
        <div>
          <bdi dir="ltr">{rental.rentalNumber}</bdi>
          <span>{branch?.name ?? rental.branchId}</span>
        </div>
        <Badge tone={statusTone(rental.status)}>{rentalStatusLabels[rental.status]}</Badge>
      </header>

      <div className="rental-card__body">
        <div className="rental-card__timer">
          <RentalListTimer rental={rental} referenceMs={referenceMs} />
          <p>{rentalStatusDescriptions[rental.status]}</p>
        </div>

        <div className="rental-card__details">
          <div className="rental-card__asset">
            <span>{"\u0627\u0644\u0644\u0639\u0628\u0629"}</span>
            <h3>{asset?.name ?? "\u0623\u0635\u0644 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641"}</h3>
            <bdi dir="ltr">{asset?.assetNumber ?? rental.assetId}</bdi>
          </div>
          <dl>
            <div><dt>{"\u0627\u0644\u0639\u0645\u064a\u0644"}</dt><dd>{customer?.name ?? "\u0639\u0645\u064a\u0644 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641"}</dd></div>
            <div><dt>{"\u0627\u0644\u0645\u062f\u0629"}</dt><dd>{durationLabels[rental.durationType]}</dd></div>
            <div><dt>{"\u0627\u0644\u0628\u062f\u0627\u064a\u0629"}</dt><dd>{time(rental.startedAt)}</dd></div>
            <div className="rental-card__amount"><dt>{"\u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u062d\u0627\u0644\u064a"}</dt><dd>{money(rentalLiveAmount(rental, referenceMs))}</dd></div>
          </dl>
        </div>
      </div>

      <footer className="rental-card__footer">
        <RentalActions rental={rental} asset={asset} customer={customer} branch={branch} />
      </footer>
    </Card>
  );
}
function RentalsContent() {
  useRentalReminderEvaluation();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { roles, activeBranch, availableBranches } = useShell();
  const { rentals, assets } = useRentals();
  const customers = useCustomers();
  const branches = useBranches();
  const employees = useEmployees();
  const state = params.get("state") ?? "normal";
  const referenceMs = useRentalClock(state !== "offline");
  const administrativeFilters = canUseRentalAdministrativeFilters(roles);
  const status = params.get("status") ?? "all";
  const duration = params.get("duration") ?? "all";
  const customerFilter = params.get("customer") ?? "all";
  const assetFilter = params.get("asset") ?? "all";
  const employeeFilter = administrativeFilters ? params.get("employee") ?? "all" : "all";
  const requestedBranch = params.get("branch") ?? activeBranch.id;
  const branch = administrativeFilters ? requestedBranch : activeBranch.id;
  const allowed = new Set(availableBranches.filter((item) => item.id !== "all").map((item) => item.id));
  const scopedRentals = rentals.filter((item) =>
    (administrativeFilters || allowed.has(item.branchId))
    && (branch === "all" || item.branchId === branch),
  );
  const filterBase = scopedRentals.filter((item) =>
    (duration === "all" || item.durationType === duration)
    && (customerFilter === "all" || item.customerId === customerFilter)
    && (assetFilter === "all" || item.assetId === assetFilter)
    && (employeeFilter === "all" || item.employeeId === employeeFilter),
  );
  const filtered = (state === "empty" ? [] : filterBase).filter((item) => status === "all" || item.status === status);
  const scopedCustomerIds = new Set(scopedRentals.map((item) => item.customerId));
  const scopedAssetIds = new Set(scopedRentals.map((item) => item.assetId));
  const scopedEmployeeIds = new Set(scopedRentals.map((item) => item.employeeId));
  const filterCustomers = customers.filter((item) => scopedCustomerIds.has(item.id));
  const filterAssets = assets.filter((item) => scopedAssetIds.has(item.id));
  const filterEmployees = employees.filter((item) => scopedEmployeeIds.has(item.id));
  const customerMap = new Map(customers.map((item) => [item.id, item]));
  const assetMap = new Map(assets.map((item) => [item.id, item]));
  const branchMap = new Map(branches.map((item) => [item.id, item]));

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all" || !value) next.delete(key); else next.set(key, value);
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  if (state === "loading") return <div className="rental-skeleton" aria-label="جار تحميل التأجيرات">جار التحميل…</div>;
  return (
    <div className="rentals-page">
      {state === "offline" ? <div className="rentals-offline"><WifiOff size={17} />دون اتصال — القراءة متاحة والإجراءات معطلة، والعداد يعرض آخر مرجع معروف.</div> : null}
      <header className="rentals-header">
        <div><span>التشغيل</span><h2>التأجيرات</h2><p>تأجيرات ثابتة ووقت مفتوح ضمن نطاق الفرع.</p></div>
        <Link aria-disabled={state === "offline"} className="ui-button ui-button--primary ui-button--md" href={state === "offline" ? "#" : "/rentals/new"}><Plus size={17} />تأجير جديد</Link>
      </header>
      <section className="rental-summary">
        {Object.entries(rentalStatusLabels).map(([key, label]) => <Card key={key}><span>{label}</span><strong>{filterBase.filter((item) => item.status === key).length.toLocaleString("ar-EG-u-nu-latn")}</strong></Card>)}
      </section>
      <Card className={`rental-filters${administrativeFilters ? "" : " rental-filters--scoped"}`}>
        {administrativeFilters ? <select aria-label="الفرع" value={branch} onChange={(event) => setFilter("branch", event.target.value)}><option value="all">كل الفروع</option>{availableBranches.filter((item) => item.id !== "all").map((item) => <option key={item.id} value={item.id}>{item.nameAr}</option>)}</select> : null}
        <select aria-label="الحالة" value={status} onChange={(event) => setFilter("status", event.target.value)}><option value="all">كل الحالات</option>{Object.entries(rentalStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <select aria-label="نوع المدة" value={duration} onChange={(event) => setFilter("duration", event.target.value)}><option value="all">كل المدد</option>{Object.entries(durationLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <select aria-label="العميل" value={customerFilter} onChange={(event) => setFilter("customer", event.target.value)}><option value="all">كل عملاء الفرع</option>{filterCustomers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select aria-label="الأصل" value={assetFilter} onChange={(event) => setFilter("asset", event.target.value)}><option value="all">كل أصول الفرع</option>{filterAssets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        {administrativeFilters ? <select aria-label="الموظف" value={employeeFilter} onChange={(event) => setFilter("employee", event.target.value)}><option value="all">كل الموظفين</option>{filterEmployees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : null}
      </Card>
      {state === "error" ? (
        <Card className="rental-state"><AlertTriangle /><h3>تعذر تحميل التأجيرات</h3><p>Reference Code: RNT-MOCK-503</p><Button onClick={() => setFilter("state", "normal")}>إعادة المحاولة</Button></Card>
      ) : filtered.length ? (
        <section className="rental-card-grid" aria-label={"\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062a\u0623\u062c\u064a\u0631\u0627\u062a"}>
          {[...filtered]
            .sort((first, second) => rentalStatusPriority[first.status] - rentalStatusPriority[second.status])
            .map((item) => {
              const customer = customerMap.get(item.customerId);
              const asset = assetMap.get(item.assetId);
              const itemBranch = branchMap.get(item.branchId);
              return <RentalCard key={item.id} rental={item} asset={asset} customer={customer} branch={itemBranch} referenceMs={referenceMs} />;
            })}
        </section>) : <Card className="rental-state"><h3>لا توجد تأجيرات ضمن النطاق</h3><p>غيّر الفلاتر أو ابدأ تأجيرًا جديدًا.</p></Card>}
    </div>
  );
}










