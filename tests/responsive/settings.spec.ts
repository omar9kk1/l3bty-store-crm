import { expect, test } from "@playwright/test";

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

test("settings page is responsive and saves mock policy changes", async ({ page }) => {
  test.setTimeout(60_000);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/settings");
    await expect(page.locator(".settings-page")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), String(viewport.width)).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/settings");
  await page.locator('[data-setting-key="reminderMinutes"] input').fill("10");
  await page.getByRole("button", { name: "حفظ التغييرات" }).click();
  await expect(page.getByRole("status")).toContainText("تم حفظ");
  await expect(page.locator(".settings-audit__row")).toHaveCount(1);
});

test("operational roles cannot render system settings", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/settings");
  await page.getByRole("button", { name: /معاينة الأدوار/ }).click();
  await page.getByRole("checkbox", { name: "موظف المبيعات", exact: true }).click();
  await page.getByRole("checkbox", { name: "مالك النشاط", exact: true }).click();
  await expect(page.locator(".settings-page")).toHaveCount(0);
  await expect(page.locator(".feedback-state[role=alert]")).toBeVisible();
});