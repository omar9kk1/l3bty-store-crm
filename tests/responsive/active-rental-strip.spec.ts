import { expect, test } from "@playwright/test";

function timerSeconds(value: string) {
  const [hours, minutes, seconds] = value.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

test("rental card, details, and top strip show the same timer state", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/rentals?branch=branch-2");

  const overtimeCard = page.locator(".rental-card").filter({ hasText: "RNT-2026-0103" });
  const cardTimer = overtimeCard.locator(".rental-ring-timer");
  const cardValue = (await cardTimer.locator("strong").textContent())?.trim() ?? "";
  const cardColor = await cardTimer.locator("strong").evaluate((element) => getComputedStyle(element).color);
  await expect(cardTimer.locator("span")).toHaveText("وقت إضافي");
  await expect(cardTimer).toHaveAttribute("data-progress", "100.00");

  await overtimeCard.getByRole("link", { name: "عرض التفاصيل" }).click();
  await expect(page).toHaveURL(new RegExp("/rentals/rental-overtime$"));
  await expect(page.locator(".rental-details-page")).toBeVisible();
  const detailsAsset = page.locator(".rentals-header h2");
  const stripAsset = page.locator(".active-rental-strip strong").first();
  const detailsTimer = page.locator(".rental-hero strong");
  const stripTimer = page.locator(".active-rental-strip__timer");

  const assetName = (await detailsAsset.textContent())?.trim() ?? "";
  await expect(stripAsset).toHaveText(assetName);
  await expect(page.locator(".rental-hero small")).toHaveText("وقت إضافي");
  await expect(stripTimer).toHaveAttribute("aria-label", /وقت إضافي/);
  const detailsColor = await detailsTimer.evaluate((element) => getComputedStyle(element).color);
  expect(detailsColor).toBe(cardColor);

  await expect.poll(async () => {
    const details = (await detailsTimer.textContent())?.trim();
    const strip = (await stripTimer.textContent())?.trim();
    return details === strip;
  }).toBe(true);
  const detailsValue = (await detailsTimer.textContent())?.trim() ?? "";
  expect(Math.abs(timerSeconds(detailsValue) - timerSeconds(cardValue))).toBeLessThanOrEqual(2);

  const before = detailsValue;
  await page.waitForTimeout(1100);
  await expect(detailsTimer).not.toHaveText(before);
  await expect.poll(async () => {
    const details = (await detailsTimer.textContent())?.trim();
    const strip = (await stripTimer.textContent())?.trim();
    return details === strip;
  }).toBe(true);
});


