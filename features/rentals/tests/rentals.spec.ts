import { beforeEach, describe, expect, it } from "vitest";
import { RENTAL_ASSET_FIXTURES } from "@/features/rental-assets/fixtures";
import { RENTAL_FIXTURES } from "../fixtures";
import { canAccessRentalBranch, canManageRentals, canOperateRentals, canSendRentalWhatsApp, canUseRentalAdministrativeFilters, canViewRentals } from "../permissions";
import { evaluateFiveMinuteReminder } from "../services/rental-reminder-service";
import { addMinutes, calculateFixedAmount, calculateOpenAmount, calculateOpenSeconds, calculateOpenShiftRentalCollections, calculateRentalLiveAmount, calculateRentalSettlement, canExtendRental, DEFAULT_RENTAL_PRICE_PER_HOUR, isRentalEndingSoon, isRentalInCurrentShift, MOCK_SERVER_TIME, RENTAL_END_ALERT_SECONDS, selectionElapsedBillableSeconds, validateRentalStart } from "../services/rental-rules";
import { changeRentalAsset, closeRental, evaluateRentalReminders, extendRental, getRentalSnapshot, hasOpenCollectionShift, hydrateRentalStore, refreshRentalStoreFromStorage, RENTAL_STORE_STORAGE_KEY, resetRentalStore, startRental } from "../services/rental-store";
import { browserRentalWhatsAppService } from "../services/rental-whatsapp-service";

const input = { customerId: "customer-001", assetId: "asset-scooter-01", branchId: "main", employeeId: "employee-rental", durationType: "fixed_30" as const, customMinutes: 30, pricePerHour: 120, paidAmount: 60, paymentMethod: "cash" as const, hasOpenShift: true };

