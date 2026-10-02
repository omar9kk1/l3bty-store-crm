import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CUSTOMER_FIXTURES } from "../fixtures";
import { resolveCustomerAccess } from "../permissions";
import { validateCustomerForm } from "../schemas/customer-schema";
import { findDuplicateCustomer } from "../services/find-duplicate-customer";
import { normalizePhone } from "../services/normalize-phone";
import { createCustomer, getCustomerDeleteRequestsSnapshot, getCustomersSnapshot, requestCustomerDeletion, resetCustomerStore, reviewCustomerDeletion } from "../services/customer-store";
import { matchesCustomerSearch, scopeCustomers } from "../services/query-customers";
import { getNotificationsSnapshot, resetNotificationStore } from "@/features/notifications/services/notification-service";

const allBranches = ["main", "branch-2", "branch-3", "workshop"];

describe("customer search and phone rules", () => {
  it("searches by Arabic name", () => {
    expect(matchesCustomerSearch(CUSTOMER_FIXTURES[1], "للمبيعات")).toBe(true);
  });

  it("normalizes country prefix, spaces and separators before phone search", () => {
    expect(normalizePhone("+20 100-000-0001")).toBe("01000000001");
    expect(matchesCustomerSearch(CUSTOMER_FIXTURES[0], "+20 100-000-0001")).toBe(true);
  });

  it("blocks duplicates found in primary or alternate phones", () => {
    expect(findDuplicateCustomer("010 0000 0001", CUSTOMER_FIXTURES)?.id).toBe("customer-001");
    expect(findDuplicateCustomer("011-0000-0001", CUSTOMER_FIXTURES)?.id).toBe("customer-001");
    const validation = validateCustomerForm({ name: "عميل جديد", primaryPhone: "+20 100 000 0001", alternatePhone: "", branchId: "main", notes: "" }, CUSTOMER_FIXTURES);
    expect(validation.valid).toBe(false);
    expect(validation.duplicate?.id).toBe("customer-001");
  });
});

describe("customer role and branch scope", () => {
  it("keeps the standalone customer directory administrative", () => {
    for (const role of ["sales_employee", "rental_maintenance_employee", "maintenance_technician"] as const) {
      const access = resolveCustomerAccess([role]);
      expect(access.canCreate).toBe(false);
      expect(access.canEdit).toBe(false);
      expect(access.allowedActivityTypes).toHaveLength(0);
    }
    expect(resolveCustomerAccess(["owner"]).canCreate).toBe(true);
    expect(resolveCustomerAccess(["manager"]).canEdit).toBe(true);
  });

  it("shows a customer created during rental entry to the rental employee", () => {
    const customer = createCustomer({ name: "عميل تأجير جديد", primaryPhone: "01012345678", alternatePhone: "", branchId: "branch-01", notes: "" }, "rental");
    expect(customer.activityTypes).toContain("rental");
    expect(scopeCustomers([customer], ["rental_maintenance_employee"], "branch-01", ["branch-01"])).toEqual([customer]);
    resetCustomerStore();
  });

  it("gives owner and manager access to every customer", () => {
    for (const role of ["owner", "manager"] as const) {
      expect(scopeCustomers(CUSTOMER_FIXTURES, [role], "all", allBranches)).toHaveLength(CUSTOMER_FIXTURES.length);
    }
  });

  it("limits sales employees to sales-linked customers", () => {
    const result = scopeCustomers(CUSTOMER_FIXTURES, ["sales_employee"], "all", allBranches);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((customer) => customer.activityTypes.includes("sales"))).toBe(true);
  });

  it("limits rental employees to rental or maintenance customers", () => {
    const result = scopeCustomers(CUSTOMER_FIXTURES, ["rental_maintenance_employee"], "all", ["main", "branch-2"]);
    expect(result.every((customer) => customer.activityTypes.includes("rental") || customer.activityTypes.includes("maintenance"))).toBe(true);
  });

  it("does not grant customer directory access to technicians", () => {
    const result = scopeCustomers(CUSTOMER_FIXTURES, ["maintenance_technician"], "all", ["main", "workshop"]);
    expect(result).toHaveLength(0);
    expect(resolveCustomerAccess(["maintenance_technician"]).canViewMaintenance).toBe(false);
  });

  it("unions access for multiple roles and honors activeBranch", () => {
    const roles = ["sales_employee", "rental_maintenance_employee"] as const;
    const union = scopeCustomers(CUSTOMER_FIXTURES, roles, "all", allBranches);
    expect(union.some((customer) => customer.activityTypes.includes("sales"))).toBe(true);
    expect(union.some((customer) => customer.activityTypes.includes("rental"))).toBe(true);
    const branch = scopeCustomers(CUSTOMER_FIXTURES, roles, "branch-3", allBranches);
    expect(branch.every((customer) => customer.branchIds.includes("branch-3"))).toBe(true);
  });
});

