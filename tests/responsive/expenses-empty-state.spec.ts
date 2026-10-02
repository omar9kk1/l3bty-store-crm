import { expect, test } from "@playwright/test";

test("empty expenses page stays simple and actionable", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/expenses?state=empty");

  await expect(page.getByRole("heading", { name: "المصروفات", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "لا توجد مصروفات حتى الآن" })).toBeVisible();
  await expect(page.getByRole("link", { name: "إضافة أول مصروف" })).toHaveAttribute("href", "/my-expenses");
  await expect(page.locator(".expenses-filters")).toHaveCount(0);
  await expect(page.locator(".expenses-table-wrap")).toHaveCount(0);
  await expect(page.locator(".expenses-summary--simple .ui-card")).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test("empty expenses page remains usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/expenses?state=empty");

  await expect(page.getByRole("heading", { name: "لا توجد مصروفات حتى الآن" })).toBeVisible();
  await expect(page.getByRole("link", { name: "إضافة أول مصروف" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
