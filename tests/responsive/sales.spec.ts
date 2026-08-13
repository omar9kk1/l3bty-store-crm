import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 834, height: 1112 },
  { width: 390, height: 844 },
];

async function chooseOnlyRole(page: Page, role: string) {
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  await page.getByRole("button", { name: /معاينة/ }).click();
  await page.getByRole("checkbox", { name: role, exact: true }).click();
  await page.getByRole("checkbox", { name: "مالك النشاط", exact: true }).click();
  if (mobile) await page.getByRole("dialog", { name: "معاينة الأدوار" }).getByRole("button", { name: "إغلاق" }).click();
}

test("sales and catalog routes are responsive without horizontal overflow", async ({ page }) => {
  test.setTimeout(90_000);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of ["/sales/pos", "/sales/invoices", "/sales/returns", "/products", "/products/product-car-12v"]) {
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${route} at ${viewport.width}`).toBeLessThanOrEqual(1);
    }
    await page.goto("/products");
    if (viewport.width < 768) {
      await expect(page.locator(".products-table-wrap")).toBeHidden();
      await expect(page.locator(".product-mobile-card").first()).toBeVisible();
      await page.goto("/sales/pos");
      await expect(page.locator(".pos-product-card").first().getByRole("button", { name: "إضافة للسلة" })).toHaveCSS("min-height", "44px");
      const undersizedTargets = await page.locator(".pos-page button, .pos-page a.ui-button").evaluateAll((items) => items.filter((item) => { const rect = item.getBoundingClientRect(); return rect.width > 0 && rect.height < 44; }).length);
      expect(undersizedTargets).toBe(0);
    }
  }
});

test("POS completes a Mock sale and keeps the generated receipt action visible", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/sales/pos");
  await page.locator(".pos-product-card").first().getByRole("button", { name: "إضافة للسلة" }).click();
  await page.getByLabel("العميل *").selectOption("customer-001");
  await page.getByRole("button", { name: "تأكيد البيع وإصدار الفاتورة" }).click();
  await expect(page.locator(".sale-success")).toBeVisible();
  await expect(page.locator(".sale-success").getByRole("link", { name: "فتح الإيصال" })).toBeVisible();
});

test("sales and catalog direct URLs use the same role policy", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/sales/pos");
  await chooseOnlyRole(page, "موظف التأجير واستلام الصيانة");
  await expect(page.locator(".feedback-state")).toBeVisible();
  await page.goto("/products");
  await chooseOnlyRole(page, "موظف التأجير واستلام الصيانة");
  await expect(page.locator(".feedback-state")).toBeVisible();

  await page.goto("/dashboard");
  await page.getByRole("button", { name: /معاينة/ }).click();
  await page.getByRole("checkbox", { name: "موظف المبيعات", exact: true }).click();
  await page.getByRole("checkbox", { name: "موظف التأجير واستلام الصيانة", exact: true }).click();
  await page.goto("/sales/invoices/sale-401");
  await expect(page.locator(".sale-invoice-page")).toBeVisible();
  await page.goto("/products/product-car-12v");
  await expect(page.locator(".product-details-page")).toBeVisible();
});

test("WhatsApp is available for valid phones and disabled for invalid phones", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/sales/invoices/sale-401");
  await expect(page.getByRole("button", { name: "إرسال الفاتورة عبر واتساب", exact: true })).toBeEnabled();
  await page.goto("/sales/invoices/sale-406");
  await expect(page.getByRole("button", { name: "إرسال الفاتورة عبر واتساب", exact: true })).toBeDisabled();
});

test("manager cancellation is documented and keeps the original invoice", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/sales/invoices/sale-401");
  await page.getByLabel("سبب الإلغاء *").fill("تصحيح فاتورة Mock");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "إلغاء الفاتورة", exact: true }).click();
  await expect(page.getByText(/تم إلغاء الفاتورة/)).toBeVisible();
  await expect(page.locator(".sale-receipt")).toBeVisible();
});
