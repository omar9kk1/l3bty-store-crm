import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetricCard } from "../components/MetricCard";
import { allowedActivityTypes, dashboardVisibility, resolveDashboardMode } from "../permissions";
import { getDashboardData } from "../services/get-dashboard-data";
import type { DashboardQuery } from "../types";

const baseQuery: DashboardQuery = { period: "today", type: "all", state: "normal", branchId: "all" };

describe("dashboard role-aware model", () => {
  it("shows the four approved management metrics to owner and manager", () => {
    for (const role of ["owner", "manager"] as const) {
      const model = getDashboardData(baseQuery, [role]);
      expect(model.metrics.map((metric) => metric.key)).toEqual(["sales", "rental", "maintenance", "cash"]);
      expect(dashboardVisibility([role]).branchPerformance).toBe(true);
    }
  });

  it("limits sales employee to sales activity and hides rental operations", () => {
    expect(allowedActivityTypes(["sales_employee"])).toEqual(["sales"]);
    expect(dashboardVisibility(["sales_employee"])).toMatchObject({ activeRentals: false, maintenance: false, rentalUtilization: false });
    expect(getDashboardData({ ...baseQuery, type: "sales" }, ["sales_employee"]).metrics.every((metric) => metric.key.startsWith("sales") || ["invoice-count", "returns"].includes(metric.key))).toBe(true);
  });

  it("shows rental and maintenance operations without management metrics", () => {
    const roles = ["rental_maintenance_employee"] as const;
    expect(allowedActivityTypes(roles)).toEqual(["all", "rental", "maintenance"]);
    expect(getDashboardData(baseQuery, roles).metrics.some((metric) => metric.key === "sales")).toBe(false);
    expect(dashboardVisibility(roles)).toMatchObject({ activeRentals: true, maintenance: true, branchPerformance: false });
  });

  it("shows technician workload with spare-part stock only", () => {
    const model = getDashboardData({ ...baseQuery, type: "maintenance" }, ["maintenance_technician"]);
    expect(resolveDashboardMode(["maintenance_technician"])).toBe("technician");
    expect(dashboardVisibility(["maintenance_technician"])).toMatchObject({ maintenance: true, rentalUtilization: false });
    expect(model.metrics.map((metric) => metric.key)).toEqual(["faults", "repairing", "ready", "parts"]);
    expect(model.stock.every((item) => item.category === "spare_part")).toBe(true);
  });

  it("unions multiple operational roles and applies activity filters", () => {
    const roles = ["sales_employee", "maintenance_technician"] as const;
    expect(resolveDashboardMode(roles)).toBe("combined");
    expect(allowedActivityTypes(roles)).toEqual(["all", "sales", "maintenance"]);
    const filtered = getDashboardData({ ...baseQuery, type: "maintenance" }, roles);
    expect(filtered.metrics.map((metric) => metric.key)).toEqual(["faults", "repairing", "ready", "parts"]);
    expect(new Set(filtered.stock.map((item) => item.category))).toEqual(new Set(["sale_game", "spare_part"]));
  });

  it("changes deterministic totals with period and branch filters", () => {
    const todayAll = getDashboardData(baseQuery, ["owner"]);
    const monthMain = getDashboardData({ ...baseQuery, period: "month", branchId: "main" }, ["owner"]);
    expect(monthMain.metrics[0].value).not.toBe(todayAll.metrics[0].value);
    expect(monthMain.branches).toHaveLength(1);
    expect(monthMain.branches[0].id).toBe("main");
  });
});

describe("metric visual rules", () => {
  it("does not render a sparkline for the cash metric", () => {
    const cash = getDashboardData(baseQuery, ["owner"]).metrics.find((metric) => metric.key === "cash");
    render(MetricCard({ metric: cash! }));
    expect(screen.queryByTestId("dashboard-sparkline")).not.toBeInTheDocument();
  });

  it("uses the correct trend color hook and no endpoint dot", () => {
    const metric = getDashboardData(baseQuery, ["owner"]).metrics[0];
    const { container } = render(MetricCard({ metric }));
    expect(screen.getByTestId("dashboard-sparkline")).toHaveAttribute("data-trend", "up");
    expect(container.querySelector("[data-testid='dashboard-sparkline'] circle")).toBeNull();
  });
});
