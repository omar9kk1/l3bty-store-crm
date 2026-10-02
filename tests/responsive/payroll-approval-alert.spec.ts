import { expect, test } from "@playwright/test";

test("payroll approval notice keeps its text and action inside the card", async ({ page }) => {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/payroll/runs");

    const alert = page.locator(".payroll-approval-alert");
    await expect(alert).toBeVisible();

    const cardBox = await alert.boundingBox();
    const textBox = await alert.locator("div").boundingBox();
    const actionBox = await alert.locator("a").boundingBox();
    expect(cardBox && textBox && actionBox).toBeTruthy();

    for (const childBox of [textBox!, actionBox!]) {
      expect(childBox.x).toBeGreaterThanOrEqual(cardBox!.x);
      expect(childBox.y).toBeGreaterThanOrEqual(cardBox!.y);
      expect(childBox.x + childBox.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width + 1);
      expect(childBox.y + childBox.height).toBeLessThanOrEqual(cardBox!.y + cardBox!.height + 1);
    }

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
  }
});
