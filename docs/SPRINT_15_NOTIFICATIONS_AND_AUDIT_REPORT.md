# تقرير Sprint 15 — الإشعارات وسجل النشاط

تاريخ التحقق: 8 أغسطس 2026  
النطاق: تطبيق `l3bty-app` فقط، باستخدام Mock State حتمية، دون Supabase أو Auth أو Realtime حقيقي.

## 1. النتيجة التنفيذية

- تحولت `/notifications` من Placeholder إلى مركز إشعارات خاص بالمستخدم الحالي فقط.
- أصبح زر الإشعارات في Header فعليًا: يعرض العدد غير المقروء وآخر خمسة إشعارات، في Popover على Desktop وBottom Sheet على Mobile.
- تحولت `/activity-log` إلى سجل إداري مركزي للمالك والمدير فقط.
- أضيفت `/my-activity` لعرض نشاط الموظف الحالي فقط، ويمكن الوصول إليها من قائمة المستخدم دون إضافتها إلى Sidebar.
- أُنشئت خدمتان مركزيتان للإشعارات وAudit Events مع عقود موحدة، منع التكرار، وفصل واضح للصلاحيات ونطاق الفروع.
- لم يُعد تصميم App Shell، ولم تبدأ الإعدادات أو قاعدة البيانات أو المصادقة أو الاتصال اللحظي.

## 2. الملفات المنشأة

### الإشعارات

- `features/notifications/types.ts`
- `features/notifications/permissions.ts`
- `features/notifications/fixtures.ts`
- `features/notifications/services/notification-service.ts`
- `features/notifications/hooks/use-notifications.ts`
- `features/notifications/components/notification-ui.tsx`
- `features/notifications/components/NotificationsPage.tsx`
- `features/notifications/components/NotificationBell.tsx`
- `features/notifications/tests/notifications.spec.ts`
- `styles/notifications.css`

### سجل النشاط

- `features/audit-log/types.ts`
- `features/audit-log/permissions.ts`
- `features/audit-log/fixtures.ts`
- `features/audit-log/services/audit-service.ts`
- `features/audit-log/hooks/use-audit.ts`
- `features/audit-log/components/audit-ui.tsx`
- `features/audit-log/components/ActivityDetailsDrawer.tsx`
- `features/audit-log/components/ActivityLogPage.tsx`
- `features/audit-log/components/MyActivityPage.tsx`
- `features/audit-log/tests/audit.spec.ts`
- `styles/activity-log.css`

### المسارات والاختبارات

- `app/(workspace)/my-activity/page.tsx`
- `tests/responsive/notifications-audit.spec.ts`
- `docs/SPRINT_15_NOTIFICATIONS_AND_AUDIT_REPORT.md`

## 3. الملفات المعدلة

- `app/(workspace)/notifications/page.tsx`
- `app/(workspace)/activity-log/page.tsx`
- `app/globals.css`
- `components/shell/Header.tsx`
- `permissions/types.ts`
- `permissions/keys.ts`
- `permissions/role-templates.ts`
- `permissions/navigation-policy.ts`
- `features/employees/services/employee-store.ts`
- `features/attendance/services/attendance-store.ts`
- `features/rental-damage/services/damage-store.ts`
- `features/reports/services/report-store.ts`
- `vitest.config.mts`

## 4. عقد Notification

العقد الموحد يتضمن الهوية والرقم، `recipientUserId` و`recipientEmployeeId`، النوع والفئة والأولوية، العنوان والنص، الفرع، المرجع وDeep Link، الحالة وتواريخ القراءة والتنفيذ والانتهاء، `idempotencyKey`، و`metadata`.

الحالات المدعومة: غير مقروء، مقروء، تم اتخاذ إجراء، مخفي من العرض الشخصي، ومنتهي. الأولويات: منخفضة، عادية، عالية، وعاجلة. البيانات مرتبة من الأحدث إلى الأقدم وتواريخها مخزنة بصيغة ISO UTC وتعرض بتوقيت القاهرة.

الخدمة المركزية تدعم:

