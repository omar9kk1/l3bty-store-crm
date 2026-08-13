# تقرير Sprint 11 — المخزون والتحويلات

تاريخ التنفيذ: 6 أغسطس 2026  
الحالة: مكتمل ضمن نطاق الـMock فقط، بلا Supabase أو Auth حقيقي أو قاعدة بيانات.

## 1. النطاق المنفذ

- استبدال صفحة `/inventory` المؤقتة بصفحة مخزون فعلية متجاوبة.
- إضافة سجل الحركات `/inventory/movements`.
- إضافة قائمة التحويلات `/inventory/transfers`.
- إضافة معالج إنشاء التحويل `/inventory/transfers/new` من ثماني خطوات.
- إضافة تفاصيل التحويل `/inventory/transfers/[transferId]` مع الاعتماد والإرسال والاستلام والفروقات والإلغاء.
- إبقاء المخزون الكمي مقتصرًا على ألعاب البيع وقطع الغيار.
- إبقاء أصول التأجير سجلات منفردة Serialised، وعدم دمجها في الأرصدة الكمية.
- عدم إضافة الخدمات أو الرسوم أو التأمين أو العربون إلى المخزون.
- ربط الرصيد الحالي بحركات البيع والمرتجعات والصيانة والتحويلات الموجودة في مخزن الـMock المشترك.
- تطبيق Moving Weighted Average عند استلام مخزون بتكلفة جديدة.
- إضافة جرد وتسوية موثقة بحركة مستقلة وAudit Mock، دون تعديل صامت للرصيد.
- إظهار تنبيهات المخزون المنخفض الحية داخل بيانات Dashboard بدل المصدر الثابت السابق.

## 2. نموذج المخزون

### StockBalance

يتضمن المنتج والفرع، الكمية بالمخزن، المحجوز، المتاح، الحد الأدنى، مستوى إعادة الطلب، متوسط التكلفة، وآخر تحديث.

### StockMovement

سجل Append-only يضم: الرقم، المنتج، الفرع، النوع، الكمية، الرصيد قبل وبعد، التكلفة، المرجع، المنفذ، السبب، الوقت، ومفتاح Idempotency.

أنواع الحركات المدعومة تشمل:

- رصيد افتتاحي واستلام شراء.
- بيع ومرتجع بيع.
- صرف وإرجاع صيانة.
- إرسال واستلام تحويل.
- تسويات داخلة وخارجة وفروق جرد.
- تالف وشطب.

## 3. دورة التحويل

الدورة المعتمدة المنفذة:

`إنشاء → انتظار اعتماد عند الحاجة → اعتماد/رفض → إرسال → في الطريق → استلام → مكتمل أو فروقات للمراجعة`

القواعد المهمة:

- المصدر لا ينقص عند إنشاء الطلب أو اعتماده؛ ينقص عند تأكيد الإرسال فقط.
- الوجهة لا تزيد عند الإرسال؛ تزيد عند تأكيد الاستلام فقط.
- التحويل الإداري المعتمد تلقائيًا يحمل الكمية المعتمدة الصحيحة قبل الإرسال.
- أي فرق استلام يحتاج سببًا، ويبقى في حالة مراجعة حتى قرار المالك أو المدير.
- لا يُحذف المستند عند الرفض أو الإلغاء، ويظل السبب والسجل الزمني محفوظين.
- أصل التأجير لا ينتقل إلى موقع الوجهة قبل الاستلام المؤكد، ولا يمكن إدخاله في تحويل نشط مكرر.
- تحويلات الصيانة مرتبطة بأوامر الصيانة الحالية عند وجود مرجع.

## 4. الأدوار والصلاحيات

أضيفت الصلاحيات المركزية التالية:

- `inventory.view`
- `inventory.movements`
- `inventory.cost`
- `inventory.adjust`
- `transfers.view`
- `transfers.create`
- `transfers.operate`
- `transfers.approve`

تطبيق الأدوار:

- المالك والمدير: عرض كامل، التكلفة، الجرد والتسوية، الاعتماد، الفروقات، وكل أنواع التحويل.
- موظف المبيعات: ألعاب البيع ضمن فروعه، الحركات التشغيلية المسموحة، وإنشاء وتشغيل تحويلات المخزون المسموحة.
- موظف التأجير واستلام الصيانة: قطع الغيار ومواقع أصول التأجير ضمن نطاقه، وإنشاء وتشغيل التحويلات المسموحة.
- فني الصيانة: قطع الغيار وحركات الصيانة والتحويلات المرتبطة بمهامه؛ بلا تكلفة أو تسوية إدارية أو اعتماد.
- دمج الأدوار يستخدم اتحاد الصلاحيات، مع استمرار تقييد الفروع حسب سياسة App Shell الحالية.

## 5. البيانات التجريبية

- أضيفت أرصدة ورشة مركزية لقطع الغيار الحالية.
- أضيفت عشرة سيناريوهات تحويل حتمية تغطي: انتظار الاعتماد، المعتمد، التجهيز، الطريق، الاستلام الجزئي، الفروقات، المكتمل، المرفوض، والملغي.
- المنتجات المستخدمة فقط من الأنواع المعتمدة: `sale_toy` و`spare_part`.
- أصول التأجير مأخوذة من Rental Store الحالي وتحافظ على رقم الأصل وحالته وموقعه.
- لا توجد منتجات شيبسي أو مشروبات أو منتجات عامة في Feature الجديدة.

## 6. الملفات المنشأة

### الصفحات

- `app/(workspace)/inventory/page.tsx`
- `app/(workspace)/inventory/movements/page.tsx`
- `app/(workspace)/inventory/transfers/page.tsx`
- `app/(workspace)/inventory/transfers/new/page.tsx`
- `app/(workspace)/inventory/transfers/[transferId]/page.tsx`

