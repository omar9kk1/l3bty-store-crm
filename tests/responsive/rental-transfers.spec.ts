import { expect, test, type Page } from "@playwright/test";

async function chooseRentalBranch(page: Page) {
  const roleTrigger = page.locator(".role-preview__trigger");
  await roleTrigger.click();
  const roleInputs = page.locator(".role-preview__option input");
  await expect(roleInputs).toHaveCount(5);
  await roleInputs.nth(2).check();
  await roleInputs.nth(0).uncheck();
  await roleTrigger.click();
  await page.locator("label.branch-select select").selectOption("branch-2");
}

test("rental employee sees branch asset and maintenance movements only", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/inventory/transfers");

  await chooseRentalBranch(page);

  await expect(page.locator(".transfers-header h2")).toBeVisible();
  await expect(page.locator('a[href="/inventory/transfers/new?type=rental_asset"]')).toBeVisible();
  await expect(page.locator('a[href="/inventory/transfers/transfer-3"]').first()).toBeVisible();
  await expect(page.locator('a[href="/inventory/transfers/transfer-4"]').first()).toBeVisible();
  await expect(page.locator('a[href="/inventory/transfers/transfer-2"]')).toHaveCount(0);
  await expect(page.locator('a[href="/inventory/transfers/transfer-5"]')).toHaveCount(0);
  await expect(page.locator('a[href="/inventory/transfers/transfer-10"]')).toHaveCount(0);
  await expect(page.locator(".transfer-table-wrap tbody tr")).toHaveCount(2);

  await page.locator('a[href="/inventory/transfers/new?type=rental_asset"]').click();
  await expect(page.locator(".transfer-choice-grid button")).toHaveCount(1);
  const next = page.locator(".transfer-wizard__actions .ui-button--primary");
  await next.click();
  const source = page.locator(".transfer-wizard__panel select");
  const sourceValues = await source.locator("option").evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
  expect(sourceValues).toContain("main");
  expect(sourceValues).not.toContain("branch-2");
  await next.click();
  const destination = page.locator(".transfer-wizard__panel select");
  await expect(destination).toBeDisabled();
  await expect(destination).toHaveValue("branch-2");
  await next.click();
  const assets = page.locator(".transfer-wizard__panel select");
  const assetValues = await assets.locator("option").evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value).filter(Boolean));
  expect(assetValues.length).toBeGreaterThan(0);
  expect(assetValues.every((value) => value.startsWith("asset-"))).toBe(true);

  await page.goto("/inventory/transfers/transfer-2");
  await chooseRentalBranch(page);
  await expect(page.locator(".feedback-state")).toBeVisible();

  await page.goto("/maintenance/orders/maintenance-order-3");
  await chooseRentalBranch(page);
  const handover = page.locator('a[href="/inventory/transfers/new?type=maintenance_to_workshop&orderId=maintenance-order-3"]').first();
  await expect(handover).toBeVisible();
  await handover.click();
  await expect(page.locator(".transfer-choice-grid button")).toHaveCount(1);
  const maintenanceNext = page.locator(".transfer-wizard__actions .ui-button--primary");
  await maintenanceNext.click();
  await expect(page.locator(".transfer-wizard__panel select")).toHaveValue("branch-2");
  await maintenanceNext.click();
  await expect(page.locator(".transfer-wizard__panel select")).toBeDisabled();
  await expect(page.locator(".transfer-wizard__panel select")).toHaveValue("workshop");
});