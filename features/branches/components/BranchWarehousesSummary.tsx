import Link from "next/link";
import { Warehouse } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Branch } from "../types";

export function BranchWarehousesSummary({ branch }: { branch: Branch }) { return <Card className="branch-detail-card"><div className="branch-detail-card__heading"><div><span>المخازن</span><h3>{branch.type === "central_workshop" ? "مخزن قطع الغيار الفنية" : "مخازن الموقع"}</h3></div><Warehouse aria-hidden size={20} /></div><div className="branch-placeholder-summary"><strong>{branch.warehouseCount.toLocaleString("ar-EG-u-nu-latn")}</strong><span>مخزن مسجل لهذا الموقع</span><Link href="/inventory">فتح صفحة المخزون الحالية</Link></div></Card>; }
