import { getEgyptNowIso } from "@/lib/egypt-time";
import {
  readLocalTestData,
  removeLocalTestData,
  writeLocalTestData,
} from "@/lib/local-test-data";
import type {
  BranchNeedRequest,
  CreateBranchNeedInput,
} from "../types";

const STORAGE_KEY = "l3bty-local-branch-needs-v1";
const STORAGE_VERSION = 1;
const stored = readLocalTestData<{
  requests: BranchNeedRequest[];
  sequence: number;
}>(STORAGE_KEY, STORAGE_VERSION, { requests: [], sequence: 1 });
let requests: readonly BranchNeedRequest[] = stored.requests.map((request) => ({
  ...request,
  transferId: request.transferId ?? null,
}));
let sequence = stored.sequence;
let snapshot = { requests };
const listeners = new Set<() => void>();

function emit() {
  snapshot = { requests };
  writeLocalTestData(STORAGE_KEY, STORAGE_VERSION, { requests, sequence });
  listeners.forEach((listener) => listener());
}

export function subscribeBranchNeeds(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBranchNeedsSnapshot() {
  return snapshot;
}

export function createBranchNeed(input: CreateBranchNeedInput) {
  const itemName = input.itemName.trim();
  const reason = input.reason.trim();
  if (!input.branchId || input.branchId === "all")
    return { valid: false, message: "اختر فرعًا محددًا قبل إرسال الطلب." };
  if (!input.requestedByEmployeeId)
    return { valid: false, message: "اختر الموظف الذي يقدم الطلب." };
  if (!itemName) return { valid: false, message: "اكتب اسم الحاجة المطلوبة." };
  if (!Number.isInteger(input.quantity) || input.quantity < 1)
    return {
      valid: false,
      message: "الكمية يجب أن تكون رقمًا صحيحًا أكبر من صفر.",
    };
  if (!reason) return { valid: false, message: "اكتب سبب الاحتياج." };
  const now = getEgyptNowIso();
  const request: BranchNeedRequest = {
    id: `branch-need-${sequence}`,
    requestNumber: `REQ-${now.slice(0, 4)}-${String(sequence++).padStart(4, "0")}`,
    ...input,
    itemName,
    reason,
    status: "pending",
    managementNote: "",
    reviewedByEmployeeId: null,
    transferId: null,
    createdAt: now,
    updatedAt: now,
  };
  requests = [request, ...requests];
  emit();
  return { valid: true, message: "تم إرسال الطلب للإدارة.", request };
}

export function linkBranchNeedToTransfer(id: string, transferId: string) {
  const request = requests.find((item) => item.id === id);
  if (!request) return { valid: false, message: "طلب الاحتياج غير موجود." };
  if (request.status !== "approved")
    return {
      valid: false,
      message: "يجب اعتماد طلب الاحتياج قبل إنشاء التحويل.",
    };
  if (request.transferId)
    return { valid: false, message: "تم إنشاء تحويل لهذا الطلب بالفعل." };
  const now = getEgyptNowIso();
  requests = requests.map((item) =>
    item.id === id ? { ...item, transferId, updatedAt: now } : item,
  );
  emit();
  return { valid: true, message: "تم ربط التحويل بطلب الاحتياج." };
}

export function completeBranchNeedFromTransfer(id: string, transferId: string) {
  const request = requests.find((item) => item.id === id);
  if (!request || request.transferId !== transferId)
    return { valid: false, message: "لا يوجد طلب احتياج مرتبط بهذا التحويل." };
  const now = getEgyptNowIso();
  requests = requests.map((item) =>
    item.id === id ? { ...item, status: "fulfilled", updatedAt: now } : item,
  );
  emit();
  return {
    valid: true,
    message: "تم تسجيل توفير احتياج الفرع بعد اكتمال الاستلام.",
  };
}

export function unlinkBranchNeedTransfer(id: string, transferId: string) {
  const request = requests.find((item) => item.id === id);
  if (
    !request ||
    request.transferId !== transferId ||
    request.status === "fulfilled"
  )
    return { valid: false, message: "لا يمكن فك ارتباط طلب الاحتياج." };
  const now = getEgyptNowIso();
  requests = requests.map((item) =>
    item.id === id ? { ...item, transferId: null, updatedAt: now } : item,
  );
  emit();
  return { valid: true, message: "يمكن إنشاء تحويل بديل للطلب." };
}

export function reviewBranchNeed(
  id: string,
  status: "approved" | "rejected",
  actorEmployeeId: string,
  note: string,
) {
  const request = requests.find((item) => item.id === id);
  if (!request) return { valid: false, message: "الطلب غير موجود." };
  if (request.status === "fulfilled")
    return { valid: false, message: "تم توفير هذا الطلب بالفعل." };
  if (status === "rejected" && !note.trim())
    return { valid: false, message: "اكتب سبب الرفض." };
  const now = getEgyptNowIso();
  requests = requests.map((item) =>
    item.id === id
      ? {
          ...item,
          status,
          managementNote: note.trim(),
          reviewedByEmployeeId: actorEmployeeId,
          updatedAt: now,
        }
      : item,
  );
  emit();
  return {
    valid: true,
    message: status === "approved" ? "تم اعتماد الطلب." : "تم رفض الطلب.",
  };
}

export function resetBranchNeedsStore() {
  requests = [];
  sequence = 1;
  removeLocalTestData(STORAGE_KEY);
  snapshot = { requests };
  listeners.forEach((listener) => listener());
}
