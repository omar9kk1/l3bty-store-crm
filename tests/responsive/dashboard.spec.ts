import { expect, test } from "@playwright/test";

const sizes = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 834, height: 1112 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];

test("dashboard is RTL and has no horizontal overflow at approved sizes", async ({ page }) => {
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.goto("/dashboard?period=week&type=all");
    await expect(page.locator(".dashboard-page")).toBeVisible();
    const result = await page.evaluate(() => ({
      direction: document.documentElement.dir,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      metricHeights: [...document.querySelectorAll<HTMLElement>(".dashboard-metric-card")].map((card) => Math.round(card.getBoundingClientRect().height)),
    }));
    expect(result.direction).toBe("rtl");
    expect(result.overflow, `${size.width}x${size.height}`).toBeLessThanOrEqual(1);
    expect(Math.max(...result.metricHeights), `${size.width}x${size.height}`).toBeLessThanOrEqual(176);
    expect(Math.max(...result.metricHeights) - Math.min(...result.metricHeights)).toBeLessThanOrEqual(1);
  }
});

test("query states and period selection are functional", async ({ page }) => {
  await page.goto("/dashboard?state=empty&period=month");
  await expect(page.getByText("لا توجد بيانات ضمن هذا النطاق")).toBeVisible();
  await expect(page.getByRole("button", { name: "هذا الشهر" })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/dashboard?state=error");
  await page.getByRole("button", { name: "إعادة المحاولة" }).click();
  await expect(page.locator(".dashboard-metrics")).toBeVisible();
  await page.goto("/dashboard?state=offline");
  await expect(page.getByText(/أنت غير متصل/)).toBeVisible();
  await expect(page.getByRole("button", { name: "تصدير" })).toBeDisabled();
});
