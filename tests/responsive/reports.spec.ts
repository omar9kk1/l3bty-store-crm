import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 834, height: 1112 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

async function selectOnlyRole(page: Page, role: string) {
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  const trigger = page.getByRole("button", { name: mobile ? "معاينة" : /معاينة الأدوار/ });
  await trigger.click();
  const panel = mobile ? page.getByRole("dialog", { name: "معاينة الأدوار" }) : page.locator(".role-preview__panel");
  const target = panel.getByRole("checkbox", { name: role, exact: true });
  await target.setChecked(true);
  for (const option of await panel.locator(".role-preview__option").all()) {
    if ((await option.innerText()).trim() !== role) await option.getByRole("checkbox").setChecked(false);
  }
  if (mobile) await panel.getByRole("button", { name: "إغلاق" }).click();
  else await trigger.click();
}

test("report routes remain responsive without horizontal overflow", async ({ page }) => {
  test.setTimeout(140_000);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const path of ["/reports", "/reports/management-summary", "/reports/snapshots/snapshot-ready", "/reports/deliveries", "/my-reports"]) {
      await page.goto(path);
      await expect(page.locator(".reports-page")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${path} ${viewport.width}`).toBeLessThanOrEqual(1);
    }
  }
});

test("administrative reports are denied to operational roles", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const role of ["موظف المبيعات", "موظف التأجير واستلام الصيانة", "فني الصيانة"]) {
    await page.goto("/reports");
    await selectOnlyRole(page, role);
    await expect(page.getByText("لا تملك صلاحية لعرض هذا القسم")).toBeVisible();
    await expect(page.locator(".reports-page")).toHaveCount(0);
    await page.goto("/reports/snapshots/snapshot-ready");
    await selectOnlyRole(page, role);
    await expect(page.getByText("لا تملك صلاحية لعرض هذا القسم")).toBeVisible();
  }
});

test("personal reports expose only the active operational scope", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/my-reports");
  await selectOnlyRole(page, "فني الصيانة");
  await expect(page.getByText("نشاط الصيانة الفني")).toBeVisible();
  await expect(page.getByText("قيمة مبيعاتي")).toHaveCount(0);
  await expect(page.locator(".reports-page").getByText(/راتب|خزينة عامة|إيرادات عامة/)).toHaveCount(0);
});

test("manager can prepare delivery while owner cannot send", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/reports/snapshots/snapshot-ready");
  await expect(page.getByRole("button", { name: "إرسال إلى مالك النشاط" })).toHaveCount(0);
  await selectOnlyRole(page, "المدير");
  const sendButton = page.getByRole("button", { name: "إرسال إلى مالك النشاط" });
  await expect(sendButton).toBeVisible();
  await sendButton.click();
  const drawer = page.getByRole("dialog", { name: "إرسال إلى مالك النشاط" });
  expect((await drawer.boundingBox())?.x).toBeLessThan(3);
  await drawer.getByRole("button", { name: "إغلاق" }).click();
});

test("report delivery drawer becomes a bottom sheet on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/reports/snapshots/snapshot-ready");
  await selectOnlyRole(page, "المدير");
  await page.getByRole("button", { name: "إرسال إلى مالك النشاط" }).click();
  const drawer = page.getByRole("dialog", { name: "إرسال إلى مالك النشاط" });
  await expect(drawer).toHaveCSS("inset-block-end", "0px");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});


const administrativeReportKeys = [
  "management-summary", "sales", "rentals", "maintenance", "inventory",
  "transfers", "finance", "shifts", "receivables", "expenses", "payroll",
  "attendance", "employees", "branches", "customers",
];

test("all administrative reports use the shared aligned filter toolbar", async ({ page }) => {
  test.setTimeout(140_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  for (const key of administrativeReportKeys) {
    await page.goto("/reports/" + key);
    const card = page.locator(".report-filters-card");
    const form = card.locator(".report-filters");
    await expect(card).toBeVisible();
    await expect(form).toBeVisible();
    const fits = await card.evaluate((element) => element.scrollWidth <= element.clientWidth + 1);
    expect(fits, key).toBe(true);
  }
});

test("report filters stay aligned on desktop, tablet and mobile", async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/reports/receivables");
    const card = page.locator(".report-filters-card");
    await expect(card).toBeVisible();
    const controlHeights = await card.locator("select, input[type=date], .ui-button").evaluateAll((elements) =>
      elements.map((element) => Math.round(element.getBoundingClientRect().height)),
    );
    expect(controlHeights.every((height) => height >= 43 && height <= 46), String(viewport.width)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
});

