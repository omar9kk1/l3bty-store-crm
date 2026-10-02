"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { ROLE_TEMPLATES } from "@/permissions/role-templates";
import { ROLE_IDS } from "@/permissions/types";
import { useShell } from "./ShellContext";

export function RolePreview() {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { activeBranch, activeEmployee, activeWorkLocation, availableBranches, availableEmployees, availableWorkLocations, roles, setActiveBranchId, setActiveEmployeeId, setActiveWorkLocationId, toggleRole } = useShell();
  const summary = roles.map((role) => ROLE_TEMPLATES[role].shortLabelAr).join(" + ");
  const globalMaintenanceTechnician = roles.includes("maintenance_technician");

  const roleControls = (
    <div className="role-preview__controls">
      <div className="role-preview__heading">
        <strong>معاينة الأدوار</strong>
        <span>اختر دورًا واحدًا فقط للمعاينة.</span>
      </div>
      {ROLE_IDS.map((role) => (
        <label key={role} className="role-preview__option">
          <input type="checkbox" checked={roles.includes(role)} onChange={() => toggleRole(role)} />
          <span>{ROLE_TEMPLATES[role].labelAr}</span>
        </label>
      ))}
      <div className="role-preview__session">
        <label>
          <span>الموظف المستخدم في الاختبار</span>
          <select aria-label="اختيار الموظف" value={activeEmployee?.id ?? ""} onChange={(event) => setActiveEmployeeId(event.target.value)}>
            <option value="">اختر الموظف</option>
            {availableEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.employeeNumber}</option>)}
          </select>
        </label>
        {!availableEmployees.length ? <p>لا يوجد موظف نشط مسجل بهذا الدور. أضف الموظف أولًا من صفحة الموظفين.</p> : null}
        {globalMaintenanceTechnician ? <label>
          <span>ورشة عمل الفني</span>
          <select aria-label="اختيار الورشة المركزية" value={availableWorkLocations.length ? activeWorkLocation.id : ""} disabled={!activeEmployee || !availableWorkLocations.length} onChange={(event) => setActiveWorkLocationId(event.target.value)}>
            {!availableWorkLocations.length ? <option value="">لا توجد ورشة مركزية نشطة</option> : null}
            {availableWorkLocations.map((workshop) => <option key={workshop.id} value={workshop.id}>{workshop.nameAr} · {workshop.code}</option>)}
          </select>
        </label> : <label>
          <span>الفرع المستخدم في الاختبار</span>
          <select aria-label="اختيار فرع الموظف" value={activeBranch.id} disabled={!activeEmployee} onChange={(event) => setActiveBranchId(event.target.value)}>
            {availableBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.nameAr} · {branch.code}</option>)}
          </select>
        </label>}
        <small>{globalMaintenanceTechnician ? "الاختيار يحدد ورشة عمل الفني فقط، بينما تظل بلاغات الصيانة المتاحة له من كل الفروع." : "سيُستخدم الموظف والفرع في العمليات كما لو تم الدخول بحسابه الحقيقي."}</small>
      </div>
      <a href="/ui-states" className="role-preview__dev-link">معاينة حالات الواجهة</a>
    </div>
  );

  return (
    <div className="role-preview">
      <div className="role-preview__desktop">
        <button
          type="button"
          className="role-preview__trigger"
          aria-label={`معاينة الأدوار: ${summary}`}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="role-preview__copy">
            <Badge tone="accent">وضع المعاينة</Badge>
            <span>{summary}</span>
          </span>
          <ChevronDown aria-hidden size={16} />
        </button>
        {open ? <div className="role-preview__panel">{roleControls}</div> : null}
      </div>
      <button type="button" className="role-preview__mobile-trigger" onClick={() => setMobileOpen(true)}>
        معاينة
      </button>
      <Drawer
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        title="معاينة الأدوار"
        description="اختر الدور ثم الموظف والفرع لتجربة جلسة عمل واقعية"
        variant="bottom-sheet"
      >
        <div className="role-preview__drawer">{roleControls}</div>
      </Drawer>
    </div>
  );
}
