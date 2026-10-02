import { RENTAL_ASSET_FIXTURES } from "@/features/rental-assets/fixtures";
import type { RentalAsset, RentalAssetCondition, RentalAssetStatus } from "@/features/rental-assets/types";
import { RENTAL_FIXTURES } from "../fixtures";
import { getShiftSnapshot } from "@/features/shifts/services/shift-store";
import { recordPayment } from "@/features/finance/services/finance-store";
import { registerCustomerActivity } from "@/features/customers/services/customer-store";
import { persistLocalDatabaseSnapshot } from "@/lib/local-test-data";
import type { NewRentalInput, Rental, RentalReminderNotification, RentalReminderStatus } from "../types";
import { evaluateFiveMinuteReminder } from "./rental-reminder-service";
import { MOCK_SERVER_TIME, addMinutes, calculateFixedAmount, calculateRentalLiveAmount, canExtendRental, currentMockServerIso, resetMockServerClock, resolveDurationMinutes, validateRentalStart } from "./rental-rules";

let rentals: readonly Rental[] = [];
let assets: readonly RentalAsset[] = [];
let rentalNotifications: readonly RentalReminderNotification[] = [];
let sequence = 110;
let snapshot = { rentals, assets, rentalNotifications };
const serverSnapshot = snapshot;
let hydratedFromStorage = false;
let storageListenerAttached = false;
const listeners = new Set<() => void>();

export const RENTAL_STORE_STORAGE_KEY = "l3bty-rental-store-v1";
const RENTAL_STORE_VERSION = 4 as const;

type PersistedRentalStore = {
  version: typeof RENTAL_STORE_VERSION;
  rentals: Rental[];
  assets: RentalAsset[];
  rentalNotifications: RentalReminderNotification[];
  sequence: number;
};

function cloneRental(item: Rental): Rental { return { ...item, events: item.events.map((event) => ({ ...event })) }; }
function normalizeRentalPayment(item: Rental): Rental {
  const rental = cloneRental(item);
  if (canExtendRental(rental) && rental.durationType === "open_time") return { ...rental,paidAmount:0 };
  if (canExtendRental(rental) && rental.durationType !== "open_time" && rental.paidAmount < rental.quotedAmount) return { ...rental,paidAmount:rental.quotedAmount };
  if (rental.status === "completed" && rental.paidAmount < rental.currentAmount) return { ...rental,paidAmount:rental.currentAmount };
  return rental;
}
function cloneAsset(item: RentalAsset): RentalAsset { return { ...item, statusHistory: item.statusHistory.map((event) => ({ ...event })) }; }
function persistRentalStore() {
  if (typeof window === "undefined") return;
  const persisted: PersistedRentalStore = { version:RENTAL_STORE_VERSION,rentals:rentals.map(cloneRental),assets:assets.map(cloneAsset),rentalNotifications:rentalNotifications.map((item) => ({ ...item })),sequence };
  try { window.localStorage.setItem(RENTAL_STORE_STORAGE_KEY, JSON.stringify(persisted)); } catch { /* Storage may be unavailable in private or restricted browser contexts. */ }
  persistLocalDatabaseSnapshot(RENTAL_STORE_STORAGE_KEY, RENTAL_STORE_VERSION, { rentals:persisted.rentals,assets:persisted.assets,rentalNotifications:persisted.rentalNotifications,sequence:persisted.sequence });
}
function emit(persist = true) { snapshot = { rentals, assets, rentalNotifications }; if (persist) persistRentalStore(); listeners.forEach((listener) => listener()); }
function reminderEventType(status: RentalReminderStatus): Rental["events"][number]["type"] {
  if (status === "opened") return "reminder_opened";
  if (status === "sent_manually") return "reminder_sent_manually";
  if (status === "failed_to_open") return "reminder_failed_to_open";
  if (status === "customer_phone_missing") return "reminder_phone_missing";
  return "reminder_skipped";
}

