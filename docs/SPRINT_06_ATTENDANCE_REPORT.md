# تقرير Sprint 06 — الحضور والانصراف

تاريخ التنفيذ: 6 أغسطس 2026  
النطاق: Feature الحضور والانصراف فقط داخل `l3bty-app`، باستخدام Mock State حتمية ومن دون Supabase أو Auth حقيقي أو رواتب.

## النتيجة

تم تنفيذ المسارات الأربعة المطلوبة:

- `/attendance`: لوحة إدارة الحضور للمالك والمدير فقط.
- `/attendance/exceptions`: مراجعة الاستثناءات للمالك والمدير فقط.
- `/attendance/check`: تسجيل الحضور أو الانصراف للموظف الحالي فقط.
- `/attendance/my`: السجل وطلبات الاستثناء الخاصة بالموظف الحالي فقط.

وجهة عنصر التنقل «الحضور والانصراف» أصبحت معتمدة على الصلاحية من سياسة التنقل المركزية نفسها: الإدارة تذهب إلى `/attendance`، والأدوار التشغيلية تذهب إلى `/attendance/my`. الوصول المباشر محمي قبل عرض بيانات الصفحة.

## عقود البيانات

أضيفت عقود منظمة في `features/attendance/types.ts`:

- `AttendanceEvent`: حدث حضور/انصراف مع توقيت ISO، `Africa/Cairo`، إحداثيات، دقة، مسافة، Geofence، حالة موقع، ومرجع جلسة صورة مباشرة مؤقت.
- `AttendanceDay`: يوم العمل، أوقات الوردية، الأحداث المرتبطة، مدة العمل، التأخير، المغادرة المبكرة، الحالة والمراجعة.
- `AttendanceException`: نوع الاستثناء، سببه، ملاحظة الموظف، الدليل التجريبي، مرجع المهمة، حالة المراجعة وقرارها.
- `AttendanceCorrection`: القيمة السابقة والجديدة، سبب إلزامي، المنفذ والتوقيت، من دون حذف الحدث الأصلي.
- `AttendanceAuditEvent`: سجل حتمي لالتقاط الحدث والتصحيح وطلب/مراجعة الاستثناء.

كل Fixtures الزمنية بصيغة ISO، والعرض مضبوط على توقيت مصر. لا يوجد أي حساب راتب أو خصم أو أجر إضافي.

## الإدارة مقابل الصفحات الشخصية

### الإدارة

- ملخص: حاضر، متأخر، غائب، خارج النطاق، تحتاج مراجعة، وانصراف مفقود.
- فلاتر URL للتاريخ والفترة والفرع والموظف والدور والحالة والمراجعة والترتيب والصفحة.
- نطاق الفرع يبدأ من `ShellContext`: كل الفروع أو الفرع النشط.
- جدول Desktop/Tablet وCards على Mobile.
- تفاصيل السجل تعرض المتوقع والمسجل، الإحداثيات، المسافة، الدقة، حالة الموقع، مرجع الكاميرا، الاستثناءات والتعديلات.
- التصحيح الإداري يتطلب سببًا، يحفظ السابق والجديد وينشئ Mock Audit Event.
- تصدير Mock للإدارة فقط، بلا ملف مالي أو أثر على الرواتب.
- مراجعة الاستثناء: قبول، رفض، أو طلب معلومات إضافية؛ والملاحظة الإدارية إلزامية.

### الموظف

- هوية الموظف تحل من مصدر الموظفين الحالي `resolvePreviewEmployee`؛ لا يقبل المسار `employeeId` لعرض شخص آخر.
- يعرض حالة اليوم، الحضور، الانصراف، مدة العمل، التأخير، الأيام التي تحتاج مراجعة، وطلبات الموظف وحده.
- فترات اليوم/الأسبوع/الشهر وحالة السجل تستخدم URL Search Params.
- طلب الاستثناء داخل Auxiliary Drawer/Bottom Sheet، ويُرسل للمراجعة ولا يتجاوز شروط التسجيل.
- الموظف لا يرى إجماليات الفروع أو سجلات الآخرين أو التصحيح أو الاعتماد.

## توزيع الصلاحيات

أضيفت المفاتيح:

- `attendance.capture`
- `attendance.view_self`
- `attendance.view_all`
- `attendance.correct`
- `attendance.request_exception`
- `attendance.review_exception`
- `attendance.approve_exception`

المالك والمدير يملكانها جميعًا. موظف المبيعات وموظف التأجير واستلام الصيانة وفني الصيانة يملكون فقط `capture` و`view_self` و`request_exception`. جمع أكثر من دور تشغيلي لا يمنح أي صلاحية إدارية، بينما وجود المالك أو المدير يمنح الإدارة الكاملة.

## الكاميرا والموقع في Mock

- الكاميرا تستخدم `navigator.mediaDevices.getUserMedia` ببث مباشر فقط.
- لا يوجد `input[type=file]` أو صورة محفوظة أو بديل رفع ملفات.
- عند التسجيل يُرسم Frame لحظيًا على Canvas مؤقت، يُنتج `livePhotoSessionKey` فقط، ثم يُفرغ Canvas؛ لا يوجد تخزين دائم للصورة.
- كل Tracks تتوقف عند مغادرة مكوّن الكاميرا أو إعادة المحاولة.
- الموقع يستخدم `navigator.geolocation.getCurrentPosition` مع `enableHighAccuracy`، ولا توجد حقول لتعديل الإحداثيات.
- رفض الإذن أو عدم توفر API يعرض حالة واضحة وإعادة محاولة، ويبقي زر التسجيل معطلًا مع مسار طلب استثناء.
- وضع Offline يبقي القراءة متاحة ويعطل الالتقاط والتصحيح والاعتماد، ولا يدّعي وجود Offline Queue.

