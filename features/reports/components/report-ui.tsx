"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { useProducts } from "@/features/products/hooks/use-products";
import {
  formatReportDisplayValue,
  formatReportFieldLabel,
  type ReportDisplayLookups,
} from "../services/report-display";
import type { ReportPayload, ReportSnapshot } from "../types";

function useReportDisplayLookups(): ReportDisplayLookups {
  const branches = useBranches();
  const employees = useEmployees();
  const { products } = useProducts();

  return useMemo(
    () => ({
      branches: new Map(branches.map((branch) => [branch.id, branch.name])),
      products: new Map(products.map((product) => [product.id, product.name])),
      employees: new Map(employees.map((employee) => [employee.id, employee.name])),
    }),
    [branches, employees, products],
  );
}

export function ReportPayloadView({ payload }: { payload: ReportPayload }) {
  const lookups = useReportDisplayLookups();

  return (
    <div className="report-payload">
      {payload.sections.map((section) => (
        <section key={section.id}>
          <h3>{section.title}</h3>
          {section.metrics.length ? (
            <div className="report-metrics">
              {section.metrics.map((item) => (
                <Card key={item.key}>
                  <span>{item.label}</span>
                  <strong>{item.value} {item.unit}</strong>
                  <small>{item.description}</small>
                </Card>
              ))}
            </div>
          ) : null}
          {section.rows.length ? (
            <>
              <div className="report-table-wrap">
                <table>
                  <thead>
                    <tr>
                      {Object.keys(section.rows[0]).map((key) => (
                        <th key={key}>{formatReportFieldLabel(key)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row, index) => (
                      <tr key={index}>
                        {Object.entries(row).map(([key, value]) => (
                          <td key={key}>{formatReportDisplayValue(key, value, lookups)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="report-mobile-rows">
                {section.rows.map((row, index) => (
                  <Card key={index}>
                    {Object.entries(row).map(([key, value]) => (
                      <p key={key}>
                        <span>{formatReportFieldLabel(key)}</span>
                        <strong>{formatReportDisplayValue(key, value, lookups)}</strong>
                      </p>
                    ))}
                  </Card>
                ))}
              </div>
            </>
          ) : null}
          <p className="report-text-alternative">{section.summaryText}</p>
        </section>
      ))}
    </div>
  );
}

export function SnapshotBadge({ snapshot }: { snapshot: ReportSnapshot }) {
  return (
    <Badge tone={snapshot.status === "sent" ? "success" : "info"}>
      {formatReportDisplayValue("status", snapshot.status)}
    </Badge>
  );
}
