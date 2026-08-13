import { Boxes, CalendarClock, Gamepad2, Package, ShoppingBag, UserRound, Warehouse, Wrench } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Branch, BranchAccess } from "../types";

export function BranchOverview({ branch, access }: { branch: Branch; access: BranchAccess }) {
  const branchItems = [
    ...(access.canViewSales ? [{ label: "منتجات البيع", value: branch.saleProductCount, icon: ShoppingBag }] : []),
    ...(access.canViewRentals ? [{ label: "أصول التأجير النشطة", value: branch.activeRentalAssetCount, icon: Gamepad2 }] : []),
    ...(access.canViewMaintenance ? [{ label: "طلبات الصيانة", value: branch.openMaintenanceOrderCount, icon: Wrench }] : []),
    ...(access.canViewEmployees ? [{ label: "الموظفون", value: branch.assignedEmployeeCount, icon: UserRound }] : []),
    ...(access.canViewCashboxes ? [{ label: "الخزائن", value: branch.cashboxCount, icon: Boxes }] : []),
    ...(access.canViewWarehouses ? [{ label: "المخازن", value: branch.warehouseCount, icon: Warehouse }] : []),
  ];
  const workshopItems = [
    { label: "الفنيون", value: branch.technicianCount, icon: UserRound },
    { label: "أوامر الصيانة", value: branch.openMaintenanceOrderCount, icon: Wrench },
    { label: "قطع الغيار", value: branch.sparePartCount, icon: Package },
    { label: "التحويلات الواردة", value: branch.incomingMaintenanceTransferCount, icon: Boxes },
    { label: "قيد الإصلاح", value: branch.repairingItemCount, icon: CalendarClock },
    { label: "جاهزة للعودة", value: branch.readyReturnCount, icon: Gamepad2 },
  ];
  const items = branch.type === "central_workshop" ? workshopItems : branchItems;
  return <section className="branch-overview" aria-label="نظرة عامة على الموقع">{items.map((item) => <Card className="branch-overview__item" key={item.label}><item.icon aria-hidden size={18} /><span>{item.label}</span><strong>{item.value.toLocaleString("ar-EG-u-nu-latn")}</strong></Card>)}</section>;
}
