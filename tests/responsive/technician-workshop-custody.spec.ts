import { expect, test, type Page } from "@playwright/test";

async function switchToTechnician(page: Page) {
  await page.goto("/dashboard");
  await page.locator(".role-preview__trigger").click();
  const roles = page.locator(".role-preview__option input");
  await expect(roles).toHaveCount(5);
  await roles.nth(4).check();
  await roles.nth(0).uncheck();
}

test("technician sees workshop stock and custody actions without costs", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await switchToTechnician(page);
  await page.locator('.sidebar a[href="/inventory"]').click();
  await expect(page.locator(".inventory-page")).toBeVisible();
  await expect(page.locator('.inventory-actions a[href="/inventory/transfers/new"]')).toHaveCount(0);
  await expect(page.locator(".inventory-summary .ui-card")).toHaveCount(2);
  await expect(page.locator(".inventory-list thead th")).toHaveCount(7);
  const locations = await page.locator(".inventory-list tbody tr td:nth-child(2)").allTextContents();
  expect(locations.length).toBeGreaterThan(0);
  expect(locations.every((location) => location.trim() === "workshop")).toBe(true);
  await expect(page.locator(".inventory-header h2")).toHaveText("المخزون");
  const inventoryLink = page.locator('.sidebar a[href="/inventory"]');
  const transfersLink = page.locator('.sidebar a[href="/inventory/transfers"]');
  await expect(inventoryLink).toHaveAttribute("aria-current", "page");
  await expect(transfersLink).toBeVisible();
  await transfersLink.click();
  await expect(page.locator(".transfers-page")).toBeVisible();
  await expect(page.locator(".transfers-header h2")).toHaveText("طلبات التحويل");
  await expect(transfersLink).toHaveAttribute("aria-current", "page");
  await expect(inventoryLink).not.toHaveAttribute("aria-current", "page");
  await expect(page.locator('.transfers-header a[href="/inventory/transfers/new"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test("technician transfer wizard enforces workshop custody directions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await switchToTechnician(page);
  await page.goto("/inventory/transfers/new");
  await page.locator(".role-preview__trigger").click();
  const roles = page.locator(".role-preview__option input");
  await roles.nth(4).check();
  await roles.nth(0).uncheck();
  await expect(page.locator(".transfer-choice-grid button")).toHaveCount(3);
  await expect(page.locator(".transfer-choice-grid button.is-active")).toHaveCount(1);

  await page.locator(".transfer-wizard__actions button").last().click();
  const source = page.locator(".transfer-wizard__panel select");
  await expect(source.locator("option")).toHaveCount(1);
  await expect(source).toHaveValue("workshop");

  await page.locator(".transfer-wizard__actions button").last().click();
  const destination = page.locator(".transfer-wizard__panel select");
  expect(await destination.locator('option[value="workshop"]').count()).toBe(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".transfer-wizard")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
test("technician records spare-part supply and requests replenishment from managers", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await switchToTechnician(page);
  await page.locator('.sidebar a[href="/inventory"]').click();

  await page.getByRole("button", { name: "إضافة توريد قطع" }).click();
  await page.getByLabel("قطعة الغيار").selectOption("part-battery-12v");
  await page.getByLabel("الكمية").fill("2");
  await page.getByLabel("رقم فاتورة أو مرجع").fill("E2E-RECEIPT-1");
  await page.getByRole("button", { name: "إضافة إلى مخزون الورشة" }).click();
  await expect(page.getByRole("status")).toContainText("تمت إضافة القطع");
  await expect(page.locator(".inventory-intake-panel")).toContainText("E2E-RECEIPT-1");

  await page.getByRole("button", { name: "طلب تزويد" }).click();
  await page.getByLabel("قطعة الغيار").selectOption("part-motor-550");
  await page.getByLabel("الكمية المطلوبة").fill("4");
  await page.getByLabel("الأولوية").selectOption("urgent");
  await page.getByLabel("سبب الاحتياج").fill("المتبقي لا يكفي للصيانات الحالية");
  await page.getByRole("button", { name: "إرسال الطلب للمديرين" }).click();
  await expect(page.getByRole("status")).toContainText("تم إرسال طلب التزويد");
  await expect(page.locator(".inventory-restock-panel")).toContainText("بانتظار الإدارة");


  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
