# تقرير Sprint 13 — المصروفات والرواتب والسلف

تاريخ التنفيذ: 6 أغسطس 2026  
الحالة: مكتمل ضمن Frontend/Mock State فقط، بلا Supabase أو Auth أو قاعدة بيانات أو دفع بنكي.

## 1. النطاق المنفذ

- تحويل `/expenses` إلى إدارة فعلية لطلبات المصروفات والموافقة والدفع والعكس.
- إضافة `/my-expenses` لطلبات الموظف الحالي وحالاتها فقط.
- تحويل `/payroll` إلى ملخص إداري للرواتب والسلف.
- إضافة `/payroll/runs` لتشغيل دورة الرواتب.
- إضافة `/payroll/[payrollId]` لمراجعة الدورة واعتمادها ودفعها وقفلها.
- إضافة `/payroll/advances` لإدارة طلبات السلف والأقساط.
- إضافة `/my-payroll` لكشف راتب وسلف الموظف الحالي فقط.
- ربط الحسابات بموظفي وفروع وحضور وخزائن المشروع الحالية دون تكرار كياناتها.
- تحديث Dashboard بصورة محدودة بتنبيهات المصروفات والرواتب والسلف الإدارية والشخصية.

لم تبدأ التقارير أو الإشعارات الكاملة أو الإعدادات أو Supabase.

## 2. الفصل بين الصفحات الإدارية والشخصية

### الإدارة

المسارات `/expenses` و`/payroll` وكل المسارات الفرعية لهما متاحة للمالك والمدير فقط. الحماية مطبقة من Permission Policy المركزية، ولذلك لا يظهر المحتوى قبل حالة منع الوصول، كما تختفي روابط Sidebar وMobile More عن الأدوار التشغيلية.

### الموظف

- `/my-expenses`: يعرض طلبات الموظف الحالي ويسمح له بإنشاء طلب فقط.
- `/my-payroll`: يعرض كشوف الموظف المنشورة وسلفه فقط ويسمح له بطلب سلفة.
- المساران الشخصيان موجودان داخل قائمة المستخدم، وليس Sidebar الرئيسي.
- أي معرف موظف في URL لا يغير نطاق البيانات؛ الهوية التجريبية تحل من الدور الحالي.

## 3. عقود المصروفات

أضيفت عقود `Expense` و`ExpenseCategory` و`ExpenseAttachment` و`ExpenseAudit` و`ExpenseNotification`، مع الحالات المطلوبة للمصروف والموافقة والدفع.

الفئات التجريبية:

- نقل وشحن.
- صيانة معدات.
- شراء أدوات.
- كهرباء ومرافق.
- نظافة.
- ضيافة إدارية.
- مصروف طارئ.
- عهدة موظف.
- مشتريات تشغيلية.

يشترط طلب الموظف فرعًا مسندًا ومبلغًا موجبًا ووصفًا وغرضًا. بعض الفئات تتطلب مرجع مرفق Mock. لا ينشئ الطلب حركة خزينة قبل الموافقة والدفع، ولا يستطيع الموظف اعتماد طلبه.

## 4. الموافقات ودفع المصروف

- المالك أو المدير يستطيع الاعتماد أو الرفض أو طلب معلومات مع سبب.
- تعديل المبلغ أو الفئة محفوظ في Audit بالقيمة السابقة والجديدة.
- المصروف المعتمد يدفع من خزينة نشطة مطابقة للفرع بعد فحص الرصيد.
- الدفع ينشئ `Payment` خارجًا مرتبطًا بالمصروف ومفتاح Idempotency.
- لا يمكن دفع المصروف مرتين.
- عكس السداد ينشئ حركة عكسية ويحافظ على الأصل.
- لا يوجد Hard Delete؛ الإلغاء أو العكس موثق بسبب.
- الموظف يرى حالة السداد ولا يرى رصيد الخزينة.

## 5. عقود الرواتب والسلف

أضيفت:

- `PayrollRun`
- `PayrollLine`
- `SalaryProfile`
- `PayrollComponent`
- `Advance`
- `PayrollTimelineEvent`
- `PayrollAudit`

تغطي البيانات التجريبية الرواتب الشهرية واليومية وبالساعة، والوقت الإضافي المعتمد، والبدلات، والخصومات المعتمدة، والسلف، والدورات المسودة وتحت المراجعة والمعتمدة والمدفوعة جزئيًا والمقفلة.

## 6. الحسابات والوقت الإضافي والخصومات

