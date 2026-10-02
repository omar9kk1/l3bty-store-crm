"use client";

import Link from "next/link";
import { Menu, Search, UserRound } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Select } from "@/components/ui/Select";
import { DEFAULT_SHELL_SCENARIO } from "@/mock-data/scenarios/shell";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { RolePreview } from "./RolePreview";
import { useShell } from "./ShellContext";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";

export function Header({ title, onOpenNavigation }: { title: string; onOpenNavigation: () => void }) {
  const { activeBranch, activeEmployee, activeWorkLocation, availableBranches, availableWorkLocations, roles, setActiveBranchId, setActiveWorkLocationId } = useShell();
  const globalMaintenanceTechnician = roles.includes("maintenance_technician");
  const userLabel = activeEmployee?.name ?? "اختر موظفًا";
  return (
    <header className="workspace-header">
      <div className="workspace-header__inner">
        <div className="workspace-header__primary">
          <IconButton label="فتح قائمة التنقل" className="workspace-header__menu" onClick={onOpenNavigation}>
            <Menu aria-hidden />
          </IconButton>
          <div className="workspace-header__title-group">
            <span className="workspace-header__eyebrow">مساحة العمل</span>
            <h1>{title}</h1>
          </div>
        </div>
        <div className="workspace-header__actions">
          {globalMaintenanceTechnician && availableWorkLocations.length > 1 ? (
            <Select
              label="اختيار الورشة المركزية"
              value={activeWorkLocation.id}
              onChange={(event) => setActiveWorkLocationId(event.target.value)}
              className="branch-select"
            >
              {availableWorkLocations.map((workshop) => (
                <option key={workshop.id} value={workshop.id}>{workshop.nameAr} · {workshop.code}</option>
              ))}
            </Select>
          ) : globalMaintenanceTechnician ? (
            <div className="branch-context-label" aria-label="الورشة المركزية">
              <span>ورشة عمل الفني</span>
              <strong>{availableWorkLocations.length ? <>{activeWorkLocation.nameAr} · <bdi>{activeWorkLocation.code}</bdi></> : "لم تُضف ورشة مركزية"}</strong>
            </div>
          ) : availableBranches.length === 1 ? (
            <div className="branch-context-label" aria-label="الفرع المسند">
              <span>الفرع</span>
              <strong>{activeBranch.nameAr} · <bdi>{activeBranch.code}</bdi></strong>
            </div>
          ) : (
            <Select
              label="اختيار الفرع"
              value={activeBranch.id}
              onChange={(event) => setActiveBranchId(event.target.value)}
              className="branch-select"
            >
              {availableBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.nameAr} · {branch.code}</option>
              ))}
            </Select>
          )}
          <RolePreview />
          <div className="workspace-header__utility-group">
            <details className="user-menu">
              <summary className="user-menu-button" aria-label="قائمة المستخدم">
                <span className="user-menu-button__avatar"><UserRound aria-hidden size={18} /></span>
                <span className="user-menu-button__copy"><strong>{userLabel}</strong><small>{activeEmployee ? `${activeEmployee.employeeNumber} · ${activeWorkLocation.nameAr}` : "لم يتم تحديد جلسة اختبار"}</small></span>
              </summary>
              <div className="user-menu__popover"><Link href="/profile"><UserRound aria-hidden size={16} />الملف الشخصي</Link><Link href="/my-activity">نشاطي</Link><Link href="/my-expenses">طلباتي المالية</Link><Link href="/my-payroll">كشف راتبي</Link><Link href="/my-reports">تقارير نشاطي</Link></div>
            </details>
            <NotificationBell />
            <ConnectionIndicator connected={DEFAULT_SHELL_SCENARIO.connected} />
            <IconButton label="البحث — غير متاح في هذه المرحلة" className="header-search-button" disabled><Search aria-hidden /></IconButton>
          </div>
        </div>
      </div>
    </header>
  );
}
