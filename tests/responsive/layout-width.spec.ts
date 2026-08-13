import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1366, height: 900 },
  { width: 1440, height: 900 },
  { width: 1600, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`shared workspace uses the available desktop width at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/dashboard");
    await expect(page.locator(".dashboard-page")).toBeVisible();

    const measurements = await page.evaluate(() => {
      const body = document.querySelector<HTMLElement>(".app-shell__body")!.getBoundingClientRect();
      const workspace = document.querySelector<HTMLElement>(".workspace-content")!.getBoundingClientRect();
      const dashboard = document.querySelector<HTMLElement>(".dashboard-page")!.getBoundingClientRect();
      const header = document.querySelector<HTMLElement>(".workspace-header__inner")!.getBoundingClientRect();
      const primary = document.querySelector<HTMLElement>(".workspace-header__primary")!.getBoundingClientRect();
      return {
        bodyWidth: body.width,
        workspaceWidth: workspace.width,
        dashboardWidth: dashboard.width,
        headerWidth: header.width,
        toolbarRightGap: header.right - primary.right,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(measurements.workspaceWidth).toBeLessThanOrEqual(1440.5);
    expect(measurements.headerWidth).toBeLessThanOrEqual(1440.5);
    expect(measurements.workspaceWidth).toBeGreaterThanOrEqual(Math.min(measurements.bodyWidth, 1440) - 1);
    expect(measurements.headerWidth).toBeGreaterThanOrEqual(Math.min(measurements.bodyWidth, 1440) - 1);
    expect(measurements.dashboardWidth).toBeGreaterThanOrEqual(measurements.workspaceWidth - 42);
    expect(Math.abs(measurements.toolbarRightGap)).toBeLessThanOrEqual(21);
    expect(measurements.overflow).toBeLessThanOrEqual(1);
  });
}

test("top-level feature pages inherit the wider shared workspace", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/operations");
  await expect(page.locator(".operations-page")).toBeVisible();
  const widths = await page.evaluate(() => ({
    shell: document.querySelector<HTMLElement>(".workspace-content")!.getBoundingClientRect().width,
    page: document.querySelector<HTMLElement>(".operations-page")!.getBoundingClientRect().width,
    workspace: document.querySelector<HTMLElement>(".operations-workspace")!.getBoundingClientRect().width,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(widths.page).toBeGreaterThanOrEqual(widths.shell - 42);
  expect(widths.workspace).toBeLessThanOrEqual(widths.page);
  expect(widths.overflow).toBeLessThanOrEqual(1);
});
