import type { Branch, BranchAccess } from "../types";
import { BranchCard } from "./BranchCard";
import { BranchMobileCard } from "./BranchMobileCard";

export function BranchesGrid({ branches, access, activeBranchId, offline, onEdit, onUse }: { branches: Branch[]; access: BranchAccess; activeBranchId: string; offline: boolean; onEdit: (branch: Branch) => void; onUse: (branch: Branch) => void }) {
  return <><section className="branches-grid" aria-label="الفروع والمواقع">{branches.map((branch) => <BranchCard key={branch.id} branch={branch} access={access} active={activeBranchId === branch.id} offline={offline} onEdit={() => onEdit(branch)} onUse={() => onUse(branch)} />)}</section><section className="branches-mobile-list" aria-label="الفروع والمواقع للموبايل">{branches.map((branch) => <BranchMobileCard key={branch.id} branch={branch} access={access} active={activeBranchId === branch.id} offline={offline} onEdit={() => onEdit(branch)} onUse={() => onUse(branch)} />)}</section></>;
}
