import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: [
      "tests/permissions/**/*.spec.{ts,tsx}",
      "tests/component/**/*.spec.{ts,tsx}",
      "features/dashboard/tests/**/*.spec.{ts,tsx}",
      "features/customers/tests/**/*.spec.{ts,tsx}",
      "features/branches/tests/**/*.spec.{ts,tsx}",
      "features/employees/tests/**/*.spec.{ts,tsx}",
      "features/attendance/tests/**/*.spec.{ts,tsx}",
      "features/rentals/tests/**/*.spec.{ts,tsx}",
      "features/rental-assets/tests/**/*.spec.{ts,tsx}",
      "features/products/tests/**/*.spec.{ts,tsx}",
      "features/sales/tests/**/*.spec.{ts,tsx}",
      "features/maintenance/tests/**/*.spec.{ts,tsx}",
      "features/inventory/tests/**/*.spec.{ts,tsx}",
      "features/transfers/tests/**/*.spec.{ts,tsx}",
      "features/branch-needs/tests/**/*.spec.{ts,tsx}",
      "features/finance/tests/**/*.spec.{ts,tsx}",
      "features/shifts/tests/**/*.spec.{ts,tsx}",
      "features/expenses/tests/**/*.spec.{ts,tsx}",
      "features/payroll/tests/**/*.spec.{ts,tsx}",
      "features/reports/tests/**/*.spec.{ts,tsx}",
      "features/notifications/tests/**/*.spec.{ts,tsx}",
      "features/audit-log/tests/**/*.spec.{ts,tsx}",
      "features/settings/tests/**/*.spec.{ts,tsx}",
    ],
  },
});
