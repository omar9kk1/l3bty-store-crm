import { expect, test, type Page } from "@playwright/test";

const viewports = [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 834, height: 1112 }, { width: 768, height: 1024 }, { width: 390, height: 844 }];

async function selectOnlyRole(page: Page, role: string) {
  await page.waitForLoadState("networkidle");
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  await page.getByRole("button", { name: mobile ? "معاينة" : /معاينة الأدوار/ }).click();
  await page.getByRole("checkbox", { name: role, exact: true }).click();
  await page.getByRole("checkbox", { name: "مالك النشاط", exact: true }).click();
  if (mobile) await page.getByRole("dialog", { name: "معاينة الأدوار" }).getByRole("button", { name: "إغلاق" }).click();
}

test("attendance administration is responsive and record drawer follows overlay policy", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/attendance");
    await expect(page.locator(".attendance-admin-page")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(1);
    if (viewport.width < 768) {
      await expect(page.locator(".attendance-table-wrap")).toBeHidden();
      await expect(page.locator(".attendance-mobile-card").first()).toBeVisible();
    } else await expect(page.locator(".attendance-table-wrap")).toBeVisible();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "التفاصيل", exact: true }).first().click();
  const desktopDrawer = page.getByRole("dialog", { name: "تفاصيل سجل الحضور" });
  expect((await desktopDrawer.boundingBox())?.x).toBeLessThan(3);
  await desktopDrawer.getByRole("button", { name: "إغلاق" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "عرض التفاصيل" }).first().click();
  await expect(page.getByRole("dialog", { name: "تفاصيل سجل الحضور" })).toHaveCSS("inset-block-end", "0px");
});

test("attendance administration is owner-manager only while personal routes remain available", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const role of ["موظف المبيعات", "موظف التأجير واستلام الصيانة", "فني الصيانة"]) {
    await page.goto("/attendance");
    await selectOnlyRole(page, role);
    await expect(page.getByText("لا تملك صلاحية لعرض هذا القسم")).toBeVisible();
    await expect(page.locator(".attendance-admin-page")).toHaveCount(0);
    await page.goto("/attendance/exceptions");
    await selectOnlyRole(page, role);
    await expect(page.getByText("لا تملك صلاحية لعرض هذا القسم")).toBeVisible();
    await page.goto("/attendance/my");
    await selectOnlyRole(page, role);
    await expect(page.locator(".my-attendance-page")).toBeVisible();
    await page.goto("/attendance/check?state=offline");
    await selectOnlyRole(page, role);
    await expect(page.locator(".attendance-check-page")).toBeVisible();
    await expect(page.getByRole("button", { name: /تسجيل حضور|تسجيل انصراف/ })).toBeDisabled();
  }
  await page.goto("/attendance");
  await page.getByRole("button", { name: /معاينة الأدوار/ }).click();
  await page.getByRole("checkbox", { name: "المدير", exact: true }).click();
  await page.getByRole("checkbox", { name: "مالك النشاط", exact: true }).click();
  await expect(page.locator(".attendance-admin-page")).toBeVisible();
  await page.goto("/attendance/exceptions");
  await selectOnlyRole(page, "المدير");
  await expect(page.locator(".attendance-exceptions-page")).toBeVisible();
});

test("operational attendance navigation opens the current employee only", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard");
  await selectOnlyRole(page, "موظف المبيعات");
  const attendanceLink = page.getByRole("link", { name: "الحضور والانصراف" }).first();
  await expect(attendanceLink).toHaveAttribute("href", "/attendance/my");
  await attendanceLink.click();
  await expect(page.locator(".my-attendance-page")).toHaveAttribute("data-attendance-employee", "employee-sales");
  await expect(page.getByText("تظهر هنا حالتك فقط، دون بيانات أي موظف آخر.")).toBeVisible();
  await page.evaluate(() => { window.history.pushState({}, "", "/attendance/my?employeeId=employee-owner"); window.dispatchEvent(new PopStateEvent("popstate")); });
  await expect(page.locator(".my-attendance-page")).toHaveAttribute("data-attendance-employee", "employee-sales");
});

test("capture requires live camera and location, offers retries and never file upload", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().clearPermissions();
  await page.goto("/attendance/check");
  await expect(page.locator(".attendance-check-page")).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /تسجيل حضور|تسجيل انصراف/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: "إعادة المحاولة" }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.goto("/attendance/my");
  await page.getByRole("button", { name: "طلب استثناء" }).click();
  const sheet = page.getByRole("dialog", { name: "طلب استثناء حضور" });
  await expect(sheet).toHaveCSS("inset-block-end", "0px");
});
