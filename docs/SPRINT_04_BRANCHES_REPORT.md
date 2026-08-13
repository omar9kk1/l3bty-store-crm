# تقرير Sprint 04 — الفروع والمواقع

تاريخ الإقفال: 5 أغسطس 2026

## النتيجة

تم تحويل مسارَي `/branches` و`/branches/[branchId]` إلى Feature فعلي قائم على Mock Data موحدة، مع دعم الفرق الصريح بين الفرع التجاري والورشة المركزية، وربط اختيار الفرع النشط مع App Shell. لم يبدأ تنفيذ الموظفين أو الحضور أو الورديات أو المخازن أو الخزائن كـFeatures مستقلة.

## مصدر البيانات الموحد

- المصدر الوحيد لهويات الفروع والمواقع هو `mock-data/branches.ts`.
- يستهلك App Shell وDashboard وCustomers وBranches المصدر نفسه بدل قوائم متكررة.
- البيانات الحالية: الفرع الرئيسي `BR01`، فرع 2 `BR02`، فرع 3 `BR03`، والورشة المركزية `WRK`.
- الورشة معرفة بنوع `central_workshop` وليست فرع بيع؛ لذلك لا تعرض ملخص مبيعات أو خزائن افتراضية.
- العناوين، أسماء المسؤولين، الأرقام والإحداثيات بيانات Mock تجريبية فقط.

## ما تم تنفيذه

- صفحة قائمة مرنة ببحث وفلاتر النوع والحالة والمدينة.
- ملخص أعداد المواقع والحالات، وبطاقات Desktop وMobile، وحالات loading وempty وoffline.
- صفحة تفاصيل تحتوي على نظرة عامة، الموقع ونطاق الحضور، ساعات العمل، الإدارة، الموارد المرتبطة والنشاط التجريبي.
- Drawer موحد لإضافة الموقع وتعديله، مع اتجاه auxiliary المعتمد: يسار Desktop/Tablet وBottom Sheet على Mobile.
- تحقق من الحقول: الاسم، الكود الفريد، النوع، الحالة، العنوان، المدينة، المنطقة، الهاتف، الإحداثيات، نصف قطر الحضور بين 25 و2000 متر، ساعات العمل، وسبب تغيير الحالة عند الحاجة.
- يدعم الجدول الورديات الليلية التي تنتهي في اليوم التالي.
- الإضافة والتعديل يحفظان داخل Mock Store في الذاكرة فقط ويُعاد ضبطهما عند إعادة تحميل التطبيق.
- اختيار «استخدام هذا الفرع» يحدّث سياق الفرع النشط في App Shell.

## الصلاحيات

| الدور | النطاق | الإدارة | البيانات الحساسة |
|---|---|---:|---|
| مالك النشاط | كل المواقع | إضافة وتعديل كامل | كل الملخصات |
| المدير | كل المواقع | إضافة وتعديل كامل | كل الملخصات |
| موظف المبيعات | سياق الفروع المسندة داخل العمل فقط | لا يوجد وصول إلى `/branches` | لا تعرض بيانات إدارة الفروع |
| موظف التأجير واستلام الصيانة | سياق المواقع المسندة داخل العمل فقط | لا يوجد وصول إلى `/branches` | لا تعرض بيانات إدارة الفروع |
| فني الصيانة | الورشة المسندة كسياق عمل ثابت | لا يوجد وصول إلى `/branches` | لا تعرض بيانات إدارة الفروع |

تعتمد صفحة القائمة والتفاصيل على `branches.manage` حصريًا، وهي ممنوحة لمالك النشاط والمدير فقط. يحتفظ المستخدم التشغيلي باسم الفرع أو الفروع المسندة في Header والوحدات التشغيلية دون أن تتحول هذه المعلومة إلى صلاحية إدارية. يتم منع الوصول قبل تركيب مكونات بيانات الفروع، كما تستخدم Sidebar وMobile Navigation وMore Drawer وحماية URL السياسة المركزية نفسها.

شمل تدقيق الصلاحيات الإدارية أيضًا `/employees` و`/finance` و`/expenses` و`/payroll` و`/reports` و`/settings` و`/activity-log`؛ وجميعها محصورة في المالك والمدير. إدارة الأدوار والصلاحيات مدرجة ضمن إدارة النظام في `/settings` ولا يوجد لها مسار مستقل حاليًا.

### تصحيح تدقيق الصلاحيات — 5 أغسطس 2026

كان السبب الجذري أن سياسة التنقل ربطت `/branches` بصلاحية `branches.view` الموجودة في قوالب الأدوار التشغيلية، بدل صلاحية الإدارة الموجودة أصلًا `branches.manage`. كما كانت `audit.view` و`settings.view` ممنوحتين لهذه القوالب رغم أن المسارين الحاليين إداريان بالكامل.

تم تنفيذ الآتي:

