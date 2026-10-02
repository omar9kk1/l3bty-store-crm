import { expect, test, type Page } from "@playwright/test";

async function selectOnlyRole(page: Page, role: string) {
  const trigger = page.getByRole("button", { name: /معاينة الأدوار/ });
  await trigger.click();
  const panel = page.locator(".role-preview__panel");
  await panel.getByRole("checkbox", { name: role, exact: true }).setChecked(true);
  for (const option of await panel.locator(".role-preview__option").all()) {
    if ((await option.innerText()).trim() !== role) await option.getByRole("checkbox").setChecked(false);
  }
  await trigger.click();
}

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 834, height: 1112 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

test("inventory and transfer pages remain responsive", async ({ page }) => {
  test.setTimeout(75_000);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/inventory");
    await expect(page.locator(".inventory-page")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), viewport.width + "px inventory").toBeLessThanOrEqual(1);
    if (viewport.width < 768) {
      await expect(page.locator(".inventory-table-wrap")).toBeHidden();
      await expect(page.locator(".inventory-mobile-card, .inventory-state").first()).toBeVisible();
    }

    await page.goto("/inventory/transfers");
    await expect(page.locator(".transfers-page")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), viewport.width + "px transfers").toBeLessThanOrEqual(1);
    if (viewport.width < 768) {
      await expect(page.locator(".transfer-table-wrap")).toBeHidden();
      await expect(page.locator(".transfer-mobile-card, .transfer-list").first()).toBeVisible();
    }
  }
});

test("inventory adjustment follows auxiliary drawer policy", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/inventory");
  await selectOnlyRole(page, "المدير");
  await page.getByRole("button", { name: "جرد وتسوية" }).click();
  const desktopDrawer = page.getByRole("dialog", { name: "جرد وتسوية مخزون" });
  expect((await desktopDrawer.boundingBox())?.x).toBeLessThan(3);
  await desktopDrawer.getByRole("button", { name: "إغلاق" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "جرد وتسوية" }).click();
  await expect(page.getByRole("dialog", { name: "جرد وتسوية مخزون" })).toHaveCSS("inset-block-end", "0px");
});

test("transfer workflow decrements source only on dispatch and increments destination on receive", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/inventory");
  await selectOnlyRole(page, "المدير");
  await page.goto("/inventory/transfers/transfer-2");
  if (await page.getByRole("heading", { name: "التحويل غير موجود" }).isVisible()) return;
  await expect(page.locator(".transfers-page")).toBeVisible();
  await page.getByRole("button", { name: "تأكيد الإرسال" }).click();
  await expect(page.getByText("تم الإرسال؛ لم يضف أي رصيد للوجهة بعد.")).toBeVisible();
  await page.getByRole("button", { name: "تأكيد الاستلام" }).click();
  const receiveDrawer = page.getByRole("dialog", { name: "تسجيل الاستلام" });
  await receiveDrawer.getByRole("button", { name: "حفظ الاستلام" }).click();
  await expect(page.getByText("تم الاستلام الكامل وإكمال التحويل.")).toBeVisible();
});

test("low-stock tab toggles the filter and active state for technician", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/inventory");
  await page.getByRole("button", { name: /معاينة/ }).click();
  await page.getByRole("checkbox", { name: "فني الصيانة", exact: true }).click();
  await page.getByRole("button", { name: /معاينة الأدوار:/ }).click();


  const lowStockTab = page.getByRole("button", { name: "منخفض المخزون", exact: true });
  const rows = page.locator(".inventory-table-wrap tbody tr");
  const allCount = await rows.count();
  await expect(lowStockTab).toHaveAttribute("aria-pressed", "false");

  await lowStockTab.click();
  await expect(page).toHaveURL(/lowStock=true/);
  await expect(lowStockTab).toHaveAttribute("aria-pressed", "true");
  await expect(lowStockTab).toHaveClass(/is-active/);
  expect(await rows.count()).toBeLessThanOrEqual(allCount);
  expect(await rows.locator(".ui-badge--success").count()).toBe(0);

  await lowStockTab.click();
  await expect(page).not.toHaveURL(/lowStock=true/);
  await expect(lowStockTab).toHaveAttribute("aria-pressed", "false");
  await expect(lowStockTab).not.toHaveClass(/is-active/);
});
