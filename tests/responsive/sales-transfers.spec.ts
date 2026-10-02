import { expect, test } from "@playwright/test";

test("sales follows incoming branch transfers without creating them", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/inventory/transfers");

  const roleTrigger = page.locator(".role-preview__trigger");
  await roleTrigger.click();
  const roleInputs = page.locator(".role-preview__option input");
  await expect(roleInputs).toHaveCount(5);
  await roleInputs.nth(3).check();
  await roleInputs.nth(0).uncheck();
  await roleTrigger.click();
  await expect(page.locator(".transfers-header h2")).toBeVisible();
  await expect(page.locator('a[href="/inventory/transfers/new"]')).toHaveCount(0);

  await page.goto("/inventory/transfers/new");
  await expect(page.locator(".feedback-state")).toBeVisible();
});
