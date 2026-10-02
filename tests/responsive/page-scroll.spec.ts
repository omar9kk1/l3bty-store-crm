import { expect, test } from "@playwright/test";

test("the page itself keeps its vertical scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 720 });
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(750);
  await expect(page.locator("#workspace-content")).toBeVisible();
  await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.dataset.scrollProbe = "true";
    probe.style.blockSize = "1000px";
    document.querySelector("main")?.append(probe);
  });

  const before = await page.evaluate(() => ({
    scrollY: window.scrollY,
    pageHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
    overflowY: getComputedStyle(document.documentElement).overflowY,
  }));
  expect(before.pageHeight).toBeGreaterThan(before.viewportHeight);
  expect(before.overflowY).toBe("scroll");

  await page.mouse.move(600, 500);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});