describe("rental rules", () => {
  beforeEach(resetRentalStore);
  it("requires customer and open collection shift", () => {
    expect(validateRentalStart({ ...input, assetAvailable: true, activeForAsset: false, price: 120, durationMinutes: 30, customerId: "" }).valid).toBe(false);
    expect(validateRentalStart({ ...input, assetAvailable: true, activeForAsset: false, price: 120, durationMinutes: 30, hasOpenShift: false }).valid).toBe(false);
    expect(hasOpenCollectionShift("main")).toBe(false);
    expect(hasOpenCollectionShift("branch-3")).toBe(false);
  });
  it("keeps selection time free", () => expect(selectionElapsedBillableSeconds()).toBe(0));
  it("turns the rental timer red from exactly two minutes remaining", () => {
    expect(RENTAL_END_ALERT_SECONDS).toBe(120);
    expect(isRentalEndingSoon(121)).toBe(false);
    expect(isRentalEndingSoon(120)).toBe(true);
    expect(isRentalEndingSoon(1)).toBe(true);
    expect(isRentalEndingSoon(0)).toBe(true);
    expect(isRentalEndingSoon(-1)).toBe(false);
  });
  it("charges 50 EGP for every 15 minutes in new rentals", () => {
    expect(calculateFixedAmount(15, DEFAULT_RENTAL_PRICE_PER_HOUR)).toBe(50);
    expect(calculateFixedAmount(30, DEFAULT_RENTAL_PRICE_PER_HOUR)).toBe(100);
    expect(calculateFixedAmount(45, DEFAULT_RENTAL_PRICE_PER_HOUR)).toBe(150);
    expect(calculateFixedAmount(60, DEFAULT_RENTAL_PRICE_PER_HOUR)).toBe(200);
  });
  it("calculates fixed and open time precisely", () => {
    expect(calculateFixedAmount(30, 120)).toBe(60);
    const seconds = calculateOpenSeconds("2026-08-06T15:42:18+03:00");
    expect(seconds).toBe(2862);
    expect(calculateOpenAmount(seconds, 180)).toBe(143.1);
  });
  it("starts only available asset once", () => {
    expect(startRental(input).valid).toBe(true);
    expect(startRental(input).valid).toBe(false);
    expect(getRentalSnapshot().assets.find((asset) => asset.id === input.assetId)?.status).toBe("rented");
  });
  it("blocks unavailable asset", () => expect(startRental({ ...input, assetId: "asset-race-workshop" }).valid).toBe(false));
  it("prevents extending a closed rental", () => expect(extendRental("rental-completed", 15, "", true).valid).toBe(false));
  it("prevents extending an open-time rental", () => expect(extendRental("rental-open", 15, "", true)).toMatchObject({ valid: false, message: "الوقت المفتوح لا يحتاج تمديدًا؛ يستمر حتى الإنهاء." }));
  it("changes the game while preserving the same rental time and price", () => {
    const before = getRentalSnapshot().rentals.find((rental) => rental.id === "rental-open")!;
    const result = changeRentalAsset("rental-open", "asset-drift-branch-2", "employee-rental");
    expect(result.valid).toBe(true);
    const after = getRentalSnapshot().rentals.find((rental) => rental.id === "rental-open")!;
    expect(after.assetId).toBe("asset-drift-branch-2");
    expect(after.startedAt).toBe(before.startedAt);
    expect(after.expectedEndAt).toBe(before.expectedEndAt);
    expect(after.currentAmount).toBe(before.currentAmount);
    expect(after.rentalNumber).toBe(before.rentalNumber);
    expect(after.events[0]).toMatchObject({ type: "asset_changed", by: "employee-rental" });
    expect(getRentalSnapshot().assets.find((asset) => asset.id === "asset-hoverboard-01")).toMatchObject({ status: "available", currentRentalId: null });
    expect(getRentalSnapshot().assets.find((asset) => asset.id === "asset-drift-branch-2")).toMatchObject({ status: "rented", currentRentalId: "rental-open" });
  });

  it("closes open time at the live amount", () => {
    const started = startRental({ ...input, durationType: "open_time", pricePerHour: DEFAULT_RENTAL_PRICE_PER_HOUR });
    expect(started.valid).toBe(true);
    const closedAt = addMinutes(started.rental!.startedAt!, 15);
    const result = closeRental(started.rental!.id, "good", closedAt, 50);
    expect(result.valid).toBe(true);
    expect(result.finalAmount).toBe(50);
    expect(getRentalSnapshot().rentals.find((rental) => rental.id === started.rental!.id)?.currentAmount).toBe(50);
  });
  it("closes and restores asset state", () => {
    startRental(input);
    const created = getRentalSnapshot().rentals[0];
    const rentalCountBeforeClose = getRentalSnapshot().rentals.length;
    expect(closeRental(created.id, "good").valid).toBe(true);
    const afterClose = getRentalSnapshot();
    expect(afterClose.rentals).toHaveLength(rentalCountBeforeClose);
    expect(afterClose.rentals.find((rental) => rental.id === created.id)).toMatchObject({
      status: "completed",
      assetId: input.assetId,
    });
    expect(afterClose.rentals.filter((rental) => rental.assetId === input.assetId && canExtendRental(rental))).toHaveLength(0);
    expect(afterClose.assets.find((asset) => asset.id === input.assetId)).toMatchObject({
      status: "available",
      currentRentalId: null,
    });
    expect(closeRental(created.id, "good").valid).toBe(false);
    expect(getRentalSnapshot().rentals).toHaveLength(rentalCountBeforeClose);
  });
  it("requires full payment before starting a fixed rental", () => {
    expect(startRental({ ...input, paidAmount: 59 }).valid).toBe(false);
    expect(startRental({ ...input, paidAmount: 60 }).valid).toBe(true);
  });
  it("keeps open-time payment at zero until ending", () => {
    const result = startRental({ ...input, durationType: "open_time", paidAmount: 500 });
    expect(result.valid).toBe(true);
    expect(result.rental?.paidAmount).toBe(0);
  });
  it("collects payment before issuing the open-time invoice", () => {
    const started = startRental({ ...input, durationType: "open_time", pricePerHour: DEFAULT_RENTAL_PRICE_PER_HOUR, paidAmount: 0 });
    const closedAt = addMinutes(started.rental!.startedAt!, 15);
    expect(closeRental(started.rental!.id, "good", closedAt, 50)).toMatchObject({ valid: true, finalAmount: 50, fullyPaid: true, customerChange: 0 });
    expect(getRentalSnapshot().rentals.find((rental) => rental.id === started.rental!.id)).toMatchObject({ currentAmount: 50, paidAmount: 50 });
  });
  it("records money received and customer change at open-time checkout", () => {
    const started = startRental({ ...input, durationType: "open_time", paidAmount: 0 });
    const closedAt = addMinutes(started.rental!.startedAt!, 15);
    expect(closeRental(started.rental!.id, "good", closedAt, 200)).toMatchObject({ valid: true, finalAmount: 30, customerChange: 170 });
    expect(getRentalSnapshot().rentals.find((rental) => rental.id === started.rental!.id)?.paidAmount).toBe(200);
  });
  it("separates the amount due from the change returned to the customer", () => {
    expect(calculateRentalSettlement(33.78, 200)).toEqual({ amountDue: 0, customerChange: 166.22 });
    expect(calculateRentalSettlement(210, 200)).toEqual({ amountDue: 10, customerChange: 0 });
  });
  it("does not add time or money after expiry without an explicit extension", () => {
    const started = startRental({ ...input, durationType: "fixed_15", pricePerHour: DEFAULT_RENTAL_PRICE_PER_HOUR });
    const rental = started.rental!;
    const expectedEndMs = new Date(rental.expectedEndAt!).getTime();

    expect(calculateRentalLiveAmount(rental, expectedEndMs + 59_000)).toBe(50);
    expect(calculateRentalLiveAmount(rental, expectedEndMs + 60_000)).toBe(50);
    expect(calculateRentalLiveAmount(rental, expectedEndMs + 6 * 60_000 + 1_000)).toBe(50);

    expect(closeRental(rental.id, "good", new Date(expectedEndMs + 6 * 60_000 + 1_000).toISOString()).finalAmount).toBe(50);
    expect(getRentalSnapshot().rentals.find((item) => item.id === rental.id)?.currentAmount).toBe(50);
  });
  it("adds price only after choosing extension and returns the rental to active", () => {
    const result = extendRental("rental-overtime", 15, "اختار الموظف التمديد", true);
    expect(result).toMatchObject({ valid: true, extra: 25 });
    expect(getRentalSnapshot().rentals.find((item) => item.id === "rental-overtime")).toMatchObject({ status: "active", quotedAmount: 100, currentAmount: 100 });
  });
  it("sends assets that need inspection to maintenance", () => {
    expect(closeRental("rental-active-15", "needs_inspection").valid).toBe(true);
    expect(getRentalSnapshot().assets.find((asset) => asset.id === "asset-drift-01")?.status).toBe("maintenance");
  });
  it("closes only the selected rental", () => {
    const activeBefore = getRentalSnapshot().rentals.filter(canExtendRental).length;
    expect(closeRental("rental-open", "good", MOCK_SERVER_TIME.referenceIso, 143.1).valid).toBe(true);
    const after = getRentalSnapshot();

    expect(after.rentals.find((rental) => rental.id === "rental-open")?.status).toBe("completed");
    expect(after.rentals.filter(canExtendRental)).toHaveLength(activeBefore - 1);
    expect(after.rentals.find((rental) => rental.id === "rental-active-15")?.status).not.toBe("completed");
  });
  it("restores created and closed rentals after a browser reload", () => {
    const started = startRental(input);
    expect(started.valid).toBe(true);
    expect(closeRental(started.rental!.id, "good", MOCK_SERVER_TIME.referenceIso).valid).toBe(true);
    const persisted = window.localStorage.getItem(RENTAL_STORE_STORAGE_KEY);
    const rentalCount = getRentalSnapshot().rentals.length;
    const activeCount = getRentalSnapshot().rentals.filter(canExtendRental).length;

    resetRentalStore();
    window.localStorage.setItem(RENTAL_STORE_STORAGE_KEY, persisted!);
    expect(hydrateRentalStore()).toBe(true);

    const restored = getRentalSnapshot();
    expect(restored.rentals).toHaveLength(rentalCount);
    expect(restored.rentals.find((rental) => rental.id === started.rental!.id)?.status).toBe("completed");
    expect(restored.rentals.filter(canExtendRental)).toHaveLength(activeCount);
  });
  it("refreshes rentals written by another browser tab", () => {
    const started = startRental(input);
    const persisted = window.localStorage.getItem(RENTAL_STORE_STORAGE_KEY);

    resetRentalStore();
    window.localStorage.setItem(RENTAL_STORE_STORAGE_KEY, persisted!);
    expect(refreshRentalStoreFromStorage()).toBe(true);
    expect(getRentalSnapshot().rentals.some((item) => item.id === started.rental!.id)).toBe(true);
  });
});

