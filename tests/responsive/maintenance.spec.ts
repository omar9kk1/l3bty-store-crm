import { expect, test, type Page } from "@playwright/test";

const viewports=[{width:1920,height:1080},{width:1440,height:900},{width:1024,height:768},{width:834,height:1112},{width:390,height:844}];
async function chooseOnlyRole(page:Page,role:string){const mobile=(page.viewportSize()?.width??1440)<768;const trigger=page.getByRole("button",{name:mobile?"معاينة":/معاينة الأدوار/});await trigger.click();const panel=mobile?page.getByRole("dialog",{name:"معاينة الأدوار"}):page.locator(".role-preview__panel");const target=panel.getByRole("checkbox",{name:role,exact:true});await target.setChecked(true);for(const option of await panel.locator(".role-preview__option").all()){if((await option.innerText()).trim()!==role)await option.getByRole("checkbox").setChecked(false)}if(mobile)await panel.getByRole("button",{name:"إغلاق"}).click();else await trigger.click();}

test("maintenance routes remain RTL and responsive",async({page})=>{test.setTimeout(120_000);await page.setViewportSize(viewports[0]);await page.goto("/maintenance");await chooseOnlyRole(page,"موظف التأجير واستلام الصيانة");for(const viewport of viewports){await page.setViewportSize(viewport);for(const route of ["/maintenance","/maintenance/intake","/maintenance/faults","/maintenance/faults/fault-1","/maintenance/orders/maintenance-order-4"]){await page.goto(route);await expect(page.locator("html")).toHaveAttribute("dir","rtl");expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),`${route} at ${viewport.width}`).toBeLessThanOrEqual(1);}await page.goto("/maintenance");if(viewport.width<768){await expect(page.locator(".maintenance-table-wrap")).toBeHidden();await expect(page.locator(".maintenance-mobile-card, .maintenance-state").first()).toBeVisible();}}});

test("maintenance direct URLs and actions follow the role policy",async({page})=>{
  test.setTimeout(20_000);
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/maintenance");
  await chooseOnlyRole(page,"موظف المبيعات");
  await expect(page.locator(".feedback-state")).toBeVisible();
  await page.goto("/dashboard");
  await chooseOnlyRole(page,"فني الصيانة");
  await page.goto("/maintenance/faults");
  await expect(page.getByRole("heading",{name:"صندوق بلاغات الأعطال"})).toBeVisible();
  await expect(page.locator(".feedback-state")).toHaveCount(0);
});

test("customer intake keeps only the essential fields",async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto("/maintenance");await chooseOnlyRole(page,"موظف التأجير واستلام الصيانة");await page.goto("/maintenance/intake");await expect(page.getByRole("button",{name:/عطل أصل تأجير داخلي/})).toBeVisible();await page.getByRole("button",{name:/لعبة كهربائية للعميل/}).click();const form=page.locator(".maintenance-form");await expect(form.getByLabel("العميل")).toBeVisible();await expect(form.getByLabel("اسم اللعبة")).toBeVisible();await expect(form.getByLabel("وصف العطل")).toBeVisible();await expect(form.getByLabel("الحالة عند الاستلام")).toBeVisible();await expect(form.getByLabel("الملحقات المستلمة")).toBeVisible();await expect(form.getByLabel("الفرع")).toHaveCount(0);await expect(form.getByLabel("الماركة/الموديل")).toHaveCount(0);await expect(form.getByLabel("الأولوية")).toHaveCount(0);await expect(form.getByLabel("موعد الفحص المتوقع")).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);});

test("maintenance page opens the correct branch or customer intake workflow",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/maintenance");
  await chooseOnlyRole(page,"موظف التأجير واستلام الصيانة");
  const branchReport=page.getByRole("link",{name:"بلاغ عطل",exact:true});
  const customerIntake=page.getByRole("link",{name:"استلام لعبة",exact:true});
  await expect(branchReport).toHaveAttribute("href","/maintenance/intake?type=internal_asset");
  await expect(customerIntake).toHaveAttribute("href","/maintenance/intake?type=customer_item");

  await customerIntake.click();
  await expect(page.getByRole("heading",{name:"استلام لعبة عميل للصيانة"})).toBeVisible();
  await expect(page.getByRole("button",{name:/لعبة كهربائية للعميل/})).toHaveAttribute("aria-pressed","true");
  await expect(page.getByLabel("العميل")).toBeVisible();
  await expect(page.getByLabel("اسم اللعبة")).toBeVisible();

  await page.goto("/maintenance/intake?type=internal_asset");
  await expect(page.getByRole("heading",{name:"بلاغ عطل لعبة الفرع"})).toBeVisible();
  await expect(page.getByRole("button",{name:/عطل أصل تأجير داخلي/})).toHaveAttribute("aria-pressed","true");
  await expect(page.getByLabel("أصل التأجير")).toBeVisible();
  await expect(page.getByRole("button",{name:"إرسال بلاغ العطل"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test("owner monitors maintenance while manager manages it",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/maintenance");
  await chooseOnlyRole(page,"المدير");
  await expect(page.getByRole("heading",{name:"إدارة الصيانة"})).toBeVisible();
  await expect(page.getByRole("link",{name:"بلاغ عطل",exact:true})).toHaveCount(0);
  await expect(page.getByRole("link",{name:"استلام لعبة",exact:true})).toHaveCount(0);
  await expect(page.getByRole("link",{name:"صندوق البلاغات",exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"الورشة المركزية",exact:true})).toBeVisible();

  await chooseOnlyRole(page,"مالك النشاط");
  await expect(page.getByRole("heading",{name:"متابعة الصيانة"})).toBeVisible();
  await expect(page.locator(".maintenance-page__header .maintenance-actions a")).toHaveCount(0);
  await page.goto("/maintenance/intake");
  await expect(page.getByText("لا تملك صلاحية لعرض هذا القسم")).toBeVisible();
});
