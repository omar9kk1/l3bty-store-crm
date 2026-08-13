import { UserRoundX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
export function EmployeeEmptyState({ onAdd, canAdd }: { onAdd: () => void; canAdd: boolean }) { return <Card className="employees-state"><UserRoundX aria-hidden size={28} /><h3>لا يوجد موظفون ضمن الفلتر الحالي</h3><p>غيّر البحث أو الفلاتر لمراجعة نتائج أخرى.</p>{canAdd ? <Button type="button" variant="primary" onClick={onAdd}>إضافة موظف</Button> : null}</Card>; }
