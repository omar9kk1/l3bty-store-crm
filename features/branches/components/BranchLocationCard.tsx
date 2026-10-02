import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Branch } from "../types";

export function BranchLocationCard({ branch }: { branch: Branch }) { return <Card className="branch-detail-card"><div className="branch-detail-card__heading"><div><span>معلومات الموقع</span><h3>المدينة</h3></div><MapPin aria-hidden size={20} /></div><dl className="branch-detail-list"><div><dt>المدينة</dt><dd>{branch.city}</dd></div></dl></Card>; }
