# تقرير Sprint 10 — الصيانة وبلاغات الأعطال

التاريخ: 2026-08-06  
الحالة: مكتمل ضمن Mock State، من دون Supabase أو Auth أو قاعدة بيانات أو مخزون/محاسبة إنتاجية.

## 1. النطاق المنفذ

- تحويل `/maintenance` من Placeholder إلى لوحة متابعة فعلية.
- إنشاء `/maintenance/intake` لمساري استلام منفصلين بوضوح.
- إنشاء صندوق بلاغات الفني في `/maintenance/faults` وتفاصيل البلاغ في `/maintenance/faults/[faultId]`.
- إنشاء تفاصيل أمر الصيانة في `/maintenance/orders/[orderId]`.
- إنشاء متابعة الورشة المركزية في `/maintenance/workshop`.
- إضافة Mock Store موحد للبلاغات والأوامر والإشعارات وسجل النشاط وقطع الغيار والتحويلات.
- إضافة فتح WhatsApp يدويًا للاستلام والتقدير والموافقة والجاهزية، من دون إرسال تلقائي.

## 2. الفرق بين نوعي الصيانة

| البند | عطل أصل تأجير داخلي | لعبة كهربائية مملوكة للعميل |
|---|---|---|
| المرجع | `rentalAssetId` إلزامي ومن فرع الاستلام | `customerId` وبيانات اللعبة إلزامية |
| الأثر الأولي | يتحول الأصل إلى حالة صيانة في Rental Mock Store | ينشأ `customerItemId` داخل أمر الصيانة |
| التقدير المالي | إصلاح داخلي ولا يحتاج موافقة عميل | تقدير عمل وقطع ينتظر موافقة العميل |
| بدء الإصلاح | حسب التشخيص والتحويل | يمنع الإصلاح المدفوع قبل توثيق الموافقة |
| التواصل | إشعارات داخلية | WhatsApp يدوي للأدوار المخولة فقط |
| الإغلاق | يعيد الأصل إلى `available` بعد الإغلاق | جاهزية، تسليم، ثم إغلاق |

لا تُجمع دفعة ولا يُحدد سعر نهائي داخل الاستلام.

## 3. عقود البلاغ وأمر الصيانة

- `FaultReport` يحتفظ بالفرع، الموقع، الموظف المبلّغ، نوع العنصر، العميل أو الأصل، وصف العطل، الحالة الخارجية، الملحقات، المرفقات، الأولوية، موقع العنصر، والفني المسؤول.
- `MaintenanceOrder` يحتفظ بالحالة التشغيلية، التشخيص، السبب، الإجراء، تقديرات العمل والقطع، موافقة العميل، الضمان، القطع المرتبطة، التحويل، الموقع الحالي، والتسلسل الزمني.
- `MaintenanceNotification` يمثل الإشعارات التجريبية للفني والمدير وموظف الاستلام.
- Fixtures حتمية وتغطي 15 حالة، منها: غير مسند، قيد التشخيص، انتظار الموافقة/القطعة، بالورشة، جاهز للعودة/التسليم، ملغي، متأخر، تم التسليم ومغلق.

## 4. الفني والاستلام والتشخيص

- البلاغ غير المسند يُرسل إلى الفنيين المؤهلين وإلى المدير، والمسند يرسل للفني المحدد.
- أول فني مؤهل يؤكد الاستلام يصبح المسؤول؛ المحاولة التالية ترفض ولا تغير المالك.
- إعادة التعيين متاحة في الواجهة للمالك والمدير فقط، وتتطلب سببًا يظهر في Audit Mock.
- التشخيص متاح للفني المسؤول أو الإدارة، ويشمل السبب والإجراء والتقدير والموعد والضمان والحاجة للورشة.
- صيانة لعبة العميل ذات التكلفة تنتقل إلى `awaiting_customer_approval`، ولا يسمح ببدء `in_repair` قبل الموافقة.
- الفني لا يملك اعتماد العميل أو تحصيل مبلغ أو الوصول إلى الإدارة المالية العامة.

