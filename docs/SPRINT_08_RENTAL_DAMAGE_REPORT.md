# SPRINT 08 — Rental Damage Feature Report

تاريخ التنفيذ: 2026-08-06  
النطاق: تلفيات التأجير فقط داخل تطبيق `l3bty-app` باستخدام Mock State حتمية، دون Supabase أو Auth أو محاسبة أو صيانة كاملة.

## 1. النتيجة

- تحوّل `/rental-damage` من مسار غير منفذ إلى قائمة تشغيلية فعلية.
- أضيفت صفحة التفاصيل `/rental-damage/[damageId]`.
- رُبط خيار «توجد واقعة تلف» في `/rentals/[rentalId]/close` بإنشاء مسودة واحدة والانتقال إليها.
- أضيف التوثيق والأدلة والتقييم الفني المحدود والرسم المستقل والموافقة وسطر الفاتورة والتحصيل الجزئي أو الكامل أو الإضافة إلى رصيد العميل، كلها داخل Mock State فقط.
- أضيفت ملخصات صغيرة مرتبطة داخل ملف العميل وأصل التأجير وتفاصيل التأجير، دون إعادة بناء Features السابقة.
- لا توجد آلية تأمين أو وديعة أو مبلغ محتجز أو خصم/رد مرتبط بها داخل الواجهة أو العقود أو Feature.

## 2. الملفات المنشأة

### Routes

- `app/(workspace)/rental-damage/page.tsx`
- `app/(workspace)/rental-damage/[damageId]/page.tsx`

### Feature

- `features/rental-damage/types.ts`
- `features/rental-damage/fixtures.ts`
- `features/rental-damage/permissions.ts`
- `features/rental-damage/hooks/use-rental-damage.ts`
- `features/rental-damage/schemas/damage-schema.ts`
- `features/rental-damage/services/damage-policy.ts`
- `features/rental-damage/services/damage-store.ts`
- `features/rental-damage/forms/DamageForms.tsx`
- `features/rental-damage/components/rental-damage-labels.ts`
- `features/rental-damage/components/RentalDamagePage.tsx`
- `features/rental-damage/components/RentalDamageDetailsPage.tsx`
- `features/rental-damage/components/DamageRelatedSummary.tsx`
- `features/rental-damage/tests/rental-damage.spec.ts`

### Styling and browser tests

- `styles/rental-damage.css`
- `tests/responsive/rental-damage.spec.ts`
- `docs/SPRINT_08_RENTAL_DAMAGE_REPORT.md`

## 3. الملفات المعدلة

- `app/globals.css` — استيراد `rental-damage.css` مرة واحدة.
- `permissions/types.ts` و`permissions/keys.ts` — صلاحيات القائمة والتفاصيل والإدارة والتقييم والتحصيل.
- `permissions/role-templates.ts` — توزيع الصلاحيات على الأدوار المعتمدة.
- `permissions/navigation-policy.ts` — عنصر التنقل وحماية القائمة والتفاصيل كلٌ بصلاحية مناسبة.
- `features/rentals/forms/CloseRentalForm.tsx` — إنشاء/فتح مسودة التلف عند إنهاء التأجير.
- `features/rentals/services/rental-store.ts` — تحديث حالة الأصل للفحص أو خارج الخدمة أو الإتاحة بعد إلغاء موثق.
- `features/rentals/components/RentalDetailsPage.tsx` — ملخص الواقعة المرتبطة.
- `features/rental-assets/components/RentalAssetDetailsPage.tsx` — تاريخ التلفيات وآخر واقعة.
- `features/customers/components/CustomerDetailsPage.tsx` — الوقائع والرسوم غير المسددة وFlag المديونية.
- `vitest.config.mts` — إدراج اختبارات Feature الجديدة في الجولة الكاملة.
- `tests/permissions/navigation.spec.ts` — اختبارات صلاحيات المسار المركزي.
- `tests/responsive/branches.spec.ts` — تثبيت محدد اختبار قديم على بطاقة الورشة وانتظار اكتمال مسح البحث لمنع سباق DOM متقطع.

