# تقرير Sprint 14 — التقارير وتسليمها لمالك النشاط

## النتيجة

تم تنفيذ Feature التقارير كتجربة تشغيلية Mock كاملة داخل تطبيق L3BTY، مع فصل واضح بين التقارير الإدارية والتقرير الشخصي للموظف. يستطيع المالك والمدير فقط تصفح مركز التقارير والـSnapshots وسجل التسليم، ويستطيع المدير إرسال Snapshot ثابت إلى مالك النشاط. لا يعاد حساب التقرير عند الفتح أو إعادة المحاولة.

لم تتم إضافة Supabase أو Auth حقيقي أو قاعدة بيانات أو إعدادات أو Activity Log شامل.

## المسارات المنفذة

- `/reports`: كتالوج 16 تقريرًا إداريًا، ملخص الـSnapshots وحالات التسليم.
- `/reports/[reportKey]`: معاينة تقرير بالفترة والفروع والفلاتر، ثم حفظ Snapshot ثابت.
- `/reports/snapshots/[snapshotId]`: عرض النسخة الثابتة وبيانات hash والإصدارات والتصدير.
- `/reports/deliveries`: صندوق الوارد للمالك وسجل الإرسال وإعادة المحاولة للمدير.
- `/my-reports`: نشاط الموظف التشغيلي الشخصي فقط، حسب الدور والفروع المسندة.

## التقارير المعتمدة

1. ملخص الإدارة.
2. المبيعات.
3. التأجير.
4. الصيانة.
5. تلفيات التأجير ورسومها المستقلة.
6. المخزون.
7. التحويلات.
8. الحسابات والخزائن.
9. الورديات والتحصيلات.
10. المديونيات.
11. المصروفات.
12. الرواتب.
13. الحضور والانصراف.
14. الموظفون.
15. أداء الفروع.
16. العملاء.

## الصلاحيات

- `owner`: قراءة التقارير الإدارية والـSnapshots وصندوق الوارد وفتح التسليمات والتصدير. لا يظهر له إجراء الإرسال إلى نفسه.
- `manager`: قراءة التقارير، إنشاء Snapshot، الإرسال للمالك، متابعة التسليم، وإعادة محاولة التسليم الفاشل باستخدام النسخة نفسها.
- `sales_employee`: لا يصل إلى الإدارة؛ يرى في `/my-reports` نشاط المبيعات والتحصيلات الخاصة به فقط.
- `rental_maintenance_employee`: لا يصل إلى الإدارة؛ يرى نشاط التأجير والاستلام ورسوم التلف التي سجلها فقط.
- `maintenance_technician`: لا يصل إلى الإدارة؛ يرى البلاغات والأوامر والقطع والتحويلات الفنية المسندة إليه، دون المالية العامة أو الرواتب.
- تعدد الأدوار التشغيلية يجمع الأقسام الشخصية المسموحة ولا يمنح الوصول الإداري.

أضيفت مفاتيح الصلاحيات `reports.view_self` و`reports.snapshot` و`reports.deliver`، واستمرت سياسة الوصول الإداري المركزية عبر Navigation Policy والـroute guards نفسها.

## Snapshot والتسليم

- يتم بناء المعاينة من مخازن الـMock الحالية للوحدات المنفذة.
- عند الحفظ يُنسخ المحتوى بعمق، يُجمّد، ويحصل على hash حتمي `FNV-1a` ورقم إصدار ومفتاح idempotency.
- تكرار الحفظ بالمفتاح نفسه يعيد النسخة السابقة ولا ينشئ نسخة مكررة.
- لا يمكن الإرسال من Preview؛ الإرسال يحتاج Snapshot بحالة `ready` أو `sent`.
- التسليم مسموح من `employee-manager` إلى `employee-owner` فقط.
- فتح المالك يسجل `openedAt` ويحافظ على المحتوى الأصلي.
- إعادة محاولة الفشل تغيّر سجل التسليم وتحتفظ بـ`snapshotId` نفسه بلا إعادة حساب.
- التنبيهات والسجل التدقيقي Mock داخل الذاكرة، وربطت حالات التسليم الجديدة/الفاشلة بتنبيهات Dashboard الإدارية الحالية فقط.

## التصدير والطباعة

- طباعة A4 عبر تنسيقات `@media print`.
- تنزيل JSON للـSnapshot الثابت.
- تنزيل CSV من صفوف أقسام التقرير.
- كل عملية تصدير تسجل Audit Mock.

## الملفات المضافة

