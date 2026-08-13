import { BranchCard } from "./BranchCard";
import type { Branch, BranchAccess } from "../types";

export function BranchMobileCard(props: { branch: Branch; access: BranchAccess; active: boolean; offline: boolean; onEdit: () => void; onUse: () => void }) {
  return <div className="branch-mobile-card"><BranchCard {...props} /></div>;
}
