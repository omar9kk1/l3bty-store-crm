# تقرير Sprint 09 — المبيعات والكتالوج

التاريخ: 2026-08-06  
الحالة: مكتمل ضمن Mock State، من دون Supabase أو Auth أو قاعدة بيانات أو محاسبة/مخزون إنتاجي.

## 1. النطاق المنفذ

- تحويل `/sales/pos` من Placeholder إلى نقطة بيع تفاعلية.
- إنشاء قائمة فواتير المبيعات في `/sales/invoices` وتفاصيل الفاتورة في `/sales/invoices/[invoiceId]`.
- إنشاء المرتجعات والاستبدال داخل `/sales/returns` بحركات عكسية موثقة.
- تحويل `/products` إلى كتالوج كمي وإنشاء `/products/[productId]`.
- إضافة فتح فاتورة البيع يدويًا عبر WhatsApp/WhatsApp Web، من دون إرسال تلقائي.
- ربط مؤشرات Dashboard ببيانات المبيعات التجريبية، وإضافة ملخص المبيعات داخل ملف العميل.

## 2. أنواع المنتجات المعتمدة

الكتالوج الكمي يقبل نوعين فقط:

- `sale_toy`: ألعاب كهربائية للبيع.
- `spare_part`: قطع غيار.

بيانات Mock الحالية تشمل 4 ألعاب كهربائية للبيع و5 قطع غيار. المنتج غير النشط موجود لاختبار الحالة، ولا يظهر كمنتج متاح في POS. لا تحتوي Fixtures أو POS على شيبسي أو مشروبات أو بسكويت أو أجهزة ألعاب فيديو أو أصول تأجير.

## 3. قواعد POS والسلة

- البحث بالاسم أو SKU أو Barcode، مع Tabs للكل/ألعاب البيع/قطع الغيار.
- عرض منتجات الفرع النشطة ذات الرصيد المتاح فقط.
- دعم الإضافة، الزيادة، التخفيض، حذف السطر، وتفريغ السلة بتأكيد.
- العميل إلزامي، ويعاد استخدام `QuickCustomerForm` وتطبيع الهاتف وفحص التكرار من Customer Feature الحالية.
- يلزم فرع تشغيلي ووردية مالية مفتوحة للمحصل.
- يمنع تجاوز الرصيد أو البيع بسلة فارغة أو بيع منتج غير نشط أو RentalAsset.
- السلة Mock محفوظة على مستوى Store أثناء التنقل داخل التطبيق، وتفرغ بعد نجاح الفاتورة.
- يستخدم Checkout مفتاح Idempotency لمنع تكرار الفاتورة والحركة المخزنية عند تكرار الطلب.

## 4. الأسعار والخصومات والدفع

- الضريبة الافتراضية `0%` مع الاحتفاظ بالحقل كنقطة إعداد مستقبلية.
- حد خصم موظف المبيعات Mock هو `10%`.
- أي تجاوز من موظف المبيعات يحتاج اختيار موافقة الإدارة وسببًا موثقًا.
- تعديل السعر متاح للمالك والمدير فقط، ويُسجل السعر الأصلي والجديد والسبب في Audit Events.
- طرق الدفع Mock: نقدي، بطاقة، محفظة، ومختلط.
- المبلغ المتبقي لا يسمح به إلا للمالك أو المدير مع اعتماد وسبب.
- Payment Mock يرتبط بالفرع والوردية والموظف المحصل.

## 5. الفواتير وWhatsApp

- حالات الفاتورة المعرفة: `draft`, `completed`, `partially_returned`, `fully_returned`, `cancelled`.
- الإيصال يعرض العميل، الهاتف، الفرع، الموظف، الوردية، السطور، الخصومات، الضريبة، الإجمالي، المدفوع، المتبقي، والمدفوعات.
- خيارات طباعة Mock: 58mm و80mm وA4 عبر CSS الطباعة الحالي، من دون PDF على الخادم.
- `SalesWhatsAppService` عقد قابل للاستبدال لاحقًا بمزود API.
- الرقم المصري يطبع ويحوّل إلى الصيغة الدولية داخل رابط `wa.me`.
- لا يحدث إرسال تلقائي؛ الزر يفتح WhatsApp فقط. إذا كان الهاتف غير صالح يعطل الزر وتظهر رسالة واضحة.

## 6. المرتجعات والاستبدال وتأثير المخزون

- يدعم المرتجع الجزئي والكامل والاستبدال، مع السبب والكمية وحالة المنتج وطريقة الرد Mock.
- المنتج الصالح للبيع فقط يعود إلى الرصيد المتاح.
- المنتج التالف أو المحتاج للفحص لا يعود تلقائيًا إلى الرصيد المتاح، وتسجل له حركة مستقلة.
- الاستبدال يخفض رصيد المنتج البديل قبل اعتماد الحركة.
- لا يوجد Hard Delete؛ تبقى الفاتورة الأصلية ويحدث Status وAudit Event وReturn Record.
- إلغاء الفاتورة متاح للمالك والمدير فقط مع سبب وتأكيد؛ يعيد الكميات غير المرتجعة بحركات عكسية ويحتفظ بالفاتورة بحالة `cancelled`.
- البيع يخفض `ProductBranchStock` للفرع، والمرتجع الصالح ينشئ حركة عكسية.

## 7. الصلاحيات

