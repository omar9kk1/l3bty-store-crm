# تقرير Sprint 07 — التأجير وأصول التأجير

تم تنفيذ Feature التأجير والأصول داخل `l3bty-app` باستخدام Mock State حتمية ومن دون قاعدة بيانات أو Auth حقيقي أو حسابات مالية إنتاجية.

## المسارات

- `/rentals`: قائمة فعلية بفلاتر URL وجدول Desktop وCards للهاتف.
- `/rentals/new`: Wizard من ست خطوات يبدأ الحساب عند التأكيد النهائي فقط.
- `/rentals/[rentalId]`: تفاصيل وعداد وتسوية وسجل أحداث وروابط العميل والأصل.
- `/rentals/[rentalId]/extend`: تمديد ثابت أو مخصص مع Mock Approval للتجاوز الإداري.
- `/rentals/[rentalId]/close`: إنهاء وفحص إرجاع وتحديث حالة الأصل وإيصال Mock.
- `/rental-assets` و`/rental-assets/[assetId]`: قائمة وتفاصيل أصل منفرد وسجل الحالة والتأجيرات والفحوصات وPlaceholder الصيانة.

## العقود والقواعد

`features/rentals/types.ts` يعرّف `Rental` و`RentalEvent` و`NewRentalInput` و`ServerTimeContract`. `features/rental-assets/types.ts` يعرّف الأصل المنفرد وحالته الفنية والتشغيلية وموقعه وفحوصاته.

Fixed Time يدعم 15/30/45/60 دقيقة ومدة مخصصة، ويحسب النهاية المتوقعة والقيمة من سعر الساعة. Open Time يحسب الثواني الفعلية من مرجع خدمة باسم `mock_server_authoritative`، وليس من مكوّن العرض. مرحلة الاختيار لها `selectionStartedAt` وتعيد دائمًا صفر ثوانٍ قابلة للفوترة؛ الأصل لا يتحول إلى `rented` إلا عند التأكيد.

بدء التأجير يتحقق من العميل، توافر الأصل، عدم وجود تأجير نشط مكرر، السعر والمدة، ووجود وردية مفتوحة في مصدر الفرع الحالي. الإنهاء يعيد الأصل إلى `available` عند الإرجاع السليم أو `maintenance` عند الحاجة للفحص/وجود واقعة Draft. الواقعة مجرد Flag ووصف أولي مستقل بلا حساب رسم.

## الصلاحيات

- المالك والمدير: كل التأجيرات والأصول وكل الفروع والتجاوزات.
- موظف التأجير واستلام الصيانة: التأجير والتشغيل ضمن الفروع المسندة.
- موظف المبيعات: لا يرى التأجير أو أصول التأجير.
- فني الصيانة: لا يرى التأجيرات؛ يرى حالة الأصل وسجل الصيانة فقط ضمن الورشة/النطاق المسند، دون بيانات العميل أو التحصيل.
- تعدد أدوار المبيعات والتأجير يجمع الصلاحيتين صراحة.

تم تغيير `exactMatch` للتأجير والأصول إلى `false` داخل سياسة التنقل، لذلك كل المسارات المتداخلة محمية مركزيًا قبل عرض البيانات.

## التكامل

- العملاء من Store العملاء الحالي، مع إعادة استخدام `QuickCustomerForm` داخل Auxiliary Drawer.
- الفروع والورديات من مصدر الفروع الحالي؛ `openShiftCount` هو عقد Mock للتحقق من وردية التحصيل.
- الموظف الحالي من مصدر الموظفين الحالي.
- `ActiveRentalStrip` مرتبط بأول تأجير نشط فعلي ضمن نطاق الدور والفرع، ويعرض الأصل والعميل والحالة والعداد ورابط التفاصيل.

## الملفات

أضيف مجلدا `features/rentals` و`features/rental-assets` ببنية components/forms/services/schemas/hooks/tests والعقود والFixtures والصلاحيات. أضيفت Routes الديناميكية، و`styles/rentals.css` و`styles/rental-assets.css`، واختبارات `tests/responsive/rentals.spec.ts`. عُدلت `app/globals.css` وسياسة التنقل و`ActiveRentalStrip.tsx` و`vitest.config.mts` واختبارات الصلاحيات.

