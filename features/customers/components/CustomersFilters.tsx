import { Drawer } from "@/components/ui/Drawer";
import type { BranchOption } from "@/features/branches/types";
import type { CustomerAccess, CustomerActivityType, CustomerFlag, CustomerSort, CustomerStatus } from "../types";

interface CustomersFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: BranchOption[];
  branchId: string;
  status: CustomerStatus | "all";
  flag: CustomerFlag | "all";
  activity: CustomerActivityType | "all";
  sort: CustomerSort;
  access: CustomerAccess;
  onBranchChange: (value: string) => void;
  onFilterChange: (key: "status" | "flag" | "activity" | "sort", value: string) => void;
}

const statusOptions = [["all", "كل الحالات"], ["active", "نشط"], ["inactive", "غير نشط"], ["blocked", "موقوف"]] as const;
const flagOptions = [["all", "كل التنبيهات"], ["debt", "لديه مديونية"], ["rental_ban", "ممنوع من التأجير"], ["needs_review", "يحتاج مراجعة"]] as const;
const activityLabels: Record<CustomerActivityType | "all", string> = { all: "كل الأنشطة", sales: "بيع", rental: "تأجير", maintenance: "صيانة" };
const sortOptions = [["recent", "الأحدث نشاطًا"], ["name", "الاسم"], ["balance", "الأعلى مديونية"]] as const;

function FilterSection({ label, value, options, onChange }: { label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }) {
  return (
    <section className="customers-filter-group">
      <h3>{label}</h3>
      <div className="customers-filter-options">
        {options.map(([optionValue, optionLabel]) => <button key={optionValue} type="button" aria-pressed={value === optionValue} onClick={() => onChange(optionValue)}>{optionLabel}</button>)}
      </div>
    </section>
  );
}

export function CustomersFilters(props: CustomersFiltersProps) {
  const activityOptions = [["all", activityLabels.all], ...props.access.allowedActivityTypes.map((type) => [type, activityLabels[type]])] as [string, string][];
  const visibleFlags = props.access.canViewFinancial ? flagOptions : flagOptions.filter(([value]) => value === "all" || value === "needs_review");
  const visibleSorts = props.access.canViewFinancial ? sortOptions : sortOptions.filter(([value]) => value !== "balance");
  return (
    <Drawer open={props.open} onOpenChange={props.onOpenChange} title="تصفية العملاء" description="تُطبق النتائج ضمن صلاحياتك ونطاق الفرع الحالي." variant="auxiliary">
      <FilterSection label="الفرع" value={props.branchId} options={props.branches.map((branch) => [branch.id, branch.nameAr])} onChange={props.onBranchChange} />
      <FilterSection label="الحالة" value={props.status} options={statusOptions} onChange={(value) => props.onFilterChange("status", value)} />
      <FilterSection label="التنبيه" value={props.flag} options={visibleFlags} onChange={(value) => props.onFilterChange("flag", value)} />
      <FilterSection label="نوع النشاط" value={props.activity} options={activityOptions} onChange={(value) => props.onFilterChange("activity", value)} />
      <FilterSection label="الترتيب" value={props.sort} options={visibleSorts} onChange={(value) => props.onFilterChange("sort", value)} />
    </Drawer>
  );
}
