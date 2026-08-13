"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ALL_BRANCH_OPTION, toBranchOption } from "@/mock-data/branches";
import { useBranches } from "@/features/branches/hooks/use-branches";
import type { BranchOption } from "@/features/branches/types";
import { filterNavigation } from "@/permissions/navigation-policy";
import { resolveBranchIds, resolvePermissions } from "@/permissions/resolve-permissions";
import type { NavigationItem, PermissionKey, RoleId } from "@/permissions/types";

interface ShellContextValue {
  roles: RoleId[];
  setRoles: (roles: RoleId[]) => void;
  toggleRole: (role: RoleId) => void;
  activeBranch: BranchOption;
  setActiveBranchId: (branchId: string) => void;
  availableBranches: BranchOption[];
  permissions: Set<PermissionKey>;
  navigation: NavigationItem[];
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [roles, setRolesState] = useState<RoleId[]>(["owner"]);
  const [activeBranchId, setActiveBranchIdState] = useState("all");
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const branches = useBranches();

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      setSidebarCollapsedState(localStorage.getItem("l3bty-sidebar-collapsed") === "true");
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, []);

  const permissions = useMemo(() => resolvePermissions(roles), [roles]);
  const branchIds = useMemo(() => resolveBranchIds(roles), [roles]);
  const availableBranches = useMemo(
    () =>
      branchIds === "all"
        ? [ALL_BRANCH_OPTION, ...branches.filter((branch) => branch.status !== "inactive").map(toBranchOption)]
        : branches.filter((branch) => branch.status !== "inactive" && branchIds.has(branch.id)).map(toBranchOption),
    [branchIds, branches],
  );

  const activeBranch =
    availableBranches.find((branch) => branch.id === activeBranchId) ??
    availableBranches[0] ??
    ALL_BRANCH_OPTION;

  const salesNavigation = roles.includes("sales_employee")
    && !roles.some((role) => ["owner", "manager", "rental_maintenance_employee", "maintenance_technician"].includes(role));
  const rentalNavigation = roles.includes("rental_maintenance_employee")
    && !roles.some((role) => ["owner", "manager", "sales_employee", "maintenance_technician"].includes(role));
  const navigation = useMemo(
    () => filterNavigation(permissions).map((item) => item.key !== "transfers"
      ? item
      : salesNavigation
        ? { ...item, labelAr: "طلبات تزويد الفرع", descriptionAr: "طلب ألعاب البيع للفرع ومتابعة الاستلام." }
        : rentalNavigation
          ? { ...item, labelAr: "نقل ألعاب التأجير", descriptionAr: "متابعة نقل ألعاب الفرع وتسليم الصيانة واستلامها." }
          : item),
    [permissions, rentalNavigation, salesNavigation],
  );
  function setRoles(nextRoles: RoleId[]) {
    if (nextRoles.length === 0) return;
    setRolesState(nextRoles);
  }

  function toggleRole(role: RoleId) {
    setRolesState((current) => {
      if (current.includes(role)) {
        return current.length === 1 ? current : current.filter((item) => item !== role);
      }
      return [...current, role];
    });
  }

  function setSidebarCollapsed(collapsed: boolean) {
    setSidebarCollapsedState(collapsed);
    localStorage.setItem("l3bty-sidebar-collapsed", String(collapsed));
  }

  return (
    <ShellContext.Provider
      value={{
        roles,
        setRoles,
        toggleRole,
        activeBranch,
        setActiveBranchId: setActiveBranchIdState,
        availableBranches,
        permissions,
        navigation,
        sidebarCollapsed,
        setSidebarCollapsed,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const context = useContext(ShellContext);
  if (!context) throw new Error("useShell must be used within ShellProvider");
  return context;
}
