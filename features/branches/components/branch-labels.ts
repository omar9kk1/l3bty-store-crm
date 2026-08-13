import type { BranchStatus, BranchType } from "../types";

export const branchTypeLabels: Record<BranchType, string> = { branch: "فرع", central_workshop: "ورشة مركزية" };
export const branchStatusLabels: Record<BranchStatus, string> = { active: "نشط", inactive: "غير نشط", temporarily_closed: "مغلق مؤقتًا" };
export const branchStatusTones = { active: "success", inactive: "neutral", temporarily_closed: "warning" } as const;