describe("approved electric rental assets", () => {
  it("uses only electric children rides in rental data", () => {
    const approvedWords = ["عربية", "موتوسيكل", "هوفر", "سكوتر"];
    expect(RENTAL_ASSET_FIXTURES.every((asset) => approvedWords.some((word) => asset.name.includes(word)))).toBe(true);
    expect(RENTAL_FIXTURES.every((rental) => RENTAL_ASSET_FIXTURES.some((asset) => asset.id === rental.assetId))).toBe(true);
  });
});

describe("five-minute reminder", () => {
  beforeEach(resetRentalStore);
  it("becomes due in the final five minutes but not before", () => {
    const fixed = RENTAL_FIXTURES.find((rental) => rental.id === "rental-active-15")!;
    expect(evaluateFiveMinuteReminder(fixed, "2026-08-06T16:29:59+03:00").due).toBe(false);
    expect(evaluateFiveMinuteReminder(fixed, "2026-08-06T16:30:00+03:00").due).toBe(true);
  });
  it("never applies to open-time rentals", () => {
    const open = RENTAL_FIXTURES.find((rental) => rental.id === "rental-open")!;
    expect(evaluateFiveMinuteReminder(open, "2026-08-06T16:30:00+03:00").due).toBe(false);
  });
  it("creates one Mock notification and one audit event per rental", () => {
    evaluateRentalReminders();
    const first = getRentalSnapshot();
    const notificationCount = first.rentalNotifications.length;
    evaluateRentalReminders();
    const second = getRentalSnapshot();
    expect(second.rentalNotifications).toHaveLength(notificationCount);
    expect(second.rentals.find((rental) => rental.id === "rental-active-15")?.events.filter((event) => event.type === "reminder_due")).toHaveLength(1);
  });
});