## Responsive والجودة

التصميم يحافظ على RTL وApp Shell والعرض المرن. الجداول تتحول إلى Cards تحت 768px، والـWizard وأزرار العمليات تترك مساحة للتنقل السفلي، وQuick Customer Drawer من اليسار على Desktop/Tablet وBottom Sheet على الهاتف.

- `check:styles`: ناجح — 13 CSS imports.
- `build`: ناجح — Next.js 16.3.0 وجميع المسارات مولدة.
- `lint`: ناجح.
- `typecheck`: ناجح.
- `npm test`: ناجح — 128 اختبارًا في 12 ملفًا.
- `npm run test:e2e`: ناجح — 54/54 اختبار Playwright بعاملين ثابتين، وتغطي المقاسات 1920، 1440، 1366، 1024، 834، 768، 390 والصلاحيات والـWizard والـDrawers ومنع overflow، مع نجاح كل Regression السابقة.

## القيود

كل الوقت والتحصيل والوردية والإيصالات Mock داخل الذاكرة وتعود Fixtures بعد إعادة تحميل كاملة. لا توجد مزامنة أو Queue أو ضرائب أو تسعير إنتاجي أو صيانة فعلية أو رسوم واقعة فعلية. لم يبدأ أي Feature إضافي.

## تصحيح مجال النشاط وWhatsApp وتذكير الخمس دقائق

### تصحيح بيانات النشاط

أزيلت من بيانات التأجير وأصوله والـDashboard والاختبارات كل بيانات PlayStation وPS4 وPS5 وXbox ومحطات/أجهزة الألعاب المنزلية، مع استبدال المعرّفات القديمة أيضًا حتى لا تبقى مراجع يتيمة في تلفيات التأجير أو اختبارات الصلاحيات. أكد بحث ثابت على ملفات المصدر والاختبارات عدم بقاء أي من الكلمات أو المعرّفات القديمة خارج هذا التوثيق التاريخي.

الأنواع التجريبية الحالية هي:

- عربية دريفت كهربائية.
- عربية أطفال كهربائية.
- موتوسيكل أطفال كهربائي.
- هوفر بورد.
- سكوتر كهربائي.
- عربية دفع رباعي للأطفال.
- عربية سباق كهربائية.

كل Fixture ما زال أصلًا منفردًا برقم أصل وباركود وفرع وحالة وموقع ومدة تشغيل وسجل حالة/تأجير وربط صيانة. مصدر البيانات الأساسي هو `features/rental-assets/fixtures.ts`، وتستخدمه `features/rentals/fixtures.ts` وتلفيات التأجير والـDashboard و`ActiveRentalStrip`.

### فاتورة WhatsApp اليدوية

أضيف `RentalWhatsAppService` في `features/rentals/services/rental-whatsapp-service.ts`. يعيد استخدام `features/customers/services/normalize-phone.ts`، يتحقق من رقم الموبايل المصري ويحوّله إلى صيغة دولية داخل رابط `wa.me`، ثم يجهز رسالة عربية تحتوي العميل والأصل ورقم العملية والفرع والبداية والنهاية والمدة والإجمالي والمدفوع والمتبقي ورابط الإيصال Mock.

الزر «إرسال الفاتورة عبر واتساب» موجود في تفاصيل التأجير، وشاشة الإنهاء، وصفحة التفاصيل التي تمثل الإيصال بعد الإنهاء، وإجراءات التأجير المنتهي. فتح الرابط يتطلب ضغط المستخدم ولا يرسل رسالة تلقائيًا. الرقم غير الصالح يعطّل الزر ويعرض «لا يوجد رقم واتساب صالح لهذا العميل» مع رابط ملف العميل. لا يوجد PDF خادمي.

### تذكير الخمس دقائق

