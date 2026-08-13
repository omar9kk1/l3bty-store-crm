# تقرير App Shell والصلاحيات التجريبية — L3BTY

تاريخ التنفيذ: 5 أغسطس 2026  
النطاق: المهمة الثانية فقط — App Shell، التنقل، الفروع، الأدوار والصلاحيات باستخدام Mock Data.

## 1. النتيجة

تم بناء App Shell عربي RTL داخل `l3bty-app` فوق Foundation الحالية من دون إعادة إنشاء المشروع. أصبحت جميع صفحات الهيكل روابط فعلية داخل Route Group باسم `app/(workspace)`، ويعيد المسار `/` التوجيه إلى `/dashboard`.

لم يبدأ أي منطق أعمال للتأجير أو البيع أو الصيانة أو الحسابات، ولم تُنشأ مصادقة أو قاعدة بيانات أو Supabase. لم يُستخدم iframe أو Claude Runtime.

## 2. الملفات المنشأة أو المعدلة

### مسارات التطبيق

- عُدّل `app/page.tsx` ليعيد التوجيه إلى `/dashboard`.
- أُنشئ `app/(workspace)/layout.tsx` لاحتواء صفحات النظام داخل `AppShell`.
- أُنشئت صفحات Placeholder للمسارات:
  - `/dashboard`
  - `/operations`
  - `/rentals`
  - `/sales/pos`
  - `/maintenance`
  - `/customers`
  - `/products`
  - `/rental-assets`
  - `/inventory`
  - `/employees`
  - `/attendance`
  - `/shifts`
  - `/finance`
  - `/expenses`
  - `/payroll`
  - `/reports`
  - `/branches`
  - `/notifications`
  - `/activity-log`
  - `/settings`
- أُنشئت `/ui-states` كصفحة تطوير غير موجودة في تنقل المستخدم النهائي.

كل Placeholder يعرض اسم الصفحة ووصفًا مختصرًا وحالة «قيد البناء» وسياق القسم فقط، بلا جداول أو نماذج أعمال.

### مكونات App Shell

- `components/shell/AppShell.tsx`
- `components/shell/ShellContext.tsx`
- `components/shell/Sidebar.tsx`
- `components/shell/SidebarSection.tsx`
- `components/shell/Header.tsx`
- `components/shell/MobileNavigation.tsx`
- `components/shell/MobileMoreDrawer.tsx`
- `components/shell/WorkspaceContent.tsx`
- `components/shell/ConnectionIndicator.tsx`
- `components/shell/ActiveRentalStrip.tsx`
- `components/shell/RolePreview.tsx`
- `components/shell/PlaceholderPage.tsx`

### الصلاحيات والتنقل

- `permissions/keys.ts`
- `permissions/types.ts`
- `permissions/role-templates.ts`
- `permissions/resolve-permissions.ts`
- `permissions/navigation-policy.ts`
- `components/permissions/PermissionGuard.tsx`
- `mock-data/scenarios/shell.ts`
- `lib/page-config.ts`

### مكونات UI والحالات

- `components/ui/AppIcon.tsx`
- `components/ui/Button.tsx`
- `components/ui/IconButton.tsx`
- `components/ui/Badge.tsx`
- `components/ui/Card.tsx`
- `components/ui/Divider.tsx`
- `components/ui/Drawer.tsx`
- `components/ui/Select.tsx`
- `components/ui/Tooltip.tsx`
- `components/feedback/LoadingState.tsx`
- `components/feedback/EmptyState.tsx`
- `components/feedback/ErrorState.tsx`
- `components/feedback/OfflineState.tsx`
- `components/feedback/PermissionDeniedState.tsx`

### التنسيق والاختبارات

- أُضيف `styles/shell.css` واستُورد من `app/globals.css`.
- عُدل `next.config.ts` لتعطيل مؤشر التطوير المرئي لأنه يتداخل مع Mobile Navigation العائمة فقط في وضع التطوير.
- أضيفت أوامر الاختبار إلى `package.json`.
- أُنشئت `vitest.config.mts` و`playwright.config.ts`.
- أُنشئت اختبارات `tests/permissions` و`tests/component/shell` و`tests/responsive`.
- عُدل `.gitignore` لاستبعاد مخرجات Playwright المولدة.

## 3. شكل التنقل حسب المقاس

### Desktop