describe("manual WhatsApp messages", () => {
  it("normalizes the Egyptian phone and composes the full invoice", () => {
    const result = browserRentalWhatsAppService.buildInvoiceLink({ customerName: "عميل تجريبي", customerPhone: "0100 000 0001", assetName: "عربية دريفت كهربائية — رقم 1", rentalNumber: "RNT-2026-0101", branchName: "الفرع الرئيسي", startedAt: "2026-08-06T16:20:00+03:00", endedAt: "2026-08-06T16:35:00+03:00", durationLabel: "15 دقيقة", totalAmount: 30, paidAmount: 200, receiptUrl: "http://localhost:3000/rentals/rental-active-15" });
    expect(result.internationalPhone).toBe("201000000001");
    expect(result.href).toContain("https://wa.me/201000000001?text=");
    expect(result.message).toContain("RNT-2026-0101");
    expect(result.message).toContain("عربية دريفت كهربائية — رقم 1");
    expect(result.message).toContain("حالة الدفع: مدفوع");
    expect(result.message).toContain("الباقي للعميل: 170 ج.م");
    expect(result.message).not.toContain("المتبقي على العميل");
  });
  it("rejects invalid customer phone numbers", () => {
    expect(browserRentalWhatsAppService.buildReminderLink({ customerName: "عميل", customerPhone: "123", assetName: "سكوتر كهربائي", assetNumber: "AST-001", branchName: "الفرع الرئيسي", expectedEndAt: "2026-08-06T16:35:00+03:00" })).toMatchObject({ valid: false, href: null });
  });
  it("composes the reminder with rental and branch context", () => {
    const result = browserRentalWhatsAppService.buildReminderLink({ customerName: "عميل", customerPhone: "01000000001", assetName: "سكوتر كهربائي", assetNumber: "AST-001", branchName: "الفرع الرئيسي", expectedEndAt: "2026-08-06T16:35:00+03:00" });
    expect(result.message).toContain("متبقي حوالي 5 دقائق");
    expect(result.message).toContain("AST-001");
    expect(result.message).toContain("الفرع الرئيسي");
  });
});