| الدور | POS والفواتير والمرتجعات والكتالوج | إدارة المنتج ورؤية التكلفة | النطاق |
|---|---|---|---|
| owner | كامل | نعم | كل الفروع |
| manager | كامل | نعم | كل الفروع |
| sales_employee | نعم | لا | الفروع المسندة |
| rental_maintenance_employee | ممنوع | ممنوع | لا تعرض بيانات المبيعات |
| maintenance_technician | ممنوع | ممنوع | لا تعرض بيانات المبيعات |

تعدد الأدوار يجمع الصلاحيات؛ لا يمنح الوصول للمبيعات إلا عند وجود `sales_employee` أو `owner` أو `manager` صراحة. Navigation وMobile More والوصول المباشر تستخدم السياسة المركزية نفسها.

## 8. Responsive والحالات

- Desktop: كتالوج وسلة واضحة، والسلة Sticky داخل مساحة المحتوى.
- Tablet: توزيع متوازن من دون التأثير في Sidebar/Navigation Drawer.
- Mobile: بطاقات منتجات، السلة متتابعة داخل الصفحة، وأهداف لمس مناسبة للمكونات الأساسية.
- جداول الفواتير والمنتجات تتحول إلى Cards على الهاتف.
- Auxiliary Drawer لإضافة/تعديل المنتج والعميل يفتح من اليسار على Desktop/Tablet ومن الأسفل على Mobile.
- الحالات المدعومة: normal وloading وempty وerror وoffline. الإنشاء معطل في POS Offline ولا تدعي الواجهة وجود Queue حقيقية.
- تحقق المتصفح على 1920×1080 و1440×900 و1024×768 و834×1112 و390×844: RTL صحيح ولا يوجد Horizontal Scroll.

## 9. الملفات المنشأة

### Products

- `features/products/types.ts`
- `features/products/fixtures.ts`
- `features/products/permissions.ts`
- `features/products/schemas/product-schema.ts`
- `features/products/services/product-store.ts`
- `features/products/hooks/use-products.ts`
- `features/products/forms/ProductForm.tsx`
- `features/products/components/ProductsPage.tsx`
- `features/products/components/ProductDetailsPage.tsx`
- `features/products/tests/products.spec.ts`
- `app/(workspace)/products/[productId]/page.tsx`
- `styles/products.css`

### Sales

- `features/sales/types.ts`
- `features/sales/fixtures.ts`
- `features/sales/permissions.ts`
- `features/sales/services/sales-store.ts`
- `features/sales/services/sales-whatsapp-service.ts`
- `features/sales/hooks/use-sales.ts`
- `features/sales/components/PosPage.tsx`
- `features/sales/components/SaleInvoicesPage.tsx`
- `features/sales/components/SaleInvoicePage.tsx`
- `features/sales/components/SaleReturnPage.tsx`
- `features/sales/components/SaleWhatsAppAction.tsx`
- `features/sales/components/SaleCancelAction.tsx`
- `features/sales/components/CustomerSalesSummary.tsx`
- `features/sales/tests/sales.spec.ts`
- `app/(workspace)/sales/invoices/page.tsx`
- `app/(workspace)/sales/invoices/[invoiceId]/page.tsx`
- `app/(workspace)/sales/returns/page.tsx`
- `styles/sales.css`
- `tests/responsive/sales.spec.ts`

## 10. الملفات المعدلة

- `app/(workspace)/sales/pos/page.tsx`
- `app/(workspace)/products/page.tsx`
- `app/globals.css`
- `permissions/navigation-policy.ts`
- `features/customers/fixtures.ts`
- `features/customers/components/CustomerDetailsPage.tsx`
- `features/dashboard/services/get-dashboard-data.ts`
- `tests/permissions/navigation.spec.ts`
- `vitest.config.mts`

لم تعدل ملفات Prototype أو `support.js` أو `uploads`.

## 11. نتائج الجودة

| الفحص | النتيجة |
|---|---|
| `npm run check:styles` | ناجح — تحقق من 15 استيراد CSS محليًا |
| `npm run build` | ناجح — Next.js 16.3.0، وكل المسارات الجديدة ضمن Build Output |
| `npm run lint` | ناجح — بلا أخطاء أو تحذيرات |
| `npm run typecheck` | ناجح |
| `npm test` | ناجح — 14 ملفات، 142 اختبارًا |
| `npm run test:e2e` | ناجح — 59 اختبارًا، تشمل 5 اختبارات للمبيعات والكتالوج والإلغاء وحد لمس 44px |

تم كذلك فتح `/sales/pos` و`/sales/invoices` و`/sales/invoices/sale-401` و`/sales/returns` و`/products` و`/products/product-car-12v` يدويًا. عملت جميعها من دون Runtime خاص بالـPrototype، وكانت `dir=rtl` ونتيجة overflow تساوي صفرًا.

## 12. حدود المرحلة الحالية

- كل البيانات والحركات داخل الذاكرة Mock وتعود إلى Fixtures بعد إعادة تشغيل الخادم.
- لا توجد قاعدة بيانات أو تسوية مالية أو حجز مخزني متزامن أو تكامل دفع حقيقي.
- WhatsApp فتح يدوي فقط، ولا يوجد إرسال API.
- الطباعة من المتصفح فقط، ولا يوجد PDF Server-side.
- قيم حد الخصم وسياسات الاعتماد Mock ويجب نقلها إلى إعدادات وصلاحيات إنتاجية لاحقًا.
