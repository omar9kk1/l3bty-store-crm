import { expect, test, type Page } from "@playwright/test";

async function chooseRentalBranch(page: Page) {
  const roleTrigger = page.locator(".role-preview__trigger");
  await roleTrigger.click();
  const roleInputs = page.locator(".role-preview__option input");
  await expect(roleInputs).toHaveCount(5);
  await roleInputs.nth(2).check();
  await roleInputs.nth(0).uncheck();
  await roleTrigger.click();
}

test("rental employee follows branch movements without creating transfers", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/inventory/transfers");

  await chooseRentalBranch(page);

  await expect(page.locator(".transfers-header h2")).toBeVisible();
  await expect(page.locator('a[href="/inventory/transfers/new?type=rental_asset"]')).toHaveCount(0);

  await page.goto("/inventory/transfers/new?type=rental_asset");
  await expect(page.locator(".feedback-state")).toBeVisible();

  await page.goto("/maintenance/orders/maintenance-order-3");
  const handover = page.locator('a[href="/inventory/transfers/new?type=maintenance_to_workshop&orderId=maintenance-order-3"]').first();
  await expect(handover).toHaveCount(0);
});