- Sidebar على يمين الشاشة وفق RTL بعرض 264px.
- يمكن تصغيره إلى Rail بعرض 72px، وتُحفظ التفضيلات محليًا على الجهاز.
- الأقسام قابلة للفتح والإغلاق، والقسم الذي يحتوي الصفحة النشطة يبقى مفتوحًا.
- العنصر النشط يستخدم سطحًا رماديًا خفيفًا ومؤشر Accent بعرض 3px.
- زر التصغير ثابت أسفل القائمة، مع تمرير داخلي هادئ عند قصر الشاشة.

### Tablet

- يتحول Sidebar تلقائيًا إلى Rail بعرض 72px.
- زر القائمة في Header يفتح Drawer كاملًا للتنقل.
- يبقى المحتوى منفصلًا عن الـRail ولا تغطيه القائمة.

### Mobile

- لا يوجد Sidebar ثابت.
- يظهر Mobile Navigation عائم بخلفية Glassmorphism وحدود وظل خفيفين، لا مستطيل رمادي بعرض الشاشة.
- يعرض أربع وجهات أساسية حسب أولوية الدور، إضافة إلى زر «المزيد»؛ أي خمس خانات كحد أقصى.
- يفتح «المزيد» Drawer سفليًا بباقي الصفحات المسموحة.
- يراعي Safe Area ويضيف المحتوى مسافة سفلية تمنع تغطيته.
- أهداف اللمس في التنقل لا تقل عن 44px.

## 4. Header والشريط التجريبي

يحتوي Header على اسم الصفحة، اختيار الفرع، مؤشر الاتصال، الإشعارات، قائمة مستخدم شكلية، أداة معاينة الأدوار، وزر بحث معطل بوضوح في هذه المرحلة.

`ActiveRentalStrip` مثال بصري فقط لعداد نشط، ويمكن طيه أو إخفاؤه. لا يحتوي منطق تأجير ولا أي تأمين أو خصم أو تسوية.

## 5. الأدوار والصلاحيات

الأدوار الموجودة في التنفيذ هي فقط:

| المعرّف | الاسم العربي | الصفحات المتاحة |
| --- | --- | --- |
| `owner` | مالك النشاط | جميع الصفحات العشرين |
| `manager` | المدير | جميع الصفحات العشرين |
| `rental_maintenance_employee` | موظف التأجير واستلام الصيانة | Dashboard، العمليات، التأجير، الصيانة، العملاء، أصول التأجير، المخزون، الحضور، الورديات، الإشعارات، سجل النشاط، الإعدادات |
| `sales_employee` | موظف المبيعات | Dashboard، العمليات، POS، العملاء، منتجات البيع، المخزون، الحضور، الورديات، الإشعارات، سجل النشاط، الإعدادات |
| `maintenance_technician` | فني الصيانة | Dashboard، العمليات، الصيانة، أصول التأجير، المخزون، الحضور، الإشعارات، سجل النشاط، الإعدادات |

لا توجد في التنفيذ أدوار `accountant` أو `ACC` أو `ops_employee`.

### حل تعدد الأدوار

`resolvePermissions` يجمع صلاحيات الأدوار المحددة في `Set` واحدة. اختيار:

`rental_maintenance_employee + sales_employee`

يعرض صفحات التأجير وPOS معًا، لكنه لا يمنح المالية أو الرواتب لأن أيًا من الدورين لا يملكهما. وجود `owner` أو `manager` يمنح كل Permission Keys.

`PermissionGuard` يحمي العرض التجريبي عند الوصول المباشر إلى مسار غير مسموح، فيعرض حالة «لا تملك صلاحية» بدل محتوى الصفحة.

## 6. الفروع التجريبية

الفروع المعرفة في `mock-data/scenarios/shell.ts`:

- الفرع الرئيسي — `BR01`
- فرع 2 — `BR02`
- فرع 3 — `BR03`
- الورشة المركزية — `WRK`

التوزيع التجريبي:

| الدور | الفروع المتاحة |
| --- | --- |
| المالك والمدير | كل الفروع، مع خيار «كل الفروع» |
| موظف التأجير واستلام الصيانة | الفرع الرئيسي، فرع 2 |
| موظف المبيعات | الفرع الرئيسي، فرع 2، فرع 3 |
| فني الصيانة | الفرع الرئيسي، الورشة المركزية |

عند تعدد الأدوار يتم اتحاد الفروع المسندة. تغيير الدور أو الفرع يعيد حساب سياق Shell والقائمة المتاحة من السياسة نفسها. هذا Mock Policy فقط، ولا يوجد عزل بيانات حقيقي في هذه المرحلة.

## 7. مصدر التنقل والأيقونات

`permissions/navigation-policy.ts` هو المصدر الوحيد لعناصر التنقل ويحتوي لكل عنصر على:

