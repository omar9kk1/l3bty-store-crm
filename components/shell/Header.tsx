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
  const { activeBranch, availableBranches, setActiveBranchId } = useShell();
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
          {availableBranches.length === 1 ? (
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
                <span className="user-menu-button__copy"><strong>{DEFAULT_SHELL_SCENARIO.userName}</strong><small>{activeBranch.nameAr}</small></span>
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
