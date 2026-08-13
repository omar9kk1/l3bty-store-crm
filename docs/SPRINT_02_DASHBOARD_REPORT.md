# تقرير Sprint 02 — لوحة التحكم

تاريخ التنفيذ: 5 أغسطس 2026  
النطاق: بناء صفحة `/dashboard` فقط داخل تطبيق `l3bty-app` مع بيانات تجريبية ثابتة، دون بدء أي وحدة أعمال أخرى.

## 1. النتيجة

تم استبدال الـPlaceholder الخاص بمسار `/dashboard` بلوحة تحكم حقيقية متجاوبة تحافظ على App Shell المعتمد، واتجاه RTL، ونظام التصميم الحالي. لم يتم تغيير المسارات أو تعريفات الأدوار أو الصلاحيات الأساسية أو عناصر التنقل أو Sidebar أو Header أو Mobile Navigation أو ActiveRentalStrip.

تعتمد الصفحة على بيانات Mock حتمية فقط. لا يوجد اتصال بقاعدة بيانات، ولا Supabase، ولا Auth حقيقي، ولا منطق أعمال فعلي.

## 2. الملفات المنشأة

### طبقة الـFeature

- `features/dashboard/types.ts`: عقود بيانات لوحة التحكم والاستعلام والحالات والاتجاهات.
- `features/dashboard/fixtures.ts`: بيانات Mock ثابتة للفروع والتأجيرات والمخزون والتنبيهات.
- `features/dashboard/permissions.ts`: تحديد نمط العرض والأقسام وأنواع الأنشطة المتاحة حسب اتحاد الأدوار.
- `features/dashboard/services/get-dashboard-data.ts`: تكوين نموذج العرض الحتمي حسب الفترة والفرع والنشاط والأدوار.
- `features/dashboard/components/DashboardPage.tsx`: مكوّن التجميع الرئيسي وربط URL وShellContext.
- `features/dashboard/components/DashboardHeader.tsx`: عنوان الصفحة والفترات والتصفية والتصدير التجريبي.
- `features/dashboard/components/DashboardFilters.tsx`: Drawer للفروع وأنواع النشاط المتاحة للدور.
- `features/dashboard/components/MetricCard.tsx`: بطاقة المؤشر.
- `features/dashboard/components/Sparkline.tsx`: رسم SVG خفيف بدون نقاط نهاية.
- `features/dashboard/components/DashboardSections.tsx`: أداء الفروع، استغلال الأصول، التأجيرات، الصيانة، المخزون، الحضور، والتنبيهات.
- `features/dashboard/components/QuickActions.tsx`: إجراءات سريعة مفلترة حسب الدور.
- `features/dashboard/components/DashboardStates.tsx`: Loading وEmpty وError وOffline.
- `features/dashboard/tests/dashboard-data.spec.ts`: اختبارات البيانات والصلاحيات وقواعد المؤشرات.
- `styles/dashboard.css`: تنسيق الصفحة المتجاوب باستخدام Tokens وخصائص CSS المنطقية.
- `tests/responsive/dashboard.spec.ts`: فحص RTL والـOverflow والمقاسات وحالات URL.

### ملفات الربط التي تم تحديثها

- `app/(workspace)/dashboard/page.tsx`: ربط المسار بالمكوّن الجديد داخل Suspense.
- `app/globals.css`: استيراد `styles/dashboard.css`.
- `vitest.config.mts`: إدراج اختبارات Feature الجديدة.
- `playwright.config.ts`: دعم منفذ اختبار معزول وتشغيل نسخة الإنتاج المبنية؛ يفيد عند وجود خادم تطوير سابق على المنفذ الافتراضي.

## 3. مصادر التصميم

تم الالتزام بالمصادر المعتمدة حسب الأولوية:

1. `docs/NEXTJS_IMPLEMENTATION_BLUEPRINT.md`
2. `docs/NEW_CLIENT_DECISIONS_IMPACT_MATRIX.md`
3. `docs/SYSTEM_MODULES_AND_SITEMAP.md`
4. `docs/COMPONENT_LIBRARY.md`
5. `docs/DESIGN_SYSTEM.md`
6. `docs/UI_GUIDELINES.md`
7. `docs/RESPONSIVE_RULES.md`
8. `Shell Dashboard Prototype.dc.html` كمرجع بصري فقط

أعيد استخدام الألوان، الحدود، نصف الأقطار، الظلال، المسافات والخط من Design Tokens القائمة. لم تتم إضافة هوية بصرية جديدة أو نسخ Runtime من الـPrototype.

## 4. سلوك لوحة التحكم

### الفلاتر وURL

- الفترة: `?period=today|week|month`.
- نوع النشاط: `?type=all|sales|rental|maintenance` مع حصر الاختيارات حسب الدور.
- حالات العرض التجريبية: `?state=normal|loading|empty|error|offline`.
- الفرع مرتبط مباشرة بـ`activeBranch` و`setActiveBranchId` من `ShellContext`؛ لا توجد حالة فروع مستقلة داخل الـDashboard.
- اختيار صف من أداء الفروع يغيّر الفرع النشط نفسه على مستوى App Shell.
- التصدير ظاهر لمالك النشاط والمدير فقط، وهو Mock، ويتوقف في حالة Offline.

### المؤشرات