### Feature المخزون

- `features/inventory/types.ts`
- `features/inventory/permissions.ts`
- `features/inventory/fixtures.ts`
- `features/inventory/services/inventory-service.ts`
- `features/inventory/hooks/use-inventory.ts`
- `features/inventory/components/inventory-labels.ts`
- `features/inventory/components/InventoryPage.tsx`
- `features/inventory/components/StockMovementsPage.tsx`
- `features/inventory/forms/StockAdjustmentForm.tsx`
- `features/inventory/tests/inventory.spec.ts`

### Feature التحويلات

- `features/transfers/types.ts`
- `features/transfers/permissions.ts`
- `features/transfers/fixtures.ts`
- `features/transfers/schemas/transfer-schema.ts`
- `features/transfers/services/transfer-store.ts`
- `features/transfers/hooks/use-transfers.ts`
- `features/transfers/components/transfer-labels.ts`
- `features/transfers/components/TransfersPage.tsx`
- `features/transfers/components/CreateTransferPage.tsx`
- `features/transfers/components/TransferDetailsPage.tsx`
- `features/transfers/forms/CreateTransferWizard.tsx`
- `features/transfers/tests/transfers.spec.ts`

### التصميم والاختبارات

- `styles/inventory.css`
- `styles/transfers.css`
- `tests/responsive/inventory.spec.ts`

## 7. الملفات القائمة التي تم تحديثها

- `app/globals.css`: استيراد `inventory.css` و`transfers.css` مرة واحدة.
- `features/products/types.ts`: توسيع أنواع حركات المخزون.
- `features/products/fixtures.ts`: أرصدة قطع الغيار بالورشة.
- `features/products/services/product-store.ts`: حركة مخزون ذرية مع منع الرصيد السالب وIdempotency.
- `features/rentals/services/rental-store.ts`: إرسال واستلام موقع أصل التأجير.
- `features/dashboard/services/get-dashboard-data.ts`: تنبيهات المخزون الحية.
- `permissions/types.ts`, `permissions/keys.ts`, `permissions/role-templates.ts`: الصلاحيات الجديدة.
- `permissions/navigation-policy.ts`: جعل قسم المخزون يشمل المسارات الفرعية.
- `vitest.config.mts`: إدراج اختبارات المخزون والتحويلات.
- `tests/responsive/rentals.spec.ts`: حصر فحص تذكير الخمس دقائق داخل تفاصيل التأجير؛ لأن ActiveRentalStrip العام قد يعرض تذكير تأجير آخر بصورة صحيحة.

## 8. خطأ Runtime الذي اكتُشف أثناء التحقق

كان `getInventorySnapshot()` ينشئ كائنًا جديدًا في كل قراءة من `useSyncExternalStore`، فدخل React في حلقة إعادة رسم وأظهر صفحة الخطأ عند فتح `/inventory`.

تم إصلاحه بتخزين Snapshot ثابت، وإعادة بنائه فقط عند تغير Product Store أو Audit Store. بعد الإصلاح فتحت الصفحة طبيعيًا بلا أخطاء Console.

## 9. نتائج الجودة

| الفحص | النتيجة |
|---|---|
| `npm run check:styles` | ناجح — 18 استيراد CSS محليًا |
| `npm run build` | ناجح — 39 صفحة مولدة، ومسارات المخزون والتحويلات موجودة |
| `npm run lint` | ناجح بلا أخطاء |
| `npm run typecheck` | ناجح بلا أخطاء |
| `npm test` | ناجح — 161/161 اختبارًا في 17 ملفًا |
| `npm run test:e2e` | ناجح — 65/65 اختبارًا |

تم تشغيل E2E النهائي على خادم Production منفصل بالمنفذ 3105 لتجنب تعارض منفذ 3000 وتعليق إغلاق خادم Playwright التلقائي على Windows. لم يتغير سلوك التطبيق بسبب المنفذ.

## 10. التحقق المتجاوب واليدوي

تم التحقق آليًا ويدويًا عند:

- 1920×1080
- 1440×900
- 1366×768
- 1024×768
- 834×1112
- 768×1024
- 390×844

النتيجة:

- RTL صحيح في الصفحات الجديدة.
- لا يوجد Horizontal Scroll في أي مقاس.
- الجدول ظاهر على Desktop/Tablet، ويتحول إلى بطاقات على الهاتف.
- Drawer الجرد Auxiliary يسار Desktop/Tablet وأسفل الهاتف.
- قائمة التحويلات ومعالج الإنشاء وتفاصيل التحويل تعمل دون أخطاء Console.
- App Shell وSidebar وHeader وباقي الصفحات لم تتغير بصريًا بسبب Feature.

## 11. القيود المؤجلة للإنتاج

- الحالة الحالية In-memory Mock وتُعاد عند إعادة تشغيل التطبيق.
- لا توجد معاملات قاعدة بيانات أو قفل تزامن متعدد المستخدمين بعد.
- لا يوجد Auth حقيقي أو إشعارات Push أو Supabase.
- عند الانتقال للإنتاج يجب تنفيذ حركات المخزون والتحويلات داخل معاملات ذرية في الخادم، مع قيود uniqueness لمفاتيح Idempotency وأصول التأجير النشطة.
- لم يبدأ أي Feature مالية أو رواتب أو مشتريات ضمن هذا Sprint.

## 12. الخلاصة

Feature المخزون والتحويلات جاهزة كتنفيذ Frontend/Mock متكامل مع النظام الحالي، وتغطي الفصل بين المنتجات الكمية وأصول التأجير، دورة التحويل، الصلاحيات، الفروقات، الجرد، ومتوسط التكلفة المتحرك. لا توجد مشكلة مانعة متبقية ضمن نطاق Sprint 11.