## Geofence والورديات

- المسافة تحسب بخوارزمية Haversine في `features/attendance/services/attendance-rules.ts`.
- تقارن المسافة بـ`geofenceRadiusMeters` من مصدر الفروع الحالي `mock-data/branches.ts`.
- الحالات: `inside` و`outside` و`unavailable` و`inaccurate`.
- التسجيل خارج النطاق يبقى حدثًا يحتاج مراجعة، ولا يعدل الموظف الإحداثيات.
- لا يسمح بانصراف قبل حضور، أو حضورين متتاليين، أو انصرافين متتاليين.
- الوردية التي تعبر منتصف الليل ترتبط بتاريخ بداية الحضور؛ Fixture ثابت يغطي 4–5 أغسطس 2026.

## Mock Scenarios

أضيفت حالات ثابتة بلا `Math.random`: حضور في الوقت، تأخير، غياب، خارج النطاق، انصراف مفقود، فني الورشة المركزية، تكليف في فرع آخر، وردية عبر منتصف الليل، واستثناء معلق/مقبول/مرفوض. الموظفون والفروع مستوردون من المصادر الحالية ولم تُنشأ قوائم بديلة لهما.

## Drawers وResponsive

- تفاصيل السجل، نموذج الاستثناء، ومراجعة الاستثناء تستخدم `variant="auxiliary"`.
- Desktop وTablet: عرض 360px (340px على Tablet) ومن الحافة اليسرى وفق سياسة RTL الحالية.
- Mobile: Bottom Sheet بعرض متاح كامل ومسافات آمنة.
- زر التسجيل على الهاتف يترك مساحة للـMobile Navigation وSafe Area.
- تم التحقق عند: 1920×1080، 1440×900، 1366×768، 1024×768، 834×1112، 768×1024، 390×844.
- لا يوجد Horizontal Scroll، ولا جدول أفقي على الهاتف، والكاميرا لا تتجاوز حدود البطاقة، وأهداف التفاعل الأساسية لا تقل عن 44px.

## الملفات المنشأة

- `app/(workspace)/attendance/check/page.tsx`
- `app/(workspace)/attendance/my/page.tsx`
- `app/(workspace)/attendance/exceptions/page.tsx`
- `features/attendance/types.ts`
- `features/attendance/fixtures.ts`
- `features/attendance/permissions.ts`
- `features/attendance/components/*`
- `features/attendance/forms/AttendanceExceptionForm.tsx`
- `features/attendance/hooks/use-attendance.ts`
- `features/attendance/schemas/exception-schema.ts`
- `features/attendance/services/attendance-rules.ts`
- `features/attendance/services/attendance-store.ts`
- `features/attendance/services/query-attendance.ts`
- `features/attendance/tests/attendance.spec.ts`
- `styles/attendance.css`
- `tests/responsive/attendance.spec.ts`
- `docs/SPRINT_06_ATTENDANCE_REPORT.md`

## الملفات المعدلة

- `app/(workspace)/attendance/page.tsx`
- `app/globals.css`
- `permissions/types.ts`
- `permissions/keys.ts`
- `permissions/role-templates.ts`
- `permissions/navigation-policy.ts`
- `features/employees/components/EmployeePersonalProfile.tsx`
- `tests/permissions/navigation.spec.ts`
- `vitest.config.mts`

`styles/attendance.css` موجود فعليًا ومستورد مرة واحدة فقط بعد `employees.css` وقبل `print.css`.

## نتائج الجودة النهائية

- `npm run check:styles`: ناجح — تم التحقق من 10 CSS imports محلية.
- `npm run build`: ناجح — Next.js 16.3.0، وتم توليد المسارات الأربعة.
- `npm run lint`: ناجح دون أخطاء أو تحذيرات.
- `npm run typecheck`: ناجح.
- `npm test`: ناجح — 9 ملفات، 82 اختبارًا.
- `npm run test:e2e`: ناجح — 45 اختبار Playwright، تشمل 4 اختبارات حضور جديدة وكل Regression الحالي.

تغطي الاختبارات Haversine وGeofence وتسلسل التسجيل والوردية الليلية والصلاحيات وتعدد الأدوار والاستثناءات والتصحيح الموثق، إضافة إلى رفض الكاميرا/الموقع، عدم وجود رفع ملفات، Offline، اتجاه Drawer، Bottom Sheet، وعرض المقاسات السبعة بلا overflow.

## قيود المتصفح والمرحلة

- الكاميرا والموقع يعتمدان على موافقة المستخدم وSecure Context (`https` أو `localhost`) وتوفر أجهزة فعلية.
- Role Preview أداة تطوير فقط وليس Auth أو Session حقيقية.
- Mock State داخل الذاكرة وتعود Fixtures بعد إعادة تحميل كاملة؛ لا توجد مزامنة أو تخزين دائم.
- الصور لا تحفظ عمدًا، ولا توجد Offline Queue أو قاعدة بيانات.
- لا توجد رواتب أو خصومات أو حساب أجر إضافي أو أثر مالي.

لا توجد مشكلة متبقية تمنع مراجعة Feature الحالية. الانتقال إلى Supabase/Auth/Payroll خارج نطاق هذا Sprint ولم يبدأ.
