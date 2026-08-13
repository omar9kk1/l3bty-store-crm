import { expect, test } from "@playwright/test";

test("sales sees branch sale-toy restocking flow only", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/inventory/transfers");

  const roleTrigger = page.locator(".role-preview__trigger");
  await roleTrigger.click();
  const roleInputs = page.locator(".role-preview__option input");
  await expect(roleInputs).toHaveCount(5);
  await roleInputs.nth(3).check();
  await roleInputs.nth(0).uncheck();
  await roleTrigger.click();
  await page.locator("label.branch-select select").selectOption("branch-2");

  await expect(page.locator(".transfers-header h2")).toBeVisible();
  await expect(page.locator('a[href="/inventory/transfers/new"]')).toBeVisible();
  await expect(page.locator('a[href="/inventory/transfers/transfer-1"]').first()).toBeVisible();
  await expect(page.locator('a[href="/inventory/transfers/transfer-8"]').first()).toBeVisible();
  await expect(page.locator('a[href="/inventory/transfers/transfer-6"]')).toHaveCount(0);
  const rows = page.locator(".transfer-table-wrap tbody tr");
  await expect(rows).toHaveCount(2);
  for (const row of await rows.all()) await expect(row).toContainText("branch-2");

  await page.locator('a[href="/inventory/transfers/new"]').click();
  await expect(page.locator(".transfer-wizard")).toBeVisible();
  await expect(page.locator(".transfer-choice-grid button")).toHaveCount(1);

  const next = page.locator(".transfer-wizard__actions .ui-button--primary");
  await next.click();
  const source = page.locator(".transfer-wizard__panel select");
  const sourceValues = await source.locator("option").evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
  expect(sourceValues).not.toContain("branch-2");

  await next.click();
  const destination = page.locator(".transfer-wizard__panel select");
  await expect(destination).toBeDisabled();
  await expect(destination).toHaveValue("branch-2");

  await next.click();
  const product = page.locator(".transfer-wizard__panel select");
  const productValues = await product.locator("option").evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value).filter(Boolean));
  expect(productValues.length).toBeGreaterThan(0);
  expect(productValues.every((value) => value.startsWith("product-"))).toBe(true);
  await product.selectOption("product-car-12v");

  await next.click();
  await next.click();
  await expect(page.locator(".transfer-valid")).toBeVisible();
  await next.click();
  await next.click();
  const submit = page.locator(".transfer-wizard__panel .ui-button--primary");
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page).toHaveURL(/\/inventory\/transfers\/transfer-/);
  await expect(page.locator(".transfer-details-grid")).toBeVisible();
  await expect(page.getByRole("button").filter({ hasText: /./ })).not.toContainText(["dispatch"]);
});