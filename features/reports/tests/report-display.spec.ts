import { describe, expect, it } from "vitest";
import {
  formatReportDisplayValue,
  formatReportFieldLabel,
} from "../services/report-display";

const lookups = {
  branches: new Map([["branch-01", "مول غازي"]]),
  products: new Map([["product-mock-100", "هافربورد"]]),
  employees: new Map([["employee-sales", "شكري"]]),
};

describe("report display", () => {
  it("shows Arabic field labels instead of internal report keys", () => {
    expect(formatReportFieldLabel("product")).toBe("المنتج");
    expect(formatReportFieldLabel("productId")).toBe("المنتج");
    expect(formatReportFieldLabel("branch")).toBe("الفرع");
    expect(formatReportFieldLabel("branchId")).toBe("الفرع");
    expect(formatReportFieldLabel("available")).toBe("المتاح");
    expect(formatReportFieldLabel("averageCost")).toBe("متوسط التكلفة");
  });

  it("resolves internal ids to their visible names", () => {
    expect(formatReportDisplayValue("branch", "branch-01", lookups)).toBe("مول غازي");
    expect(formatReportDisplayValue("branchId", "branch-01", lookups)).toBe("مول غازي");
    expect(formatReportDisplayValue("product", "product-mock-100", lookups)).toBe("هافربورد");
    expect(formatReportDisplayValue("productId", "product-mock-100", lookups)).toBe("هافربورد");
    expect(formatReportDisplayValue("employee", "employee-sales", lookups)).toBe("شكري");
  });

  it("never exposes an unknown seeded id to the user", () => {
    expect(formatReportDisplayValue("branch", "branch-missing", lookups)).toBe("فرع غير معروف");
    expect(formatReportDisplayValue("product", "product-missing", lookups)).toBe("منتج غير معروف");
    expect(formatReportDisplayValue("status", "pending_review", lookups)).toBe("بانتظار المراجعة");
    expect(formatReportDisplayValue("amount", undefined, lookups)).toBeUndefined();
  });
});
