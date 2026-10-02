import { expect, test, type Page } from "@playwright/test";

async function selectOnlyRole(page: Page, role: string) {
  const trigger = page.getByRole("button", { name: /معاينة الأدوار/ });
  await trigger.click();
  const panel = page.locator(".role-preview__panel");
  await panel.getByRole("checkbox", { name: role, exact: true }).setChecked(true);
  for (const option of await panel.locator(".role-preview__option").all()) {
    if ((await option.innerText()).trim() !== role) {
      await option.getByRole("checkbox").setChecked(false);
    }
  }
  await trigger.click();
}

test("owner monitors every inventory section without management actions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/inventory");
  await selectOnlyRole(page, "مالك النشاط");

  await expect(page.getByRole("heading", { name: "متابعة المخزون" })).toBeVisible();
  await expect(page.getByRole("button", { name: "جرد وتسوية" })).toHaveCount(0);

  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "متابعة منتجات البيع" })).toBeVisible();
  await expect(page.getByRole("button", { name: "إضافة منتج" })).toHaveCount(0);

  await page.goto("/rental-assets");
  await expect(page.getByRole("heading", { name: "متابعة أصول التأجير" })).toBeVisible();
  await expect(page.getByRole("button", { name: "إضافة لعبة تأجير" })).toHaveCount(0);

  await page.goto("/inventory/transfers");
  await expect(page.getByRole("heading", { name: "متابعة التحويلات" })).toBeVisible();
  await expect(page.getByRole("link", { name: "إنشاء طلب تحويل" })).toHaveCount(0);

  await page.goto("/branch-needs");
  await expect(page.getByRole("heading", { name: "متابعة احتياجات الفروع" })).toBeVisible();
  await expect(page.getByRole("button", { name: /مراجعة الطلب|تسجيل التوفير/ })).toHaveCount(0);
});

test("manager gets the inventory management actions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/inventory");
  await selectOnlyRole(page, "المدير");

  await expect(page.getByRole("heading", { name: "إدارة المخزون" })).toBeVisible();
  await expect(page.getByRole("button", { name: "جرد وتسوية" })).toBeVisible();

  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "إدارة منتجات البيع" })).toBeVisible();
  await expect(page.getByRole("button", { name: "إضافة منتج" })).toBeVisible();

  await page.goto("/rental-assets");
  await expect(page.getByRole("heading", { name: "إدارة أصول التأجير" })).toBeVisible();
  await expect(page.getByRole("button", { name: "إضافة لعبة تأجير" })).toBeVisible();

  await page.goto("/inventory/transfers");
  await expect(page.getByRole("heading", { name: "إدارة التحويلات" })).toBeVisible();
  await expect(page.getByRole("link", { name: "إنشاء طلب تحويل" })).toBeVisible();

  await page.goto("/branch-needs");
  await expect(page.getByRole("heading", { name: "إدارة احتياجات الفروع" })).toBeVisible();
});
