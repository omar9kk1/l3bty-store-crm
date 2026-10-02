import { expect, test, type Page } from "@playwright/test";

async function switchToRentalEmployee(page: Page) {
  await page.getByRole("button", { name: /معاينة/ }).click();
  await page.getByRole("checkbox", { name: "موظف التأجير واستلام الصيانة", exact: true }).click();
}

function timerSeconds(value: string) {
  const [hours, minutes, seconds] = value.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

test("employee changes the game inside the same rental without resetting time", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/rentals/rental-open");
  await switchToRentalEmployee(page);

  const timer = page.locator(".rental-hero strong");
  const before = timerSeconds((await timer.textContent())?.trim() ?? "00:00:00");
  await page.getByRole("button", { name: "تغيير اللعبة", exact: true }).click();

  const changePanel = page.getByRole("region", { name: "تغيير اللعبة مع استمرار الوقت" });
  await expect(changePanel).toBeVisible();
  await expect(page.locator(".rental-actions").getByRole("region", { name: "تغيير اللعبة مع استمرار الوقت" })).toBeVisible();
  await expect(changePanel.getByText("سيستمر نفس العداد ونفس التأجير دون إعادة الوقت أو الحساب.")).toBeVisible();
  await changePanel.getByRole("button", { name: /عربية دريفت كهربائية — رقم 2/ }).click();
  await changePanel.getByRole("button", { name: "تأكيد وتكملة الوقت" }).click();

  await expect(page).toHaveURL(new RegExp("/rentals/rental-open$"));
  await expect(page.locator(".rentals-header h2")).toHaveText("عربية دريفت كهربائية — رقم 2");
  await expect(page.locator(".active-rental-strip strong").first()).toHaveText("عربية دريفت كهربائية — رقم 2");
  await expect(page.getByRole("status")).toHaveText("تم تغيير اللعبة واستمرار نفس الوقت.");
  await expect(page.locator(".rental-timeline")).toContainText("مع استمرار نفس العداد");

  const after = timerSeconds((await timer.textContent())?.trim() ?? "00:00:00");
  expect(after).toBeGreaterThanOrEqual(before);
  expect(after - before).toBeLessThanOrEqual(3);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "تغيير اللعبة", exact: true }).click();
  await expect(page.getByRole("region", { name: "تغيير اللعبة مع استمرار الوقت" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

