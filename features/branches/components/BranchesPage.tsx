"use client";

import { AlertTriangle, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { PERMISSION_KEYS } from "@/permissions/keys";
import { createDefaultCashboxForBranch } from "@/features/finance/services/finance-store";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { BranchForm } from "../forms/BranchForm";
import { useBranches } from "../hooks/use-branches";
import { resolveBranchAccess, scopeBranches } from "../permissions";
import { createBranch, updateBranch } from "../services/branch-store";
import { applyEmployeeCounts, filterBranches, summarizeBranches } from "../services/query-branches";
import type { Branch, BranchFormValues, BranchSort, BranchStatus, BranchType, BranchViewState } from "../types";
import { BranchEmptyState } from "./BranchEmptyState";
import { BranchesFilters } from "./BranchesFilters";
import { BranchesGrid } from "./BranchesGrid";
import { BranchesHeader } from "./BranchesHeader";
import { BranchesSummary } from "./BranchesSummary";
import { BranchSkeleton } from "./BranchSkeleton";

const types = ["all", "branch", "central_workshop"];
const statuses = ["all", "active", "inactive", "temporarily_closed"];
const sorts = ["name", "code", "updated", "employees"];
const states = ["normal", "loading", "empty", "error", "offline"];

export function BranchesPage() {
  const { permissions } = useShell();
  if (!permissions.has(PERMISSION_KEYS.branchesManage)) return <PermissionDeniedState />;
  return <BranchesAdminPage />;
}

function BranchesAdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const branches = useBranches();
  const employees = useEmployees();
  const { roles, activeBranch, setActiveBranchId } = useShell();
  const access = useMemo(() => resolveBranchAccess(roles), [roles]);
  const branchesWithEmployeeCounts = useMemo(() => applyEmployeeCounts(branches, employees), [branches, employees]);
  const scoped = useMemo(() => scopeBranches(branchesWithEmployeeCounts, roles), [branchesWithEmployeeCounts, roles]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch>();
  const [notice, setNotice] = useState("");
  const q = params.get("q") ?? "";
  const type = (types.includes(params.get("type") ?? "") ? params.get("type") : "all") as BranchType | "all";
  const status = (statuses.includes(params.get("status") ?? "") ? params.get("status") : "all") as BranchStatus | "all";
  const sort = (sorts.includes(params.get("sort") ?? "") ? params.get("sort") : "name") as BranchSort;
  const state = (states.includes(params.get("state") ?? "") ? params.get("state") : "normal") as BranchViewState;
  const filtered = filterBranches(state === "empty" ? [] : scoped, { q, type, status, sort }, activeBranch.id);

  function updateQuery(updates: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    Object.entries(updates).forEach(([key, value]) => {
      const defaultValue = (key === "type" || key === "status") ? "all" : key === "sort" ? "name" : "";
      if (!value || value === defaultValue) next.delete(key); else next.set(key, value);
    });
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }
  function openAdd() { setEditingBranch(undefined); setFormOpen(true); }
  function openEdit(branch: Branch) { setEditingBranch(branch); setFormOpen(true); }
  function save(values: BranchFormValues) {
    if (editingBranch) updateBranch(editingBranch.id, values); else createDefaultCashboxForBranch(createBranch(values));
    if (editingBranch?.id === activeBranch.id && values.status === "inactive") {
      setActiveBranchId("all");
      setNotice("تم تحديث الموقع والعودة إلى نطاق كل الفروع لأن الموقع الحالي أصبح غير نشط.");
    } else setNotice(editingBranch ? "تم تحديث بيانات الموقع بنجاح." : "تمت إضافة الموقع بنجاح.");
    setFormOpen(false);
  }
  function useBranch(branch: Branch) {
    setActiveBranchId(branch.id);
    setNotice(`أصبح ${branch.name} هو نطاق العمل الحالي، وانعكس الاختيار على التطبيق.`);
  }

  return <div className="branches-page" data-branches-state={state}>
    {state === "offline" ? <div className="branches-offline" role="status"><WifiOff aria-hidden size={17} />وضع دون اتصال — القراءة متاحة والحفظ وتغيير الحالة معطلان.</div> : null}
    <BranchesHeader canManage={access.canManage} offline={state === "offline"} onAdd={openAdd} />
    <Drawer open={formOpen} onOpenChange={setFormOpen} title={editingBranch ? "تعديل الفرع أو الموقع" : "إضافة فرع أو موقع"} description={editingBranch ? "تحديث البيانات الأساسية وحالة الفرع." : "أدخل البيانات الأساسية فقط، وسيُنشأ كود الفرع تلقائيًا."} variant="auxiliary"><BranchForm key={editingBranch?.id ?? `new-branch-${branches.length}`} branches={branches} initialBranch={editingBranch} offline={state === "offline"} onCancel={() => setFormOpen(false)} onSave={save} /></Drawer>
    {notice ? <div className="branches-notice" role="status"><span>{notice}</span><button type="button" aria-label="إغلاق الرسالة" onClick={() => setNotice("")}>×</button></div> : null}
    {state === "loading" ? <BranchSkeleton /> : <>
      <BranchesSummary data={summarizeBranches(scoped)} />
      <BranchesFilters q={q} type={type} status={status} sort={sort} onSearch={(value) => updateQuery({ q: value })} onFilter={(nextType, nextStatus) => updateQuery({ type: nextType, status: nextStatus })} onSort={(value) => updateQuery({ sort: value })} />
      {state === "error" ? <Card className="branches-state branches-state--error"><span className="branches-state__icon"><AlertTriangle aria-hidden /></span><h3>تعذر تحميل الفروع والمواقع</h3><p>حدث خطأ أثناء تحميل البيانات — رمز الخطأ: BRN-503</p><Button type="button" variant="primary" onClick={() => updateQuery({ state: "normal" })}>إعادة المحاولة</Button></Card> : filtered.length === 0 ? <BranchEmptyState canManage={access.canManage && state !== "offline"} onAdd={openAdd} /> : <BranchesGrid branches={filtered} access={access} activeBranchId={activeBranch.id} offline={state === "offline"} onEdit={openEdit} onUse={useBranch} />}
    </>}
  </div>;
}
