"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LOCAL_DATA_DOMAINS, LOCAL_DATA_KEYS, type LocalDatabaseSnapshot, type LocalDataKey } from "@/lib/local-data-contract";

const RELOAD_MARKER = "l3bty-sqlite-hydrated";
const CLEAN_SLATE_MARKER = "l3bty-clean-slate-2026-08-15-v1";

function decodeLocal(key: LocalDataKey, raw: string) {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const version = Number(parsed.version);
  if (!Number.isSafeInteger(version) || version < 1) return null;
  if (key === LOCAL_DATA_DOMAINS.rentals) {
    const { version: _version, ...data } = parsed;
    void _version;
    return { version, data };
  }
  return parsed.data === undefined ? null : { version, data: parsed.data };
}

function encodeLocal(snapshot: LocalDatabaseSnapshot) {
  return JSON.stringify(snapshot.key === LOCAL_DATA_DOMAINS.rentals
    ? { version:snapshot.version,...snapshot.data as object }
    : { version:snapshot.version,data:snapshot.data });
}

function hasBusinessRecords(key: LocalDataKey, data: unknown) {
  if (!data || typeof data !== "object") return false;
  const value = data as Record<string, unknown>;
  const keys = key === LOCAL_DATA_DOMAINS.branches ? ["branches"]
    : key === LOCAL_DATA_DOMAINS.employees ? ["employees"]
      : key === LOCAL_DATA_DOMAINS.customers ? ["customers"]
        : key === LOCAL_DATA_DOMAINS.finance ? ["cashboxes", "payments", "vouchers"]
          : key === LOCAL_DATA_DOMAINS.shifts ? ["shifts"]
            : key === LOCAL_DATA_DOMAINS.rentals ? ["rentals", "assets"]
              : key === LOCAL_DATA_DOMAINS.products ? ["products", "stocks", "movements"]
                : key === LOCAL_DATA_DOMAINS.sales ? ["invoices", "returns"]
                  : key === LOCAL_DATA_DOMAINS.maintenance ? ["faults", "orders"]
                    : key === LOCAL_DATA_DOMAINS.inventory ? ["audits", "partIntakes", "restockRequests"]
                      : key === LOCAL_DATA_DOMAINS.transfers ? ["transfers"]
                        : key === LOCAL_DATA_DOMAINS.branchNeeds ? ["requests"]
                        : key === LOCAL_DATA_DOMAINS.attendance ? ["events", "days", "exceptions"]
                          : key === LOCAL_DATA_DOMAINS.expenses ? ["expenses"]
                            : key === LOCAL_DATA_DOMAINS.payroll ? ["runs", "profiles", "advances"]
                              : key === LOCAL_DATA_DOMAINS.notifications ? ["notifications"]
                                : key === LOCAL_DATA_DOMAINS.audit ? ["events"]
                                  : ["snapshots", "deliveries"];
  return keys.some((recordKey) => Array.isArray(value[recordKey]) && value[recordKey].length > 0);
}

async function uploadLocal(key: LocalDataKey, raw: string) {
  const decoded = decodeLocal(key, raw);
  if (!decoded) return;
  await fetch("/api/local-data", { method:"PUT",headers:{ "content-type":"application/json" },body:JSON.stringify({ key,version:decoded.version,data:decoded.data }) });
}

export function LocalDatabaseBridge({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function synchronize() {
      try {
        if (window.localStorage.getItem(CLEAN_SLATE_MARKER) !== "1") {
          LOCAL_DATA_KEYS.forEach((key) => window.localStorage.removeItem(key));
          window.localStorage.setItem(CLEAN_SLATE_MARKER, "1");
        }
        const response = await fetch("/api/local-data", { cache:"no-store" });
        if (!response.ok) throw new Error("database unavailable");
        const result = await response.json() as { snapshots: LocalDatabaseSnapshot[] };
        const remote = new Map(result.snapshots.map((snapshot) => [snapshot.key, snapshot]));
        let restored = false;
        for (const key of LOCAL_DATA_KEYS) {
          const snapshot = remote.get(key);
          const local = window.localStorage.getItem(key);
          if (snapshot) {
            const decodedLocal = local ? decodeLocal(key, local) : null;
            if (decodedLocal && hasBusinessRecords(key, decodedLocal.data) && !hasBusinessRecords(key, snapshot.data)) {
              await uploadLocal(key, local!);
              continue;
            }
            const encoded = encodeLocal(snapshot);
            if (local !== encoded) { window.localStorage.setItem(key, encoded); restored = true; }
          } else if (local) {
            await uploadLocal(key, local);
          }
        }
        if (restored && window.sessionStorage.getItem(RELOAD_MARKER) !== "1") {
          window.sessionStorage.setItem(RELOAD_MARKER, "1");
          window.location.reload();
          return;
        }
        window.sessionStorage.removeItem(RELOAD_MARKER);
      } catch {
        if (!cancelled) setOffline(true);
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void synchronize();
    return () => { cancelled = true; };
  }, []);

  if (!ready) return <main style={{ minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:"var(--font-arabic)" }}>جار تجهيز قاعدة البيانات المحلية…</main>;
  return <>{offline ? <div role="status" style={{ padding:"8px 16px",background:"#fff3cd",color:"#664d03" }}>تعذر الوصول إلى SQLite مؤقتًا؛ تعمل نسخة المتصفح الاحتياطية.</div> : null}{children}</>;
}