## 5. قطع الغيار

- طلب القطعة ينشأ فقط من داخل أمر صيانة ويرتبط بـ`maintenanceOrderId`.
- يقبل `spare_part` فقط؛ لا يقبل لعبة بيع أو أصل تأجير كقطعة.
- الصرف ينشئ حركة `maintenance_issue` في Product Mock Store ويخفض الرصيد الفعلي للموقع التجريبي.
- يمنع الصرف فوق الرصيد، وتتحول حالة الطلب إلى `unavailable` عند عدم كفاية الكمية.
- هذا الربط ليس Feature مخزون كاملًا، ولا يشمل شراء أو جرد أو موردين.

## 6. التحويل للورشة والعودة

- التحويل يحتفظ بالفرع المصدر، سبب التحويل، الحالة قبل الإرسال والملحقات.
- الحالات التشغيلية: طلب تحويل، إرسال/في الطريق، استلام بالورشة، جاهز للعودة، ثم عودة للفرع.
- لكل أمر `currentLocation` واحد فقط، ويتغير مع انتقالات التحويل؛ لا تظهر اللعبة في الفرع والورشة معًا.
- العودة إلى الفرع لا تحذف الأمر ولا تغلقه تلقائيًا قبل إكمال التسليم أو الفحص النهائي.

## 7. الصلاحيات

| الدور | لوحة الصيانة | الاستلام والمتابعة | البلاغات والتشخيص | الورشة | WhatsApp للعميل |
|---|---|---|---|---|---|
| owner | كامل | كامل | كامل | كامل | نعم |
| manager | كامل | كامل | كامل | كامل | نعم |
| rental_maintenance_employee | فروعه | إنشاء ومتابعة | لا يشخص أو يصرف قطعًا | لا يدير الورشة | نعم |
| maintenance_technician | ينتقل لصندوق البلاغات | لا | البلاغات المؤهلة/المسندة والعمل الفني | نعم | لا |
| sales_employee | ممنوع | ممنوع | ممنوع | ممنوع | ممنوع |

أضيفت المفاتيح `maintenance.intake` و`maintenance.technician` و`maintenance.manage` إلى جانب `maintenance.view`. عنصر التنقل مركزي: الفني يفتح `/maintenance/faults`، وموظف الاستلام والإدارة يفتحون `/maintenance`. تعدد الأدوار يجمع المسموح فقط.

## 8. WhatsApp والإشعارات

- يتم تطبيع رقم الهاتف المصري وفتح رابط `wa.me` يدويًا فقط.
- الهاتف غير الصالح يعطل الإجراء ولا ينشئ رابطًا.
- الرسائل المتاحة: إيصال الاستلام، التقدير، توثيق الموافقة، والجاهزية.
- رسائل التقدير والموافقة لا تظهر للفني.
- إشعارات Mock تتضمن رقم البلاغ، الفرع، اللعبة، وصف العطل والمسار المباشر.

## 9. Drawers وResponsive

- النماذج الطويلة (الاستلام وتفاصيل الأمر) Routes كاملة.
- التشخيص، طلب القطعة، التحويل وإعادة التعيين تستخدم `auxiliary Drawer` المشترك: من اليسار على Desktop/Tablet ومن الأسفل على Mobile، بعرض قياسي 360px وحقول لا تقل عن 44px.
- الجداول تتحول إلى Cards تحت 768px، مع مسافة آمنة فوق Mobile Navigation.
- تم التحقق على 1920×1080 و1440×900 و1024×768 و834×1112 و390×844 داخل E2E، إضافة إلى قواعد Shell الموجودة لـ768×1024. جميع المسارات RTL ولا يوجد Horizontal Scroll.

## 10. الملفات المنشأة

