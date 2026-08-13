import { expect, test } from "@playwright/test";

const viewports = [
  { width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1366, height: 768 },
  { width: 1024, height: 768 }, { width: 834, height: 1112 }, { width: 768, height: 1024 }, { width: 390, height: 844 },
];

test("branches list and details are responsive without horizontal overflow", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/branches");
    await expect(page.locator(".branches-page")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(1);
    if (viewport.width < 768) { await expect(page.locator(".branches-grid")).toBeHidden(); await expect(page.locator(".branches-mobile-list [data-branch-card]").first()).toBeVisible(); }
    else await expect(page.locator(".branches-grid")).toBeVisible();
  }
  await page.goto("/branches/main");
  await expect(page.getByRole("heading", { name: "الفرع الرئيسي", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test("search, filters and branch/workshop detail differences work", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/branches", { waitUntil: "networkidle" });
  await page.getByRole("searchbox", { name: "البحث في الفروع" }).fill("BR02");
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("BR02");
  await expect(page.locator('.branches-grid [data-branch-card="branch-2"]')).toBeVisible();
  const branchSearch = page.getByRole("searchbox", { name: "البحث في الفروع" });
  await branchSearch.fill("");
  await expect(branchSearch).toHaveValue("");
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBeNull();
  await expect(page.locator('.branches-grid [data-branch-card="workshop"]')).toBeVisible();
  await page.getByRole("tab", { name: "الورشة المركزية" }).click();
  await expect(page.locator('.branches-grid [data-branch-card="workshop"]')).toBeVisible();
  await page.locator('.branches-grid [data-branch-card="workshop"]').getByRole("link", { name: "عرض الملف" }).click();
  await expect(page).toHaveURL(/\/branches\/workshop/);
  const workshopDetails = page.locator(".branch-details-page");
  await expect(workshopDetails.getByText("التحويلات الواردة", { exact: true })).toBeVisible();
  await expect(workshopDetails.getByText("منتجات البيع", { exact: true })).toHaveCount(0);
  await page.goto("/branches/main");
  const branchDetailsGrid = page.locator(".branch-details-grid");
  await expect(branchDetailsGrid.getByText("أصول التأجير", { exact: true })).toBeVisible();
  await expect(branchDetailsGrid.getByText("منتجات البيع", { exact: true })).toBeVisible();
});

test("owner and manager can open the branches administration module", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/branches");
  await expect(page.locator(".branches-page")).toBeVisible();
  await page.getByRole("button", { name: /معاينة الأدوار/ }).click();
  await page.getByLabel("المدير", { exact: true }).click();
  await page.getByLabel("مالك النشاط").click();
  await expect(page.locator(".branches-grid [data-branch-card]")).toHaveCount(4);
  await page.goto("/branches/main");
  await expect(page.locator(".branch-details-page")).toBeVisible();
});

test("operational roles cannot see or render branch administration routes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const role of ["موظف المبيعات", "موظف التأجير واستلام الصيانة", "فني الصيانة"]) {
    await page.goto("/branches");
    await page.getByRole("button", { name: /معاينة الأدوار/ }).click();
    await page.getByLabel(role, { exact: true }).click();
    await page.getByLabel("مالك النشاط").click();
    await expect(page.getByText("لا تملك صلاحية لعرض هذا القسم")).toBeVisible();
    await expect(page.locator(".branches-page, .branch-details-page")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "الفروع والمواقع" })).toHaveCount(0);
  }
});

test("operational multi-role does not grant branch administration unless manager is selected", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/branches/main");
  await page.getByRole("button", { name: /معاينة الأدوار/ }).click();
  await page.getByLabel("موظف المبيعات").click();
  await page.getByLabel("فني الصيانة").click();
  await page.getByLabel("مالك النشاط").click();
  await expect(page.getByText("لا تملك صلاحية لعرض هذا القسم")).toBeVisible();
  await expect(page.locator(".branch-details-page")).toHaveCount(0);
  await page.getByLabel("المدير", { exact: true }).click();
  await expect(page.locator(".branch-details-page")).toBeVisible();
});

test("branch form Drawer direction, validation and states work", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/branches");
  await page.getByRole("button", { name: "إضافة فرع أو موقع" }).click();
  const desktopDrawer = page.getByRole("dialog", { name: "إضافة فرع أو موقع" });
  await expect(desktopDrawer).toBeVisible();
  expect((await desktopDrawer.boundingBox())?.x).toBeLessThan(3);
  await page.getByLabel("كود الفرع *").fill("BR01");
  await expect(page.getByText("الكود مستخدم بالفعل")).toBeVisible();
  await page.getByRole("button", { name: "إغلاق" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "إضافة فرع أو موقع" }).click();
  const mobileDrawer = page.getByRole("dialog", { name: "إضافة فرع أو موقع" });
  await expect(mobileDrawer).toHaveCSS("inset-block-end", "0px");
  await page.goto("/branches?state=loading"); await expect(page.getByLabel("جار تحميل الفروع")).toBeVisible();
  await page.goto("/branches?state=empty"); await expect(page.getByText("لا توجد فروع ضمن الفلتر الحالي")).toBeVisible();
  await page.goto("/branches?state=error"); await expect(page.getByText(/BRN-MOCK-503/)).toBeVisible();
  await page.goto("/branches?state=offline"); await expect(page.getByText(/وضع دون اتصال/)).toBeVisible();
});
