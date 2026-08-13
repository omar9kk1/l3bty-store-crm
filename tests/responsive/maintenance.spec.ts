import { expect, test, type Page } from "@playwright/test";

const viewports=[{width:1920,height:1080},{width:1440,height:900},{width:1024,height:768},{width:834,height:1112},{width:390,height:844}];
async function chooseOnlyRole(page:Page,role:string){const mobile=(page.viewportSize()?.width??1440)<768;await page.getByRole("button",{name:/معاينة/}).click();await page.getByRole("checkbox",{name:role,exact:true}).click();await page.getByRole("checkbox",{name:"مالك النشاط",exact:true}).click();if(mobile)await page.getByRole("dialog",{name:"معاينة الأدوار"}).getByRole("button",{name:"إغلاق"}).click();}

test("maintenance routes remain RTL and responsive",async({page})=>{test.setTimeout(120_000);for(const viewport of viewports){await page.setViewportSize(viewport);for(const route of ["/maintenance","/maintenance/intake","/maintenance/faults","/maintenance/faults/fault-1","/maintenance/orders/maintenance-order-4","/maintenance/workshop"]){await page.goto(route);await expect(page.locator("html")).toHaveAttribute("dir","rtl");expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),`${route} at ${viewport.width}`).toBeLessThanOrEqual(1);}await page.goto("/maintenance");if(viewport.width<768){await expect(page.locator(".maintenance-table-wrap")).toBeHidden();await expect(page.locator(".maintenance-mobile-card").first()).toBeVisible();}}});

test("maintenance direct URLs and actions follow the role policy",async({page})=>{
  test.setTimeout(20_000);
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/maintenance");
  await chooseOnlyRole(page,"موظف المبيعات");
  await expect(page.locator(".feedback-state")).toBeVisible();
  await page.goto("/dashboard");
  await page.getByRole("button",{name:/معاينة/}).click();
  await page.getByRole("checkbox",{name:"فني الصيانة",exact:true}).click();
  await page.getByRole("checkbox",{name:"مالك النشاط",exact:true}).click();
  await page.locator(".sidebar").getByRole("link",{name:"الصيانة",exact:true}).click();
  await expect(page.getByRole("heading",{name:"صندوق بلاغات الأعطال"})).toBeVisible();
  await page.locator(".fault-card").filter({hasText:"FLT-2026-0001"}).getByRole("link",{name:"فتح البلاغ"}).click();
  await page.getByRole("button",{name:"تأكيد استلام البلاغ"}).click();
  await expect(page.getByText(/أصبح الفني مسؤولًا/)).toBeVisible();
});

test("customer intake keeps the two workflows visually distinct",async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto("/maintenance/intake");await expect(page.getByRole("button",{name:/عطل أصل تأجير داخلي/})).toBeVisible();await page.getByRole("button",{name:/لعبة كهربائية للعميل/}).click();await expect(page.getByLabel("العميل")).toBeVisible();await expect(page.getByLabel("اسم اللعبة")).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);});

test("maintenance page opens the correct branch or customer intake workflow",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/maintenance");
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
