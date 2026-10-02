import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultCashboxForBranch, getFinanceSnapshot, resetFinanceStore } from "@/features/finance/services/finance-store";
import { resetShiftStore } from "@/features/shifts/services/shift-store";
import { createRentalAsset, getRentalSnapshot, RENTAL_STORE_STORAGE_KEY, resetRentalStore, startRental } from "../services/rental-store";

describe("local test data integration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetFinanceStore();
    resetShiftStore();
    resetRentalStore();
  });

  it("persists newly added rental assets in the shared rental store", () => {
    const result = createRentalAsset({ name:"لعبة اختبار حقيقية",assetNumber:"AST-LIVE-1",barcode:"987654321",category:"سكوتر",branchId:"main",purchaseDate:"2026-08-15",purchaseCost:1000,notes:"" });
    expect(result.valid).toBe(true);
    expect(getRentalSnapshot().assets.some((asset) => asset.assetNumber === "987654321" && asset.barcode === "987654321")).toBe(true);
    const persisted = JSON.parse(window.localStorage.getItem(RENTAL_STORE_STORAGE_KEY) ?? "null");
    expect(persisted.version).toBe(4);
    expect(persisted.assets.some((asset: { assetNumber: string; barcode: string }) => asset.assetNumber === "987654321" && asset.barcode === "987654321")).toBe(true);
  });

  it("requires a unique game barcode and accepts letters", () => {
    const base = { name:"لعبة اختبار",category:"سكوتر",branchId:"main",purchaseDate:"",purchaseCost:0,notes:"" };
    expect(createRentalAsset({ ...base,assetNumber:"AST-B",barcode:"GAME-1001" }).valid).toBe(true);
    expect(createRentalAsset({ ...base,assetNumber:"AST-C",barcode:"GAME-1001" })).toMatchObject({ valid:false,message:"رقم اللعبة مستخدم بالفعل." });
  });

  it("creates a zero-balance cashbox for a new branch", () => {
    const cashbox = createDefaultCashboxForBranch({ id:"branch-live",code:"LIVE",name:"فرع الاختبار" });
    expect(cashbox).toMatchObject({ branchId:"branch-live",currentBalance:0,status:"active" });
    expect(getFinanceSnapshot().cashboxes.filter((item) => item.branchId === "branch-live")).toHaveLength(1);
    expect(createDefaultCashboxForBranch({ id:"branch-live",code:"LIVE",name:"فرع الاختبار" }).id).toBe(cashbox.id);
  });

  it("records fixed-rental payment in the open shift cashbox", () => {
    const before = getFinanceSnapshot().payments.length;
    const result = startRental({ customerId:"customer-001",assetId:"asset-scooter-01",branchId:"main",employeeId:"employee-rental",durationType:"fixed_30",customMinutes:30,pricePerHour:120,paidAmount:60,paymentMethod:"cash",hasOpenShift:true });
    expect(result.valid).toBe(true);
    expect(getFinanceSnapshot().payments).toHaveLength(before + 1);
    expect(getFinanceSnapshot().payments[0]).toMatchObject({ sourceType:"rental",sourceId:result.rental?.id,amount:60,shiftId:"shift-rental-open",cashboxId:"cash-main" });
  });
});