function applyPersistedRentalStore(raw: string | null) {
  if (!raw) return false;
  try {
    const stored = JSON.parse(raw) as Omit<Partial<PersistedRentalStore>, "version"> & { version?: number };
    if (stored.version !== RENTAL_STORE_VERSION || !Array.isArray(stored.rentals) || !Array.isArray(stored.assets) || !Array.isArray(stored.rentalNotifications) || !Number.isSafeInteger(stored.sequence)) return false;
    rentals = stored.rentals.map(normalizeRentalPayment);
    assets = stored.assets.map(cloneAsset);
    rentalNotifications = stored.rentalNotifications.map((item) => ({ ...item }));
    sequence = stored.sequence!;
    emit(false);
    return true;
  } catch { return false; }
}
export function refreshRentalStoreFromStorage() {
  if (typeof window === "undefined") return false;
  return applyPersistedRentalStore(window.localStorage.getItem(RENTAL_STORE_STORAGE_KEY));
}
function handleRentalStorage(event: StorageEvent) {
  if (event.key === RENTAL_STORE_STORAGE_KEY) applyPersistedRentalStore(event.newValue);
}
function attachRentalStorageListener() {
  if (storageListenerAttached || typeof window === "undefined") return;
  window.addEventListener("storage", handleRentalStorage);
  storageListenerAttached = true;
}
export function subscribeRentalStore(listener: () => void) {
  hydrateRentalStore();
  attachRentalStorageListener();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function getRentalSnapshot() { return snapshot; }
export function getRentalServerSnapshot() { return serverSnapshot; }
export function hydrateRentalStore() {
  if (hydratedFromStorage || typeof window === "undefined") return false;
  hydratedFromStorage = true;
  return refreshRentalStoreFromStorage();
}
hydrateRentalStore();
export function hasOpenCollectionShift(branchId: string) { return getShiftSnapshot().shifts.some((shift) => shift.branchId === branchId && shift.status === "open"); }

export interface CreateRentalAssetInput {
  name: string;
  assetNumber: string;
  barcode: string;
  category: string;
  branchId: string;
  purchaseDate: string;
  purchaseCost: number;
  notes: string;
}

export function createRentalAsset(input: CreateRentalAssetInput) {
  const name = input.name.trim();
  const barcode = input.barcode.trim().toUpperCase();
  const assetNumber = barcode;
  if (name.length < 2 || !barcode || !input.branchId) return { valid:false,message:"أدخل اسم اللعبة ورقم اللعبة والفرع." };
  if (assets.some((item) => item.assetNumber.toUpperCase() === barcode || item.barcode.toUpperCase() === barcode)) return { valid:false,message:"رقم اللعبة مستخدم بالفعل." };
  const now = new Date().toISOString();
  const asset: RentalAsset = { id:`rental-asset-${sequence++}`,assetNumber,barcode,name,category:input.category.trim()||"ألعاب تأجير",branchId:input.branchId,currentLocationId:input.branchId,status:"available",condition:"good",operatingSeconds:0,purchaseDate:input.purchaseDate,purchaseCost:Math.max(0,input.purchaseCost),currentRentalId:null,lastInspectionAt:now,nextInspectionAt:now,maintenanceStatus:"none",notes:input.notes.trim(),statusHistory:[{id:`asset-created-${sequence++}`,status:"available",at:now,reason:"إضافة أصل تأجير للاختبار"}] };
  assets = [asset, ...assets];
  emit();
  return { valid:true,message:"تمت إضافة لعبة التأجير وأصبحت متاحة.",asset };
}

export function startRental(input: NewRentalInput) {
  const asset = assets.find((item) => item.id === input.assetId);
  const minutes = resolveDurationMinutes(input.durationType, input.customMinutes);
  const active = rentals.some((item) => item.assetId === input.assetId && ["active", "near_end", "additional_time"].includes(item.status));
  const validation = validateRentalStart({ customerId:input.customerId,assetAvailable:asset?.status === "available",activeForAsset:active,hasOpenShift:input.hasOpenShift,price:input.pricePerHour,durationMinutes:minutes });
  if (!validation.valid || !asset) return validation;
  const startedAt = currentMockServerIso();
  const id = `rental-${sequence++}`;
  const amount = minutes === null ? 0 : calculateFixedAmount(minutes, input.pricePerHour);
  if (minutes !== null && input.paidAmount < amount) return { valid:false,message:"يجب تحصيل قيمة التأجير كاملة وإصدار الفاتورة قبل بدء اللعب." };
  const paidAmount = minutes === null ? 0 : input.paidAmount;
  const collectionShift = getShiftSnapshot().shifts.find((shift) => shift.branchId === input.branchId && shift.status === "open");
  if (minutes !== null && collectionShift) {
    const payment = recordPayment({ branchId:input.branchId,cashboxId:collectionShift.cashboxId,shiftId:collectionShift.id,customerId:input.customerId,sourceType:"rental",sourceId:id,amount,parts:[{method:input.paymentMethod === "wallet" ? "electronic_wallet" : input.paymentMethod,amount,reference:id}],employeeId:collectionShift.employeeId,roles:["rental_maintenance_employee"],assignedBranchIds:[input.branchId],idempotencyKey:`rental-start-${id}` });
    if (!payment.valid) return { valid:false as const,message:payment.message };
  }
  const rental: Rental = { id,rentalNumber:`RNT-2026-${sequence}`,customerId:input.customerId,assetId:input.assetId,branchId:input.branchId,employeeId:input.employeeId,status:"active",durationType:input.durationType,durationMinutes:minutes,selectionStartedAt:startedAt,startedAt,expectedEndAt:minutes===null?null:addMinutes(startedAt,minutes),closedAt:null,pricePerHour:input.pricePerHour,quotedAmount:amount,currentAmount:amount,paidAmount,paymentMethod:input.paymentMethod,collectionShiftId:collectionShift?.id??null,workDate:startedAt.slice(0,10),fiveMinuteReminderTriggeredAt:null,reminderStatus:"not_due",events:[{id:`event-${id}-start`,type:"started",at:startedAt,by:input.employeeId,note:minutes===null?"بدأ تأجير الوقت المفتوح والتحصيل عند الإنهاء":"تم الدفع وإصدار الفاتورة ثم بدأ التأجير"}] };
  rentals = [rental, ...rentals];
  registerCustomerActivity(input.customerId, "rental", input.branchId, startedAt);
  assets = assets.map((item) => item.id === asset.id ? { ...item,status:"rented",currentRentalId:id,statusHistory:[{id:`history-${id}`,status:"rented",at:startedAt,reason:"بدء التأجير"},...item.statusHistory] } : item);
  emit();
  return { valid:true,message:"تم بدء التأجير.",rental };
}

export function extendRental(id: string, minutes: number, note: string, approved: boolean) {
  const rental = rentals.find((item) => item.id === id); if (!rental || !canExtendRental(rental)) return { valid:false,message:"لا يمكن تمديد تأجير مغلق." }; if (rental.durationType === "open_time") return { valid:false,message:"الوقت المفتوح لا يحتاج تمديدًا؛ يستمر حتى الإنهاء." }; if ((minutes < 15 || minutes > 60) && !approved) return { valid:false,message:"المدة المخصصة تحتاج Mock Approval إداري." };
  const extra = calculateFixedAmount(minutes, rental.pricePerHour); const extendedAt = currentMockServerIso(); const extensionBase = new Date(Math.max(new Date(rental.expectedEndAt??extendedAt).getTime(),new Date(extendedAt).getTime())).toISOString(); rentals = rentals.map((item) => item.id === id ? { ...item,status:"active",durationMinutes:(item.durationMinutes??0)+minutes,expectedEndAt:addMinutes(extensionBase,minutes),quotedAmount:item.quotedAmount+extra,currentAmount:item.quotedAmount+extra,fiveMinuteReminderTriggeredAt:null,reminderStatus:"not_due",events:[{id:`event-${id}-${sequence++}`,type:"extended",at:extendedAt,by:"المستخدم الحالي",note:note||`تمديد ${minutes} دقيقة`},...item.events] } : item); emit(); return { valid:true,message:"تم التمديد.",extra };
}

export function changeRentalAsset(id: string, nextAssetId: string, actor: string) {
  const rental = rentals.find((item) => item.id === id);
  if (!rental || !canExtendRental(rental)) return { valid:false,message:"لا يمكن تغيير لعبة تأجير مغلق." };
  const currentAsset = assets.find((item) => item.id === rental.assetId);
  const nextAsset = assets.find((item) => item.id === nextAssetId);
  if (!currentAsset) return { valid:false,message:"اللعبة الحالية غير موجودة." };
  if (!nextAsset || nextAsset.id === currentAsset.id) return { valid:false,message:"اختر لعبة أخرى متاحة." };
  if (nextAsset.branchId !== rental.branchId) return { valid:false,message:"اللعبة الجديدة يجب أن تكون في نفس الفرع." };
  if (nextAsset.status !== "available" || nextAsset.currentRentalId) return { valid:false,message:"اللعبة الجديدة لم تعد متاحة." };
  const usedByAnotherRental = rentals.some((item) => item.id !== id && item.assetId === nextAsset.id && canExtendRental(item));
  if (usedByAnotherRental) return { valid:false,message:"اللعبة الجديدة مرتبطة بتأجير نشط آخر." };

  const changedAt = currentMockServerIso();
  const nextStatus: RentalAssetStatus = rental.status === "near_end" ? "near_end" : rental.status === "additional_time" ? "additional_time" : "rented";
  rentals = rentals.map((item) => item.id === id ? {
    ...item,
    assetId: nextAsset.id,
    events: [{
      id:`event-${id}-asset-change-${sequence++}`,
      type:"asset_changed" as const,
      at:changedAt,
      by:actor,
      note:`تم تغيير اللعبة من ${currentAsset.name} إلى ${nextAsset.name} مع استمرار نفس العداد`,
    },...item.events],
  } : item);
  assets = assets.map((item) => {
    if (item.id === currentAsset.id) return {
      ...item,
      status:"available" as const,
      currentRentalId:null,
      statusHistory:[{ id:`history-${id}-released-${sequence++}`,status:"available" as const,at:changedAt,reason:"تغيير اللعبة مع استمرار التأجير" },...item.statusHistory],
    };
    if (item.id === nextAsset.id) return {
      ...item,
      status:nextStatus,
      currentRentalId:id,
      statusHistory:[{ id:`history-${id}-assigned-${sequence++}`,status:nextStatus,at:changedAt,reason:"استكمال نفس التأجير على لعبة أخرى" },...item.statusHistory],
    };
    return item;
  });
  emit();
  return { valid:true,message:"تم تغيير اللعبة واستمرار نفس الوقت.",rentalId:id,previousAssetId:currentAsset.id,nextAssetId:nextAsset.id };
}

export function closeRental(id: string, condition: RentalAssetCondition, closedAtIso = currentMockServerIso(), receivedNow = 0) {
  const rental = rentals.find((item) => item.id === id);
  if (!rental || !canExtendRental(rental)) return { valid:false,message:"التأجير غير قابل للإنهاء." };
  const finalAmount = calculateRentalLiveAmount(rental, new Date(closedAtIso).getTime());
  const requiredNow = Math.round(Math.max(0, finalAmount - rental.paidAmount) * 100) / 100;
  if (receivedNow < requiredNow) return { valid:false,message:"المبلغ المستلم أقل من إجمالي الفاتورة." };
  const finalPaidAmount = Math.round((rental.paidAmount + receivedNow) * 100) / 100;
  const fullyPaid = finalPaidAmount >= finalAmount;
  const customerChange = Math.round(Math.max(0, finalPaidAmount - finalAmount) * 100) / 100;
  if (requiredNow > 0 && rental.collectionShiftId) {
    const shift = getShiftSnapshot().shifts.find((item) => item.id === rental.collectionShiftId && item.status === "open");
    if (shift) {
      const payment = recordPayment({ branchId:rental.branchId,cashboxId:shift.cashboxId,shiftId:shift.id,customerId:rental.customerId,sourceType:"rental",sourceId:rental.id,amount:requiredNow,parts:[{method:rental.paymentMethod === "wallet" ? "electronic_wallet" : rental.paymentMethod,amount:requiredNow,reference:rental.id}],employeeId:shift.employeeId,roles:["rental_maintenance_employee"],assignedBranchIds:[rental.branchId],idempotencyKey:`rental-close-${rental.id}` });
      if (!payment.valid) return { valid:false as const,message:payment.message };
    }
  }
  rentals = rentals.map((item) => item.id === id ? { ...item,status:"completed",closedAt:closedAtIso,currentAmount:finalAmount,paidAmount:finalPaidAmount,events:[{id:`event-${id}-close`,type:"closed" as const,at:closedAtIso,by:"المستخدم الحالي",note:requiredNow>0?"تم الدفع عند الإنهاء وإصدار الفاتورة":"إنهاء التأجير المدفوع مقدمًا"},...item.events] } : item);
  const nextStatus = condition === "needs_inspection" || condition === "damaged" ? "maintenance" : "available";
  assets = assets.map((item) => item.id === rental.assetId ? { ...item,status:nextStatus,condition,currentRentalId:null,statusHistory:[{id:`history-close-${id}`,status:nextStatus,at:closedAtIso,reason:nextStatus === "maintenance" ? "يحتاج فحصًا بعد الإرجاع" : "إرجاع سليم"},...item.statusHistory] } : item);
  emit();
  return { valid:true,message:"تم إنهاء التأجير وإرجاع حالة الأصل.",finalAmount,fullyPaid,customerChange };
}

export function evaluateRentalReminders(referenceIso = MOCK_SERVER_TIME.referenceIso) {
  let changed = false;
  rentals = rentals.map((rental) => {
    const evaluation = evaluateFiveMinuteReminder(rental, referenceIso);
    if (!evaluation.due || rental.fiveMinuteReminderTriggeredAt) return rental;
    changed = true;
    if (!rentalNotifications.some((item) => item.rentalId === rental.id)) rentalNotifications = [{ id:`rental-reminder-${rental.id}`,rentalId:rental.id,employeeId:rental.employeeId,branchId:rental.branchId,title:"متبقي 5 دقائق",message:`اقترب انتهاء التأجير ${rental.rentalNumber}`,createdAt:referenceIso,read:false },...rentalNotifications];
    return { ...rental,fiveMinuteReminderTriggeredAt:referenceIso,reminderStatus:"due" as const,events:[{id:`event-${rental.id}-reminder-due`,type:"reminder_due" as const,at:referenceIso,by:"mock-reminder-service",note:"ظهر تنبيه الخمس دقائق مرة واحدة"},...rental.events] };
  });
  if (changed) emit();
  return { triggered: changed, notifications: rentalNotifications };
}

export function recordRentalReminderOutcome(id: string, status: Exclude<RentalReminderStatus,"not_due"|"due">, actor: string) {
  let changed = false; rentals = rentals.map((rental) => rental.id === id ? (changed = true, { ...rental,reminderStatus:status,events:[{id:`event-${id}-reminder-${sequence++}`,type:reminderEventType(status),at:MOCK_SERVER_TIME.referenceIso,by:actor,note:status==="opened"?"فتح رابط واتساب للتذكير":status==="sent_manually"?"تأكيد الإرسال اليدوي":status==="customer_phone_missing"?"لا يوجد رقم واتساب صالح":status==="failed_to_open"?"تعذر فتح واتساب":"تم تخطي التذكير"},...rental.events] }) : rental); if (changed) emit(); return { valid:changed,status };
}

export function recordInvoiceWhatsAppOpened(id: string, actor: string) { let changed=false; rentals=rentals.map((rental)=>rental.id===id?(changed=true,{...rental,events:[{id:`event-${id}-invoice-whatsapp-${sequence++}`,type:"invoice_whatsapp_opened",at:MOCK_SERVER_TIME.referenceIso,by:actor,note:"فتح فاتورة التأجير عبر واتساب"},...rental.events]}):rental);if(changed)emit();return{valid:changed}; }
export function setRentalAssetMaintenanceStatus(assetId:string,status:"maintenance"|"out_of_service"|"available",reason:string){const asset=assets.find((item)=>item.id===assetId);if(!asset)return{valid:false,message:"أصل التأجير غير موجود."};const condition:RentalAssetCondition=status==="available"?"good":status==="out_of_service"?"damaged":"needs_inspection";assets=assets.map((item)=>item.id===assetId?{...item,status,condition,maintenanceStatus:status==="maintenance"?"active":status==="available"?"none":item.maintenanceStatus,statusHistory:[{id:`history-maintenance-${sequence++}`,status,at:MOCK_SERVER_TIME.referenceIso,reason},...item.statusHistory]}:item);emit();return{valid:true,message:"تم تحديث حالة أصل التأجير."};}
export function resetRentalStore(){rentals=RENTAL_FIXTURES.map(cloneRental);assets=RENTAL_ASSET_FIXTURES.map(cloneAsset);rentalNotifications=[];sequence=110;hydratedFromStorage=false;resetMockServerClock();if(typeof window!=="undefined"){try{window.localStorage.removeItem(RENTAL_STORE_STORAGE_KEY);}catch{/* Storage may be unavailable in tests. */}}emit(false);}

export function setRentalAssetTransferLocation(assetId:string,action:"dispatch"|"receive",destinationId:string,reason:string){
  const asset=assets.find((item)=>item.id===assetId);if(!asset)return{valid:false,message:"أصل التأجير غير موجود."};
  if(action==="dispatch"&&["rented","near_end","additional_time","selecting","in_transit"].includes(asset.status))return{valid:false,message:"لا يمكن تحويل أصل مؤجر أو مستخدم أو موجود في تحويل نشط."};
  assets=assets.map((item)=>{if(item.id!==assetId)return item;const previous=item.statusHistory.find((entry)=>entry.status!=="in_transit")?.status;const receivedStatus=item.maintenanceStatus==="active"?"maintenance":previous==="out_of_service"?"out_of_service":"available";const status=action==="dispatch"?"in_transit":receivedStatus;return{...item,branchId:action==="receive"?destinationId:item.branchId,currentLocationId:action==="dispatch"?"in_transit":destinationId,status,statusHistory:[{id:`asset-transfer-${sequence++}`,status,at:"2026-08-06T18:00:00+03:00",reason},...item.statusHistory]}});emit();return{valid:true,message:"تم تحديث موقع أصل التأجير."};
}

