import { AlertCircle, Clock3, LogOut, MapPinOff, UserCheck, UserX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ReturnTypeOfSummary } from "./summary-types";
const items = [{ key: "present", label: "حاضر اليوم", icon: UserCheck }, { key: "late", label: "متأخر", icon: Clock3 }, { key: "absent", label: "غائب", icon: UserX }, { key: "outside", label: "خارج النطاق", icon: MapPinOff }, { key: "needsReview", label: "تحتاج مراجعة", icon: AlertCircle }, { key: "missingCheckout", label: "لم يسجلوا الانصراف", icon: LogOut }] as const;
export function AttendanceSummary({ summary }: { summary: ReturnTypeOfSummary }) { return <section className="attendance-summary" aria-label="ملخص الحضور">{items.map(({ key, label, icon: Icon }) => <Card key={key}><span><Icon aria-hidden size={18} />{label}</span><strong>{summary[key].toLocaleString("ar-EG-u-nu-latn")}</strong></Card>)}</section>; }
