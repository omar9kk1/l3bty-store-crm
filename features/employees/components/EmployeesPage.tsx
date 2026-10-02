"use client";

import { AlertTriangle, Search, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { usePayroll } from "@/features/payroll/hooks/use-payroll";
import { getTodayLocalDate } from "@/features/payroll/services/payroll-period";
import { saveSalaryProfile } from "@/features/payroll/services/payroll-store";
import { ALL_BRANCH_OPTION, toBranchOption } from "@/mock-data/branches";
import { PERMISSION_KEYS } from "@/permissions/keys";
import { resolvePreviewEmployee } from "../fixtures";
import { EmployeeForm, type EmployeeSalaryValues } from "../forms/EmployeeForm";
import { useEmployees } from "../hooks/use-employees";
import { createEmployee, updateEmployee } from "../services/employee-store";
import { filterEmployees, paginateEmployees, summarizeEmployees } from "../services/query-employees";
import type { Employee, EmployeeFilters, EmployeeFormValues, EmployeeSort, EmployeeStatus, EmployeeViewState, EmploymentType } from "../types";
import { EmployeeEmptyState } from "./EmployeeEmptyState";
import { EmployeeMobileCard } from "./EmployeeMobileCard";
import { EmployeeSkeleton } from "./EmployeeSkeleton";
import { EmployeesFilters } from "./EmployeesFilters";
import { EmployeesHeader } from "./EmployeesHeader";
import { EmployeesSummary } from "./EmployeesSummary";
import { EmployeesTable } from "./EmployeesTable";

const validStates = ["normal", "loading", "empty", "error", "offline"];
const validStatuses = ["all", "active", "suspended", "inactive"];
const validEmploymentTypes = ["all", "full_time", "part_time", "temporary"];
const validMultiRoles = ["all", "yes", "no"];
const validSorts = ["recent", "name", "employee_number"];

export function EmployeesPage() { const { permissions } = useShell(); if (!permissions.has(PERMISSION_KEYS.employees)) return <PermissionDeniedState />; return <EmployeesAdminPage />; }

function EmployeesAdminPage() {
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams();
  const employees = useEmployees(); const branches = useBranches(); const payroll = usePayroll();
  const { roles, activeBranch } = useShell();
  const branchOptions = useMemo(() => [ALL_BRANCH_OPTION, ...branches.map(toBranchOption)], [branches]);
  const branchNames = Object.fromEntries(branchOptions.map((branch) => [branch.id, branch.nameAr]));
  const [filtersOpen, setFiltersOpen] = useState(false); const [formOpen, setFormOpen] = useState(false); const [editing, setEditing] = useState<Employee>(); const [notice, setNotice] = useState("");
  const state = (validStates.includes(params.get("state") ?? "") ? params.get("state") : "normal") as EmployeeViewState;
  const requestedPage = Number(params.get("page") ?? "1"); const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const filters: EmployeeFilters = { q: params.get("q") ?? "", branch: params.get("branch") ?? activeBranch.id, role: params.get("role") ?? "all", status: (validStatuses.includes(params.get("status") ?? "") ? params.get("status") : "all") as EmployeeStatus | "all", employmentType: (validEmploymentTypes.includes(params.get("employmentType") ?? "") ? params.get("employmentType") : "all") as EmploymentType | "all", multiRole: (validMultiRoles.includes(params.get("multiRole") ?? "") ? params.get("multiRole") : "all") as EmployeeFilters["multiRole"], sort: (validSorts.includes(params.get("sort") ?? "") ? params.get("sort") : "recent") as EmployeeSort };
  const filtered = filterEmployees(state === "empty" ? [] : employees, filters);
  const pagination = paginateEmployees(filtered, page); const previewEmployee = resolvePreviewEmployee(roles, employees);
  function updateQuery(key: keyof EmployeeFilters | "page" | "state", value: string) { const next = new URLSearchParams(params.toString()); if (!value || value === "all" || (key === "sort" && value === "recent")) next.delete(key); else next.set(key, value); if (key !== "page") next.delete("page"); router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false }); }
  function openAdd() { setEditing(undefined); setFormOpen(true); } function openEdit(employee: Employee) { setEditing(employee); setFormOpen(true); }
  const editingSalary = editing ? payroll.profiles.find((profile) => profile.employeeId === editing.id && profile.active) : undefined;
  function save(values: EmployeeFormValues, salary: EmployeeSalaryValues) { const employee = editing ? updateEmployee(editing.id, values) : createEmployee(values); if (!employee) return; const currentProfile = payroll.profiles.find((profile) => profile.employeeId === employee.id && profile.active); saveSalaryProfile({ employeeId: employee.id, baseSalary: salary.baseSalary, salaryType: salary.salaryType, effectiveFrom: currentProfile?.effectiveFrom ?? getTodayLocalDate(), active: true, overtimeEnabled: currentProfile?.overtimeEnabled ?? false, overtimeRateType: "normal", allowances: currentProfile?.allowances ?? [], defaultDeductions: currentProfile?.defaultDeductions ?? [], commissionsEnabled: currentProfile?.commissionsEnabled ?? false }); setFormOpen(false); setNotice(editing ? "تم تحديث بيانات الموظف وراتبه بنجاح." : "تمت إضافة الموظف وحفظ راتبه بنجاح."); }
  async function copy(employee: Employee) { await navigator.clipboard?.writeText(employee.phone); setNotice(`تم نسخ رقم ${employee.name}.`); }
  return (
    <div className="employees-page" data-employees-state={state}>
      {state === "offline" ? <div className="employees-offline"><WifiOff aria-hidden size={17} />وضع دون اتصال — القراءة متاحة والتغييرات معطلة.</div> : null}
      <EmployeesHeader offline={state === "offline"} onAdd={openAdd} onFilters={() => setFiltersOpen(true)} />
      <EmployeesFilters open={filtersOpen} onOpenChange={setFiltersOpen} branches={branchOptions} filters={filters} onChange={(key, value) => updateQuery(key, value)} />
      <Drawer open={formOpen} onOpenChange={setFormOpen} title={editing ? "تعديل الموظف" : "إضافة موظف"} description={editing ? "تحديث بيانات الموظف ودوره وفرعه وحالته." : "أدخل بيانات الموظف واختر دوره والفرع الذي سيعمل فيه."} variant="auxiliary">
        <EmployeeForm key={editing?.updatedAt ?? `new-${employees.length}`} employees={employees} branches={branchOptions} initialEmployee={editing} initialSalary={editingSalary ? { salaryType: editingSalary.salaryType, baseSalary: editingSalary.baseSalary } : undefined} currentPreviewEmployeeId={previewEmployee.id} offline={state === "offline"} onCancel={() => setFormOpen(false)} onSave={save} />
      </Drawer>
      {notice ? <div className="employees-notice" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="إغلاق الرسالة">×</button></div> : null}
      {state === "loading" ? <EmployeeSkeleton /> : (
        <>
          <EmployeesSummary summary={summarizeEmployees(employees)} branchNames={branchNames} />
          <Card className="employees-toolbar"><label><Search aria-hidden size={18} /><span className="sr-only">البحث في الموظفين</span><input type="search" value={filters.q} onChange={(event) => updateQuery("q", event.target.value)} placeholder="ابحث بالاسم أو الهاتف أو كود الموظف أو المسمى" /></label><span>{filtered.length.toLocaleString("ar-EG-u-nu-latn")} نتيجة</span></Card>
          {state === "error" ? (
            <Card className="employees-state employees-state--error"><AlertTriangle aria-hidden size={28} /><h3>تعذر تحميل الموظفين</h3><p>حدث خطأ مؤقت — رمز الخطأ: EMP-503</p><Button type="button" variant="primary" onClick={() => updateQuery("state", "normal")}>إعادة المحاولة</Button></Card>
          ) : pagination.items.length === 0 ? (
            <EmployeeEmptyState canAdd={state !== "offline"} onAdd={openAdd} />
          ) : (
            <>
              <EmployeesTable employees={pagination.items} branchNames={branchNames} onEdit={openEdit} onCopy={copy} />
              <div className="employees-mobile-list">{pagination.items.map((employee) => <EmployeeMobileCard key={employee.id} employee={employee} branchNames={branchNames} />)}</div>
              {pagination.pageCount > 1 ? <nav className="employees-pagination" aria-label="صفحات الموظفين"><Button size="sm" disabled={pagination.page === 1} onClick={() => updateQuery("page", String(pagination.page - 1))}>السابق</Button><span>صفحة {pagination.page.toLocaleString("ar-EG-u-nu-latn")} من {pagination.pageCount.toLocaleString("ar-EG-u-nu-latn")}</span><Button size="sm" disabled={pagination.page === pagination.pageCount} onClick={() => updateQuery("page", String(pagination.page + 1))}>التالي</Button></nav> : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
