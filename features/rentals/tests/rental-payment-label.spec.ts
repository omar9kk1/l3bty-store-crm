import { describe, expect, it } from "vitest";
import { rentalPaymentLabel } from "../components/rental-payment-label";

describe("rentalPaymentLabel", () => {
  it("shows supported payment methods in Arabic", () => {
    expect(rentalPaymentLabel("cash")).toBe("نقدي");
    expect(rentalPaymentLabel("card")).toBe("بطاقة");
    expect(rentalPaymentLabel("wallet")).toBe("محفظة");
  });
});
