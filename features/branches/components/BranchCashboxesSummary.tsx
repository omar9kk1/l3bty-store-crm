import Link from "next/link";
import { Landmark } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Branch } from "../types";

export function BranchCashboxesSummary({ branch }: { branch: Branch }) { return <Card className="branch-detail-card"><div className="branch-detail-card__heading"><div><span>الخزائن</span><h3>خزائن الفرع</h3></div><Landmark aria-hidden size={20} /></div><div className="branch-placeholder-summary"><strong>{branch.cashboxCount.toLocaleString("ar-EG-u-nu-latn")}</strong><span>خزينة مسجلة للعرض فقط</span><Link href="/finance">سيتم بناء الإدارة التفصيلية لاحقًا</Link></div></Card>; }
