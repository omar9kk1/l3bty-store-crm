import { MapPinned, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function BranchesHeader({ canManage, offline, onAdd }: { canManage: boolean; offline: boolean; onAdd: () => void }) {
  return <header className="branches-heading"><div><span className="branches-eyebrow"><MapPinned aria-hidden size={15} />دليل المواقع</span><h2>الفروع والمواقع</h2><p>إدارة مواقع التشغيل والورشة المركزية ومراجعة نطاق الوصول حسب الدور.</p></div>{canManage ? <Button type="button" variant="primary" icon={<Plus aria-hidden size={18} />} onClick={onAdd} disabled={offline}>إضافة فرع أو موقع</Button> : null}</header>;
}
