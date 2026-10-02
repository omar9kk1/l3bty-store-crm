import { expect, test, type Page } from "@playwright/test";

const viewports = [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 834, height: 1112 }, { width: 768, height: 1024 }, { width: 390, height: 844 }];
async function selectOnlyRole(page: Page, role: string) { const mobile = (page.viewportSize()?.width ?? 1440) < 768; await page.getByRole("button", { name: mobile ? "معاينة" : /معاينة الأدوار/ }).click(); await page.getByRole("checkbox", { name: role, exact: true }).click(); if (mobile) await page.getByRole("dialog", { name: "معاينة الأدوار" }).getByRole("button", { name: "إغلاق" }).click(); }

test("notification and activity routes are responsive without horizontal overflow", async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of viewports) { await page.setViewportSize(viewport); for (const path of ["/notifications", "/activity-log", "/my-activity"]) { await page.goto(path); await expect(page.locator(".notifications-page,.activity-log-page,.my-activity-page")).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${path} ${viewport.width}`).toBeLessThanOrEqual(1); } }
});

test("notifications ignore foreign userId and keep current recipient isolation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/notifications?userId=user-owner"); await selectOnlyRole(page, "موظف المبيعات");
  await expect(page.getByText(/إشعارات سارة عادل/)).toBeVisible(); await expect(page.getByText("مرتجع يحتاج موافقة")).toBeVisible(); await expect(page.getByText("تقرير جديد من المدير")).toHaveCount(0); expect(new URL(page.url()).searchParams.get("userId")).toBe("user-owner");
});

test("activity administration is owner-manager only in navigation and direct URLs", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const role of ["موظف المبيعات", "موظف التأجير واستلام الصيانة", "فني الصيانة"]) { await page.goto("/activity-log"); await selectOnlyRole(page, role); await expect(page.getByText("لا تملك صلاحية لعرض هذا القسم")).toBeVisible(); await expect(page.locator(".activity-log-page")).toHaveCount(0); await expect(page.getByRole("link", { name: "سجل النشاط", exact: true })).toHaveCount(0); }
  await page.goto("/activity-log"); await selectOnlyRole(page, "المدير"); await expect(page.locator(".activity-log-page")).toBeVisible(); await expect(page.getByRole("link", { name: "سجل النشاط", exact: true })).toBeVisible();
});

test("personal activity shows only the current operational actor", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/my-activity"); await selectOnlyRole(page, "فني الصيانة"); await expect(page.getByText(/يوسف ماهر/)).toBeVisible(); await expect(page.getByText("تسجيل تشخيص")).toBeVisible(); await expect(page.getByText("إتمام بيع")).toHaveCount(0); await expect(page.getByText("اعتماد دورة رواتب")).toHaveCount(0);
});

test("notification bell reports unread count and opens a compact desktop list", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/notifications"); const bell = page.getByRole("button", { name: /الإشعارات — \d+ غير مقروءة/ }); await expect(bell).toBeVisible(); await bell.click(); const popover = page.getByRole("dialog", { name: "آخر الإشعارات" }); await expect(popover).toBeVisible(); await expect(popover.getByRole("link", { name: "عرض كل الإشعارات" })).toBeVisible(); await popover.getByRole("button", { name: "إغلاق" }).click();
});

test("details use left auxiliary drawer and bell uses bottom sheet on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/activity-log"); await page.getByRole("button", { name: "عرض", exact: true }).first().click(); let drawer = page.getByRole("dialog"); expect((await drawer.boundingBox())?.x).toBeLessThan(3); await drawer.getByRole("button", { name: "إغلاق" }).click();
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/notifications"); await page.getByRole("button", { name: /الإشعارات — \d+ غير مقروءة/ }).click(); drawer = page.getByRole("dialog", { name: "آخر الإشعارات" }); await expect(drawer).toHaveCSS("inset-block-end", "0px"); expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