## 4. عقود التلف والتقييم والموافقة

يعرف `RentalDamage` الارتباطات المطلوبة بالتأجير والعميل والأصل والفرع والموظف، والوصف وحالة الأصل قبل/بعد الإرجاع والأدلة ودرجة التلف وحالة الواقعة. كما يحفظ التقييم الفني والرسم المقترح والمعتمد وحالة الموافقة وسطر الفاتورة وحالة الدفع والمبلغ المدفوع والمتبقي والربط المستقبلي الاختياري بأمر الصيانة وسجل الأحداث والإلغاء المسبب.

العقود المساندة:

- `EvidenceAttachment`: صورة أو مستند، ومفتاح Mock ووقت ووصف والموظف الملتقط.
- `TechnicianAssessment`: التشخيص والسبب المحتمل وقابلية الإصلاح والنقل للورشة وتكلفة ومدة الإصلاح التقديريتان والقطع والملاحظات.
- `DamageInvoiceLine`: سطر واحد باسم «رسوم تلفيات»، غير مخزني ولا يغير كميات المنتجات.
- `DamageActivityEvent` و`DamageNotification`: سجل وتنبيهات Mock حتمية للأحداث الحساسة.

## 5. ربط إنهاء التأجير ومنع التكرار

- ينفذ `ensureDamageDraftFromRental` أمرًا حتميًا باستخدام `idempotencyKey` بالشكل `rental-close:{rentalId}:damage`.
- إذا وجدت مسودة لنفس التأجير أو نفس المفتاح، تُفتح المسودة القائمة بدل إنشاء أخرى.
- لا ينشأ رسم عند إنشاء المسودة.
- يكتمل إغلاق التأجير، لكن الأصل يتحول إلى `maintenance`/فحص ولا يعود `available` تلقائيًا.
- إذا ثبت عدم وجود تلف وألغت الإدارة الواقعة بسبب واضح، يعود الأصل `available` ويُسجل السبب في تاريخ حالته.
- إذا كانت الدرجة `asset_unusable` يتحول الأصل إلى `out_of_service`.

## 6. تكلفة الإصلاح ورسم العميل

- تكلفة الإصلاح التقديرية جزء من تقييم الفني.
- رسم العميل قيمة مستقلة، وله سبب وموظف مقترح وحدود صلاحية وموافقة منفصلة.
- الواجهة تعرض القيمتين والفرق بينهما صراحة.
- دفع الرسم لا يغير حالة فحص الأصل أو إصلاحه.

السياسة التجريبية الحالية:

- `employeeDamageFeeLimit = 500 EGP`.
- موظف التأجير يقترح داخل الحد.
- تجاوز الحد ينتقل إلى `pending_approval` للمالك أو المدير.
- سياسة الفصل تمنع مقدم الطلب من اعتماد طلبه بنفسه.
- هذه قيمة Mock تحتاج اعتمادًا ماليًا نهائيًا قبل الإنتاج.

## 7. الموافقة والفاتورة والتحصيل

- المالك والمدير يستطيعان اعتماد الرسم أو رفضه بسبب مسجل.
- عند الاعتماد ينشأ سطر فاتورة Mock واحد فقط لكل واقعة؛ إعادة القرار لا تكرر السطر.
- التحصيل يدعم الدفع الجزئي والكامل والإضافة إلى رصيد العميل.
- موظف التأجير يحتاج صلاحية التحصيل ووردية مفتوحة؛ المالك والمدير يملكان صلاحية الإدارة الكاملة.
- لا توجد قيود محاسبية أو خزائن أو ترحيل مالي حقيقي.

## 8. الصلاحيات