- النشر الحتمي دون `Math.random`.
- القراءة وعدم القراءة وتعليم الكل كمقروء للمستخدم الحالي فقط.
- الإخفاء الشخصي دون Hard Delete ودون حذف الحدث الأصلي أو Audit Event.
- اشتراك React ثابت عبر `useSyncExternalStore`.
- منع التكرار باستخدام `idempotencyKey`؛ إعادة الطلب نفسه تعيد السجل الموجود ولا تنشئ نسخة ثانية.

## 5. عقد AuditEvent

العقد الموحد يتضمن هوية الحدث ورقمه، المستخدم والموظف المنفذ، لقطة الأدوار وقت التنفيذ، الفرع، الإجراء والفئة والكيان والمرجع، مستوى الأهمية والسبب، `before` و`after` والحقول المتغيرة، المصدر، Request ID، مفتاح منع التكرار، IP وملخص المتصفح التجريبي، ووقت الإنشاء.

الخدمة Append-only: الواجهة العامة توفر `appendAuditEvent` والقراءة فقط، ولا توفر تحديثًا أو حذفًا. التصحيح أو الإلغاء أو العكس يجب أن ينتج Event جديدًا مستقلًا.

تُطبق Redaction متداخلة قبل الحفظ والعرض على كلمات المرور والرموز والأسرار ومفاتيح API وبيانات البطاقات والدفع والصور، مع إخفاء جزئي لأرقام الهواتف.

## 6. الصلاحيات حسب الدور

| الدور | الإشعارات | سجل النشاط الإداري | نشاطي |
|---|---|---|---|
| مالك النشاط | إشعاراته فقط | كامل لكل الفروع | نشاطه فقط |
| المدير | إشعاراته فقط | كامل لكل الفروع | نشاطه فقط |
| موظف المبيعات | إشعاراته المسموحة فقط | ممنوع | نشاطه المرتبط بدوره فقط |
| موظف التأجير واستلام الصيانة | إشعاراته المسموحة فقط | ممنوع | نشاطه المرتبط بدوره فقط |
| فني الصيانة | إشعارات الصيانة المسندة والمسموحة فقط | ممنوع | نشاط الصيانة المنفذ بواسطته فقط |

اتحاد الأدوار التشغيلية يجمع الإشعارات والفئات الشخصية المسموحة، لكنه لا يمنح سجل النشاط الإداري. وجود `owner` أو `manager` هو وحده ما يمنح `audit.view`. أضيفت صلاحية مستقلة `audit.view_self` للنشاط الشخصي.

## 7. قواعد توجيه الإشعارات

- كل إشعار يحدد المستلم صراحة، ولا توجد رسالة عامة لكل المستخدمين.
- يتم التحقق من المستخدم/الموظف، الدور، الفرع، والفئة قبل التسليم.
- الفني غير المسند أو غير المؤهل لا يستلم بلاغ المهمة.
- تقارير التسليم توجه إلى مالك النشاط المحدد فقط.
- الموظف التشغيلي لا يستلم بيانات مالية أو إدارية خارج صلاحياته.
- تغيير `userId` في Query لا يغير المستلم ولا يكشف بيانات مستخدم آخر.

## 8. Deep Links وإعادة فحص الصلاحية

يحمل كل إشعار قابل للتنقل مرجعًا وDeep Link واضحًا. عند فتحه:

1. يُعلّم الإشعار كمقروء للمستخدم الحالي.
2. تُعاد مطابقة صلاحية المسار الحالية.
3. يُعاد فحص نطاق الفرع والدور.
4. لا يفتح المرجع إلا عند السماح؛ وجود الإشعار نفسه لا يُعد صلاحية.

## 9. الأحداث الموحدة من Features الحالية

تم ربط نقاط التغيير الآمنة الحالية بالخدمة المركزية مع الإبقاء على السلوك القديم:

- الموظفون: إنشاء وتحديث سجلات الموظفين.
- الحضور: أحداث الحضور والانصراف والاستثناءات والتصحيحات المتاحة في المتجر الحالي.
- تلفيات التأجير: نشاط الواقعة والتقييم والرسوم والحالات، وإشعاراتها المحددة.
- التقارير: الإنشاء والتسليم والفتح وإعادة المحاولة، مع توجيه إشعار المالك.

كما توفر Fixtures مركزية حتمية تغطية تمثيلية لبقية الفئات الحالية: التأجير، المبيعات، الصيانة، المخزون والتحويلات، المالية والورديات، المصروفات والرواتب، العملاء والنظام. لم تُعد كتابة Features القديمة بالكامل.