- مالك النشاط والمدير: مبيعات الفترة، إيرادات التأجير، إيرادات الصيانة، ورصيد الخزائن الحالي.
- بطاقة رصيد الخزائن لا تحتوي Sparkline، وفق القرار المعتمد.
- الموظفون: مؤشرات تشغيلية خاصة بالدور بدل مؤشرات الإدارة الشاملة.
- الرسوم المصغرة SVG بلا نقاط نهاية، وبخط أخضر للصعود وأحمر للهبوط ورمادي للاستقرار.

### ظهور الأقسام حسب الدور

| القسم | مالك/مدير | موظف المبيعات | موظف التأجير واستلام الصيانة | فني الصيانة |
|---|---:|---:|---:|---:|
| أداء الفروع | نعم | لا | لا | لا |
| استغلال أصول التأجير | نعم | لا | نعم | نعم |
| التأجيرات النشطة | نعم | لا | نعم | لا |
| ملخص الصيانة | نعم | لا | نعم | نعم |
| تنبيهات المخزون | شامل | ألعاب بيع وقطع مناسبة | أصول تأجير وقطع مناسبة | قطع غيار |
| الحضور | إجمالي الفريق | شخصي | شخصي | شخصي |
| التنبيهات | إداري شامل | متعلق بالمبيعات | متعلق بالتأجير والاستلام | بلاغات وأعمال الصيانة |

عند اختيار أكثر من دور، يتم تطبيق اتحاد الصلاحيات والبيانات التشغيلية بدون تكرار العناصر. تظل أولوية العرض الإداري لمالك النشاط أو المدير.

## 5. البيانات التجريبية

- كل البيانات ثابتة وحتمية ويمكن تكرار نتائجها.
- الفترة والفرع يغيّران القيم بطريقة قابلة للاختبار دون عشوائية أو توقيت حي.
- بيانات المخزون محصورة في ألعاب للبيع، وقطع الغيار، وأصول التأجير فقط.
- Active Rentals في الصفحة عرض بصري تجريبي ولا ينفذ عمليات فعلية.
- لا توجد أي حسابات مالية فعلية أو منطق تحصيل/تسوية.

## 6. Responsive والمراجعة البصرية

- Desktop: أربع بطاقات مؤشرات في الصف.
- Tablet: بطاقتان في الصف.
- Mobile: بطاقة واحدة في الصف.
- الأقسام التفصيلية عمودان على Desktop وعمود واحد على Mobile.
- صفوف أداء الفروع تتحول إلى بطاقات/صفوف مختصرة على الشاشات الصغيرة.
- Mobile Navigation بقي بتصميمه العائم الحالي وبحد أقصى خمسة عناصر.
- تم استخدام CSS logical properties في توزيع الاتجاه قدر الإمكان.

المقاسات التي اجتازت فحص عدم وجود Horizontal Scroll:

- 1920×1080
- 1440×900
- 1024×768
- 834×1112
- 768×1024 ضمن فحوصات App Shell الحالية
- 390×844
- 360×800 ضمن اختبار Dashboard الإضافي

تمت مراجعة العرض بصريًا على Desktop وMobile: RTL صحيح، البطاقات غير مقصوصة، الـHeader والـActiveRentalStrip وMobile Navigation يعملون ضمن التصميم الحالي، ولا توجد أخطاء Console.

## 7. نتائج الجودة

| الفحص | النتيجة |
|---|---|
| `npm run build` | ناجح — Next.js 16.3.0، والمسار `/dashboard` مولّد Static |
| `npm run lint` | ناجح — 0 أخطاء و0 تحذيرات |
| `npm run typecheck` | ناجح |
| `npm test` | ناجح — 18/18 اختبارًا |
| `npm run test:e2e` | ناجح — 10/10 اختبارات على نسخة Production مع منفذ معزول |

يشمل ذلك اختبارات App Shell السابقة واختبارات Dashboard الجديدة: أدوار الإدارة، موظف المبيعات، موظف التأجير واستلام الصيانة، فني الصيانة، اتحاد الأدوار، الفروع والفترات، رسم الاتجاه، غياب Sparkline عن بطاقة الخزائن، حالات URL، وغياب الـOverflow.

## 8. حماية الملفات المرجعية

لم يتم تعديل الملفات المحظورة. تم التحقق من البصمات بعد التنفيذ:

- `Shell Dashboard Prototype.dc.html` — SHA-256: `C21F33F724EB13D206C83DC0B6B45465097DBE35D4A558F5EC893BBAD35F7419`
- `support.js` — SHA-256: `8FE7DF74405F3C55F49B7249C74EA1397E65D07DEA2B1BD3B4A489BEC2E28CBE`
- لم يتم تعديل `uploads/*`.

## 9. ملاحظات متبقية

- زر التصدير وإشعارات النجاح تجريبية فقط، كما هو مطلوب.
- روابط الإجراءات السريعة تتجه إلى المسارات القائمة التي لا تزال Placeholder، ولا تبدأ تنفيذ وحداتها.
- لا توجد خدمات حقيقية أو تخزين أو جلسات مستخدمين في هذه المرحلة.
- الخادم القديم الموجود على المنفذ 3000 كان يعرض خطأ Build قديمًا؛ لذلك شغّلت فحوصات E2E على نسخة Production حديثة ومنفذ معزول، ثم أوقفت خادم الفحص المعزول فقط دون إيقاف الخادم القديم.

تم التوقف بعد إنجاز لوحة التحكم فقط، ولم يبدأ تنفيذ أي صفحة أو Feature تالية.

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