- `key`
- `labelAr`
- `descriptionAr`
- `href`
- `icon`
- `requiredPermission`
- `section`
- `mobilePriority`
- `exactMatch`

لا توجد مصفوفة مستقلة لكل دور. Sidebar وMobile Navigation والـDrawers تستخدم الناتج نفسه بعد فلتر الصلاحيات.

تم استخدام Lucide React من خلال Wrapper داخلي باسم `components/ui/AppIcon.tsx`. لا توجد Emoji مستخدمة كأيقونات واجهة.

## 8. الحزم الفعلية الجديدة

| الحزمة | الإصدار |
| --- | --- |
| Lucide React | 1.28.0 |
| Radix Dialog | 1.1.23 |
| Radix Tooltip | 1.2.16 |
| Vitest | 4.1.10 |
| Testing Library React | 16.3.2 |
| Playwright Test | 1.62.1 |

استمرت الحزم الأساسية دون تغيير: Next.js 16.3.0، React 19.2.8، Tailwind CSS 4.3.3، TypeScript 5.9.3، ESLint 9.39.5.

## 9. نتائج الجودة

| الفحص | النتيجة |
| --- | --- |
| `npm run build` | ناجح — توليد 25 صفحة ثابتة، منها 20 Placeholder وصفحة حالات الواجهة |
| `npm run lint` | ناجح بلا أخطاء أو تحذيرات |
| `npm run typecheck` | ناجح بلا أخطاء |
| `npm test` | ناجح — 10 اختبارات Unit/Component |
| `npm run test:e2e` | ناجح — 8 اختبارات Playwright |

تغطي الاختبارات:

- owner وmanager وصول كامل.
- اتحاد صلاحيات أدوار متعددة واتحاد الفروع.
- المبيعات لا ترى التأجير.
- موظف التأجير لا يرى POS.
- الفني لا يرى المالية أو الرواتب.
- Sidebar وMobile Navigation يستخدمان العناصر المفلترة نفسها.
- تبديل الدور والفرع من الواجهة.
- فتح Drawer «المزيد» على الموبايل.
- RTL وعدم وجود Horizontal Scroll وأهداف اللمس.

## 10. نتائج المقاسات الستة

| المقاس | نمط Shell | النتيجة |
| --- | --- | --- |
| 1920×1080 | Sidebar كامل | ناجح، بلا قص أو Horizontal Scroll |
| 1440×900 | Sidebar كامل | ناجح، بلا قص أو Horizontal Scroll |
| 1024×768 | Rail + Drawer | ناجح، بلا قص أو Horizontal Scroll |
| 834×1112 | Rail + Drawer | ناجح، بلا قص أو Horizontal Scroll |
| 768×1024 | Rail + Drawer | ناجح، بلا قص أو Horizontal Scroll |
| 390×844 | Mobile Navigation + More Drawer | ناجح، بلا قص أو Horizontal Scroll، وأهداف اللمس ≥44px |

تمت كذلك معاينة Desktop تفاعليًا في المتصفح: عرض Sidebar الفعلي يقارب 264px، العنصر النشط صحيح، والتبديل إلى دور المبيعات ثم إلى multi-role حدّث التنقل والفروع دون تمدد أفقي.

## 11. الاختلافات المقصودة عن الـPrototype

- محتوى Dashboard غير منقول؛ استُبدل بـPlaceholder لأن المهمة تمنع بدء Feature.
- البحث وقائمة المستخدم والإشعارات عناصر شكلية بلا منطق، التزامًا بالنطاق.
- بيانات العداد والفروع والمستخدم مختصرة وموسومة ضمنيًا كسيناريو Mock، وليست بيانات أعمال تفصيلية.
- لا توجد شاشة أو Runtime من Claude داخل التطبيق؛ أُعيد بناء Shell بمكونات React مستقلة مع الحفاظ على الألوان والأبعاد والسلوك العام.

## 12. الملفات المحمية والقرارات المحذوفة

تمت مقارنة بصمات SHA-256 قبل التنفيذ وبعده. لم تتغير:

- `../Shell Dashboard Prototype.dc.html`
- `../support.js`
- جميع ملفات `../uploads/`

كما أكد البحث الساكن عدم وجود دور المحاسب أو موظف التشغيل القديم أو نظام التأمين داخل كود المهمة.

## 13. نقاط المراجعة المتبقية

- Role Preview أداة تطوير فقط ويجب ألا تصبح جزءًا من واجهة الإنتاج النهائية.
- حفظ حالة تصغير Sidebar محلي على الجهاز مؤقت؛ ربطها بالمستخدم الحقيقي مؤجل إلى مرحلة Auth.
- اختيار الفرع يغير سياق الـMock فقط؛ عزل البيانات الحقيقي مؤجل إلى Backend/RLS.
- لم تُنفذ Features أو Services أو بيانات أعمال، كما هو مطلوب.

