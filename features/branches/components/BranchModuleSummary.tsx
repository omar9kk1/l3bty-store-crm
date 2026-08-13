import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function BranchModuleSummary({ eyebrow, title, value, description, href, icon: Icon }: { eyebrow: string; title: string; value: number; description: string; href: string; icon: LucideIcon }) { return <Card className="branch-detail-card"><div className="branch-detail-card__heading"><div><span>{eyebrow}</span><h3>{title}</h3></div><Icon aria-hidden size={20} /></div><div className="branch-placeholder-summary"><strong>{value.toLocaleString("ar-EG-u-nu-latn")}</strong><span>{description}</span><Link href={href}>فتح الصفحة الحالية</Link></div></Card>; }
