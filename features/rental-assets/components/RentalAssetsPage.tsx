"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { PERMISSION_KEYS } from "@/permissions/keys";
import { useRentalAssets } from "../hooks/use-rental-assets";
import { canViewRentalAssets, isTechnicianAssetView } from "../permissions";
import { assetLocationLabel, assetStatusLabels, assetTone, hours } from "./asset-labels";
import { RentalAssetCreateAction } from "./RentalAssetCreateAction";

export function RentalAssetsPage() {
  const { roles, permissions } = useShell();
  if (!permissions.has(PERMISSION_KEYS.rentalAssets) || !canViewRentalAssets(roles)) return <PermissionDeniedState />;
  return <AssetsContent />;
}

function AssetsContent() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { roles, availableBranches, activeBranch } = useShell();
  const assets = useRentalAssets();
  const branches = useBranches();
  const state = params.get("state") ?? "normal";
  const branch = params.get("branch") ?? activeBranch.id;
  const status = params.get("status") ?? "all";
  const allowedIds = new Set(availableBranches.filter((item) => item.id !== "all").map((item) => item.id));
  const management = roles.includes("owner") || roles.includes("manager");
  const manager = roles.includes("manager");
  const ownerReadOnly = roles.includes("owner") && !manager;
  const technician = isTechnicianAssetView(roles);
  const filtered = (state === "empty" ? [] : assets).filter((asset) =>
    (management || allowedIds.has(asset.branchId)) &&
    (branch === "all" || asset.branchId === branch) &&
    (status === "all" || asset.status === status));

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all") next.delete(key); else next.set(key, value);
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  if (state === "loading") return <div className="asset-skeleton">جار تحميل الأصول…</div>;
  return <div className="rental-assets-page">
    {state === "offline" ? <div className="rentals-offline"><WifiOff size={17} />دون اتصال — القراءة فقط.</div> : null}
    <header className="rentals-header">
      <div><span>{ownerReadOnly || manager ? "المخزون التشغيلي" : "أصول التأجير"}</span><h2>{ownerReadOnly ? "متابعة أصول التأجير" : manager ? "إدارة أصول التأجير" : "أصول التأجير"}</h2><p>{ownerReadOnly ? "تابع الألعاب وحالتها وموقعها وساعات تشغيلها دون تعديل." : manager ? "أضف ألعاب التأجير وتابع حالتها وموقعها وجاهزيتها للتشغيل." : technician ? "عرض الحالة وسجل الصيانة ضمن النطاق المسند." : "كل لعبة مسجلة بحالتها وموقعها، وتظهر مباشرة في شاشة التأجير."}</p></div>
      {manager ? <RentalAssetCreateAction branches={branches} /> : null}
    </header>
    <section className="asset-summary">
      {Object.entries(assetStatusLabels).map(([key, label]) => <Card key={key}><span>{label}</span><strong>{filtered.filter((asset) => asset.status === key).length.toLocaleString("ar-EG-u-nu-latn")}</strong></Card>)}
    </section>
    <Card className="asset-filters">
      <label><span>الفرع</span><select value={branch} onChange={(event) => set("branch", event.target.value)}><option value="all">كل الفروع المسندة</option>{branches.filter((item) => management || allowedIds.has(item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label><span>الحالة</span><select value={status} onChange={(event) => set("status", event.target.value)}><option value="all">كل الحالات</option>{Object.entries(assetStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    </Card>
    {filtered.length ? <Card className="asset-list">
      <div className="asset-table-wrap"><table><thead><tr><th>اللعبة</th><th>رقم اللعبة</th><th>الفرع</th><th>الموقع</th><th>الحالة</th><th>التشغيل</th><th>آخر فحص</th><th>التأجير الحالي</th><th /></tr></thead><tbody>{filtered.map((asset) => <tr key={asset.id}><td><strong>{asset.name}</strong></td><td><bdi dir="ltr">{asset.barcode}</bdi></td><td>{branches.find((item) => item.id === asset.branchId)?.name}</td><td>{assetLocationLabel(asset.currentLocationId, asset.branchId, branches)}</td><td><Badge tone={assetTone(asset.status)}>{assetStatusLabels[asset.status]}</Badge></td><td>{hours(asset.operatingSeconds)}</td><td>{asset.lastInspectionAt.slice(0, 10)}</td><td>{technician ? "معلومات تشغيل محدودة" : asset.currentRentalId ?? "—"}</td><td><Link href={`/rental-assets/${asset.id}`}>التفاصيل</Link></td></tr>)}</tbody></table></div>
      <div className="asset-mobile-list">{filtered.map((asset) => <Card key={asset.id} className="asset-mobile-card"><header><strong>{asset.name}</strong><Badge tone={assetTone(asset.status)}>{assetStatusLabels[asset.status]}</Badge></header><p>رقم اللعبة: <bdi dir="ltr">{asset.barcode}</bdi> · {branches.find((item) => item.id === asset.branchId)?.name}</p><span>{hours(asset.operatingSeconds)} تشغيل</span><Link href={`/rental-assets/${asset.id}`}>عرض التفاصيل</Link></Card>)}</div>
    </Card> : <Card className="rental-state"><h3>لا توجد ألعاب تأجير مسجلة</h3><p>{manager ? "أضف أول لعبة من الزر بالأعلى." : ownerReadOnly ? "ستظهر هنا الألعاب التي يضيفها المدير." : "اطلب من المدير إضافة ألعاب التأجير."}</p></Card>}
  </div>;
}