## 14. تحسينات المراجعة البصرية اللاحقة

تم تنفيذ جولة تحسين مستهدفة على App Shell فقط بعد مراجعة Desktop وMobile، من دون تغيير المسارات أو عناصر التنقل أو الصلاحيات أو منطق الأدوار والفروع أو ملفات الاختبارات.

### عرض المحتوى والمسافات

- ضُبط `--content-max-width` على 80rem (1280px) بدل تمدد مساحة العمل حتى العرض شبه الكامل للشاشات الكبيرة.
- بقيت الحاوية متمركزة داخل المساحة المتاحة بين Sidebar وحافة الشاشة، مع gutters متجاوبة كما كانت.
- أضيف `--content-wide-max-width` بقيمة 105rem كخيار صريح للصفحات التي تحتاج عرضًا كبيرًا لاحقًا، ولا تستخدمه أي صفحة حاليًا.
- أضيف modifier باسم `workspace-content--full` عبر الخاصية الاختيارية `fullWidth`، من دون تفعيله على صفحات Placeholder.
- ضُبط الحد الأقصى لبطاقة Placeholder على 60rem (960px) حتى لا تتمدد بلا داعٍ عند 1920px.
- وُحدت مسافات أعلى الصفحة وBreadcrumb والعنوان والبطاقة، وخُفض الهدر الرأسي على الهاتف.

### Header المكتبي

- أضيفت حاوية داخلية مشتركة للرأس بعرض مساحة المحتوى نفسه.
- جُمعت الصفحة واختيار الفرع ومعاينة الدور والاتصال والإشعارات والمستخدم في صف RTL واحد متماسك، بدل توزيعها على كامل عرض الشاشة.
- أصبحت ارتفاعات أدوات Desktop الأساسية 40px مع gaps ثابتة، بينما بقيت أهداف اللمس على Mobile عند 44px.
- بقي الرأس بارتفاعه المعتمد 64px على Desktop دون ازدحام أو تغيير ترتيب RTL.

### Header الموبايل ومعاينة الأدوار

- أصبح الرأس صفين واضحين بارتفاع إجمالي يقارب 96px: صف أساسي للقائمة واسم الصفحة، وصف ثانٍ للفرع والحالة والإشعارات وأداة التطوير.
- استُبدلت معاينة الدور الدائمة على Mobile بزر صغير واضح باسم «معاينة» بارتفاع 44px.
- يفتح الزر Drawer سفليًا يحتوي خيارات الدور الواحد وتعدد الأدوار نفسها، من دون أي تغيير في `resolvePermissions` أو سلوك الاتحاد.
- بقيت معاينة Desktop في مكانها، لكن بمظهر أخف ووسم «تجريبي» أصغر.
- أكد فحص تفاعلي عند 390×844 أن Drawer يظهر، والدور المحدد يبقى محفوظًا، ولا يوجد Horizontal Scroll.

### ActiveRentalStrip وMobile Navigation

- خُفض ارتفاع شريط التأجير التجريبي إلى 40px، واستُخدم فحمي ناعم `#242426` بدل الأسود الثقيل.
- خُفض وزن النص وأحجام أيقونات الإغلاق والطي مع بقاء المؤقت Accent واضحًا ومقروءًا.
- تمت محاذاة محتوى الشريط مع نفس حاوية Workspace.
- لم يُضف أي تأمين أو وديعة أو منطق تأجير.
- بقي Mobile Navigation عائمًا بخلفية Glassmorphism ومن دون خلفية رمادية ممتدة.
- بقيت Safe Area والخمس خانات القصوى كما هي، وضُبط مؤشر العنصر النشط ليكون متمركزًا بوضوح فوق خانته.

### نتائج التحقق بعد التحسين

| الفحص | النتيجة النهائية |
| --- | --- |
| `npm run build` | ناجح — 25 صفحة ثابتة |
| `npm run lint` | ناجح بلا أخطاء أو تحذيرات |
| `npm run typecheck` | ناجح بلا أخطاء |
| `npm test` | ناجح — 10/10 اختبارات Unit/Component |
| `npm run test:e2e` | ناجح — 8/8 اختبارات Playwright |

تم التحقق عند 1920×1080 و1440×900 و1024×768 و834×1112 و390×844، بالإضافة إلى 768×1024 الموجود في مجموعة الاختبار الحالية. النتائج في كل المقاسات:

