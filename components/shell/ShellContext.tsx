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
import { setPreviewEmployeeSelection } from "@/features/employees/fixtures";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import type { Employee } from "@/features/employees/types";
import { filterNavigation } from "@/permissions/navigation-policy";
import { ROLE_TEMPLATES } from "@/permissions/role-templates";
import { resolveBranchIds, resolvePermissions } from "@/permissions/resolve-permissions";
import type { NavigationItem, PermissionKey, RoleId } from "@/permissions/types";

interface ShellContextValue {
  roles: RoleId[];
  setRoles: (roles: RoleId[]) => void;
  toggleRole: (role: RoleId) => void;
  activeEmployee: Employee | null;
  availableEmployees: readonly Employee[];
  setActiveEmployeeId: (employeeId: string) => void;
  activeBranch: BranchOption;
  setActiveBranchId: (branchId: string) => void;
  availableBranches: BranchOption[];
  activeWorkLocation: BranchOption;
  setActiveWorkLocationId: (locationId: string) => void;
  availableWorkLocations: BranchOption[];
  permissions: Set<PermissionKey>;
  navigation: NavigationItem[];
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);
export function resolveRoleToggle(current: readonly RoleId[], role: RoleId): RoleId[] {
  return current.length === 1 && current[0] === role ? [...current] : [role];
}

export function normalizeRoleSelection(nextRoles: readonly RoleId[]): RoleId[] {
  const selectedRole = nextRoles.at(-1);
  return selectedRole ? [selectedRole] : [];
}

export function getTechnicianWorkshopOptions(branches: readonly BranchOption[]): BranchOption[] {
  return branches.filter(
    (branch) => branch.id !== "all" && branch.type === "central_workshop" && branch.status === "active",
  );
}

