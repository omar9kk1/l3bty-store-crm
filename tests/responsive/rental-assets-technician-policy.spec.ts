import { expect, test, type Page } from "@playwright/test";

async function switchToTechnician(page: Page) {
  await page.getByRole("button", { name: /معاينة/ }).click();
  await page.getByRole("checkbox", { name: "فني الصيانة", exact: true }).click();
}

test("technician cannot see or open rental assets", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/rental-assets");
  await switchToTechnician(page);
  await expect(page.locator(".feedback-state")).toBeVisible();
  await expect(page.locator(".sidebar").getByRole("link", { name: "أصول التأجير", exact: true })).toHaveCount(0);

  await page.goto("/rental-assets/asset-race-01");
  await switchToTechnician(page);
  await expect(page.locator(".feedback-state")).toBeVisible();
});

test("rental maintenance employee keeps rental asset access", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /معاينة/ }).click();
  await page.getByRole("checkbox", { name: "موظف التأجير واستلام الصيانة", exact: true }).click();
  await expect(page.locator(".sidebar").getByRole("link", { name: "أصول التأجير", exact: true })).toBeVisible();
  await page.locator(".sidebar").getByRole("link", { name: "أصول التأجير", exact: true }).click();
  await expect(page.getByRole("heading", { name: "أصول التأجير", level: 2 })).toBeVisible();
});
