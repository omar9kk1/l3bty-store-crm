import { expect, test } from "@playwright/test";

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 834, height: 1112 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

test("customer list is responsive, RTL and free of horizontal overflow", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/customers");
    await expect(page.locator(".customers-page")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(1);
    if (viewport.width < 768) {
      await expect(page.locator(".customers-table-wrap")).toBeHidden();
      await expect(page.locator("[data-customer-card]").first()).toBeVisible();
    } else {
      await expect(page.locator(".customers-table-wrap")).toBeVisible();
    }
  }
});

test("search, branch scope and customer profile route work", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/customers");
  await page.getByRole("searchbox", { name: "البحث في العملاء" }).fill("للمبيعات");
  await expect(page.getByRole("link", { name: "عميل تجريبي للمبيعات", exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "البحث في العملاء" }).fill("+20 100-000-0001");
  await expect(page.getByRole("link", { name: "عميل تجريبي متعدد الأنشطة", exact: true })).toBeVisible();
  await page.getByLabel("اختيار الفرع").selectOption("branch-3");
  await expect(page.getByText("عميل تجريبي متعدد الأنشطة", { exact: true })).toHaveCount(0);
  await page.getByLabel("اختيار الفرع").selectOption("all");
  await page.getByRole("searchbox", { name: "البحث في العملاء" }).fill("CUS-2026-0001");
  await page.getByRole("link", { name: "عميل تجريبي متعدد الأنشطة" }).click();
  await expect(page).toHaveURL(/\/customers\/customer-001/);
  await expect(page.getByRole("heading", { name: "عميل تجريبي متعدد الأنشطة" })).toBeVisible();
});

test("customer add form follows auxiliary and mobile sheet direction", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/customers");
  await page.getByRole("button", { name: "إضافة عميل" }).click();
  const desktopDrawer = page.getByRole("dialog", { name: "إضافة عميل" });
  await expect(desktopDrawer).toBeVisible();
  const desktopBox = await desktopDrawer.boundingBox();
  expect(desktopBox?.x).toBeLessThan(3);
  await page.getByRole("button", { name: "إغلاق" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "إضافة عميل" }).click();
  const mobileDrawer = page.getByRole("dialog", { name: "إضافة عميل" });
  await expect(mobileDrawer).toHaveCSS("inset-block-end", "0px");
  await page.waitForTimeout(250);
  const mobileBox = await mobileDrawer.boundingBox();
  expect(Math.abs((mobileBox?.y ?? 0) + (mobileBox?.height ?? 0) - 844)).toBeLessThanOrEqual(2);
  await page.getByLabel("رقم الهاتف الأساسي").fill("01000000001");
  await expect(page.getByText("الرقم مسجل بالفعل")).toBeVisible();
  await expect(page.getByRole("button", { name: "حفظ العميل" })).toBeDisabled();
});

test("technician cannot access the customer directory or direct customer details", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/customers");
  await page.locator(".role-preview__trigger").click();
  const listRoles = page.locator(".role-preview__option input");
  await listRoles.nth(4).check();
  await listRoles.nth(0).uncheck();
  await expect(page.locator(".feedback-state")).toBeVisible();
  await expect(page.locator('.sidebar a[href="/customers"]')).toHaveCount(0);

  await page.goto("/customers/customer-001");
  await page.locator(".role-preview__trigger").click();
  const detailRoles = page.locator(".role-preview__option input");
  await detailRoles.nth(4).check();
  await detailRoles.nth(0).uncheck();
  await expect(page.locator(".feedback-state")).toBeVisible();
});

test("customer interface states are enforced", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/customers?state=loading");
  await expect(page.getByLabel("جار تحميل العملاء")).toBeVisible();
  await page.goto("/customers?state=empty");
  await expect(page.getByText("لا يوجد عملاء في النطاق الحالي")).toBeVisible();
  await page.goto("/customers?state=error");
  await expect(page.getByText(/CUS-MOCK-503/)).toBeVisible();
  await page.goto("/customers?state=offline");
  await expect(page.getByText(/وضع دون اتصال/)).toBeVisible();
});
