"use client";

import { Drawer } from "@/components/ui/Drawer";
import type { BranchOption } from "@/features/branches/types";
import type { DashboardActivityType } from "../types";

const labels: Record<DashboardActivityType, string> = {
  all: "كل الأنشطة",
  sales: "المبيعات",
  rental: "التأجير",
  maintenance: "الصيانة",
};

interface DashboardFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  types: DashboardActivityType[];
  selectedType: DashboardActivityType;
  onTypeChange: (type: DashboardActivityType) => void;
  branches: BranchOption[];
  branchId: string;
  onBranchChange: (branchId: string) => void;
}

export function DashboardFilters(props: DashboardFiltersProps) {
  return (
    <Drawer open={props.open} onOpenChange={props.onOpenChange} title="تصفية لوحة التحكم" description="غيّر النشاط أو نطاق الفرع للعرض الحالي." variant="auxiliary">
      <div className="dashboard-filter-group">
        <h3>نوع النشاط</h3>
        <div className="dashboard-filter-options">
          {props.types.map((type) => (
            <button key={type} type="button" aria-pressed={props.selectedType === type} onClick={() => props.onTypeChange(type)}>{labels[type]}</button>
          ))}
        </div>
      </div>
      <div className="dashboard-filter-group">
        <h3>الفرع</h3>
        <div className="dashboard-filter-options">
          {props.branches.map((branch) => (
            <button key={branch.id} type="button" aria-pressed={props.branchId === branch.id} onClick={() => props.onBranchChange(branch.id)}>{branch.nameAr}</button>
          ))}
        </div>
      </div>
    </Drawer>
  );
}