| الدور | القائمة | التفاصيل | الرسم/الموافقة/التحصيل |
|---|---|---|---|
| `owner` | كامل | كامل لكل الفروع | تحديد واعتماد ورفض وتحصيل وإلغاء مسبب |
| `manager` | كامل | كامل لكل الفروع | تحديد واعتماد ورفض وتحصيل وإلغاء مسبب |
| `rental_maintenance_employee` | وقائع الفروع المسندة | تشغيلية حسب الفرع والتأجير | اقتراح ضمن الحد، طلب موافقة، وتحصيل مع وردية مفتوحة |
| `maintenance_technician` | مخفية | الواقعة المسندة إليه فقط | تقييم فني فقط؛ لا رسوم أو تحصيل أو بيانات مالية عامة |
| `sales_employee` | ممنوعة | ممنوعة | لا صلاحية |

تفاصيل الفني لا تعرض العميل المالي أو الرسم أو التحصيل أو قائمة الوقائع. تعدد الأدوار يجمع الصلاحيات الصريحة، ولا يجعل واقعة غير مسندة مرئية للفني.

## 9. البيانات والحالات

توجد Fixtures ثابتة تغطي: مسودة، واقعة موثقة، انتظار تقييم، تقييم مكتمل، رسم داخل الحد، تجاوز الحد، رفض، اعتماد غير مدفوع، دفع جزئي، دفع كامل، إلغاء بعد نفي التلف، أصل خارج الخدمة، وعميل عليه مديونية. لا يستخدم التنفيذ `Math.random`.

الحالات المدعومة في القائمة: `normal`, `loading`, `empty`, `error`, `offline`. وضع Offline يسمح بالقراءة من آخر بيانات معروفة ويعطل الإنشاء والتقييم والموافقة والتحصيل، ولا يدعي وجود Queue حقيقية.

## 10. Drawers وResponsive

- الفلاتر ونموذج الرسم يستخدمان Auxiliary Drawer من اليسار على Desktop وTablet.
- النماذج التي تحتوي أدلة أو تقييمًا يصل عرضها إلى 420px، وبقية اللوحات تتبع معيار 360px المشترك.
- على Mobile تتحول اللوحات إلى Bottom Sheet.
- الجدول يظهر على Desktop/Tablet، ويتحول إلى Cards على Mobile.
- الأدلة والنصوص الطويلة تستخدم wrapping ولا تخرج من البطاقات.
- تم التحقق عند: 1920×1080، 1440×900، 1366×768، 1024×768، 834×1112، 768×1024، 390×844.
- لا يوجد Horizontal Scroll على مستوى الصفحة في المقاسات المختبرة.

## 11. نتائج الجودة النهائية

| الفحص | النتيجة |
|---|---|
| `npm run check:styles` | ناجح — 13 استيراد CSS محليًا، و`rental-damage.css` موجود فعليًا |
| `npm run build` | ناجح — Next.js 16.3.0، والمساران ظاهران في خريطة البناء |
| `npm run lint` | ناجح دون أخطاء أو تحذيرات جوهرية |
| `npm run typecheck` | ناجح |
| `npm test` | ناجح — 12 ملفات، 121 اختبارًا |
| `npm run test:e2e` | ناجح — 53/53 اختبارًا في 1.2 دقيقة |
| فحص المصطلحات الملغاة داخل Feature/Routes/CSS/Permissions | لا توجد نتائج |

## 12. حدود Mock والقرارات المؤجلة

- حفظ الملفات الحقيقي غير منفذ؛ يستخدم File Input للمعاينة وObject URL مؤقتًا مع تنظيفه عند إلغاء تركيب النموذج.
- `maintenanceOrderId` عقد مستقبلي فقط؛ لم تُبنَ دورة الصيانة.
- الفاتورة والتحصيل والتنبيهات وسجل التدقيق Mock ولا تمثل محاسبة أو إرسالًا حقيقيًا.
- يلزم اعتماد حد 500 ج.م وسياسة الفصل والوردية عند تصميم Backend وسياسات RLS لاحقًا.
- لا توجد مشكلة مفتوحة تمنع مراجعة Feature الحالية.