- لا Horizontal Scroll أو قص للعناصر.
- عرض المحتوى المكتبي مضبوط ومتمركز.
- محاذاة Header المكتبي متسقة وغير متناثرة.
- Header الموبايل مضغوط وواضح، وأهداف اللمس الأساسية لا تقل عن 44px.
- Role Preview يعمل على Desktop، ويعمل داخل Drawer على Mobile، مع بقاء multi-role والفروع كما هما.
- Mobile Navigation لم يتغير مفهومه البصري، ومؤشر النشاط متمركز ومرئي.
- جميع اختبارات الصلاحيات والمكونات الحالية ما زالت ناجحة دون تعديل ملفات الاختبارات.

لا تبدأ أي مهمة لاحقة قبل مراجعة واعتماد هذا التسليم.

## سياسة اتجاه Drawer/Sheet المعتمدة — 5 أغسطس 2026

تم توحيد اتجاه جميع الـDrawers الحالية والمستقبلية داخل المكوّن المشترك `components/ui/Drawer.tsx`. أصبحت الخاصية `variant` إلزامية، ولا يوجد اتجاه افتراضي يمكن للصفحات تخمينه بصورة مختلفة.

### السياسة

| Variant | Desktop / Tablet | Mobile | الاستخدام |
|---|---|---|---|
| `auxiliary` | الحافة اليسرى (`inline-end` في RTL) | Bottom Sheet | الفلاتر والتفاصيل والمعلومات الثانوية والنماذج الداعمة |
| `navigation` | الحافة اليمنى (`inline-start` في RTL) | الحافة اليمنى عند استخدامه | التنقل الرئيسي فقط |
| `bottom-sheet` | أسفل الشاشة | أسفل الشاشة | القوائم والإجراءات الثانوية المدمجة |
| Dialog مركزي | منتصف الشاشة | منتصف الشاشة | التأكيدات القصيرة والقرارات المركزة |

تتضمن السياسة اتجاه حركة الفتح والإغلاق، والحدود، والظل، والزوايا، مع بقاء المحتوى العربي `dir="rtl"`. يتحول `auxiliary` تلقائيًا إلى Bottom Sheet تحت 768px.

### تدقيق الاستخدامات الحالية

| الاستخدام | الملف | التصنيف |
|---|---|---|
| فلاتر Dashboard | `features/dashboard/components/DashboardFilters.tsx` | `auxiliary` |
| قائمة التنقل الرئيسية | `components/shell/AppShell.tsx` | `navigation` |
| قائمة المزيد على Mobile | `components/shell/MobileMoreDrawer.tsx` | `bottom-sheet` |
| معاينة الأدوار على Mobile | `components/shell/RolePreview.tsx` | `bottom-sheet` |

لا توجد حاليًا Drawers أخرى للفروع أو UI States أو التفاصيل. اختيار الفرع الحالي Select أصلي، ومعاينة الدور المكتبية Popover وليست Drawer، ولم يتغير سلوكهما.

### الملفات المعدلة

- `components/ui/Drawer.tsx`
- `styles/shell.css`
- `components/shell/AppShell.tsx`
- `components/shell/MobileMoreDrawer.tsx`
- `components/shell/RolePreview.tsx`
- `features/dashboard/components/DashboardFilters.tsx`
- `features/dashboard/components/DashboardHeader.tsx`
- `tests/component/ui/Drawer.spec.tsx`
- `tests/responsive/overlays.spec.ts`

### نتائج التحقق

- فلاتر Dashboard مثبتة يسارًا عند 1920×1080 و1440×900 و1024×768 و834×1112 و768×1024.
- فلاتر Dashboard تظهر Bottom Sheet عند 390×844.
- Drawer التنقل على Tablet بقي مثبتًا يمينًا.
- Mobile More وRole Preview بقيا Bottom Sheets.
- المحتوى RTL، زر الإغلاق مرئي، وEscape يغلق اللوحة.
- التركيز ينتقل داخل Drawer، والـOverlay يغطي الـViewport ويمنع التفاعل مع الخلفية.
- لا يوجد Horizontal Overflow أثناء فتح أي Drawer.

| الفحص | النتيجة |
|---|---|
| `npm run build` | ناجح |
| `npm run lint` | ناجح بلا أخطاء أو تحذيرات |
| `npm run typecheck` | ناجح |
| `npm test` | ناجح — 21/21 |
| `npm run test:e2e` | ناجح — 18/18 |

لم تتغير المسارات أو الصلاحيات أو بيانات Dashboard أو سلوك الأعمال أو عناصر التنقل.
