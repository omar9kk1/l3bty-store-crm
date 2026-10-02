import { describe, expect, it } from "vitest";
import { getTechnicianWorkshopOptions, normalizeRoleSelection, resolveRoleToggle } from "@/components/shell/ShellContext";

describe("role preview selection", () => {
  it("replaces an administrator role when an operational role is selected", () => {
    expect(resolveRoleToggle(["owner"], "rental_maintenance_employee")).toEqual(["rental_maintenance_employee"]);
  });

  it("keeps owner and manager mutually exclusive from every other role", () => {
    expect(resolveRoleToggle(["sales_employee", "rental_maintenance_employee"], "manager")).toEqual(["manager"]);
    expect(normalizeRoleSelection(["sales_employee", "owner"])).toEqual(["owner"]);
  });

  it("replaces one operational role with another", () => {
    expect(resolveRoleToggle(["sales_employee"], "rental_maintenance_employee")).toEqual(["rental_maintenance_employee"]);
  });

  it("offers active central workshops only as technician work locations", () => {
    expect(getTechnicianWorkshopOptions([
      { id: "all", nameAr: "كل الفروع", code: "ALL" },
      { id: "branch-1", nameAr: "فرع عادي", code: "BR01", type: "branch", status: "active" },
      { id: "workshop-active", nameAr: "الورشة المركزية", code: "WRK", type: "central_workshop", status: "active" },
      { id: "workshop-closed", nameAr: "ورشة مغلقة", code: "WRK2", type: "central_workshop", status: "inactive" },
    ])).toEqual([
      { id: "workshop-active", nameAr: "الورشة المركزية", code: "WRK", type: "central_workshop", status: "active" },
    ]);
  });
});
