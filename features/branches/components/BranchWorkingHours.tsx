import { Clock3 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Branch } from "../types";

export function BranchWorkingHours({ branch }: { branch: Branch }) { return <Card className="branch-detail-card"><div className="branch-detail-card__heading"><div><span>مواعيد العمل</span><h3>الجدول الأساسي</h3></div><Clock3 aria-hidden size={20} /></div><div className="branch-hours-list">{branch.workingHours.map((period) => <div key={period.id}><div><strong>{period.label}</strong><span>{period.days.join("، ")}</span></div><time dir="ltr">{period.opensAt} — {period.closesAt}{period.crossesMidnight ? " (+1)" : ""}</time></div>)}</div></Card>; }
