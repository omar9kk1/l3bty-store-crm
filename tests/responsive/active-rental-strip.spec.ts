import { expect, test } from "@playwright/test";

test("expired fixed rental waits for extend or end without overtime", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/rentals?branch=branch-2");

  const expiredCard = page.locator(".rental-card").filter({ hasText: "RNT-2026-0103" });
  test.skip(await expiredCard.count() === 0, "The expiry scenario fixture is not present in this local data session");
  const cardTimer = expiredCard.locator(".rental-ring-timer");
  await expect(cardTimer.locator("span")).toHaveText("انتهى الوقت");
  await expect(cardTimer.locator("strong")).toHaveText("00:00:00");
  await expect(cardTimer).toHaveAttribute("data-progress", "0.00");
  await expect(expiredCard.getByRole("alert")).toContainText("تمديد أم إنهاء");

  await expiredCard.getByRole("link", { name: "عرض التفاصيل" }).click();
  await expect(page.locator(".rental-hero small")).toHaveText("انتهى الوقت");
  await expect(page.locator(".rental-hero strong")).toHaveText("00:00:00");
  await expect(page.getByRole("alert").filter({ hasText: "انتهى وقت التأجير" })).toContainText("لن يُضاف وقت أو مبلغ تلقائيًا");
  await page.waitForTimeout(1_100);
  await expect(page.locator(".rental-hero strong")).toHaveText("00:00:00");
});
