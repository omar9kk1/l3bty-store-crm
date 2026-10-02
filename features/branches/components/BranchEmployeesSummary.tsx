import Link from "next/link";
import { UsersRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Branch } from "../types";

export function BranchEmployeesSummary({ branch }: { branch: Branch }) { return <Card className="branch-detail-card"><div className="branch-detail-card__heading"><div><span>الموظفون المسندون</span><h3>{branch.type === "central_workshop" ? "الفنيون وفريق الورشة" : "فريق الفرع"}</h3></div><UsersRound aria-hidden size={20} /></div><div className="branch-placeholder-summary"><strong>{branch.assignedEmployeeCount.toLocaleString("ar-EG-u-nu-latn")}</strong><span>{branch.type === "central_workshop" ? `${branch.technicianCount} فنيين ضمن العدد` : "موظفًا مسندًا للموقع"}</span><Link href="/employees">عرض الموظفين</Link></div></Card>; }
