import { BRANCH_FIXTURES } from "@/mock-data/branches";
import { readLocalTestData, removeLocalTestData, writeLocalTestData } from "@/lib/local-test-data";
import { getNextBranchCode } from "../schemas/branch-schema";
import type { Branch, BranchFormValues } from "../types";

const STORAGE_KEY = "l3bty-local-branches-v1";
const STORAGE_VERSION = 1;
const cloneBranch = (branch: Branch): Branch => ({ ...branch, kind: branch.type, workingHours: branch.workingHours.map((period) => ({ ...period, days: [...period.days] })) });
const stored = readLocalTestData<{ branches: Branch[]; nextSequence: number }>(STORAGE_KEY, STORAGE_VERSION, { branches: process.env.NODE_ENV === "test" ? BRANCH_FIXTURES.map(cloneBranch) : [], nextSequence: process.env.NODE_ENV === "test" ? BRANCH_FIXTURES.length + 1 : 1 });
let branches: readonly Branch[] = stored.branches.map(cloneBranch);
let nextSequence = stored.nextSequence;
const listeners = new Set<() => void>();

function emit(persist = true) { if (persist) writeLocalTestData(STORAGE_KEY, STORAGE_VERSION, { branches, nextSequence }); listeners.forEach((listener) => listener()); }
export function subscribeBranches(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function getBranchesSnapshot(): readonly (Branch & { kind: NonNullable<Branch["kind"]> })[] {
  return branches as readonly (Branch & { kind: NonNullable<Branch["kind"]> })[];
}

function formToBranchFields(values: BranchFormValues) {
  return {
    code: values.code,
    name: values.name,
    type: values.type,
    status: values.status,
    phone: values.phone,
    alternatePhone: values.alternatePhone,
    address: values.address,
    city: values.city,
    area: values.area,
    latitude: Number(values.latitude),
    longitude: Number(values.longitude),
    geofenceRadiusMeters: Number(values.geofenceRadiusMeters),
    managerEmployeeId: values.managerEmployeeId,
    workingHours: [{ id: "standard-hours", label: "مواعيد العمل الأساسية", days: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"], opensAt: values.opensAt, closesAt: values.closesAt, crossesMidnight: values.crossesMidnight }],
    notes: values.notes,
  };
}

export function createBranch(values: BranchFormValues): Branch {
  const sequence = nextSequence++;
  const generatedValues = { ...values, code: getNextBranchCode(branches) };
  const branch: Branch = {
    id: `branch-${String(sequence).padStart(2, "0")}`,
    kind: values.type,
    ...formToBranchFields(generatedValues),
    timezone: "Africa/Cairo",
    assignedEmployeeCount: 0, warehouseCount: values.type === "central_workshop" ? 1 : 0, cashboxCount: 0,
    activeRentalAssetCount: 0, saleProductCount: 0, openMaintenanceOrderCount: 0, openShiftCount: 0,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    technicianCount: 0, sparePartCount: 0, incomingMaintenanceTransferCount: 0, repairingItemCount: 0, readyReturnCount: 0,
  };
  branches = [branch, ...branches]; emit(); return branch;
}

export function updateBranch(branchId: string, values: BranchFormValues) {
  let updated: Branch | undefined;
  branches = branches.map((branch) => {
    if (branch.id !== branchId) return branch;
    updated = { ...branch, ...formToBranchFields({ ...values, code: branch.code }), updatedAt: new Date().toISOString() };
    return updated;
  });
  if (updated) emit();
  return updated;
}

export function resetBranchStore() {
  branches = BRANCH_FIXTURES.map((branch) => ({ ...branch, workingHours: branch.workingHours.map((period) => ({ ...period, days: [...period.days] })) }));
  nextSequence = BRANCH_FIXTURES.length + 1;
  removeLocalTestData(STORAGE_KEY);
  emit(false);
}
