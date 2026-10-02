"use client";

import Link from "next/link";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { useRentals } from "@/features/rentals/hooks/use-rentals";
import { money } from "@/features/rentals/components/rental-labels";
import { PERMISSION_KEYS } from "@/permissions/keys";
import { canViewRentalAssets, isTechnicianAssetView } from "../permissions";
import { assetLocationLabel, assetStatusLabels, assetTone, hours } from "./asset-labels";

export function RentalAssetDetailsPage({ assetId }: { assetId: string }) {
  const { roles, permissions, availableBranches } = useShell(); const { assets, rentals } = useRentals(); const branches = useBranches();
  if (!permissions.has(PERMISSION_KEYS.rentalAssets) || !canViewRentalAssets(roles)) return <PermissionDeniedState />;
  const asset = assets.find((item) => item.id === assetId); const allowed = new Set(availableBranches.map((branch) => branch.id));
  if (!asset || (!allowed.has("all") && !allowed.has(asset.branchId))) return <PermissionDeniedState />;
  const technician = isTechnicianAssetView(roles); const current = rentals.find((rental) => rental.id === asset.currentRentalId); const history = rentals.filter((rental) => rental.assetId === asset.id); const locationName = assetLocationLabel(asset.currentLocationId, asset.branchId, branches);
  return <div className="rental-assets-page asset-details-page"><header className="rentals-header"><div><span>رقم اللعبة: <bdi dir="ltr">{asset.barcode}</bdi></span><h2>{asset.name}</h2><p>{locationName}</p></div><Badge tone={assetTone(asset.status)}>{assetStatusLabels[asset.status]}</Badge></header><section className="asset-detail-grid"><Card><h3>نظرة عامة</h3><dl><div><dt>رقم اللعبة</dt><dd><bdi dir="ltr">{asset.barcode}</bdi></dd></div><div><dt>الفئة</dt><dd>{asset.category}</dd></div><div><dt>الحالة الفنية</dt><dd>{asset.condition}</dd></div><div><dt>ساعات التشغيل</dt><dd>{hours(asset.operatingSeconds)}</dd></div></dl></Card><Card><h3>الموقع والفحوصات</h3><dl><div><dt>الموقع الحالي</dt><dd>{locationName}</dd></div><div><dt>آخر فحص</dt><dd>{asset.lastInspectionAt.slice(0, 10)}</dd></div><div><dt>الفحص التالي</dt><dd>{asset.nextInspectionAt.slice(0, 10)}</dd></div><div><dt>حالة الصيانة</dt><dd>{asset.maintenanceStatus}</dd></div></dl></Card>{!technician ? <Card><h3>التأجير الحالي</h3>{current ? <><p>{current.rentalNumber}</p><p>{money(current.currentAmount)}</p><Link href={`/rentals/${current.id}`}>فتح التأجير</Link></> : <p>لا يوجد تأجير حالي.</p>}</Card> : <Card><h3>سجل الصيانة</h3><p>سيظهر هنا سجل الصيانة المرتبط بالأوامر المسندة.</p></Card>}</section><Card className="asset-history"><h3>سجل الحالة والنشاط</h3>{asset.statusHistory.map((item) => <div key={item.id}><strong>{assetStatusLabels[item.status]}</strong><span>{item.reason} · {item.at.slice(0, 10)}</span></div>)}</Card>{!technician ? <Card className="asset-history"><h3>سجل التأجيرات</h3>{history.length ? history.map((rental) => <div key={rental.id}><Link href={`/rentals/${rental.id}`}>{rental.rentalNumber}</Link><span>{rental.workDate}</span></div>) : <p>لا يوجد سجل تأجيرات.</p>}</Card> : null}<Card className="asset-history"><h3>سجل الصيانة</h3><p>سيتم عرض أوامر الصيانة المرتبطة بهذه اللعبة هنا عند توفرها.</p></Card></div>;
}