- `features/maintenance/types.ts`
- `features/maintenance/fixtures.ts`
- `features/maintenance/permissions.ts`
- `features/maintenance/schemas/maintenance-schema.ts`
- `features/maintenance/services/maintenance-store.ts`
- `features/maintenance/services/maintenance-whatsapp-service.ts`
- `features/maintenance/hooks/use-maintenance.ts`
- `features/maintenance/components/maintenance-labels.ts`
- `features/maintenance/components/MaintenancePage.tsx`
- `features/maintenance/components/MaintenanceIntakePage.tsx`
- `features/maintenance/components/MaintenanceDetailsPages.tsx`
- `features/maintenance/tests/maintenance.spec.ts`
- `app/(workspace)/maintenance/intake/page.tsx`
- `app/(workspace)/maintenance/faults/page.tsx`
- `app/(workspace)/maintenance/faults/[faultId]/page.tsx`
- `app/(workspace)/maintenance/orders/[orderId]/page.tsx`
- `app/(workspace)/maintenance/workshop/page.tsx`
- `styles/maintenance.css`
- `tests/responsive/maintenance.spec.ts`
- `docs/SPRINT_10_MAINTENANCE_REPORT.md`

## 11. الملفات المعدلة

- `app/(workspace)/maintenance/page.tsx`
- `app/globals.css` — استيراد `maintenance.css` مرة واحدة.
- `permissions/keys.ts`
- `permissions/types.ts`
- `permissions/role-templates.ts`
- `permissions/navigation-policy.ts`
- `features/products/types.ts` — أنواع حركات صيانة القطع.
- `features/products/services/product-store.ts` — صرف قطعة مرتبط بالأمر.
- `vitest.config.mts`

لم تُعدّل ملفات Prototype أو `support.js` أو `uploads`، ولم يبدأ Supabase أو Auth أو قاعدة بيانات أو Feature مالية/مخزنية جديدة.

## 12. نتائج الجودة

| الفحص | النتيجة |
|---|---|
| `npm run check:styles` | ناجح — 16 استيراد CSS محليًا، و`maintenance.css` موجود ومستورد مرة واحدة |
| `npm run build` | ناجح — Next.js 16.3.0؛ جميع مسارات الصيانة ظهرت في Build Output |
| `npm run lint` | ناجح بلا أخطاء أو تحذيرات |
| `npm run typecheck` | ناجح |
| `npm test` | ناجح — 15 ملفًا، 149 اختبارًا، منها 7 عقود صيانة |
| `npm run test:e2e` | ناجح — 62 اختبارًا، منها 3 سيناريوهات صيانة Responsive وصلاحيات واستلام |

تم فتح `/maintenance` و`/maintenance/intake` و`/maintenance/faults` و`/maintenance/faults/fault-1` و`/maintenance/orders/maintenance-order-4` و`/maintenance/workshop` يدويًا بعد إعادة تشغيل خادم التطوير. جميعها عملت بلا Build Error، مع `dir=rtl` وoverflow أفقي يساوي صفرًا.

## 13. المشاكل والقرارات التي تحتاج مراجعة

- البيانات والملفات المرفقة والإشعارات كلها Mock داخل الذاكرة وتعود إلى Fixtures بعد إعادة تشغيل الخادم.
- حجز القطع ليس متزامنًا ولا إنتاجيًا؛ يلزم Transaction حقيقية عند إدخال قاعدة البيانات لاحقًا.
- WhatsApp فتح يدوي فقط ولا توجد حالة تسليم API.
- هوية الموظف الحالي ثابتة داخل سيناريو Mock (`employee-technician`/`employee-manager`) إلى أن ينفذ Auth الحقيقي.
- وجد الفحص خادم تطوير قديمًا على المنفذ 3000 يحتفظ بحالة Turbopack قبل إنشاء `maintenance.css`. أُعيد تشغيل خادم المشروع من المصدر الحالي، فاختفى خطأ CSS. شُغلت E2E النهائية على الخادم الجديد لتجنب مشكلة إنهاء خادم Playwright المؤقت على Windows.
