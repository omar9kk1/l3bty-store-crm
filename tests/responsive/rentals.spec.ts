import { expect, test, type Page } from "@playwright/test";
const viewports = [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 834, height: 1112 }, { width: 768, height: 1024 }, { width: 390, height: 844 }];
async function selectOnlyRole(page: Page, role: string) { const mobile = (page.viewportSize()?.width ?? 1440) < 768; await page.getByRole("button", { name: mobile ? "معاينة" : /معاينة الأدوار/ }).click(); await page.getByRole("checkbox", { name: role, exact: true }).click(); if (mobile) await page.getByRole("dialog", { name: "معاينة الأدوار" }).getByRole("button", { name: "إغلاق" }).click(); }
function timerSeconds(value: string | null) { const [hours, minutes, seconds] = (value ?? "0:0:0").split(":").map(Number); return hours * 3600 + minutes * 60 + seconds; }
test("rentals and assets are responsive with mobile cards", async ({ page }) => { test.setTimeout(60_000); for (const viewport of viewports) { await page.setViewportSize(viewport); await page.goto("/rentals"); await expect(page.locator(".rentals-page")).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${viewport.width}`).toBeLessThanOrEqual(1); await expect(page.locator(".rental-card").first()).toBeVisible(); await page.goto("/rental-assets"); expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1); } await expect(page.locator(".active-rental-strip")).toBeVisible(); await expect(page.locator('.active-rental-strip a[href^="/rentals/"]')).toBeVisible(); });
test("rental routes enforce role policy and technician scope", async ({ page }) => { await page.setViewportSize({ width: 1440, height: 900 }); for (const role of ["موظف المبيعات", "فني الصيانة"]) { await page.goto("/rentals/rental-active-15"); await selectOnlyRole(page, role); await expect(page.getByText("لا تملك صلاحية لعرض هذا القسم")).toBeVisible(); } await page.goto("/rental-assets"); await selectOnlyRole(page, "موظف المبيعات"); await expect(page.getByText("لا تملك صلاحية لعرض هذا القسم")).toBeVisible(); await page.goto("/rental-assets"); await selectOnlyRole(page, "فني الصيانة"); await expect(page.getByText("لا تملك صلاحية لعرض هذا القسم")).toBeVisible(); await page.goto("/rentals"); await selectOnlyRole(page, "موظف التأجير واستلام الصيانة"); await expect(page.locator(".rentals-page")).toBeVisible(); });
test("rental filters follow administrator and branch employee scope", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/rentals?branch=all");
  const filters = page.locator(".rental-filters");
  await expect(filters.getByLabel("الفرع")).toBeVisible();
  await expect(filters.getByLabel("الفرع").locator('option[value="all"]')).toHaveText("كل الفروع");
  await expect(filters.locator("select")).toHaveCount(1);

  await selectOnlyRole(page, "موظف التأجير واستلام الصيانة");
  await page.getByLabel("اختيار الفرع").selectOption("branch-2");
  await expect(filters.getByLabel("الفرع")).toHaveCount(0);
  await expect(filters.getByLabel("الموظف")).toHaveCount(0);
  await expect(filters.getByLabel("العميل")).toBeVisible();
  await expect(filters.getByLabel("الأصل")).toBeVisible();
  await expect(page.locator(".rental-card")).toHaveCount(2);
  await expect(page.locator(".rental-card").filter({ hasText: "RNT-2026-0103" })).toHaveCount(1);
  await expect(page.locator(".rental-card").filter({ hasText: "RNT-2026-0104" })).toHaveCount(1);
  await expect(page.locator(".rental-card").filter({ hasText: "RNT-2026-0101" })).toHaveCount(0);
});

test("wizard starts after review and operation pages work", async ({ page }) => { test.setTimeout(45_000); await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/rentals/new", { waitUntil: "networkidle" }); await selectOnlyRole(page, "موظف التأجير واستلام الصيانة"); const customer = page.getByLabel("العميل *"); await customer.selectOption("customer-001"); await expect(customer).toHaveValue("customer-001"); await page.getByRole("button", { name: "التالي" }).click(); await page.getByRole("button", { name: /سكوتر كهربائي — رقم 1/ }).click(); for (let index = 0; index < 2; index++) await page.getByRole("button", { name: "التالي" }).click(); await page.getByLabel("المبلغ المستلم قبل اللعب").fill("200"); for (let index = 0; index < 2; index++) await page.getByRole("button", { name: "التالي" }).click(); await page.getByRole("button", { name: "تأكيد الدفع وإصدار الفاتورة وبدء اللعب" }).click(); await expect(page.locator(".rental-details-page")).toBeVisible(); await expect(page.locator(".rental-detail-grid").getByText("الباقي للعميل").locator("..")).toContainText("100 ج.م"); const timer = page.locator(".rental-hero strong"); const timerBeforeReload = timerSeconds(await timer.textContent()); await page.waitForTimeout(1_100); const createdRentalUrl = page.url(); await page.reload(); await expect(page).toHaveURL(createdRentalUrl); await expect(page.locator(".rental-details-page")).toBeVisible(); expect(timerSeconds(await timer.textContent())).toBeLessThan(timerBeforeReload); await page.getByRole("button", { name: "الرجوع للصفحة السابقة" }).click(); await expect(page).toHaveURL(/\/rentals$/); await expect(page.locator(".rental-wizard")).toHaveCount(0); await page.goto("/rentals/rental-active-15/extend"); await selectOnlyRole(page, "موظف التأجير واستلام الصيانة"); await expect(page.getByRole("heading", { name: "تمديد التأجير" })).toBeVisible(); await page.goto("/rentals/rental-active-15/close"); await selectOnlyRole(page, "موظف التأجير واستلام الصيانة"); await expect(page.getByRole("heading", { name: "إنهاء التأجير" })).toBeVisible(); });

test("five-minute reminder and invoice WhatsApp controls stay scoped", async ({ page }) => { await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/rentals/rental-active-15"); await selectOnlyRole(page, "موظف التأجير واستلام الصيانة"); await expect(page.getByText("متبقي 5 دقائق").first()).toBeVisible(); await expect(page.getByRole("button", { name: "تذكير العميل على واتساب" }).first()).toBeVisible(); await expect(page.getByRole("button", { name: "إرسال الفاتورة عبر واتساب" })).toBeVisible(); await page.goto("/rentals/rental-open"); await selectOnlyRole(page, "موظف التأجير واستلام الصيانة"); await expect(page.locator(".rental-details-page").getByText("متبقي 5 دقائق")).toHaveCount(0); await page.goto("/rentals/rental-completed"); await selectOnlyRole(page, "موظف التأجير واستلام الصيانة"); await expect(page.getByRole("button", { name: "إرسال الفاتورة عبر واتساب" })).toBeVisible(); });
test("open-time rentals can be ended but never extended", async ({ page }) => { await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/rentals/rental-open"); await selectOnlyRole(page, "موظف التأجير واستلام الصيانة"); await expect(page.getByRole("link", { name: "تمديد", exact: true })).toHaveCount(0); await expect(page.getByRole("link", { name: "إنهاء", exact: true })).toBeVisible(); await page.goto("/rentals/rental-open/extend"); await selectOnlyRole(page, "موظف التأجير واستلام الصيانة"); await expect(page.getByRole("heading", { name: "الوقت المفتوح لا يحتاج تمديدًا" })).toBeVisible(); await expect(page.getByRole("button", { name: "تأكيد التمديد" })).toHaveCount(0); });
test("rental details and active strip timers update every second while completed details stay fixed", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/rentals/rental-active-15");
  const detailsTimer = page.locator(".rental-hero strong");
  const stripTimer = page.locator(".active-rental-strip__timer");
  await expect(detailsTimer).toHaveText(/[0-9]{2}:[0-9]{2}:[0-9]{2}/);
  await expect(stripTimer).toHaveText(/[0-9]{2}:[0-9]{2}:[0-9]{2}/);
  const detailsBefore = await detailsTimer.textContent();
  const stripBefore = await stripTimer.textContent();
  await page.waitForTimeout(1100);
  await expect(detailsTimer).not.toHaveText(detailsBefore ?? "");
  await expect(stripTimer).not.toHaveText(stripBefore ?? "");

  await page.goto("/rentals/rental-completed");
  const completedTimer = page.locator(".rental-hero strong");
  const completedBefore = await completedTimer.textContent();
  await page.waitForTimeout(1100);
  await expect(completedTimer).toHaveText(completedBefore ?? "");
});

test("quick customer drawer follows overlay policy", async ({ page }) => { await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/rentals/new"); await selectOnlyRole(page, "موظف التأجير واستلام الصيانة"); await page.getByRole("button", { name: "إضافة عميل سريعًا" }).click(); const drawer = page.getByRole("dialog", { name: "إضافة عميل سريعًا" }); expect((await drawer.boundingBox())?.x).toBeLessThan(3); await drawer.getByRole("button", { name: "إغلاق" }).click(); await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole("button", { name: "إضافة عميل سريعًا" }).click(); await expect(page.getByRole("dialog", { name: "إضافة عميل سريعًا" })).toHaveCSS("inset-block-end", "0px"); });

test("each rental shows a live timer with the correct time mode", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/rentals?branch=all");
  const rows = page.locator(".rental-card");
  await expect(rows).toHaveCount(4);
  await expect(page.locator(".rental-card .rental-ring-timer")).toHaveCount(4);
  await expect(page.getByRole("progressbar")).toHaveCount(4);

  const activeTimer = rows.filter({ hasText: "RNT-2026-0101" }).locator(".rental-ring-timer");
  await expect(activeTimer).toHaveClass(/rental-ring-timer--fixed/);
  await expect(activeTimer).toHaveClass(/rental-ring-timer--success/);
  await expect(activeTimer).toHaveCSS("color", "rgb(201, 242, 76)");
  await expect(activeTimer.locator("strong")).toHaveText(/[0-9]{2}:[0-9]{2}:[0-9]{2}/);
  const before = await activeTimer.locator("strong").textContent();
  const progressBefore = Number(await activeTimer.getAttribute("data-progress"));
  const stroke = activeTimer.locator(".rental-ring-timer__value");
  const offsetBefore = parseFloat(await stroke.evaluate((element) => getComputedStyle(element).strokeDashoffset));
  await page.waitForTimeout(1100);
  await expect(activeTimer.locator("strong")).not.toHaveText(before ?? "");
  const progressAfter = Number(await activeTimer.getAttribute("data-progress"));
  expect(progressAfter).not.toBe(progressBefore);
  const offsetAfter = parseFloat(await stroke.evaluate((element) => getComputedStyle(element).strokeDashoffset));
  expect(offsetAfter).not.toBe(offsetBefore);
  await expect(stroke).toHaveCSS("animation-name", "rental-ring-pulse");

  const overtimeTimer = rows.filter({ hasText: "RNT-2026-0103" }).locator(".rental-ring-timer");
  await expect(overtimeTimer).toHaveClass(/rental-ring-timer--danger/);
  await expect(overtimeTimer.locator(".rental-ring-timer__value")).toHaveCSS("animation-name", "rental-ring-alert");
  await expect(rows.filter({ hasText: "RNT-2026-0104" }).locator(".rental-ring-timer")).toHaveClass(/rental-ring-timer--open/);
  const openTimer = rows.filter({ hasText: "RNT-2026-0104" }).locator(".rental-ring-timer");
  const openProgressBefore = Number(await openTimer.getAttribute("data-progress"));
  await page.waitForTimeout(1100);
  const openProgressAfter = Number(await openTimer.getAttribute("data-progress"));
  expect(openProgressAfter).not.toBe(openProgressBefore);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".rental-card .rental-ring-timer").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test("branch 2 has available demo assets for a new rental", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/rentals");
  await selectOnlyRole(page, "موظف التأجير واستلام الصيانة");
  await page.getByLabel("اختيار الفرع").selectOption("branch-2");
  await page.getByRole("link", { name: "تأجير جديد" }).click();
  await page.getByLabel("العميل *").selectOption("customer-001");
  await page.getByRole("button", { name: "التالي" }).click();
  await expect(page.getByRole("button", { name: /عربية دريفت كهربائية — رقم 2/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /سكوتر كهربائي — رقم 2/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /عربية دفع رباعي للأطفال — رقم 2/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /موتوسيكل أطفال كهربائي — رقم 2/ })).toBeVisible();
  await expect(page.getByText("لا توجد أصول متاحة في الفرع.")).toHaveCount(0);
});

test("new rental pricing uses 50 EGP per quarter hour", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/rentals");
  await selectOnlyRole(page, "موظف التأجير واستلام الصيانة");
  await page.getByLabel("اختيار الفرع").selectOption("branch-2");
  await page.getByRole("link", { name: "تأجير جديد" }).click();
  await page.getByLabel("العميل *").selectOption("customer-001");
  await page.getByRole("button", { name: "التالي" }).click();
  await page.getByRole("button", { name: /عربية دريفت كهربائية — رقم 2/ }).click();
  await page.getByRole("button", { name: "التالي" }).click();

  await expect(page.getByLabel("السعر لكل 15 دقيقة — ج.م")).toHaveValue("50");
  const summary = page.locator(".rental-wizard__panel").getByText(/القيمة المبدئية/);
  await page.getByRole("button", { name: "15 دقيقة", exact: true }).click();
  await expect(summary).toContainText("50 ج.م");
  await page.getByRole("button", { name: "30 دقيقة", exact: true }).click();
  await expect(summary).toContainText("100 ج.م");
  await page.getByRole("button", { name: "45 دقيقة", exact: true }).click();
  await expect(summary).toContainText("150 ج.م");
  await page.getByRole("button", { name: "60 دقيقة", exact: true }).click();
  await expect(summary).toContainText("200 ج.م");
});

test("active rentals can be closed directly from the list", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/rentals?branch=all", { waitUntil: "networkidle" });
  await selectOnlyRole(page, "موظف التأجير واستلام الصيانة");
  await page.getByLabel("اختيار الفرع").selectOption("branch-2");
  await expect(page.locator('a[href^="/rental-damage"]')).toHaveCount(0);
  const openRow = page.locator(".rental-card").filter({ hasText: "RNT-2026-0104" });
  const closeAction = openRow.getByRole("link", { name: "إنهاء", exact: true });
  await expect(closeAction).toHaveAttribute("href", "/rentals/rental-open/close");
  await expect(closeAction).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(closeAction).toHaveCSS("font-weight", "700");
  await closeAction.click();
  await expect(page.locator('.rental-operation-form input[type="checkbox"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "إنهاء التأجير" })).toBeVisible();
  await expect(page.getByRole("button", { name: "إرسال الفاتورة عبر واتساب" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "عرض وطباعة الفاتورة" })).toHaveCount(0);
  await expect(page.getByText("بعد تأكيد الدفع سيتم إنهاء التأجير وإظهار الفاتورة.")).toBeVisible();
  await page.getByLabel("المبلغ المستلم من العميل").fill("3000");
  await expect(page.locator(".rental-operation-form dl").getByText("الباقي للعميل").locator("..")).not.toContainText("0 ج.م");
  const collectAndInvoice = page.getByRole("button", { name: "تأكيد الدفع وإنهاء وإصدار الفاتورة" });
  await expect(collectAndInvoice).toBeVisible();
  await expect(page.locator(".rental-operation-form dl").getByText(/الإجمالي النهائي/).locator("..")).not.toContainText("0 ج.م");
  await expect(page.locator(".rental-operation-form dl").getByText("المطلوب دفعه الآن")).toBeVisible();
  await collectAndInvoice.click();
  await expect(page).toHaveURL(/\/rentals\/rental-open\?receipt=ready$/);
  await expect(page.locator(".rental-details-page").getByText("منتهي", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("تم الدفع وإصدار الفاتورة");
  await expect(page.locator(".rental-detail-grid").getByText("حالة الفاتورة").locator("..")).toContainText("صادرة");
  await expect(page.locator(".rental-detail-grid").getByText("الباقي للعميل").locator("..")).not.toContainText("0 ج.م");
  await expect(page.getByRole("button", { name: "إرسال الفاتورة عبر واتساب" })).toBeVisible();
  const invoiceLink = page.getByRole("link", { name: "عرض وطباعة الفاتورة" });
  await expect(invoiceLink).toHaveAttribute("href", "/rental-invoices/rental-open");
  const invoicePagePromise = page.waitForEvent("popup");
  await invoiceLink.click();
  const invoicePage = await invoicePagePromise;
  await expect(invoicePage).toHaveURL(/\/rental-invoices\/rental-open$/);
  await expect(invoicePage.getByRole("heading", { name: "فاتورة تأجير" })).toBeVisible();
  await expect(invoicePage.locator(".rental-invoice-document")).toContainText("إجمالي الفاتورة");
  await expect(invoicePage.locator(".rental-invoice-document")).toContainText("المبلغ المستلم");
  await expect(invoicePage.locator(".rental-invoice-document")).toContainText("الباقي للعميل");
  await expect(page.locator(".active-rental-strip")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "تمديد", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "إنهاء", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "التأجير", exact: true }).click();
  await expect(page).toHaveURL(/\/rentals$/);
  await expect(page.locator(".active-rental-strip")).toBeVisible();
  await expect(page.getByRole("link", { name: "إنهاء", exact: true }).first()).toBeVisible();
  await page.reload();
  await selectOnlyRole(page, "موظف التأجير واستلام الصيانة");
  await expect(page.locator(".active-rental-strip")).toBeVisible();
  await expect(page.getByRole("link", { name: "إنهاء", exact: true }).first()).toBeVisible();
});

test("owner and manager see active rentals and shift collections without rental actions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const role of ["المالك", "المدير"]) {
    await page.goto("/rentals?branch=all");
    if (role === "المدير") await selectOnlyRole(page, role);
    await expect(page.getByTestId("active-rental-count")).toContainText("4");
    await expect(page.getByTestId("rental-shift-collected")).toContainText("165 ج.م");
    await expect(page.locator(".rental-summary")).toHaveClass(/rental-summary--administrative/);
    await expect(page.getByTestId("rental-shift-collected").locator("strong")).toHaveCSS("white-space", "nowrap");
    await expect(page.locator(".rental-card")).toHaveCount(4);
    await expect(page.getByRole("link", { name: "تأجير جديد" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "إنهاء", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /واتساب/ })).toHaveCount(0);
    await page.locator(".rental-card").first().getByRole("link", { name: "عرض التفاصيل" }).click();
    await expect(page.locator(".rental-details-page")).toBeVisible();
    await expect(page.locator(".rental-actions")).toHaveCount(0);
    await page.goto("/rentals/new");
    await expect(page.getByText("لا تملك صلاحية لعرض هذا القسم")).toBeVisible();
    await page.goto("/rentals/rental-active-15/close");
    await expect(page.getByText("لا تملك صلاحية لعرض هذا القسم")).toBeVisible();
  }
});
