- تستخدم المبالغ `MoneyString` وعمليات صحيحة على السنت داخل `lib/utils/money.ts`، ولا تعتمد الحسابات على Float مباشر.
- الإجمالي = الأساسي + الوقت الإضافي المعتمد + البدلات + العمولات.
- الخصومات = الخصومات المعتمدة + قسط السلفة.
- الصافي = الإجمالي − الخصومات.
- يمنع صافي الراتب السالب دون موافقة استثنائية واضحة.
- الوقت الإضافي يعمل بالمعدل العادي فقط، ويتطلب `overtimeEnabled` ودقائق معتمدة.
- التأخير والغياب بيانات مراجعة فقط ولا ينشئان خصمًا تلقائيًا.
- فرق الوردية لا ينشئ خصمًا تلقائيًا.
- كل خصم فعلي يحتاج مكونًا مستقلاً بمصدر وسبب وقيمة ومعتمد ووقت.
- العمولات معطلة افتراضيًا وقيمتها `0.00`، ولا يوجد ربط تلقائي بالمبيعات.

## 7. تشغيل دورة الرواتب

المسار الكامل يغطي اختيار الفترة والفرع، جلب الموظفين النشطين وSalary Profiles، قراءة الحضور، إضافة الوقت الإضافي والخصومات المعتمدة، ربط أقساط السلف، حساب المسودة، المراجعة، الاعتماد، الدفع Mock والقفل.

قواعد الحماية:

- لا دورة معتمدة ثانية لنفس الموظف والفترة.
- لا تعديل لدورة مقفلة.
- لا دفع قبل الاعتماد.
- لا دفع لسطر الراتب مرتين.
- الدفع الجزئي يحول الدورة إلى `partially_paid`.
- الدورة لا تقفل إلا بعد دفع كل السطور.
- لا حذف لدورة معتمدة؛ الإلغاء متاح للمسودة فقط والتصحيح المستقبلي يحفظ الأصل.

## 8. كشف راتب الموظف والسلف

يعرض `/my-payroll` آخر كشف منشور فقط؛ تم استبعاد المسودات والدورات تحت المراجعة من كشف الموظف. يعرض الأساسي والوقت الإضافي والبدلات والخصومات وقسط السلفة والصافي وحالة وتاريخ الدفع والأشهر السابقة والسلف الحالية.

الموظف يستطيع طلب سلفة ورؤية المتبقي والقسط القادم، لكنه لا يعتمدها أو يغير أقساطها أو يرى سلف غيره. الإدارة تستطيع الاعتماد أو الرفض وتعديل القيمة والأقساط بسبب موثق ثم الدفع من خزينة. يمنع القسط الأعلى من صافي الراتب دون موافقة استثنائية.

أضيفت طباعة Browser Mock فقط، دون PDF خادمي.

## 9. الصلاحيات

أضيفت الصلاحيات المركزية:

- `expenses.view`, `expenses.create`, `expenses.view_self`, `expenses.approve`, `expenses.pay`
- `payroll.view`, `payroll.view_self`, `payroll.manage`, `payroll.approve`, `payroll.pay`
- `advances.request`, `advances.manage`

التوزيع:

- المالك والمدير: إدارة كاملة لكل المصروفات والرواتب والسلف والفروع.
- موظف المبيعات: الطلبات والكشوف والسلف الشخصية فقط.
- موظف التأجير واستلام الصيانة: الطلبات والكشوف والسلف الشخصية فقط.
- فني الصيانة: الطلبات والكشوف والسلف الشخصية فقط، دون الخزائن أو الإدارة المالية.
- لا يوجد دور محاسب أو دور تشغيل قديم جامع.

## 10. الملفات المنشأة

### المصروفات

- `features/expenses/types.ts`
- `features/expenses/permissions.ts`
- `features/expenses/fixtures.ts`
- `features/expenses/schemas/expense-schema.ts`
- `features/expenses/services/expense-store.ts`
- `features/expenses/hooks/use-expenses.ts`
- `features/expenses/components/expense-labels.ts`
- `features/expenses/components/ExpensesPage.tsx`
- `features/expenses/components/MyExpensesPage.tsx`
- `features/expenses/tests/expenses.spec.ts`

### الرواتب

- `features/payroll/types.ts`
- `features/payroll/permissions.ts`
- `features/payroll/fixtures.ts`
- `features/payroll/schemas/payroll-schema.ts`
- `features/payroll/services/payroll-store.ts`
- `features/payroll/hooks/use-payroll.ts`
- `features/payroll/components/payroll-labels.ts`
- `features/payroll/components/PayrollPage.tsx`
- `features/payroll/components/PayrollRunsPage.tsx`
- `features/payroll/components/PayrollRunDetailsPage.tsx`
- `features/payroll/components/AdvancesPage.tsx`
- `features/payroll/components/MyPayrollPage.tsx`
- `features/payroll/tests/payroll.spec.ts`

