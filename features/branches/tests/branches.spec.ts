import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BRANCH_FIXTURES } from "@/mock-data/branches";
import { DASHBOARD_BRANCH_FIXTURES } from "@/features/dashboard/fixtures";
import { canAccessBranch, resolveBranchAccess, scopeBranches } from "../permissions";
import { EMPTY_BRANCH_FORM, findDuplicateBranchCode, getNextBranchCode, validateBranchForm } from "../schemas/branch-schema";
import { applyEmployeeCounts, filterBranches, matchesBranchSearch } from "../services/query-branches";
import type { Employee } from "@/features/employees/types";

describe("branch directory and filters", () => {
  it("derives branch employee totals from the current employee assignments", () => {
    const employee = {
      id: "employee-live-count",
      assignedBranchIds: ["main", "workshop", "workshop"],
      roleAssignments: [{ roleKey: "maintenance_technician", active: true }],
    } as unknown as Employee;
    const branches = applyEmployeeCounts(
      BRANCH_FIXTURES.map((branch) => ({ ...branch, assignedEmployeeCount: 0, technicianCount: 0 })),
      [employee],
    );

    expect(branches.find((branch) => branch.id === "main")).toMatchObject({ assignedEmployeeCount: 1, technicianCount: 1 });
    expect(branches.find((branch) => branch.id === "workshop")).toMatchObject({ assignedEmployeeCount: 1, technicianCount: 1 });
    expect(branches.find((branch) => branch.id === "branch-2")).toMatchObject({ assignedEmployeeCount: 0, technicianCount: 0 });
  });
  it("uses the shared branch identity in Dashboard", () => {
    expect(DASHBOARD_BRANCH_FIXTURES.map(({ id, name, code }) => ({ id, name, code }))).toEqual(BRANCH_FIXTURES.map(({ id, name, code }) => ({ id, name, code })));
  });
  it("searches by name and code", () => {
    expect(matchesBranchSearch(BRANCH_FIXTURES[0], "الرئيسي")).toBe(true);
    expect(matchesBranchSearch(BRANCH_FIXTURES[0], "br01")).toBe(true);
  });
  it("filters location type and status", () => {
    expect(filterBranches(BRANCH_FIXTURES, { q: "", type: "central_workshop", status: "all", sort: "name" })).toHaveLength(1);
    expect(filterBranches(BRANCH_FIXTURES, { q: "", type: "all", status: "temporarily_closed", sort: "name" }).map((branch) => branch.id)).toEqual(["branch-3"]);
  });
});

describe("branch form validation", () => {
  const valid = { ...EMPTY_BRANCH_FORM, name: "موقع تجريبي", code: "BR04", city: "القاهرة", area: "منطقة تجريبية", address: "عنوان تجريبي", managerEmployeeId: "employee-manager-01", latitude: "30.1", longitude: "31.2" };
  it("blocks duplicate branch codes", () => {
    expect(findDuplicateBranchCode(" br01 ", BRANCH_FIXTURES)?.id).toBe("main");
    const result = validateBranchForm({ ...valid, code: "br01" }, BRANCH_FIXTURES);
    expect(result.valid).toBe(false);
    expect(result.duplicate?.id).toBe("main");
  });
  it("generates the next branch code automatically without reusing gaps", () => {
    expect(getNextBranchCode([])).toBe("BR01");
    expect(getNextBranchCode(BRANCH_FIXTURES)).toBe("BR04");
    expect(getNextBranchCode([
      { ...BRANCH_FIXTURES[0], code: "BR02" },
      { ...BRANCH_FIXTURES[1], code: "BR09" },
      { ...BRANCH_FIXTURES[2], code: "WORKSHOP" },
    ])).toBe("BR10");
  });
  it("accepts the essential create fields without phone, manager, or coordinates", () => {
    const result = validateBranchForm({
      ...EMPTY_BRANCH_FORM,
      name: "فرع تجريبي",
      code: "BR20",
      city: "القاهرة",
    }, []);
    expect(result.valid).toBe(true);
  });
  it("validates coordinates and geofence radius", () => {
    const result = validateBranchForm({ ...valid, latitude: "91", longitude: "-181", geofenceRadiusMeters: "5" }, BRANCH_FIXTURES);
    expect(result.errors.latitude).toBeDefined();
    expect(result.errors.longitude).toBeDefined();
    expect(result.errors.geofenceRadiusMeters).toBeDefined();
  });
  it("supports explicit overnight working hours", () => {
    expect(validateBranchForm({ ...valid, opensAt: "22:00", closesAt: "06:00" }, BRANCH_FIXTURES).errors.closesAt).toBeDefined();
    expect(validateBranchForm({ ...valid, opensAt: "22:00", closesAt: "06:00", crossesMidnight: true }, BRANCH_FIXTURES).valid).toBe(true);
  });
  it("requires a reason when an existing location status changes", () => {
    const branch = BRANCH_FIXTURES[0];
    const values = { ...valid, name: branch.name, code: branch.code, status: "inactive" as const };
    expect(validateBranchForm(values, BRANCH_FIXTURES, branch).errors.statusReason).toBeDefined();
  });
});

describe("branch role scope", () => {
  it("allows owner and manager to see every location", () => {
    for (const role of ["owner", "manager"] as const) expect(scopeBranches(BRANCH_FIXTURES, [role])).toHaveLength(4);
  });
  it("does not expose the administrative directory to operational roles", () => {
    expect(scopeBranches(BRANCH_FIXTURES, ["rental_maintenance_employee"])).toEqual([]);
    expect(scopeBranches(BRANCH_FIXTURES, ["sales_employee"])).toEqual([]);
    expect(scopeBranches(BRANCH_FIXTURES, ["maintenance_technician"])).toEqual([]);
  });
  it("does not grant administration through an operational multi-role union", () => {
    const result = scopeBranches(BRANCH_FIXTURES, ["sales_employee", "maintenance_technician"]);
    expect(result).toEqual([]);
  });
  it("denies all administrative detail access and summaries to operational roles", () => {
    expect(canAccessBranch(BRANCH_FIXTURES[1], ["maintenance_technician"])).toBe(false);
    expect(resolveBranchAccess(["maintenance_technician"])).toMatchObject({ canManage: false, canViewSales: false, canViewCashboxes: false, canViewMaintenance: false });
  });
});

describe("branch styles and vocabulary", () => {
  it("keeps branch selection in the top bar instead of detail actions", () => {
    const details = readFileSync(join(process.cwd(), "features", "branches", "components", "BranchDetailsPage.tsx"), "utf8");
    expect(details).not.toContain("استخدام هذا الفرع");
    expect(details).not.toContain("المزيد");
  });
  it("has one real branches stylesheet import", () => {
    const globals = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
    expect(existsSync(join(process.cwd(), "styles", "branches.css"))).toBe(true);
    expect(globals.match(/\.\.\/styles\/branches\.css/g)).toHaveLength(1);
  });
  it("does not reintroduce retired vocabulary", () => {
    const collect = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return entry.name === "tests" ? [] : collect(path);
      return /\.(ts|tsx|css)$/.test(entry.name) ? [path] : [];
    });
    const files = [...collect(join(process.cwd(), "features", "branches")), join(process.cwd(), "mock-data", "branches.ts"), join(process.cwd(), "styles", "branches.css")];
    const retired = ["account" + "ant", "A" + "CC", "ops_" + "employee", "Dep" + "osit", "تأ" + "مين", "و" + "ديعة"];
    for (const file of files) for (const word of retired) expect(readFileSync(file, "utf8"), `${word} in ${file}`).not.toContain(word);
  });
});
