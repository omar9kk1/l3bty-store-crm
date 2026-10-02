import { expect, test, type Page } from "@playwright/test";

async function chooseRole(page: Page, role: string) {
  const option = page.getByRole("checkbox", { name: role, exact: true });
  if (!(await option.isVisible())) {
    await page.getByRole("button", { name: /معاينة/ }).click();
  }
  await option.click();
}

test("point of sale is operational for sales employees and read-only for management", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/sales/pos");

  await expect(page.getByRole("heading", { name: "متابعة المبيعات" })).toBeVisible();
  await expect(page.locator(".pos-cart")).toHaveCount(0);
  await expect(page.locator(".pos-product-grid")).toHaveCount(0);

  await chooseRole(page, "المدير");
  await expect(page.getByRole("heading", { name: "إدارة المبيعات" })).toBeVisible();
  await expect(page.locator(".pos-cart")).toHaveCount(0);
  await expect(page.locator(".pos-product-grid")).toHaveCount(0);

  await chooseRole(page, "موظف المبيعات");
  await expect(
    page.getByRole("heading", { name: "نقطة البيع", level: 2 }),
  ).toBeVisible();
  await expect(page.locator(".pos-cart")).toBeVisible();
});
