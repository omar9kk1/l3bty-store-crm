import { MapPinOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function BranchEmptyState({ canManage, onAdd }: { canManage: boolean; onAdd: () => void }) { return <Card className="branches-state"><span className="branches-state__icon"><MapPinOff aria-hidden /></span><h3>لا توجد فروع ضمن الفلتر الحالي</h3><p>غيّر البحث أو الفلتر لمراجعة مواقع أخرى.</p>{canManage ? <Button type="button" variant="primary" icon={<Plus aria-hidden size={16} />} onClick={onAdd}>إضافة فرع أو موقع</Button> : null}</Card>; }
