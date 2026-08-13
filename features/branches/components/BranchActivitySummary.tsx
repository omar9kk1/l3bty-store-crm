import { Activity } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Branch } from "../types";

export function BranchActivitySummary({ branch }: { branch: Branch }) { return <Card className="branch-detail-card branch-activity"><div className="branch-detail-card__heading"><div><span>النشاط الأخير</span><h3>تحديثات الموقع التجريبية</h3></div><Activity aria-hidden size={20} /></div><ol><li><strong>تحديث بيانات الموقع</strong><span>{new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short", timeZone: branch.timezone }).format(new Date(branch.updatedAt))}</span></li><li><strong>{branch.type === "central_workshop" ? "مراجعة تحويلات الصيانة الواردة" : "مراجعة حالة الوردية والموقع"}</strong><span>سجل Mock للعرض فقط</span></li></ol></Card>; }