- `features/reports/types.ts`
- `features/reports/fixtures.ts`
- `features/reports/permissions.ts`
- `features/reports/schemas/report-schema.ts`
- `features/reports/services/report-engine.ts`
- `features/reports/services/report-store.ts`
- `features/reports/services/personal-report-service.ts`
- `features/reports/hooks/use-reports.ts`
- `features/reports/components/ReportsPage.tsx`
- `features/reports/components/ReportViewer.tsx`
- `features/reports/components/SnapshotViewer.tsx`
- `features/reports/components/ReportDeliveriesPage.tsx`
- `features/reports/components/MyReportsPage.tsx`
- `features/reports/components/report-ui.tsx`
- `features/reports/tests/reports.spec.ts`
- `app/(workspace)/reports/page.tsx`
- `app/(workspace)/reports/[reportKey]/page.tsx`
- `app/(workspace)/reports/snapshots/[snapshotId]/page.tsx`
- `app/(workspace)/reports/deliveries/page.tsx`
- `app/(workspace)/my-reports/page.tsx`
- `styles/reports.css`
- `tests/responsive/reports.spec.ts`

## الملفات المحدّثة

- `app/globals.css`: استيراد `reports.css` مرة واحدة.
- `permissions/types.ts`, `permissions/keys.ts`, `permissions/role-templates.ts`, `permissions/navigation-policy.ts`: مفاتيح وسياسة التقارير المركزية.
- `components/shell/Header.tsx`: رابط تقرير النشاط الشخصي في قائمة المستخدم.
- `features/dashboard/services/get-dashboard-data.ts`: تنبيهات تقارير محدودة للمالك والمدير.
- `features/branches/types.ts`, `features/branches/services/branch-store.ts`: alias ثابت لنوع الفرع لقارئ التجميع، مع الحفاظ على مرجع Snapshot ثابت.
- `features/customers/types.ts`, `features/customers/services/customer-store.ts`: حقول موحدة ثابتة للهاتف والفرع المفضل لقارئ التقرير.
- `vitest.config.mts`: تضمين اختبارات التقارير.

## معالجة مشكلة ظهرت أثناء التحقق

ظهر React maximum update depth في أول تشغيل متصفح. السبب أن قارئي Snapshot للفروع والعملاء كانا يعيدان Array جديدة عند كل استدعاء، وهو مخالف لمتطلبات `useSyncExternalStore`. تم تصحيح التخزين ليبقى المرجع ثابتًا، مع إنشاء حقول التقرير الموحّدة عند إنشاء/تحديث البيانات بدل إنشائها أثناء القراءة. بعد التصحيح نجحت كل اختبارات الصفحات القديمة والجديدة.

## نتائج الجودة

- `npm run check:styles`: ناجح — تم التحقق من 23 استيراد CSS محليًا.
- `npm run build`: ناجح — Next.js 16.3.0، وتم توليد 49 صفحة دون أخطاء.
- `npm run lint`: ناجح دون أخطاء أو تحذيرات.
- `npm run typecheck`: ناجح.
- `npm test`: ناجح — 22 ملف اختبار و195 اختبارًا.
- `npm run test:e2e`: ناجح — 79 اختبارًا في 2.8 دقيقة.

## التحقق المتجاوب واليدوي

تم فحص `/reports` ومسارات المعاينة والـSnapshot والتسليم والتقرير الشخصي عند:

- 1920×1080
- 1440×900
- 1366×768
- 1024×768
- 834×1112
- 768×1024
- 390×844

النتيجة: RTL صحيح، لا horizontal overflow، بطاقات وجداول التقارير متجاوبة، التقرير على الهاتف مقروء، وDrawer الإرسال يسار سطح المكتب/التابلت وBottom Sheet على الهاتف وفق السياسة المعتمدة.

## حدود النسخة الحالية

- جميع البيانات والحالات والتنبيهات وسجل التدقيق داخل الذاكرة وتعود إلى Fixtures بعد إعادة تشغيل الخادم.
- hash الحالي حتمي ومناسب للـMock، لكنه ليس بديلًا عن hash تشفيري أو توقيع على مستوى الإنتاج.
- ملفات JSON وCSV تُنشأ في المتصفح، والطباعة تعتمد على حوار الطباعة المحلي.
- لم يتم تنفيذ تسليم خارجي أو بريد أو واتساب أو جدولة تلقائية؛ قناة التسليم الحالية `in_app` فقط.

## الخطوة التالية المقترحة

بعد مراجعة واعتماد هذه الواجهة، تكون المهمة التالية المنفصلة هي تصميم عقد persistence للـSnapshots والتسليمات في Supabase مع RLS، من دون تغيير شكل التقارير أو صلاحياتها المعتمدة.
