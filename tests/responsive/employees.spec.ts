import { expect, test, type Page } from "@playwright/test";

const viewports = [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 834, height: 1112 }, { width: 768, height: 1024 }, { width: 390, height: 844 }];

async function selectOnlyRole(page: Page, role: string) {
  await page.getByRole("button", { name: /معاينة الأدوار/ }).click();
  await page.getByRole("checkbox", { name: role, exact: true }).click();
}

test("employee administration list and detail are responsive without horizontal overflow", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport); await page.goto("/employees"); await expect(page.locator(".employees-page")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(1);
    if (viewport.width < 768) { await expect(page.locator(".employees-table-wrap")).toBeHidden(); await expect(page.locator(".employee-mobile-card").first()).toBeVisible(); } else await expect(page.locator(".employees-table-wrap")).toBeVisible();
  }
  await page.locator(".employee-mobile-card").first().getByRole("link", { name: "عرض الملف" }).click(); await expect(page.locator(".employee-details-page")).toBeVisible(); await expect(page.getByRole("heading", { name: "التواصل", exact: true })).toBeVisible(); for (const removed of ["رقم بديل", "البريد", "جهة الطوارئ", "هاتف الطوارئ", "العنوان"]) await expect(page.locator("dt", { hasText: removed })).toHaveCount(0); expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test("owner and manager can manage employees while operational roles cannot render admin data", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/employees"); await expect(page.locator(".employees-page")).toBeVisible();
  await page.getByRole("button", { name: /معاينة الأدوار/ }).click(); await page.getByRole("checkbox", { name: "المدير", exact: true }).click(); await expect(page.locator(".employees-page")).toBeVisible(); await page.getByRole("link", { name: "سارة عادل التجريبية" }).click(); await expect(page.locator(".employee-details-page")).toBeVisible();
  for (const role of ["موظف المبيعات", "موظف التأجير واستلام الصيانة", "فني الصيانة"]) { await page.goto("/employees"); await selectOnlyRole(page, role); await expect(page.getByText("لا تملك صلاحية لعرض هذا القسم")).toBeVisible(); await expect(page.locator(".employees-page,.employee-details-page")).toHaveCount(0); await expect(page.getByRole("link", { name: "الموظفون" })).toHaveCount(0); }
});

test("switching operational roles still cannot access employee administration", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/employees/employee-owner"); await page.getByRole("button", { name: /معاينة الأدوار/ }).click(); await page.getByRole("checkbox", { name: "موظف المبيعات", exact: true }).click(); await page.getByRole("checkbox", { name: "موظف التأجير واستلام الصيانة", exact: true }).click(); await expect(page.getByText("لا تملك صلاحية لعرض هذا القسم")).toBeVisible(); await expect(page.locator(".employee-details-page")).toHaveCount(0);
});

test("every operational role opens only its own limited profile", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const expected: Record<string, string> = { "موظف المبيعات": "employee-sales", "موظف التأجير واستلام الصيانة": "employee-rental", "فني الصيانة": "employee-technician" };
  for (const [role, employeeId] of Object.entries(expected)) { await page.goto("/dashboard"); await selectOnlyRole(page, role); await page.getByRole("button", { name: /معاينة الأدوار/ }).click(); await page.getByLabel("قائمة المستخدم").click(); await page.getByRole("link", { name: "الملف الشخصي" }).click(); await expect(page.locator(".employee-profile-page")).toHaveAttribute("data-profile-employee", employeeId); await expect(page.getByText("لا يمكن تعديل الدور أو الفرع أو الحالة أو الصلاحيات من الملف الشخصي.")).toBeVisible(); await expect(page.getByRole("link", { name: "الموظفون" })).toHaveCount(0); }
});

test("profile ignores foreign employee identifiers and works on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/dashboard"); await page.getByRole("button", { name: "معاينة" }).click(); await page.getByRole("checkbox", { name: "موظف المبيعات", exact: true }).click(); await page.getByRole("dialog", { name: "معاينة الأدوار" }).getByRole("button", { name: "إغلاق" }).click(); await page.getByLabel("قائمة المستخدم").click(); await page.getByRole("link", { name: "الملف الشخصي" }).click(); await expect(page.locator(".employee-profile-page")).toHaveAttribute("data-profile-employee", "employee-sales"); await page.evaluate(() => window.history.pushState({}, "", "/profile?employeeId=employee-owner")); await expect(page.locator(".employee-profile-page")).toHaveAttribute("data-profile-employee", "employee-sales");
});

test("search, active branch scope, filters and deterministic states work", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/employees"); await page.getByRole("searchbox", { name: "البحث في الموظفين" }).fill("EMP-0006"); await expect(page.locator('[data-employee-row="employee-dual"]')).toBeVisible(); await page.getByRole("searchbox", { name: "البحث في الموظفين" }).fill(""); await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBeNull(); await page.getByLabel("اختيار الفرع").selectOption("branch-3"); await expect(page.locator('[data-employee-row="employee-sales"]')).toBeVisible(); await expect(page.locator('[data-employee-row="employee-technician"]')).toHaveCount(0);
  await page.goto("/employees?state=loading"); await expect(page.getByLabel("جار تحميل الموظفين")).toBeVisible(); await page.goto("/employees?state=empty"); await expect(page.getByText("لا يوجد موظفون ضمن الفلتر الحالي")).toBeVisible(); await page.goto("/employees?state=error"); await expect(page.getByText(/EMP-MOCK-503/)).toBeVisible(); await page.goto("/employees?state=offline"); await expect(page.getByText(/وضع دون اتصال/).first()).toBeVisible(); await expect(page.getByRole("button", { name: "إضافة موظف" })).toBeDisabled();
});

test("employee form uses auxiliary Drawer on desktop and bottom sheet on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/employees"); await page.getByRole("button", { name: "إضافة موظف" }).first().click(); const desktop = page.getByRole("dialog", { name: "إضافة موظف" }); await expect(desktop).toBeVisible(); expect((await desktop.boundingBox())?.x).toBeLessThan(3); await expect(page.getByLabel("كود الموظف المُنشأ تلقائيًا")).toHaveText("EMP-0001"); await expect(desktop.getByLabel("الاسم *")).toBeVisible(); await expect(desktop.getByLabel("الهاتف *")).toBeVisible(); await expect(desktop.getByLabel("الدور *")).toBeVisible(); for (const removed of ["رقم بديل", "البريد", "المسمى الوظيفي *", "تاريخ التعيين *", "الفرع الأساسي *", "جهة اتصال للطوارئ", "العنوان", "ملاحظات"]) await expect(desktop.getByLabel(removed, { exact: true })).toHaveCount(0); await page.getByRole("button", { name: "إغلاق" }).click();
  await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole("button", { name: "إضافة موظف" }).first().click(); const mobile = page.getByRole("dialog", { name: "إضافة موظف" }); await expect(mobile).toHaveCSS("inset-block-end", "0px"); expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
