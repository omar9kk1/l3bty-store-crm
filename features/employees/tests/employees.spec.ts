import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { EMPLOYEE_FIXTURES, resolvePreviewEmployee, setPreviewEmployeeSelection } from "../fixtures";
import { canManageEmployees } from "../permissions";
import { EMPTY_EMPLOYEE_FORM, getNextEmployeeNumber, validateEmployeeForm } from "../schemas/employee-schema";
import { createEmployee, getEmployeeAuditEvents, resetEmployeeStore } from "../services/employee-store";
import { filterEmployees, summarizeEmployees } from "../services/query-employees";

const valid = { ...EMPTY_EMPLOYEE_FORM, employeeNumber: "EMP-0008", name: "موظف تجريبي", phone: "01000000008", jobTitle: "موظف تجريبي", primaryBranchId: "main", assignedBranchIds: ["main"], roleKeys: ["sales_employee"], hireDate: "2026-01-01" };

describe("employee contracts and queries", () => {
  it("contains deterministic coverage for the five roles, multi-role and suspended records", () => {
    const roles = new Set(EMPLOYEE_FIXTURES.flatMap((employee) => employee.roleAssignments.map((assignment) => assignment.roleKey)));
    expect([...roles].sort()).toEqual(["maintenance_technician", "manager", "owner", "rental_maintenance_employee", "sales_employee"].sort());
    expect(EMPLOYEE_FIXTURES.some((employee) => employee.roleAssignments.length > 1)).toBe(true);
    expect(EMPLOYEE_FIXTURES.some((employee) => employee.status === "suspended")).toBe(true);
  });
  it("filters by text, branch, role and multi-role", () => {
    expect(filterEmployees(EMPLOYEE_FIXTURES, { q: "EMP-0004", branch: "all", role: "all", status: "all", employmentType: "all", multiRole: "all", sort: "recent" }).map((item) => item.id)).toEqual(["employee-sales"]);
    expect(filterEmployees(EMPLOYEE_FIXTURES, { q: "", branch: "branch-3", role: "sales_employee", status: "all", employmentType: "all", multiRole: "yes", sort: "name" }).map((item) => item.id)).toContain("employee-dual");
  });
  it("summarizes status, multi-role and branch distribution", () => { const summary = summarizeEmployees(EMPLOYEE_FIXTURES); expect(summary.total).toBe(7); expect(summary.suspended).toBe(1); expect(summary.multiRole).toBe(1); expect(summary.byBranch.workshop).toBeGreaterThan(0); });
  it.each(["owner", "manager"] as const)("allows %s to manage employees", (role) => expect(canManageEmployees([role])).toBe(true));
  it.each(["sales_employee", "rental_maintenance_employee", "maintenance_technician"] as const)("denies employee administration to %s", (role) => expect(canManageEmployees([role])).toBe(false));
  it("resolves only the current preview identity for profile", () => { expect(resolvePreviewEmployee(["sales_employee"]).id).toBe("employee-sales"); expect(resolvePreviewEmployee(["rental_maintenance_employee", "sales_employee"]).id).toBe("employee-dual"); expect(resolvePreviewEmployee(["maintenance_technician"]).id).toBe("employee-technician"); });
  it("uses the explicitly selected real employee across preview operations", () => {
    const selected = { ...EMPLOYEE_FIXTURES.find((employee) => employee.id === "employee-rental")!, id: "employee-local-test", name: "موظف محلي" };
    setPreviewEmployeeSelection(selected);
    expect(resolvePreviewEmployee(["rental_maintenance_employee"]).id).toBe("employee-local-test");
    setPreviewEmployeeSelection(null);
  });
});

