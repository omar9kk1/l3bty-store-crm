import { expect, test, type Page } from "@playwright/test";

async function openTechnicianFaults(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /معاينة/ }).click();
  await page.getByRole("checkbox", { name: "فني الصيانة", exact: true }).click();
  await page.locator(".sidebar").getByRole("link", { name: "الصيانة", exact: true }).click();
  await expect(page.getByRole("heading", { name: "صندوق بلاغات الأعطال" })).toBeVisible();
}

test("technician can filter maintenance faults by source branch", async ({ page }) => {
  await openTechnicianFaults(page);
  const filter = page.locator("#technician-branch-filter");
  await expect(filter).toBeVisible();
  await expect(filter.locator("option")).toHaveCount(3);
  const allCount = await page.locator(".fault-card").count();

  await filter.selectOption("branch-2");
  const branchTwoCards = page.locator(".fault-card");
  await expect(branchTwoCards.first()).toBeVisible();
  expect((await branchTwoCards.locator("dl > div:first-child dd").allTextContents()).every((text) => text.includes("فرع 2"))).toBe(true);
  expect(await branchTwoCards.count()).toBeLessThan(allCount);

  await filter.selectOption("main");
  const mainCards = page.locator(".fault-card");
  await expect(mainCards.first()).toBeVisible();
  expect((await mainCards.locator("dl > div:first-child dd").allTextContents()).every((text) => text.includes("الفرع الرئيسي"))).toBe(true);

  await filter.selectOption("all");
  await expect(page.locator(".fault-card")).toHaveCount(allCount);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});


test("assigned maintenance request opens a prefilled workshop pickup", async ({ page }) => {
  await openTechnicianFaults(page);
  const eligibleCard = page.locator(".fault-card").filter({ hasText: "FLT-2026-0002" });
  const onsite = eligibleCard.getByRole("link", { name: "صيانة في الفرع" });
  const pickup = eligibleCard.getByRole("link", { name: "استلام وتحويل للورشة" });
  await expect(onsite).toHaveAttribute("href", "/maintenance/orders/maintenance-order-2");
  await expect(pickup).toHaveAttribute("href", "/inventory/transfers/new?type=maintenance_to_workshop&orderId=maintenance-order-2");
  await expect(page.locator(".fault-card").filter({ hasText: "FLT-2026-0007" }).getByRole("link", { name: "استلام وتحويل للورشة" })).toHaveCount(0);
  await expect(page.locator(".fault-card").filter({ hasText: "FLT-2026-0007" }).getByRole("link", { name: "صيانة في الفرع" })).toHaveCount(0);

  await onsite.click();
  await expect(page.getByText("اختر مكان تنفيذ الصيانة", { exact: true })).toBeVisible();
  await expect(page.getByText("يمكن إصلاح اللعبة في الفرع الحالي بدون إنشاء تحويل، أو استلامها ونقلها إلى الورشة المركزية.", { exact: true })).toBeVisible();
  await page.goBack();
  await pickup.click();
  await expect(page.getByRole("heading", { name: "إنشاء طلب تحويل" })).toBeVisible();
  await page.getByRole("button", { name: "التالي" }).click();
  await expect(page.locator(".transfer-wizard__panel select")).toHaveValue("main");
  await page.getByRole("button", { name: "التالي" }).click();
  await expect(page.locator(".transfer-wizard__panel select")).toHaveValue("workshop");
  await page.getByRole("button", { name: "التالي" }).click();
  await expect(page.locator(".transfer-wizard__panel select")).toHaveValue("maintenance-order-2");
});
test("technician branch filter stays responsive on mobile", async ({ page }) => {
  await openTechnicianFaults(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#technician-branch-filter")).toBeVisible();
  await page.locator("#technician-branch-filter").selectOption("branch-2");
  await expect(page.locator(".fault-card").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