export function ShellProvider({ children }: { children: ReactNode }) {
  const [roles, setRolesState] = useState<RoleId[]>(["owner"]);
  const [activeEmployeeId, setActiveEmployeeIdState] = useState("");
  const [activeBranchId, setActiveBranchIdState] = useState("all");
  const [activeWorkLocationId, setActiveWorkLocationIdState] = useState("");
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const branches = useBranches();
  const employees = useEmployees();
  const globalMaintenanceTechnician = roles.includes("maintenance_technician");

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      setSidebarCollapsedState(localStorage.getItem("l3bty-sidebar-collapsed") === "true");
      const storedRole = localStorage.getItem("l3bty-preview-role") as RoleId | null;
      const storedEmployeeId = localStorage.getItem("l3bty-preview-employee") ?? "";
      const storedBranchId = localStorage.getItem("l3bty-preview-branch") ?? "";
      const storedWorkLocationId = localStorage.getItem("l3bty-preview-work-location") ?? "";
      if (storedRole && Object.hasOwn(ROLE_TEMPLATES, storedRole)) setRolesState([storedRole]);
      if (storedEmployeeId) {
        setActiveEmployeeIdState(storedEmployeeId);
        setPreviewEmployeeSelection(employees.find((employee) => employee.id === storedEmployeeId && employee.status === "active") ?? null);
      }
      if (storedBranchId) setActiveBranchIdState(storedBranchId);
      if (storedWorkLocationId) setActiveWorkLocationIdState(storedWorkLocationId);
      setSessionHydrated(true);
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, [employees]);

  const activeRole = roles[0];
  const availableEmployees = useMemo(
    () => employees.filter((employee) => employee.status === "active" && employee.roleAssignments.some((assignment) => assignment.active && assignment.roleKey === activeRole)),
    [activeRole, employees],
  );
  const activeEmployee = availableEmployees.find((employee) => employee.id === activeEmployeeId) ?? null;
  const permissions = useMemo(() => resolvePermissions(roles), [roles]);
  const branchIds = useMemo(() => {
    if (globalMaintenanceTechnician) return "all";
    if (!activeEmployee) return resolveBranchIds(roles);
    const assignments = activeEmployee.roleAssignments.filter((assignment) => assignment.active && roles.includes(assignment.roleKey));
    if (assignments.some((assignment) => assignment.branchIds === "all")) return "all";
    return new Set(assignments.flatMap((assignment) => assignment.branchIds === "all" ? [] : assignment.branchIds));
  }, [activeEmployee, globalMaintenanceTechnician, roles]);
  const availableBranches = useMemo(
    () => {
      const activeBranches = branches.filter((branch) => branch.status !== "inactive");
      if (branchIds === "all") return [ALL_BRANCH_OPTION, ...activeBranches.map(toBranchOption)];
      const assigned = activeBranches.filter((branch) => branchIds.has(branch.id));
      // Local test records do not use the old fixture branch ids. Keep role preview usable
      // until real authentication and per-user assignments replace the preview switcher.
      return (assigned.length ? assigned : activeBranches).map(toBranchOption);
    },
    [branchIds, branches],
  );
  const availableWorkLocations = useMemo(
    () => globalMaintenanceTechnician
      ? getTechnicianWorkshopOptions(branches.map(toBranchOption))
      : availableBranches,
    [availableBranches, branches, globalMaintenanceTechnician],
  );

  const activeBranch = globalMaintenanceTechnician
    ? ALL_BRANCH_OPTION
    : availableBranches.find((branch) => branch.id === activeBranchId) ??
      availableBranches[0] ??
      ALL_BRANCH_OPTION;
  const activeWorkLocation = availableWorkLocations.find((location) => location.id === activeWorkLocationId) ??
    availableWorkLocations[0] ??
    activeBranch;

  useEffect(() => {
    if (!sessionHydrated) return;
    setPreviewEmployeeSelection(activeEmployee);
    localStorage.setItem("l3bty-preview-role", roles[0]);
    if (activeEmployee) localStorage.setItem("l3bty-preview-employee", activeEmployee.id);
    else localStorage.removeItem("l3bty-preview-employee");
    localStorage.setItem("l3bty-preview-branch", activeBranch.id);
    if (globalMaintenanceTechnician && activeWorkLocation.id !== "all") {
      localStorage.setItem("l3bty-preview-work-location", activeWorkLocation.id);
    } else {
      localStorage.removeItem("l3bty-preview-work-location");
    }
  }, [activeBranch.id, activeEmployee, activeWorkLocation.id, globalMaintenanceTechnician, roles, sessionHydrated]);

  const salesNavigation = roles.includes("sales_employee")
    && !roles.some((role) => ["owner", "manager", "rental_maintenance_employee", "maintenance_technician"].includes(role));
  const rentalNavigation = roles.includes("rental_maintenance_employee")
    && !roles.some((role) => ["owner", "manager", "sales_employee", "maintenance_technician"].includes(role));
  const navigation = useMemo(
    () => filterNavigation(permissions)
      .filter((item) => !(item.key === "transfers" && (salesNavigation || rentalNavigation)))
      .map((item): NavigationItem => rentalNavigation && item.section === "المخزون"
        ? { ...item, section: "ألعاب واحتياجات" }
        : item),
    [permissions, rentalNavigation, salesNavigation],
  );
  function setRoles(nextRoles: RoleId[]) {
    if (nextRoles.length === 0) return;
    selectRole(normalizeRoleSelection(nextRoles)[0]);
  }

  function toggleRole(role: RoleId) {
    selectRole(resolveRoleToggle(roles, role)[0]);
  }

  function selectRole(role: RoleId) {
    setRolesState([role]);
    const employee = employees.find((item) => item.status === "active" && item.roleAssignments.some((assignment) => assignment.active && assignment.roleKey === role));
    const nextEmployeeId = employee?.id ?? "";
    setActiveEmployeeIdState(nextEmployeeId);
    setPreviewEmployeeSelection(employee ?? null);
    setActiveBranchIdState(role === "maintenance_technician" ? "all" : employee?.primaryBranchId ?? "all");
    if (role === "maintenance_technician") {
      const workshops = getTechnicianWorkshopOptions(branches.map(toBranchOption));
      const assignedWorkshop = workshops.find((workshop) => workshop.id === employee?.primaryBranchId);
      setActiveWorkLocationIdState(assignedWorkshop?.id ?? workshops[0]?.id ?? "");
    } else {
      setActiveWorkLocationIdState(employee?.primaryBranchId ?? "all");
    }
  }

  function setActiveEmployeeId(employeeId: string) {
    const employee = availableEmployees.find((item) => item.id === employeeId);
    const nextEmployeeId = employee?.id ?? "";
    setActiveEmployeeIdState(nextEmployeeId);
    setPreviewEmployeeSelection(employee ?? null);
    setActiveBranchIdState(globalMaintenanceTechnician ? "all" : employee?.primaryBranchId ?? availableBranches[0]?.id ?? "all");
    if (globalMaintenanceTechnician) {
      const assignedWorkshop = availableWorkLocations.find((workshop) => workshop.id === employee?.primaryBranchId);
      setActiveWorkLocationIdState(assignedWorkshop?.id ?? availableWorkLocations[0]?.id ?? "");
    } else {
      setActiveWorkLocationIdState(employee?.primaryBranchId ?? availableWorkLocations[0]?.id ?? "all");
    }
  }

  function setActiveBranchId(branchId: string) {
    setActiveBranchIdState(globalMaintenanceTechnician ? "all" : branchId);
    if (!globalMaintenanceTechnician) setActiveWorkLocationIdState(branchId);
  }

  function setActiveWorkLocationId(locationId: string) {
    if (!availableWorkLocations.some((location) => location.id === locationId)) return;
    setActiveWorkLocationIdState(locationId);
    if (!globalMaintenanceTechnician) setActiveBranchIdState(locationId);
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
        activeEmployee,
        availableEmployees,
        setActiveEmployeeId,
        activeBranch,
        setActiveBranchId,
        availableBranches,
        activeWorkLocation,
        setActiveWorkLocationId,
        availableWorkLocations,
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
