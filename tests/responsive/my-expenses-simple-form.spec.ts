import { expect, test } from "@playwright/test";

test("expense request form contains only the essential fields", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/my-expenses?state=empty");
  await page.getByRole("button", { name: "طلب مصروف" }).click();

  const form = page.getByRole("dialog", { name: "طلب مصروف" });
  await expect(form.getByLabel("نوع المصروف")).toBeVisible();
  await expect(form.getByRole("spinbutton", { name: "المبلغ", exact: true })).toBeVisible();
  await expect(form.getByLabel("التاريخ")).toBeVisible();
  await expect(form.getByLabel("بيان المصروف")).toBeVisible();
  await expect(form.getByText("اختيار صورة أو PDF")).toBeVisible();
  await expect(form.locator('input[type="file"]')).toHaveCount(1);
  await expect(form.getByText("دفعت المبلغ من جيبي")).toBeVisible();
  await expect(form.locator('[name="businessPurpose"]')).toHaveCount(0);
  await expect(form.getByText("Mock")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test("simplified expense form remains usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/my-expenses?state=empty");
  await page.getByRole("button", { name: "طلب مصروف" }).click();

  const form = page.getByRole("dialog", { name: "طلب مصروف" });
  await expect(form.getByRole("button", { name: "إرسال للمراجعة" })).toBeVisible();
  await expect(form).toHaveCSS("inset-block-end", "0px");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
