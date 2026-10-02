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

for (const viewport of viewports) {
  test(`App Shell is RTL and has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/dashboard");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "لوحة التحكم", exact: true }).first()).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);

    if (viewport.width < 768) {
      await expect(page.getByTestId("mobile-navigation")).toBeVisible();
      const tooSmall = await page.locator("[data-testid='mobile-navigation'] a, [data-testid='mobile-navigation'] button").evaluateAll((items) =>
        items.filter((item) => item.getBoundingClientRect().height < 44).length,
      );
      expect(tooSmall).toBe(0);
    } else {
      await expect(page.getByTestId("sidebar").first()).toBeVisible();
    }
  });
}

test("role preview switches between single roles and applies branch scope", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard");
  await expect(page.getByLabel("قائمة المستخدم")).toContainText("المالك");
  await expect(page.getByLabel("قائمة المستخدم")).not.toContainText("أحمد حسن");
  await page.getByRole("button", { name: /معاينة/ }).click();
  await page.getByLabel("موظف المبيعات").click();
  await expect(page.getByLabel("قائمة المستخدم")).toContainText("المبيعات");
  await expect(page.getByLabel("مالك النشاط")).not.toBeChecked();
  await expect(page.getByLabel("موظف المبيعات")).toBeChecked();

  await expect(page.getByRole("link", { name: "نقطة البيع" })).toBeVisible();
  await expect(page.getByRole("link", { name: "التأجير", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "الفروع والمواقع" })).toHaveCount(0);
  await expect(page.getByLabel("الفرع المسند")).toContainText("BR01");
  await expect(page.getByLabel("اختيار الفرع")).toHaveCount(0);

  await page.getByLabel("موظف التأجير واستلام الصيانة").click();
  await expect(page.getByLabel("موظف المبيعات")).not.toBeChecked();
  await expect(page.getByLabel("موظف التأجير واستلام الصيانة")).toBeChecked();
  await expect(page.getByRole("link", { name: "التأجير", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "نقطة البيع" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "الرواتب" })).toHaveCount(0);
});

test("technician work location is limited to central workshops", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /معاينة/ }).click();
  await page.getByRole("checkbox", { name: "فني الصيانة", exact: true }).click();
  await expect(page.getByLabel("الورشة المركزية", { exact: true })).toContainText("ورشة عمل الفني");
  await expect(page.getByLabel("الورشة المركزية", { exact: true })).not.toContainText("كل الفروع");
  const workshopSelector = page.locator(".role-preview__panel").getByLabel("اختيار الورشة المركزية");
  await expect(workshopSelector.locator("option")).not.toHaveCount(0);
  await expect(workshopSelector.locator('option[value="all"]')).toHaveCount(0);
  await expect(workshopSelector.locator('option[value="main"]')).toHaveCount(0);
  await expect(page.getByLabel("اختيار الفرع")).toHaveCount(0);
});

test("mobile more drawer exposes remaining permitted destinations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /معاينة/ }).click();
  await page.getByLabel("موظف المبيعات").click();
  await page.getByRole("dialog", { name: "معاينة الأدوار" }).getByRole("button", { name: "إغلاق" }).click();
  await page.getByRole("button", { name: "المزيد" }).click();
  const more = page.getByRole("dialog", { name: "المزيد" });
  await expect(more).toBeVisible();
  await expect(more.getByRole("link", { name: "الفروع والمواقع" })).toHaveCount(0);
  await expect(more.getByRole("link", { name: "الإعدادات" })).toHaveCount(0);
  await expect(more.getByRole("link", { name: "سجل النشاط" })).toHaveCount(0);
});
test("global back button returns safely on desktop and mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "الرجوع للصفحة السابقة" })).toHaveCount(0);

  await page.goto("/maintenance/orders/maintenance-order-2");
  const desktopBack = page.getByRole("button", { name: "الرجوع للصفحة السابقة" });
  await expect(desktopBack).toBeVisible();
  await expect(page.locator("#workspace-content").getByRole("button", { name: "الرجوع للصفحة السابقة" })).toBeVisible();
  await expect(page.locator(".workspace-header").getByRole("button", { name: "الرجوع للصفحة السابقة" })).toHaveCount(0);
  await desktopBack.click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/inventory");
  const mobileBack = page.getByRole("button", { name: "الرجوع للصفحة السابقة" });
  await expect(mobileBack).toBeVisible();
  expect(await mobileBack.evaluate((button) => button.getBoundingClientRect().width)).toBeGreaterThanOrEqual(44);
  await mobileBack.click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});