describe("customer feature vocabulary", () => {
  it("does not reintroduce retired role or finance concepts", () => {
    const collect = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return entry.name === "tests" ? [] : collect(path);
      return /\.(ts|tsx|css)$/.test(entry.name) ? [path] : [];
    });
    const files = [
      ...collect(join(process.cwd(), "features", "customers")),
      join(process.cwd(), "styles", "customers.css"),
    ];
    const retired = ["account" + "ant", "ops_" + "employee", "Dep" + "osit", "تأ" + "مين", "و" + "ديعة"];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const word of retired) expect(source, `${word} in ${file}`).not.toContain(word);
    }
  });

  it("does not show customer debt concepts in the customer interface", () => {
    const components = join(process.cwd(), "features", "customers", "components");
    const sources = readdirSync(components)
      .filter((name) => name.endsWith(".tsx"))
      .map((name) => readFileSync(join(components, name), "utf8"))
      .join("\n");
    expect(sources).not.toContain("مديون");
    expect(sources).not.toContain("outstandingBalance");
  });
});

describe("customer deletion approval", () => {
  it("keeps the customer visible until the manager approves the employee request", () => {
    resetCustomerStore();
    resetNotificationStore();
    const customer = getCustomersSnapshot()[0];
    const requested = requestCustomerDeletion(customer.id, { requestedByEmployeeId: "employee-rental", requestedByUserId: "user-rental", requestedByName: "موظف التأجير", branchId: customer.branchIds[0], reason: "بيانات مكررة" });
    expect(requested.valid).toBe(true);
    if (!requested.valid) throw new Error(requested.message);
    expect(getCustomersSnapshot().find((item) => item.id === customer.id)?.deletedAt).toBeFalsy();
    expect(scopeCustomers(getCustomersSnapshot(), ["manager"], "all", allBranches)).toContainEqual(expect.objectContaining({ id: customer.id }));
    expect(getNotificationsSnapshot().notifications[0]).toMatchObject({ recipientUserId: "user-manager", recipientEmployeeId: "employee-manager", referenceType: "customer_delete_request", referenceId: requested.request.id, status: "unread" });

    const approved = reviewCustomerDeletion(requested.request.id, "approved", { reviewerEmployeeId: "employee-manager", reviewerRole: "manager", note: "طلب صحيح" });
    expect(approved.valid).toBe(true);
    expect(getCustomersSnapshot().find((item) => item.id === customer.id)?.deletedAt).toBeTruthy();
    expect(scopeCustomers(getCustomersSnapshot(), ["manager"], "all", allBranches).some((item) => item.id === customer.id)).toBe(false);
    expect(getNotificationsSnapshot().notifications.some((item) => item.recipientUserId === "user-rental" && item.type === "customer_delete_approved")).toBe(true);
  });

  it("prevents duplicate requests and rejects approval from non-manager roles", () => {
    resetCustomerStore();
    resetNotificationStore();
    const customer = getCustomersSnapshot()[0];
    const input = { requestedByEmployeeId: "employee-sales", requestedByUserId: "user-sales", requestedByName: "موظف المبيعات", branchId: customer.branchIds[0], reason: "طلب اختبار" };
    const first = requestCustomerDeletion(customer.id, input);
    expect(first.valid).toBe(true);
    if (!first.valid) throw new Error(first.message);
    expect(requestCustomerDeletion(customer.id, input).valid).toBe(false);
    expect(getCustomerDeleteRequestsSnapshot().filter((item) => item.customerId === customer.id && item.status === "pending")).toHaveLength(1);
    expect(reviewCustomerDeletion(first.request.id, "approved", { reviewerEmployeeId: "employee-owner", reviewerRole: "owner", note: "" }).valid).toBe(false);
    expect(getCustomersSnapshot().find((item) => item.id === customer.id)?.deletedAt).toBeFalsy();
  });
});