describe("rental permissions", () => {
  it.each(["owner", "manager"] as const)("gives %s read-only rental monitoring", (role) => {
    expect(canViewRentals([role])).toBe(true);
    expect(canOperateRentals([role])).toBe(false);
    expect(canManageRentals([role])).toBe(false);
    expect(canSendRentalWhatsApp([role])).toBe(false);
  });
  it("keeps rental operations with the rental employee", () => {
    expect(canViewRentals(["rental_maintenance_employee"])).toBe(true);
    expect(canOperateRentals(["rental_maintenance_employee"])).toBe(true);
    expect(canManageRentals(["rental_maintenance_employee"])).toBe(true);
    expect(canSendRentalWhatsApp(["rental_maintenance_employee"])).toBe(true);
  });
  it.each(["sales_employee", "maintenance_technician"] as const)("denies %s", (role) => {
    expect(canViewRentals([role])).toBe(false);
    expect(canSendRentalWhatsApp([role])).toBe(false);
  });
  it("supports explicit sales plus rental union", () => expect(canManageRentals(["sales_employee", "rental_maintenance_employee"])).toBe(true));
  it("totals only paid amounts collected in open rental shifts", () => {
    const openShiftIds = new Set(["shift-main-open", "shift-branch2-open"]);
    expect(calculateOpenShiftRentalCollections(RENTAL_FIXTURES, openShiftIds)).toBe(165);
    expect(calculateOpenShiftRentalCollections(RENTAL_FIXTURES, new Set(["shift-main-open"]))).toBe(90);
  });
  it("keeps completed rentals from the open shift visible to management", () => {
    const openShiftIds = new Set(["shift-main-old"]);
    expect(isRentalInCurrentShift(RENTAL_FIXTURES.find((item) => item.id === "rental-completed")!, openShiftIds)).toBe(true);
    expect(isRentalInCurrentShift(RENTAL_FIXTURES.find((item) => item.id === "rental-cancelled")!, openShiftIds)).toBe(false);
  });
  it("reserves cross-branch and employee filters for administration", () => {
    expect(canUseRentalAdministrativeFilters(["owner"])).toBe(true);
    expect(canUseRentalAdministrativeFilters(["manager"])).toBe(true);
    expect(canUseRentalAdministrativeFilters(["rental_maintenance_employee"])).toBe(false);
    expect(canUseRentalAdministrativeFilters(["sales_employee", "rental_maintenance_employee"])).toBe(false);
  });
  it("restricts operational access to assigned branches while administration keeps all branches", () => {
    expect(canAccessRentalBranch(["rental_maintenance_employee"], "main", ["main", "branch-2"])).toBe(true);
    expect(canAccessRentalBranch(["rental_maintenance_employee"], "branch-3", ["main", "branch-2"])).toBe(false);
    expect(canAccessRentalBranch(["owner"], "branch-3", ["main"])).toBe(true);
    expect(canAccessRentalBranch(["manager"], "workshop", [])).toBe(true);
  });
});



