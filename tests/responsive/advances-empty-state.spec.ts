import { expect, test } from "@playwright/test";

test("empty advances page explains its purpose without controls", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/payroll/advances");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "السلف", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "لا توجد طلبات سلف حاليًا" })).toBeVisible();
  await expect(page.locator(".advance-summary")).toHaveCount(0);
  await expect(page.locator(".advance-grid")).toHaveCount(0);
  const header = page.locator("main .payroll-header");
  const sectionBox = await header.locator("span").boundingBox();
  const titleBox = await header.getByRole("heading", { name: "السلف" }).boundingBox();
  const descriptionBox = await header.getByText("راجع طلبات الموظفين وتابع الأقساط المتبقية.").boundingBox();
  expect(sectionBox && titleBox && descriptionBox).toBeTruthy();
  expect(sectionBox!.y).toBeLessThan(titleBox!.y);
  expect(titleBox!.y).toBeLessThan(descriptionBox!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test("empty advances page stays clear on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/payroll/advances");
  await expect(page.getByRole("heading", { name: "لا توجد طلبات سلف حاليًا" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