### الصفحات والتصميم والاختبارات

- `app/(workspace)/my-expenses/page.tsx`
- `app/(workspace)/my-payroll/page.tsx`
- `app/(workspace)/payroll/runs/page.tsx`
- `app/(workspace)/payroll/advances/page.tsx`
- `app/(workspace)/payroll/[payrollId]/page.tsx`
- `styles/expenses.css`
- `styles/payroll.css`
- `tests/responsive/expenses-payroll.spec.ts`
- `lib/utils/money.ts`

## 11. الملفات المعدلة

- `app/(workspace)/expenses/page.tsx`
- `app/(workspace)/payroll/page.tsx`
- `app/globals.css`
- `components/shell/Header.tsx`
- `permissions/types.ts`
- `permissions/keys.ts`
- `permissions/role-templates.ts`
- `permissions/navigation-policy.ts`
- `features/finance/types.ts`
- `features/finance/fixtures.ts`
- `features/finance/components/finance-labels.ts`
- `features/finance/services/finance-store.ts`
- `features/dashboard/services/get-dashboard-data.ts`
- `vitest.config.mts`

## 12. التصميم وResponsive

- `styles/expenses.css` و`styles/payroll.css` موجودان فعليًا ومستوردان مرة واحدة.
- Auxiliary Drawers من اليسار على Desktop/Tablet، وتتحول إلى Bottom Sheet على الهاتف.
- عرض النموذج يستخدم معيار Drawer المشترك 360px مع حقول بارتفاع 44px، وBody قابل للتمرير.
- الجداول تتحول إلى بطاقات على الهاتف.
- لا يوجد Horizontal Scroll ولا تداخل للمبالغ أو أزرار تحت Mobile Navigation.
- RTL وخط IBM Plex Sans Arabic وقواعد App Shell الحالية محفوظة.

تم التحقق عند 1920×1080 و1440×900 و1366×768 و1024×768 و834×1112 و768×1024 و390×844.

## 13. نتائج الجودة

| الفحص | النتيجة |
|---|---|
| `npm run check:styles` | ناجح — 22 استيراد CSS محليًا |
| `npm run build` | ناجح — Next.js 16.3.0 وتوليد 47 صفحة |
| `npm run lint` | ناجح بلا أخطاء |
| `npm run typecheck` | ناجح بلا أخطاء |
| `npm test` | ناجح — 189/189 اختبارًا في 21 ملفًا |
| `npm run test:e2e` | ناجح — 74/74 اختبارًا |

شغل E2E على خادم Production مستقل بالمنفذ 3111 لتجنب تعليق خادم Playwright التلقائي على Windows. تمت مراجعة المسارات السبعة يدويًا داخل متصفح التطبيق عند 1440×900 و390×844؛ لا توجد أخطاء Console أو قص أو تمرير أفقي.

## 14. مراجعة المصطلحات المحظورة

تم فحص ملفات الـFeature والمسارات والتصميم والاختبارات. لا توجد إشارات إلى دور محاسب أو دور التشغيل القديم أو التأمين أو الوديعة أو الأموال المحتجزة. كل المبالغ بالجنيه المصري.

## 15. القيود والقرارات المؤجلة

- الحالة In-memory Mock وتعود للوضع الأصلي عند إعادة تشغيل التطبيق.
- لا يوجد Auth حقيقي أو قاعدة بيانات أو قفل تزامن متعدد المستخدمين.
- لا يوجد Bank API أو قيد محاسبي إنتاجي أو PDF خادمي.
- مرفقات المصروفات مراجع Mock فقط ولا تُرفع إلى Storage.
- إعداد تفعيل العمولات موجود في العقد ومعطل؛ بناء شاشة إعداداته مؤجل.
- النسخة المصححة لدورة معتمدة ممثلة كقاعدة عمل وAudit، أما Wizard تصحيح مستقل فيؤجل مع التخزين الخادمي.
- عند الإنتاج يجب نقل كل الموافقات والصرف ودفع الرواتب والسلف إلى خدمات خادمية داخل معاملات ذرية وقيود Idempotency دائمة.

## 16. الخلاصة

أصبحت المصروفات والرواتب والسلف Features فعلية داخل التطبيق الحالي، مع فصل صارم بين الإدارة والموظف، حسابات مالية آمنة، موافقات ودفع وعكس موثق، وقت إضافي بالمعدل العادي، وغياب أي خصم تلقائي من الحضور أو فروق الورديات. جميع فحوصات الجودة والانحدار ناجحة ولا توجد مشكلة مانعة ضمن Sprint 13.
