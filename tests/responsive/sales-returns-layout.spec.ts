import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`sales returns layout stays clear at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/sales/returns");

    await expect(
      page.getByRole("heading", { name: "المرتجعات والاستبدال", level: 2 }),
    ).toBeVisible();
    await expect(page.locator(".sale-return-summary > .ui-card")).toHaveCount(3);
    await expect(page.locator(".sale-return-workspace")).toBeVisible();
    await expect(page.locator(".sale-return-records")).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("sales actions expose invoices, returns, and exchange directly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/sales/pos");

  await expect(page.locator('a[href="/sales/invoices"]')).toBeVisible();
  await expect(
    page.locator('a[href="/sales/returns?mode=return"]'),
  ).toBeVisible();
  await expect(
    page.locator('a[href="/sales/returns?mode=exchange"]'),
  ).toBeVisible();

  await page.locator('a[href="/sales/returns?mode=exchange"]').click();
  await expect(page).toHaveURL(/\/sales\/returns\?mode=exchange/);
  await expect(page.locator(".sale-return-workspace")).toBeVisible();
});