describe("employee validation and safety", () => {
  beforeEach(() => resetEmployeeStore());
  it("generates employee numbers and accepts only the essential fields", () => {
    expect(getNextEmployeeNumber([])).toBe("EMP-0001");
    expect(getNextEmployeeNumber(EMPLOYEE_FIXTURES)).toBe("EMP-0008");
    const result = validateEmployeeForm({ ...EMPTY_EMPLOYEE_FORM, employeeNumber: "EMP-0008", name: "موظف جديد", phone: "01012345678", primaryBranchId: "main", assignedBranchIds: ["main"], roleKeys: ["sales_employee"] }, []);
    expect(result.valid).toBe(true);
    expect(result.normalizedValues.jobTitle).toBe("موظف المبيعات");
  });
  it("allows one role per employee", () => {
    expect(validateEmployeeForm({ ...valid, roleKeys: ["sales_employee", "rental_maintenance_employee"] }, []).errors.roleKeys).toMatch(/دورًا واحدًا/);
  });
  it("normalizes phone using the shared customer mechanism and blocks duplicate phone/number", () => { const duplicatePhone = validateEmployeeForm({ ...valid, phone: "+20 100 000 0001" }, EMPLOYEE_FIXTURES); expect(duplicatePhone.errors.phone).toMatch(/مسجل/); expect(duplicatePhone.duplicate?.id).toBe("employee-owner"); const duplicateNumber = validateEmployeeForm({ ...valid, employeeNumber: "emp-0002" }, EMPLOYEE_FIXTURES); expect(duplicateNumber.errors.employeeNumber).toMatch(/مستخدم/); });
  it("requires at least one branch for an operational role", () => { const result = validateEmployeeForm({ ...valid, primaryBranchId: "", assignedBranchIds: [] }, EMPLOYEE_FIXTURES); expect(result.errors.assignedBranchIds).toBeDefined(); });
  it("requires choosing a primary branch for every employee role", () => {
    const result = validateEmployeeForm({ ...valid, roleKeys: ["manager"], primaryBranchId: "", assignedBranchIds: ["main", "branch-2"], adminAccessConfirmed: true, adminAccessReason: "تعيين مدير جديد" }, EMPLOYEE_FIXTURES);
    expect(result.errors.primaryBranchId).toBe("اختر الفرع الأساسي.");
  });
  it("rejects retired and unknown role keys", () => { for (const role of ["accountant", "ACC", "ops_employee"]) expect(validateEmployeeForm({ ...valid, roleKeys: [role] }, EMPLOYEE_FIXTURES).errors.roleKeys).toMatch(/غير معتمد/); });
  it("requires confirmation and assigns all branches to owner or manager", () => { const values = { ...valid, employeeNumber: "EMP-0009", phone: "01000000009", roleKeys: ["manager"], assignedBranchIds: ["main", "branch-2", "branch-3", "workshop"], adminAccessConfirmed: true, adminAccessReason: "تعيين مدير تجريبي" }; const result = validateEmployeeForm(values, EMPLOYEE_FIXTURES); expect(result.valid).toBe(true); const created = createEmployee(result.normalizedValues); expect(created.roleAssignments[0].branchIds).toBe("all"); expect(getEmployeeAuditEvents()[0].employeeId).toBe(created.id); });
  it("prevents removing the last owner", () => { const owner = EMPLOYEE_FIXTURES.find((employee) => employee.id === "employee-owner")!; const values = { ...valid, employeeNumber: owner.employeeNumber, phone: owner.phone, roleKeys: ["manager"], assignedBranchIds: [...owner.assignedBranchIds], adminAccessConfirmed: true, adminAccessReason: "تحويل إداري تجريبي" }; expect(validateEmployeeForm(values, EMPLOYEE_FIXTURES, { currentEmployeeId: owner.id, currentPreviewEmployeeId: "employee-manager" }).errors.roleKeys).toMatch(/آخر مالك/); });
  it("prevents the current preview user from suspending itself", () => { const sales = EMPLOYEE_FIXTURES.find((employee) => employee.id === "employee-sales")!; const values = { ...valid, employeeNumber: sales.employeeNumber, phone: sales.phone, status: "suspended" as const, primaryBranchId: sales.primaryBranchId, assignedBranchIds: [...sales.assignedBranchIds], statusReason: "سبب تجريبي" }; expect(validateEmployeeForm(values, EMPLOYEE_FIXTURES, { currentEmployeeId: sales.id, currentPreviewEmployeeId: sales.id }).errors.status).toMatch(/المستخدم الحالي/); });
});

describe("employee stylesheet and forbidden vocabulary", () => {
  it("imports one physical employees stylesheet", () => { const globals = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8"); expect(existsSync(join(process.cwd(), "styles", "employees.css"))).toBe(true); expect(globals.match(/\.\.\/styles\/employees\.css/g)).toHaveLength(1); });
  it("does not ship retired role names in feature source outside tests", () => { const collect = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => { const path = join(directory, entry.name); if (entry.isDirectory()) return entry.name === "tests" ? [] : collect(path); return /\.(ts|tsx)$/.test(entry.name) ? [path] : []; }); const retired = ["account" + "ant", "A" + "CC", "ops_" + "employee"]; for (const file of collect(join(process.cwd(), "features", "employees"))) for (const word of retired) expect(readFileSync(file, "utf8")).not.toContain(word); });
});