- ربط `/branches` وكل مسارات التفاصيل التابعة له بـ`branches.manage` فقط.
- إزالة صلاحيات الفروع الإدارية والإعدادات وسجل النشاط الكامل من قوالب المبيعات والتأجير/استلام الصيانة وفني الصيانة.
- تأكيد أن الموظفين والمالية والمصروفات الإدارية والرواتب والتقارير الإدارية والإعدادات وسجل النشاط لا تمنح لأي اتحاد أدوار تشغيلية.
- إبقاء `branchIds` مستقلة كسياق عمل للـHeader والوحدات التشغيلية، دون منح الوصول إلى صفحة الإدارة.
- عرض الموقع المسند كتسمية ثابتة عندما يكون واحدًا، وعرض Select محدود دون «كل الفروع» عندما تكون المواقع المسندة متعددة.
- إضافة بوابة صلاحية داخل مكوّني القائمة والتفاصيل قبل تركيب أي مكوّن يقرأ بيانات الفروع، بالإضافة إلى حماية App Shell المركزية.

## عقد الربط المستقبلي

- الأنواع الأساسية: `features/branches/types.ts`.
- قواعد الوصول: `features/branches/permissions.ts`.
- واجهة التخزين المؤقت: `features/branches/services/branch-store.ts`.
- البحث والتصفية: `features/branches/services/query-branches.ts`.
- التحقق من النموذج: `features/branches/schemas/branch-schema.ts`.

يمكن استبدال Mock Store لاحقًا بطبقة API/Supabase مع إبقاء عقد `Branch` و`BranchFormValues` ومكوّنات العرض. لم تُنشأ قاعدة بيانات أو Auth حقيقي في هذه المهمة.

## الملفات المنشأة

- `app/(workspace)/branches/[branchId]/page.tsx`
- `features/branches/types.ts`
- `features/branches/fixtures.ts`
- `features/branches/permissions.ts`
- `features/branches/hooks/use-branches.ts`
- `features/branches/schemas/branch-schema.ts`
- `features/branches/services/branch-store.ts`
- `features/branches/services/query-branches.ts`
- `features/branches/forms/BranchForm.tsx`
- مكونات القائمة والتفاصيل والحالات داخل `features/branches/components/`
- `mock-data/branches.ts`
- `styles/branches.css`
- `features/branches/tests/branches.spec.ts`
- `tests/responsive/branches.spec.ts`

## الملفات المحدثة

- `app/(workspace)/branches/page.tsx`
- `app/globals.css`
- `components/shell/ShellContext.tsx`
- `components/shell/navigation.ts`
- `features/dashboard/components/DashboardFilters.tsx`
- `features/dashboard/fixtures.ts`
- `features/customers/components/CustomersFilters.tsx`
- `features/customers/forms/CustomerForm.tsx`
- `features/customers/forms/QuickCustomerForm.tsx`
- `mock-data/scenarios/shell.ts`
- `permissions/permission-map.ts`
- `permissions/permission-types.ts`
- `permissions/roles.ts`
- `vitest.config.mts`

تم استيراد `styles/branches.css` مرة واحدة فقط من `app/globals.css`، ونجح فحص جميع استيرادات CSS المحلية.

## التحقق البصري والاستجابة

تمت تغطية المقاسات 1920×1080 و1440×900 و1024×768 و834×1112 و768×1024 و390×844 ضمن اختبارات الاستجابة. كما تمت معاينة `/branches` و`/branches/workshop` وتشغيل Drawer الإضافة فعليًا في المتصفح:

- RTL محفوظ ولا يوجد horizontal overflow.
- Sidebar وHeader وMobile Navigation لم تتغير بنيتها.
- شبكة البطاقات تتكيف من عمودين إلى عمود واحد.
- Drawer بعرض متوازن على Desktop ويتحول إلى Bottom Sheet على Mobile.
- تفاصيل الورشة لا تعرض مبيعات أو خزائن، وتعرض بيانات الصيانة وقطع الغيار.

## نتائج الجودة

| الفحص | النتيجة |
|---|---|
| `npm run check:styles` | ناجح — 8 استيرادات CSS محلية |
| `npm run build` | ناجح |
| `npm run lint` | ناجح |
| `npm run typecheck` | ناجح |
| `npm test` | ناجح — 7 ملفات / 50 اختبارًا |
| `npm run test:e2e` | ناجح — 34 اختبارًا |

## ملاحظات وحدود المرحلة

- كل عمليات الإضافة والتعديل Mock وغير دائمة حتى ربط مصدر بيانات إنتاجي.
- اختيار المدير في النموذج يستخدم موظفين تجريبيين فقط.
- لا توجد خريطة تفاعلية؛ الإحداثيات ونطاق الحضور يُعرضان نصيًا كما هو مطلوب لهذه المرحلة.
- الروابط إلى الوحدات الأخرى تستخدم الصفحات الحالية ولا تعني أن Features الموظفين أو الورديات أو المخزون قد نُفذت.
- لم تُستخدم مكتبات ثقيلة أو Runtime خاص بـClaude.