أضيفت الحالات `not_due` و`due` و`opened` و`sent_manually` و`failed_to_open` و`skipped` و`customer_phone_missing`، مع `fiveMinuteReminderTriggeredAt` لمنع التكرار. `RentalReminderService` في `features/rentals/services/rental-reminder-service.ts` يقيّم التأجيرات المحددة المدة فقط عندما يكون المتبقي أكبر من صفر ولا يزيد على 300 ثانية. لا يطبق على Open Time.

عند الاستحقاق ينشئ الـStore إشعار Mock واحدًا للموظف المسؤول وحدث Audit واحدًا، ويظهر Badge «متبقي 5 دقائق» وزر «تذكير العميل على واتساب» في `ActiveRentalStrip`، وتفاصيل التأجير، والقائمة النشطة، ومركز العمليات، ومركز الإشعارات. فتح واتساب أو تخطي التذكير أو فشل الفتح أو غياب الرقم يسجل حالة وحدثًا تجريبيًا.

التنبيه الحالي يعمل فقط أثناء تشغيل التطبيق. الإرسال المجدول والمضمون عند إغلاقه يحتاج Backend Scheduler وWhatsApp API وProvider Adapter؛ العقود المستقبلية موجودة دون Backend أو ربط خارجي فعلي.

### الصلاحيات والنطاق

- `owner` و`manager`: الفاتورة والتذكير وحالة التذكير لكل الفروع.
- `rental_maintenance_employee`: الفاتورة والتذكير لتأجيرات الفروع المسندة فقط.
- `sales_employee` منفردًا و`maintenance_technician`: لا يشاهدان التأجيرات أو إجراءات WhatsApp.
- جمع دور المبيعات مع دور التأجير يمنح صلاحية التأجير صراحة عبر سياسة الدور الموحدة، ولا يمنحها دور المبيعات وحده.

تستخدم التفاصيل ومسارات الإنهاء والتمديد المباشرة `canAccessRentalBranch` أيضًا؛ لذلك لا يكفي امتلاك الدور لفتح URL لتأجير يقع خارج الفروع المسندة، ولا تُعرض بيانات العملية لحظيًا قبل حالة منع الوصول.

### الملفات المصححة

- `features/rental-assets/fixtures.ts`
- `features/rentals/fixtures.ts`, `types.ts`, `permissions.ts`
- `features/rentals/services/rental-store.ts`, `rental-whatsapp-service.ts`, `rental-reminder-service.ts`
- `features/rentals/hooks/use-rental-reminders.ts`
- `features/rentals/components/RentalsPage.tsx`, `RentalDetailsPage.tsx`, `RentalWhatsAppAction.tsx`, `RentalReminderPanel.tsx`, `RentalReminderCenter.tsx`
- `features/rentals/forms/CloseRentalForm.tsx`
- `components/shell/ActiveRentalStrip.tsx`
- `features/dashboard/fixtures.ts`, `features/dashboard/types.ts`, `mock-data/scenarios/shell.ts`
- `features/rental-damage/fixtures.ts` واختباراته المرتبطة بمراجع الأصول.
- `app/(workspace)/operations/page.tsx`, `app/(workspace)/notifications/page.tsx`
- `styles/rentals.css`
- اختبارات `features/rentals/tests/rentals.spec.ts`, `tests/responsive/rentals.spec.ts`, واختبارات المراجع/الاستقرار ذات الصلة.

### نتيجة التحقق النهائية

- `npm run check:styles`: ناجح، 13/13 import محليًا.
- `npm run build`: ناجح، Next.js 16.3.0 وجميع Routes مولدة.
- `npm run lint`: ناجح.
- `npm run typecheck`: ناجح.
- `npm test`: ناجح، 129/129.
- `npm run test:e2e`: ناجح، 54/54.
- الفحص اليدوي على نسخة Production: `/rentals` و`/rentals/rental-active-15` و`/rentals/rental-active-15/close` و`/rental-assets` فتحت طبيعيًا، RTL صحيح، الأسماء الكهربائية ظاهرة، أزرار WhatsApp ظاهرة في مواضعها، وتنبيه الخمس دقائق ظاهر. لا أخطاء Console ولا Horizontal Scroll على Desktop أو 390×844.
