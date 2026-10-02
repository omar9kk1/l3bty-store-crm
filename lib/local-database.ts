import "server-only";

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { LocalDatabaseSnapshot, LocalDataKey } from "./local-data-contract";
import { LOCAL_DATA_DOMAINS } from "./local-data-contract";

const dataDirectory = join(process.cwd(), ".data");
const databasePath = join(dataDirectory, "l3bty-local.sqlite");

function openDatabase() {
  mkdirSync(dataDirectory, { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_snapshots (
      domain TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS branches (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS employees (id TEXT PRIMARY KEY, employee_number TEXT NOT NULL UNIQUE, name TEXT NOT NULL, primary_branch_id TEXT, status TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS employees_primary_branch_idx ON employees(primary_branch_id);
    CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, customer_number TEXT NOT NULL UNIQUE, name TEXT NOT NULL, primary_phone TEXT NOT NULL UNIQUE, preferred_branch_id TEXT, status TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS customers_branch_idx ON customers(preferred_branch_id);
    CREATE TABLE IF NOT EXISTS cashboxes (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, branch_id TEXT NOT NULL, status TEXT NOT NULL, current_balance REAL NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS cashboxes_branch_idx ON cashboxes(branch_id);
    CREATE TABLE IF NOT EXISTS shifts (id TEXT PRIMARY KEY, shift_number TEXT NOT NULL UNIQUE, employee_id TEXT NOT NULL, branch_id TEXT NOT NULL, cashbox_id TEXT NOT NULL, status TEXT NOT NULL, opened_at TEXT NOT NULL, closed_at TEXT, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS shifts_scope_idx ON shifts(branch_id, employee_id, status);
    CREATE TABLE IF NOT EXISTS rental_assets (id TEXT PRIMARY KEY, asset_number TEXT NOT NULL UNIQUE, barcode TEXT, name TEXT NOT NULL, branch_id TEXT NOT NULL, status TEXT NOT NULL, current_rental_id TEXT, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS rental_assets_branch_status_idx ON rental_assets(branch_id, status);
    CREATE TABLE IF NOT EXISTS rentals (id TEXT PRIMARY KEY, rental_number TEXT NOT NULL UNIQUE, customer_id TEXT NOT NULL, asset_id TEXT NOT NULL, branch_id TEXT NOT NULL, employee_id TEXT NOT NULL, shift_id TEXT, status TEXT NOT NULL, started_at TEXT, closed_at TEXT, current_amount REAL NOT NULL, paid_amount REAL NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS rentals_active_scope_idx ON rentals(branch_id, status, asset_id);
    CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, payment_number TEXT NOT NULL UNIQUE, branch_id TEXT NOT NULL, cashbox_id TEXT NOT NULL, shift_id TEXT, customer_id TEXT, source_type TEXT NOT NULL, source_id TEXT NOT NULL, direction TEXT NOT NULL, amount REAL NOT NULL, status TEXT NOT NULL, paid_at TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS payments_source_idx ON payments(source_type, source_id);
    CREATE INDEX IF NOT EXISTS payments_shift_idx ON payments(shift_id, status);
  `);
  database.prepare("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES(1, ?)").run(new Date().toISOString());
  return database;
}

const globalDatabase = globalThis as typeof globalThis & { __l3btyLocalDatabase?: DatabaseSync };
const database = globalDatabase.__l3btyLocalDatabase ?? openDatabase();
if (process.env.NODE_ENV !== "production") globalDatabase.__l3btyLocalDatabase = database;

function asRecords(value: unknown, key: string) {
  if (!value || typeof value !== "object") return [] as Record<string, unknown>[];
  const records = (value as Record<string, unknown>)[key];
  return Array.isArray(records) ? records.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
}

function text(record: Record<string, unknown>, key: string) { const value = record[key]; return typeof value === "string" ? value : ""; }
function number(record: Record<string, unknown>, key: string) { const value = record[key]; return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function nullableText(record: Record<string, unknown>, key: string) { const value = text(record, key); return value || null; }

function mirrorDomain(key: LocalDataKey, data: unknown, now: string) {
  const payload = (record: Record<string, unknown>) => JSON.stringify(record);
  if (key === LOCAL_DATA_DOMAINS.branches) database.exec("DELETE FROM branches");
  if (key === LOCAL_DATA_DOMAINS.employees) database.exec("DELETE FROM employees");
  if (key === LOCAL_DATA_DOMAINS.customers) database.exec("DELETE FROM customers");
  if (key === LOCAL_DATA_DOMAINS.finance) database.exec("DELETE FROM payments; DELETE FROM cashboxes");
  if (key === LOCAL_DATA_DOMAINS.shifts) database.exec("DELETE FROM shifts");
  if (key === LOCAL_DATA_DOMAINS.rentals) database.exec("DELETE FROM rentals; DELETE FROM rental_assets");
  if (key === LOCAL_DATA_DOMAINS.branches) for (const item of asRecords(data, "branches")) database.prepare("INSERT INTO branches(id,code,name,status,payload,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET code=excluded.code,name=excluded.name,status=excluded.status,payload=excluded.payload,updated_at=excluded.updated_at").run(text(item,"id"),text(item,"code"),text(item,"name"),text(item,"status"),payload(item),now);
  if (key === LOCAL_DATA_DOMAINS.employees) for (const item of asRecords(data, "employees")) database.prepare("INSERT INTO employees(id,employee_number,name,primary_branch_id,status,payload,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET employee_number=excluded.employee_number,name=excluded.name,primary_branch_id=excluded.primary_branch_id,status=excluded.status,payload=excluded.payload,updated_at=excluded.updated_at").run(text(item,"id"),text(item,"employeeNumber"),text(item,"name"),nullableText(item,"primaryBranchId"),text(item,"status"),payload(item),now);
  if (key === LOCAL_DATA_DOMAINS.customers) for (const item of asRecords(data, "customers")) database.prepare("INSERT INTO customers(id,customer_number,name,primary_phone,preferred_branch_id,status,payload,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET customer_number=excluded.customer_number,name=excluded.name,primary_phone=excluded.primary_phone,preferred_branch_id=excluded.preferred_branch_id,status=excluded.status,payload=excluded.payload,updated_at=excluded.updated_at").run(text(item,"id"),text(item,"customerNumber"),text(item,"name"),text(item,"primaryPhone"),nullableText(item,"preferredBranchId"),text(item,"status"),payload(item),now);
  if (key === LOCAL_DATA_DOMAINS.finance) {
    for (const item of asRecords(data, "cashboxes")) database.prepare("INSERT INTO cashboxes(id,code,name,branch_id,status,current_balance,payload,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET code=excluded.code,name=excluded.name,branch_id=excluded.branch_id,status=excluded.status,current_balance=excluded.current_balance,payload=excluded.payload,updated_at=excluded.updated_at").run(text(item,"id"),text(item,"code"),text(item,"name"),text(item,"branchId"),text(item,"status"),number(item,"currentBalance"),payload(item),now);
    for (const item of asRecords(data, "payments")) database.prepare("INSERT INTO payments(id,payment_number,branch_id,cashbox_id,shift_id,customer_id,source_type,source_id,direction,amount,status,paid_at,payload,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET payment_number=excluded.payment_number,branch_id=excluded.branch_id,cashbox_id=excluded.cashbox_id,shift_id=excluded.shift_id,customer_id=excluded.customer_id,source_type=excluded.source_type,source_id=excluded.source_id,direction=excluded.direction,amount=excluded.amount,status=excluded.status,paid_at=excluded.paid_at,payload=excluded.payload,updated_at=excluded.updated_at").run(text(item,"id"),text(item,"paymentNumber"),text(item,"branchId"),text(item,"cashboxId"),nullableText(item,"shiftId"),nullableText(item,"customerId"),text(item,"sourceType"),text(item,"sourceId"),text(item,"direction"),number(item,"amount"),text(item,"status"),text(item,"paidAt"),payload(item),now);
  }
  if (key === LOCAL_DATA_DOMAINS.shifts) for (const item of asRecords(data, "shifts")) database.prepare("INSERT INTO shifts(id,shift_number,employee_id,branch_id,cashbox_id,status,opened_at,closed_at,payload,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET shift_number=excluded.shift_number,employee_id=excluded.employee_id,branch_id=excluded.branch_id,cashbox_id=excluded.cashbox_id,status=excluded.status,opened_at=excluded.opened_at,closed_at=excluded.closed_at,payload=excluded.payload,updated_at=excluded.updated_at").run(text(item,"id"),text(item,"shiftNumber"),text(item,"employeeId"),text(item,"branchId"),text(item,"cashboxId"),text(item,"status"),text(item,"openedAt"),nullableText(item,"closedAt"),payload(item),now);
  if (key === LOCAL_DATA_DOMAINS.rentals) {
    for (const item of asRecords(data, "assets")) database.prepare("INSERT INTO rental_assets(id,asset_number,barcode,name,branch_id,status,current_rental_id,payload,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET asset_number=excluded.asset_number,barcode=excluded.barcode,name=excluded.name,branch_id=excluded.branch_id,status=excluded.status,current_rental_id=excluded.current_rental_id,payload=excluded.payload,updated_at=excluded.updated_at").run(text(item,"id"),text(item,"assetNumber"),nullableText(item,"barcode"),text(item,"name"),text(item,"branchId"),text(item,"status"),nullableText(item,"currentRentalId"),payload(item),now);
    for (const item of asRecords(data, "rentals")) database.prepare("INSERT INTO rentals(id,rental_number,customer_id,asset_id,branch_id,employee_id,shift_id,status,started_at,closed_at,current_amount,paid_amount,payload,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET rental_number=excluded.rental_number,customer_id=excluded.customer_id,asset_id=excluded.asset_id,branch_id=excluded.branch_id,employee_id=excluded.employee_id,shift_id=excluded.shift_id,status=excluded.status,started_at=excluded.started_at,closed_at=excluded.closed_at,current_amount=excluded.current_amount,paid_amount=excluded.paid_amount,payload=excluded.payload,updated_at=excluded.updated_at").run(text(item,"id"),text(item,"rentalNumber"),text(item,"customerId"),text(item,"assetId"),text(item,"branchId"),text(item,"employeeId"),nullableText(item,"collectionShiftId"),text(item,"status"),nullableText(item,"startedAt"),nullableText(item,"closedAt"),number(item,"currentAmount"),number(item,"paidAmount"),payload(item),now);
  }
}

export function getLocalDatabaseSnapshots(): LocalDatabaseSnapshot[] {
  return database.prepare("SELECT domain, version, payload, updated_at FROM app_snapshots ORDER BY domain").all().map((row) => ({ key:String(row.domain) as LocalDataKey,version:Number(row.version),data:JSON.parse(String(row.payload)),updatedAt:String(row.updated_at) }));
}

export function putLocalDatabaseSnapshot(key: LocalDataKey, version: number, data: unknown) {
  const now = new Date().toISOString();
  const serialized = JSON.stringify(data);
  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare("INSERT INTO app_snapshots(domain,version,payload,updated_at) VALUES(?,?,?,?) ON CONFLICT(domain) DO UPDATE SET version=excluded.version,payload=excluded.payload,updated_at=excluded.updated_at").run(key,version,serialized,now);
    mirrorDomain(key, data, now);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
  return { key, version, updatedAt: now };
}

export function getLocalDatabasePath() { return databasePath; }
