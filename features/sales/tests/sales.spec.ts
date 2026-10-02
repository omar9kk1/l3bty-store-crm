import { beforeEach, describe, expect, it } from "vitest";
import { CUSTOMER_FIXTURES } from "@/features/customers/fixtures";
import { getProductSnapshot, resetProductStore } from "@/features/products/services/product-store";
import {
  canManageSaleOverrides,
  canOperatePointOfSale,
  canSendSaleWhatsApp,
  canViewSales,
} from "../permissions";
import { browserSalesWhatsAppService } from "../services/sales-whatsapp-service";
import {
  addProductToCart,
  cancelSaleInvoice,
  checkoutSale,
  createSaleReturn,
  getSalesSnapshot,
  resetSalesStore,
  setInvoiceDiscount,
  setSaleCustomer,
} from "../services/sales-store";

const payment = [{ method: "cash" as const, amount: 8900, reference: "TEST" }];
const checkout = (overrides: Partial<Parameters<typeof checkoutSale>[0]> = {}) => checkoutSale({
  customerId: "customer-001",
  branchId: "main",
  employeeId: "employee-sales",
  roles: ["sales_employee"],
  payments: payment,
  invoiceDiscountPercent: 0,
  approvalReason: "",
  managerApproved: false,
  allowDebt: false,
  idempotencyKey: "sale-test-1",
  ...overrides,
});