## 10. الفرق بين `/activity-log` و`/my-activity`

- `/activity-log`: شاشة إدارية للمالك والمدير، تشمل الملخص والفلاتر والجدول على Desktop والبطاقات على Mobile وتفاصيل Before/After بعد Redaction.
- `/my-activity`: Timeline شخصي مقيد بـ`actorUserId` و`actorEmployeeId` وفئات الدور الحالي، ولا يعرض بيانات موظفين آخرين أو تفاصيل إدارية حساسة.
- `/my-activity` موجودة في قائمة المستخدم فقط، وليست عنصرًا في Sidebar أو Mobile More.

## 11. التصميم والاستجابة

- واجهات عربية RTL باستخدام Design Tokens وIBM Plex Sans Arabic الحاليين.
- ملفات CSS الجديدة موجودة فعليًا ومستورد كل منها مرة واحدة داخل `app/globals.css`.
- تفاصيل النشاط تستخدم Auxiliary Drawer من اليسار على Desktop/Tablet وBottom Sheet على Mobile.
- زر الإشعارات يستخدم قائمة مدمجة على Desktop وBottom Sheet على Mobile.
- تم فحص: `1920×1080`، `1440×900`، `1366×768`، `1024×768`، `834×1112`، `768×1024`، `390×844`.
- النتيجة على المسارات الثلاثة: RTL صحيح، لا قص، لا Horizontal Scroll، Header سليم، والجدول يتحول إلى Cards على الهاتف.

## 12. وضع Offline

يبقى آخر Mock State قابلًا للقراءة. لا تدعي الواجهة وجود Realtime أو Background Sync أو Queue. تغييرات القراءة محلية داخل جلسة Mock الحالية فقط.

## 13. نتائج الجودة

| الفحص | النتيجة |
|---|---|
| `npm run check:styles` | ناجح — تم التحقق من 25 استيراد CSS محليًا |
| `npm run build` | ناجح — 50 مسارًا، منها المسارات الثلاثة الجديدة/المحدثة |
| `npm run lint` | ناجح بلا تحذيرات |
| `npm run typecheck` | ناجح |
| `npm test` | ناجح — 24 ملفًا، 204 اختبارات |
| اختبارات Sprint 15 المتجاوبة | ناجحة — 6 من 6 |
| `npm run test:e2e` الشامل | 84 من 85 في تشغيلين؛ الاختبار المتعثر السابق نجح منفردًا |

اختبارات Sprint 15 تغطي عزل المستلم، تجاهل `userId` الأجنبي، صلاحيات السجل الإداري، نطاق النشاط الشخصي، عداد Header، اتجاه Drawer/Bottom Sheet، RTL، والمقاسات السبعة دون overflow.

## 14. التحذير المتبقي

اختبار سابق خارج نطاق هذه المهمة في `tests/responsive/employees.spec.ts` بعنوان `search, active branch scope, filters and deterministic states work` يتذبذب عند تشغيل 85 اختبارًا بعاملين: مرة تأخر حذف Query البحث، ومرة تأخر تطبيق اختيار الفرع. السيناريو نفسه نجح منفردًا `1/1`. لم يُعدّل Feature الموظفين أو الاختبار لإخفاء المشكلة ضمن Sprint 15؛ الأنسب تثبيت تزامن URL/Branch State في مهمة تصحيح مستقلة قصيرة.

لا توجد مشكلة متبقية في اختبارات الإشعارات أو سجل النشاط، ولا توجد مصطلحات العميل المحظورة ضمن ملفات النطاق الجديدة بعد الفحص النصي الدقيق.

## 15. القرارات التي تحتاج مراجعة لاحقة

- استبدال Mock State بمصدر دائم عند بدء مرحلة Supabase/Auth لاحقًا، دون البدء بها الآن.
- تحديد سياسة الاحتفاظ والإتاحة القانونية لسجل النشاط في الإنتاج.
- تحديد قناة Realtime الفعلية وآلية Retry عند اعتماد البنية الخلفية.
- معالجة تذبذب اختبار الموظفين المذكور قبل اعتبار حزمة E2E القديمة خضراء بالكامل.

