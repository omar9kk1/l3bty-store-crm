import { expect, test } from "@playwright/test";

test("preview session uses a real employee and assigned branch and survives refresh", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/dashboard");

  const trigger = page.getByRole("button", { name: /معاينة الأدوار/ });
  await trigger.click();
  const panel = page.locator(".role-preview__panel");
  await panel.getByRole("checkbox", { name: "موظف التأجير واستلام الصيانة", exact: true }).check();

  const employeeSelect = panel.getByLabel("اختيار الموظف");
  const employeeId = await employeeSelect.inputValue();
  expect(employeeId).not.toBe("");
  const employeeLabel = await employeeSelect.locator(`option[value="${employeeId}"]`).textContent();

  const branchSelect = panel.getByLabel("اختيار فرع الموظف");
  await expect(branchSelect).toBeEnabled();
  const branchId = await branchSelect.inputValue();
  expect(branchId).not.toBe("");
  expect(branchId).not.toBe("all");

  const employeeName = employeeLabel?.split(" · ")[0]?.trim() ?? "";
  await expect(page.getByLabel("قائمة المستخدم")).toContainText(employeeName);

  await trigger.click();
  await page.reload();
  await expect(page.getByLabel("قائمة المستخدم")).toContainText(employeeName);
  await trigger.click();
  await expect(page.locator(".role-preview__panel").getByLabel("اختيار الموظف")).toHaveValue(employeeId);
  await expect(page.locator(".role-preview__panel").getByLabel("اختيار فرع الموظف")).toHaveValue(branchId);
});

test("preview session controls fit in the mobile drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "معاينة", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "معاينة الأدوار" });
  await expect(drawer.getByLabel("اختيار الموظف")).toBeVisible();
  await expect(drawer.getByLabel("اختيار فرع الموظف")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