describe("sales contracts", () => {
  beforeEach(() => { resetProductStore(); resetSalesStore(); });

  it("uses the approved centralized role separation", () => {
    expect(canViewSales(["owner"])).toBe(true);
    expect(canViewSales(["manager"])).toBe(true);
    expect(canViewSales(["sales_employee"])).toBe(true);
    expect(canViewSales(["rental_maintenance_employee"])).toBe(false);
    expect(canViewSales(["maintenance_technician"])).toBe(false);
    expect(canViewSales(["maintenance_technician", "sales_employee"])).toBe(true);
    expect(canOperatePointOfSale(["sales_employee"])).toBe(true);
    expect(canOperatePointOfSale(["owner"])).toBe(false);
    expect(canOperatePointOfSale(["manager"])).toBe(false);
    expect(canOperatePointOfSale(["manager", "sales_employee"])).toBe(false);
    expect(canManageSaleOverrides(["sales_employee"])).toBe(false);
    expect(canSendSaleWhatsApp(["sales_employee"])).toBe(true);
  });

  it("prevents owners and managers from executing a point-of-sale checkout", () => {
    addProductToCart("product-car-12v", "main");
    setSaleCustomer("customer-001");
    const before = getSalesSnapshot().invoices.length;

    expect(checkout({ roles: ["owner"] }).valid).toBe(false);
    expect(checkout({ roles: ["manager"] }).valid).toBe(false);
    expect(checkout({ roles: ["manager", "sales_employee"] }).valid).toBe(false);
    expect(getSalesSnapshot().invoices).toHaveLength(before);
  });

  it("requires a customer, a nonempty cart, and an open financial shift", () => {
    expect(checkout({ customerId: "" }).valid).toBe(false);
    expect(checkout().valid).toBe(false);
    addProductToCart("part-battery-12v", "branch-3");
    setSaleCustomer("customer-001");
    expect(checkout({ branchId: "branch-3", payments: [{ method: "cash", amount: 1450, reference: "TEST" }] }).valid).toBe(false);
  });

  it("blocks inactive, unknown rental, and above-stock items", () => {
    expect(addProductToCart("product-hoverboard", "main").valid).toBe(false);
    expect(addProductToCart("asset-drift-01", "main").valid).toBe(false);
    for (let index = 0; index < 7; index += 1) addProductToCart("product-car-12v", "main");
    expect(getSalesSnapshot().cart.lines[0].quantity).toBe(6);
  });

  it("requires explicit manager approval and reason above the employee discount limit", () => {
    addProductToCart("product-car-12v", "main");
    setSaleCustomer("customer-001");
    setInvoiceDiscount(11);
    expect(checkout({ payments: [{ method: "cash", amount: 7921, reference: "TEST" }], approvalReason: "حملة", managerApproved: false }).valid).toBe(false);
    expect(checkout({ payments: [{ method: "cash", amount: 7921, reference: "TEST" }], approvalReason: "اعتماد المدير", managerApproved: true }).valid).toBe(true);
  });

  it("decreases stock once and makes checkout idempotent", () => {
    const before = getProductSnapshot().stocks.find((stock) => stock.productId === "product-car-12v" && stock.branchId === "main")!.quantityAvailable;
    addProductToCart("product-car-12v", "main");
    setSaleCustomer("customer-001");
    const first = checkout();
    const second = checkout();
    expect(first.valid).toBe(true);
    expect("invoice" in second ? second.invoice?.id : undefined).toBe("invoice" in first ? first.invoice?.id : undefined);
    expect(getProductSnapshot().stocks.find((stock) => stock.productId === "product-car-12v" && stock.branchId === "main")?.quantityAvailable).toBe(before - 1);
  });

  it("records reverse movements without deleting the original invoice", () => {
    addProductToCart("product-car-12v", "main");
    setSaleCustomer("customer-001");
    const checkoutResult = checkout();
    if (!("invoice" in checkoutResult) || !checkoutResult.invoice) throw new Error("Expected invoice");
    const invoice = checkoutResult.invoice;
    const stockAfterSale = getProductSnapshot().stocks.find((stock) => stock.productId === "product-car-12v" && stock.branchId === "main")!.quantityAvailable;
    const result = createSaleReturn({ invoiceId: invoice.id, invoiceLineId: invoice.lines[0].id, quantity: 1, condition: "resellable", kind: "full", reason: "تراجع العميل", refundMethod: "cash", replacementProductId: "", employeeId: "employee-sales", approvalReason: "" });
    expect(result.valid).toBe(true);
    expect(getProductSnapshot().stocks.find((stock) => stock.productId === "product-car-12v" && stock.branchId === "main")?.quantityAvailable).toBe(stockAfterSale + 1);
    expect(getSalesSnapshot().invoices.find((item) => item.id === invoice.id)?.status).toBe("fully_returned");
  });

  it("does not restore damaged returned stock", () => {
    addProductToCart("product-car-12v", "main"); setSaleCustomer("customer-001");
    const checkoutResult = checkout();
    if (!("invoice" in checkoutResult) || !checkoutResult.invoice) throw new Error("Expected invoice");
    const invoice = checkoutResult.invoice;
    const stockAfterSale = getProductSnapshot().stocks.find((stock) => stock.productId === "product-car-12v" && stock.branchId === "main")!.quantityAvailable;
    createSaleReturn({ invoiceId: invoice.id, invoiceLineId: invoice.lines[0].id, quantity: 1, condition: "damaged", kind: "full", reason: "تالف", refundMethod: "cash", replacementProductId: "", employeeId: "employee-sales", approvalReason: "" });
    expect(getProductSnapshot().stocks.find((stock) => stock.productId === "product-car-12v" && stock.branchId === "main")?.quantityAvailable).toBe(stockAfterSale);
  });

  it("allows only administration to cancel with a reason and reverse remaining stock", () => {
    addProductToCart("product-car-12v", "main"); setSaleCustomer("customer-001");
    const checkoutResult = checkout();
    if (!("invoice" in checkoutResult) || !checkoutResult.invoice) throw new Error("Expected invoice");
    const invoice = checkoutResult.invoice;
    const stockAfterSale = getProductSnapshot().stocks.find((stock) => stock.productId === "product-car-12v" && stock.branchId === "main")!.quantityAvailable;
    expect(cancelSaleInvoice(invoice.id, ["sales_employee"], "employee-sales", "تصحيح").valid).toBe(false);
    expect(cancelSaleInvoice(invoice.id, ["manager"], "employee-manager", "").valid).toBe(false);
    expect(cancelSaleInvoice(invoice.id, ["manager"], "employee-manager", "فاتورة مكررة تجريبيًا").valid).toBe(true);
    expect(getSalesSnapshot().invoices.find((item) => item.id === invoice.id)?.status).toBe("cancelled");
    expect(getProductSnapshot().stocks.find((stock) => stock.productId === "product-car-12v" && stock.branchId === "main")?.quantityAvailable).toBe(stockAfterSale + 1);
  });

  it("builds WhatsApp links only for a valid customer phone", () => {
    const invoice = getSalesSnapshot().invoices[0];
    const valid = browserSalesWhatsAppService.buildInvoiceLink({ invoice, customerName: "عميل", customerPhone: "01012345678", branchName: "الرئيسي" });
    expect(valid.href).toContain("wa.me/201012345678");
    const invalidCustomer = CUSTOMER_FIXTURES.find((customer) => customer.id === "customer-invalid-phone")!;
    expect(browserSalesWhatsAppService.buildInvoiceLink({ invoice, customerName: invalidCustomer.name, customerPhone: invalidCustomer.primaryPhone, branchName: "الرئيسي" }).valid).toBe(false);
  });
});
