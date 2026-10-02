import { describe, expect, it } from "vitest";
import { filterNavigation, findNavigationItem } from "@/permissions/navigation-policy";
import { resolveBranchIds, resolvePermissions } from "@/permissions/resolve-permissions";
import { ALL_PERMISSIONS, PERMISSION_KEYS } from "@/permissions/keys";

const hrefsFor = (...roles: Parameters<typeof resolvePermissions>[0]) =>
  filterNavigation(resolvePermissions(roles)).map((item) => item.href);

describe("permission resolution", () => {
  it.each(["owner", "manager"] as const)("gives %s full access", (role) => {
    expect(resolvePermissions([role]).size).toBe(ALL_PERMISSIONS.length);
  });

  it("combines permissions for multiple roles", () => {
    const hrefs = hrefsFor("rental_maintenance_employee", "sales_employee");
    expect(hrefs).toContain("/rentals");
    expect(hrefs).toContain("/sales/pos");
    expect(hrefs).not.toContain("/payroll");
  });

  it("keeps maintenance technicians global when combined with another operational role", () => {
    const branches = resolveBranchIds(["sales_employee", "maintenance_technician"]);
    expect(branches).toBe("all");
  });

  it.each(["sales_employee", "rental_maintenance_employee", "maintenance_technician"] as const)("denies every administrative destination to %s", (role) => {
    const hrefs = hrefsFor(role);
    for (const href of ["/branches", "/employees", "/finance", "/expenses", "/payroll", "/reports", "/settings", "/activity-log"]) {
      expect(hrefs).not.toContain(href);
    }
  });

  it.each(["owner", "manager"] as const)("allows %s to open every administrative destination", (role) => {
    const hrefs = hrefsFor(role);
    for (const href of ["/branches", "/employees", "/finance", "/expenses", "/payroll", "/reports", "/settings", "/activity-log"]) {
      expect(hrefs).toContain(href);
    }
  });

  it("uses the administrative branch permission for list and detail URLs", () => {
    expect(findNavigationItem("/branches")?.requiredPermission).toBe(PERMISSION_KEYS.branchesManage);
    expect(findNavigationItem("/branches/main")?.requiredPermission).toBe(PERMISSION_KEYS.branchesManage);
    expect(resolvePermissions(["sales_employee"]).has(PERMISSION_KEYS.branchesManage)).toBe(false);
    expect(resolvePermissions(["sales_employee", "maintenance_technician"]).has(PERMISSION_KEYS.branchesManage)).toBe(false);
    expect(resolvePermissions(["sales_employee", "manager"]).has(PERMISSION_KEYS.branchesManage)).toBe(true);
  });

  it("uses one centralized administrative permission for employee list and detail URLs", () => {
    expect(findNavigationItem("/employees")?.requiredPermission).toBe(PERMISSION_KEYS.employees);
    expect(findNavigationItem("/employees/employee-sales")?.requiredPermission).toBe(PERMISSION_KEYS.employees);
    expect(resolvePermissions(["sales_employee", "maintenance_technician"]).has(PERMISSION_KEYS.employees)).toBe(false);
    expect(resolvePermissions(["manager"]).has(PERMISSION_KEYS.employees)).toBe(true);
    expect(resolvePermissions(["sales_employee"]).has(PERMISSION_KEYS.profile)).toBe(true);
    expect(hrefsFor("sales_employee")).not.toContain("/profile");
  });

  it("keeps branch context independent from administrative page access", () => {
    expect(resolveBranchIds(["maintenance_technician"])).toBe("all");
    expect(resolveBranchIds(["sales_employee"])).toEqual(new Set(["main", "branch-2", "branch-3"]));
  });

  it("hides rentals from the sales employee", () => {
    expect(hrefsFor("sales_employee")).not.toContain("/rentals");
  });

  it("keeps the customer directory for management only", () => {
    for (const role of ["sales_employee", "rental_maintenance_employee", "maintenance_technician"] as const) {
      expect(hrefsFor(role)).not.toContain("/customers");
      expect(resolvePermissions([role]).has(PERMISSION_KEYS.customers)).toBe(false);
    }
    expect(hrefsFor("owner")).toContain("/customers");
    expect(hrefsFor("manager")).toContain("/customers");
  });

  it("hides POS from the rental and maintenance intake employee", () => {
    expect(hrefsFor("rental_maintenance_employee")).not.toContain("/sales/pos");
  });

  it("keeps rental assets and branch needs but hides stock pages from the rental employee", () => {
    const hrefs = hrefsFor("rental_maintenance_employee");
    expect(hrefs).toContain("/rental-assets");
    expect(hrefs).toContain("/branch-needs");
    expect(hrefs).not.toContain("/inventory");
    expect(resolvePermissions(["rental_maintenance_employee"]).has(PERMISSION_KEYS.inventoryMovements)).toBe(false);
  });

  it("protects every sales and product URL with the centralized policy", () => {
    for (const path of ["/sales/pos", "/sales/invoices", "/sales/invoices/sale-401", "/sales/returns"]) {
      expect(findNavigationItem(path)?.requiredPermission).toBe(PERMISSION_KEYS.sales);
    }
    for (const path of ["/products", "/products/product-car-12v"]) {
      expect(findNavigationItem(path)?.requiredPermission).toBe(PERMISSION_KEYS.products);
    }
    for (const role of ["rental_maintenance_employee", "maintenance_technician"] as const) {
      expect(resolvePermissions([role]).has(PERMISSION_KEYS.sales)).toBe(false);
      expect(resolvePermissions([role]).has(PERMISSION_KEYS.products)).toBe(false);
    }
    expect(resolvePermissions(["sales_employee"]).has(PERMISSION_KEYS.sales)).toBe(true);
    expect(resolvePermissions(["sales_employee"]).has(PERMISSION_KEYS.products)).toBe(true);
    expect(resolvePermissions(["maintenance_technician", "sales_employee"]).has(PERMISSION_KEYS.sales)).toBe(true);
  });

  it("hides finance and payroll from the maintenance technician", () => {
    const hrefs = hrefsFor("maintenance_technician");
    expect(hrefs).not.toContain("/finance");
    expect(hrefs).not.toContain("/payroll");
  });

  it("uses role-aware attendance destinations and protects administration URLs", () => {
    expect(hrefsFor("owner")).toContain("/attendance");
    expect(hrefsFor("manager")).toContain("/attendance");
    for (const role of ["sales_employee", "rental_maintenance_employee", "maintenance_technician"] as const) {
      expect(hrefsFor(role)).toContain("/attendance/my");
      expect(hrefsFor(role)).not.toContain("/attendance");
    }
    expect(findNavigationItem("/attendance")?.requiredPermission).toBe(PERMISSION_KEYS.attendanceViewAll);
    expect(findNavigationItem("/attendance/exceptions")?.requiredPermission).toBe(PERMISSION_KEYS.attendanceViewAll);
    expect(findNavigationItem("/attendance/my")?.requiredPermission).toBe(PERMISSION_KEYS.attendanceViewSelf);
    expect(findNavigationItem("/attendance/check")?.requiredPermission).toBe(PERMISSION_KEYS.attendanceCapture);
  });

  it("separates inventory and transfers in navigation and route permissions", () => {
    const hrefs = hrefsFor("maintenance_technician");
    expect(hrefs).toContain("/inventory");
    expect(hrefs).toContain("/inventory/transfers");
    expect(findNavigationItem("/inventory")?.requiredPermission).toBe(PERMISSION_KEYS.inventory);
    expect(findNavigationItem("/inventory/movements")?.requiredPermission).toBe(PERMISSION_KEYS.inventory);
    expect(findNavigationItem("/inventory/transfers")?.requiredPermission).toBe(PERMISSION_KEYS.transfersView);
    expect(findNavigationItem("/inventory/transfers/new")?.requiredPermission).toBe(PERMISSION_KEYS.transfersView);
  });

  it("shows branch needs to rental and sales employees without showing the transfer section", () => {
    for (const role of ["sales_employee", "rental_maintenance_employee"] as const) {
      const hrefs = hrefsFor(role);
      expect(hrefs).toContain("/branch-needs");
      expect(findNavigationItem("/branch-needs")?.requiredPermission).toBe(PERMISSION_KEYS.branchNeedsView);
      expect(resolvePermissions([role]).has(PERMISSION_KEYS.branchNeedsCreate)).toBe(true);
    }
  });

  it("protects every nested rental and rental-asset URL centrally", () => {
    for (const path of ["/rentals", "/rentals/new", "/rentals/rental-active-15", "/rentals/rental-active-15/extend", "/rentals/rental-active-15/close"]) expect(findNavigationItem(path)?.requiredPermission).toBe(PERMISSION_KEYS.rentals);
    for (const path of ["/rental-assets", "/rental-assets/asset-drift-01"]) expect(findNavigationItem(path)?.requiredPermission).toBe(PERMISSION_KEYS.rentalAssets);
    expect(hrefsFor("sales_employee")).not.toContain("/rentals"); expect(hrefsFor("sales_employee")).not.toContain("/rental-assets"); expect(hrefsFor("maintenance_technician")).not.toContain("/rentals"); expect(hrefsFor("maintenance_technician")).not.toContain("/rental-assets");
  });
});
