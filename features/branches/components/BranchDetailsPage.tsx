"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Gamepad2, Package, Pencil, RadioTower, ShoppingBag, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { PERMISSION_KEYS } from "@/permissions/keys";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { BranchForm } from "../forms/BranchForm";
import { useBranches } from "../hooks/use-branches";
import { canAccessBranch, resolveBranchAccess } from "../permissions";
import { updateBranch } from "../services/branch-store";
import { applyEmployeeCounts } from "../services/query-branches";
import type { BranchFormValues, BranchViewState } from "../types";
import { BranchActivitySummary } from "./BranchActivitySummary";
import { BranchCashboxesSummary } from "./BranchCashboxesSummary";
import { BranchEmployeesSummary } from "./BranchEmployeesSummary";
import { BranchLocationCard } from "./BranchLocationCard";
import { BranchManagementSummary } from "./BranchManagementSummary";
import { BranchModuleSummary } from "./BranchModuleSummary";
import { BranchOverview } from "./BranchOverview";
import { BranchWorkingHours } from "./BranchWorkingHours";
import { BranchSkeleton } from "./BranchSkeleton";
import { branchStatusLabels, branchStatusTones, branchTypeLabels } from "./branch-labels";

const states = ["normal", "loading", "empty", "error", "offline"];

export function BranchDetailsPage({ branchId }: { branchId: string }) {
  const { permissions } = useShell();
  if (!permissions.has(PERMISSION_KEYS.branchesManage)) return <PermissionDeniedState />;
  return <BranchAdminDetailsPage branchId={branchId} />;
}

function BranchAdminDetailsPage({ branchId }: { branchId: string }) {
  const branches = useBranches();
  const employees = useEmployees();
  const router = useRouter();
  const params = useSearchParams();
  const { roles, activeBranch, setActiveBranchId } = useShell();
  const access = useMemo(() => resolveBranchAccess(roles), [roles]);
  const branchesWithEmployeeCounts = useMemo(() => applyEmployeeCounts(branches, employees), [branches, employees]);
  const branch = branchesWithEmployeeCounts.find((item) => item.id === branchId);
  const [editOpen, setEditOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const requestedState = params.get("state") ?? "normal";
  const state = (states.includes(requestedState) ? requestedState : "normal") as BranchViewState;
  if (state === "loading") return <BranchSkeleton />;
  if (!branch) return <Card className="branches-state"><span className="branches-state__code">404</span><h2>الموقع غير موجود</h2><p>لم نجد فرعًا أو ورشة بهذا المعرّف.</p><Link className="ui-button ui-button--primary ui-button--md" href="/branches">العودة إلى الفروع</Link></Card>;
  if (!canAccessBranch(branch, roles)) return <PermissionDeniedState />;
  if (state === "error") return <Card className="branches-state branches-state--error"><h2>تعذر تحميل ملف الموقع</h2><p>رمز الخطأ: BRN-DETAIL-503</p><Button type="button" variant="primary" onClick={() => router.replace(`/branches/${branch.id}`)}>إعادة المحاولة</Button></Card>;
  const resolvedBranch = branch;
  const offline = state === "offline";

  function save(values: BranchFormValues) {
    updateBranch(resolvedBranch.id, values);
    if (resolvedBranch.id === activeBranch.id && values.status === "inactive") {
      setActiveBranchId("all");
      setNotice("تم تعطيل الموقع والعودة إلى نطاق كل الفروع.");
    } else setNotice("تم تحديث بيانات الموقع بنجاح.");
    setEditOpen(false);
  }
  return <div className="branch-details-page" data-branch-type={branch.type}>
    {offline ? <div className="branches-offline"><RadioTower aria-hidden size={17} />وضع دون اتصال — العرض متاح والتغييرات معطلة.</div> : null}
    <Link href="/branches" className="branch-back-link"><ArrowRight aria-hidden size={16} />العودة إلى الفروع والمواقع</Link>
    <Card className="branch-profile-header"><div className="branch-profile-header__copy"><span className="branches-eyebrow">ملف الموقع · <bdi>{branch.code}</bdi></span><h2>{branch.name}</h2><p>{branch.city}</p><div className="branch-profile-header__badges"><Badge tone={branchStatusTones[branch.status]}>{branchStatusLabels[branch.status]}</Badge><Badge>{branchTypeLabels[branch.type]}</Badge>{activeBranch.id === branch.id ? <Badge tone="accent">النطاق الحالي</Badge> : null}</div></div><div className="branch-profile-header__actions">{access.canManage ? <Button type="button" icon={<Pencil aria-hidden size={16} />} onClick={() => setEditOpen(true)} disabled={offline}>تعديل</Button> : null}</div></Card>
    {notice ? <div className="branches-notice" role="status">{notice}</div> : null}
    <BranchOverview branch={branch} access={access} />
    <div className="branch-details-grid"><BranchLocationCard branch={branch} /><BranchWorkingHours branch={branch} />{access.canViewEmployees ? <BranchEmployeesSummary branch={branch} /> : null}{access.canViewCashboxes && branch.type === "branch" ? <BranchCashboxesSummary branch={branch} /> : null}{access.canManage ? <BranchManagementSummary branch={branch} /> : null}
      {branch.type === "branch" && access.canViewRentals ? <BranchModuleSummary eyebrow="أصول التأجير" title="الأصول النشطة" value={branch.activeRentalAssetCount} description="أصلًا يعمل داخل الفرع" href="/rental-assets" icon={Gamepad2} /> : null}
      {branch.type === "branch" && access.canViewSales ? <BranchModuleSummary eyebrow="منتجات البيع" title="كتالوج الفرع" value={branch.saleProductCount} description="لعبة وقطعة غيار للبيع" href="/products" icon={ShoppingBag} /> : null}
      {access.canViewMaintenance ? <BranchModuleSummary eyebrow="طلبات الصيانة" title={branch.type === "central_workshop" ? "أوامر الورشة" : "طلبات الفرع"} value={branch.openMaintenanceOrderCount} description="طلبًا مفتوحًا لهذا الموقع" href="/maintenance" icon={Wrench} /> : null}
      {access.canViewShifts ? <BranchModuleSummary eyebrow="الورديات" title="الورديات المفتوحة" value={branch.openShiftCount} description="وردية مفتوحة للعرض فقط" href="/shifts" icon={CalendarClock} /> : null}
      {branch.type === "central_workshop" ? <BranchModuleSummary eyebrow="قطع الغيار" title="مخزون فني" value={branch.sparePartCount} description="قطعة غيار فنية مسجلة" href="/inventory" icon={Package} /> : null}
    </div>
    <BranchActivitySummary branch={branch} />
    <Drawer open={editOpen} onOpenChange={setEditOpen} title="تعديل الفرع أو الموقع" description="تحديث بيانات الموقع وحالته." variant="auxiliary"><BranchForm key={branch.updatedAt} branches={branches} initialBranch={branch} offline={offline} onCancel={() => setEditOpen(false)} onSave={save} /></Drawer>
  </div>;
}
