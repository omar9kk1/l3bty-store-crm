"use client";

import Link from "next/link";
import { Landmark } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { money } from "@/features/finance/components/finance-labels";
import { useFinance } from "@/features/finance/hooks/use-finance";
import type { Branch } from "../types";

export function BranchCashboxesSummary({ branch }: { branch: Branch }) {
  const cashbox = useFinance().cashboxes.find((item) => item.branchId === branch.id && item.type === "branch_cash");
  return <Card className="branch-detail-card"><div className="branch-detail-card__heading"><div><span>الخزنة</span><h3>خزنة الفرع</h3></div><Landmark aria-hidden size={20} /></div><div className="branch-placeholder-summary"><strong>{money(cashbox?.currentBalance ?? 0)}</strong><span>{cashbox ? `${cashbox.code} · ${cashbox.status === "active" ? "نشطة" : "غير نشطة"}` : "لم تُنشأ خزنة لهذا الفرع"}</span><Link href="/finance/cashboxes">فتح تفاصيل الخزنة</Link></div></Card>;
}
