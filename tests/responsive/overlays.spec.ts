import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectOverlayCoversViewport(page: Page) {
  const overlay = page.locator(".ui-drawer__overlay");
  await expect(overlay).toBeVisible();
  const box = await overlay.boundingBox();
  const viewport = page.viewportSize();
  expect(box?.x).toBe(0);
  expect(box?.y).toBe(0);
  expect(box?.width).toBe(viewport?.width);
  expect(box?.height).toBe(viewport?.height);
}

async function readAuxiliarySizing(page: Page) {
  return page.locator('[data-drawer-variant="auxiliary"]').evaluate((drawer) => {
    const header = drawer.querySelector<HTMLElement>(".ui-drawer__header")!;
    const body = drawer.querySelector<HTMLElement>(".ui-drawer__body")!;
    const close = drawer.querySelector<HTMLElement>(".ui-drawer__header .ui-icon-button")!;
    const sectionHeading = drawer.querySelector<HTMLElement>(".dashboard-filter-group h3")!;
    const options = [...drawer.querySelectorAll<HTMLElement>(".dashboard-filter-options button")];
    const drawerBox = drawer.getBoundingClientRect();
    const bodyBox = body.getBoundingClientRect();
    const firstOptionBox = options[0].getBoundingClientRect();
    const headerStyle = getComputedStyle(header);
    const bodyStyle = getComputedStyle(body);
    return {
      drawerWidth: drawerBox.width,
      headerPaddingInline: parseFloat(headerStyle.paddingInlineStart),
      bodyPaddingInline: parseFloat(bodyStyle.paddingInlineStart),
      bodyOverflowY: bodyStyle.overflowY,
      closeWidth: close.getBoundingClientRect().width,
      closeHeight: close.getBoundingClientRect().height,
      headingFontSize: parseFloat(getComputedStyle(sectionHeading).fontSize),
      optionFontSizes: options.map((option) => parseFloat(getComputedStyle(option).fontSize)),
      optionHeights: options.map((option) => option.getBoundingClientRect().height),
      optionInsetStart: firstOptionBox.left - bodyBox.left,
      optionInsetEnd: bodyBox.right - firstOptionBox.right,
    };
  });
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 834, height: 1112 },
  { width: 768, height: 1024 },
]) {
  test(`auxiliary Dashboard filters attach to the left at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/dashboard");
    await page.getByTestId("dashboard-filters-trigger").click();

    const drawer = page.locator('[data-drawer-variant="auxiliary"]');
    await expect(drawer).toBeVisible();
    await page.waitForTimeout(250);
    const box = await drawer.boundingBox();
    const sizing = await readAuxiliarySizing(page);
    expect(box?.x).toBeLessThanOrEqual(1);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThan(viewport.width);
    expect(sizing.drawerWidth).toBe(viewport.width >= 1200 ? 360 : 340);
    expect(sizing.headerPaddingInline).toBe(20);
    expect(sizing.bodyPaddingInline).toBe(20);
    expect(sizing.closeWidth).toBe(40);
    expect(sizing.closeHeight).toBe(40);
    expect(sizing.headingFontSize).toBe(13);
    expect(sizing.optionFontSizes.every((size) => size === 14)).toBe(true);
    expect(sizing.optionHeights.every((height) => height === 44)).toBe(true);
    expect(sizing.optionInsetStart).toBeGreaterThanOrEqual(19);
    expect(sizing.optionInsetEnd).toBeGreaterThanOrEqual(19);
    expect(sizing.bodyOverflowY).toBe("auto");
    await expect(drawer).toHaveAttribute("dir", "rtl");
    await expectOverlayCoversViewport(page);
    await expectNoHorizontalOverflow(page);

    const focusIsInside = await drawer.evaluate((element) => element.contains(document.activeElement));
    expect(focusIsInside).toBe(true);
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  });
}

test("auxiliary Dashboard filters become a bottom sheet on mobile", async ({ page }) => {
  const viewport = { width: 390, height: 844 };
  await page.setViewportSize(viewport);
  await page.goto("/dashboard");
  await page.getByTestId("dashboard-filters-trigger").click();
  const drawer = page.locator('[data-drawer-variant="auxiliary"]');
  await expect(drawer).toBeVisible();
  await page.waitForTimeout(250);
  const box = await drawer.boundingBox();
  const sizing = await readAuxiliarySizing(page);
  expect(box?.x).toBeLessThanOrEqual(1);
  expect(box?.width).toBe(viewport.width);
  expect(Math.abs((box?.y ?? 0) + (box?.height ?? 0) - viewport.height)).toBeLessThanOrEqual(1);
  expect(box?.height).toBeLessThan(viewport.height);
  expect(sizing.drawerWidth).toBe(viewport.width);
  expect(sizing.bodyPaddingInline).toBe(20);
  expect(sizing.optionHeights.every((height) => height === 44)).toBe(true);
  expect(sizing.optionInsetStart).toBeGreaterThanOrEqual(19);
  expect(sizing.optionInsetEnd).toBeGreaterThanOrEqual(19);
  await expectNoHorizontalOverflow(page);
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});

test("tablet navigation Drawer remains attached to the right", async ({ page }) => {
  const viewport = { width: 834, height: 1112 };
  await page.setViewportSize(viewport);
  await page.goto("/dashboard");
  await page.locator(".workspace-header__menu").click();
  const drawer = page.locator('[data-drawer-variant="navigation"]');
  await expect(drawer).toBeVisible();
  await page.waitForTimeout(250);
  const box = await drawer.boundingBox();
  expect(Math.abs((box?.x ?? 0) + (box?.width ?? 0) - viewport.width)).toBeLessThanOrEqual(1);
  expect(box?.x).toBeGreaterThan(0);
  await expect(drawer).toHaveAttribute("dir", "rtl");
  await expectNoHorizontalOverflow(page);
});

test("Mobile More and Role Preview remain bottom sheets", async ({ page }) => {
  const viewport = { width: 390, height: 844 };
  await page.setViewportSize(viewport);
  await page.goto("/dashboard");

  await page.getByRole("button", { name: "المزيد" }).click();
  let drawer = page.locator('[data-drawer-variant="bottom-sheet"]');
  await expect(drawer).toBeVisible();
  await page.waitForTimeout(250);
  let box = await drawer.boundingBox();
  expect(Math.abs((box?.y ?? 0) + (box?.height ?? 0) - viewport.height)).toBeLessThanOrEqual(1);
  await expectNoHorizontalOverflow(page);
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();

  await page.locator(".role-preview__mobile-trigger").click();
  drawer = page.locator('[data-drawer-variant="bottom-sheet"]');
  await expect(drawer).toBeVisible();
  await page.waitForTimeout(250);
  box = await drawer.boundingBox();
  expect(Math.abs((box?.y ?? 0) + (box?.height ?? 0) - viewport.height)).toBeLessThanOrEqual(1);
  await expect(drawer).toHaveAttribute("dir", "rtl");
  await expectNoHorizontalOverflow(page);
});
