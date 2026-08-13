# تقرير Sprint 05 — الموظفون والملف الشخصي

تاريخ الإقفال: 5 أغسطس 2026

## النتيجة

تم تحويل `/employees` من Placeholder إلى صفحة إدارة فعلية قائمة على Mock Data، وإضافة `/employees/[employeeId]` للملف الإداري، وإضافة `/profile` لبيانات المستخدم الحالي المحدودة. لم يتم تنفيذ الحضور أو الرواتب أو الحسابات أو Auth حقيقي أو Supabase.

## عقود الموظفين والأدوار

- العقد الأساسي في `features/employees/types.ts` ويشمل الهوية التجريبية، أرقام التواصل، آخر أربعة أرقام غير حساسة، بيانات العمل والطوارئ، الحالة، نوع التوظيف، الفروع والأدوار والتواريخ.
- الدور لا يخزن كحقل مباشر؛ `roleAssignments` مصفوفة إسنادات صريحة تحتوي `roleKey` و`branchIds | all` والحالة ووقت ومنفذ الإسناد.
- الأدوار المقبولة هي فقط: `owner` و`manager` و`rental_maintenance_employee` و`sales_employee` و`maintenance_technician`.
- يدعم الموظف أكثر من دور تشغيلي، وتظهر الإسنادات دون تكرار سجل الموظف.
- المالك والمدير يحصلان على `all` تلقائيًا مع تحذير وتأكيد وسبب تجريبي.
- الدور التشغيلي يتطلب فرعًا واحدًا على الأقل، والفرع الأساسي يجب أن يكون ضمن الفروع المسندة.

## الوصول حسب الدور

| الدور | `/employees` والتفاصيل | `/profile` |
|---|---|---|
| مالك النشاط | إدارة كاملة | ملفه الشخصي المحدود |
| المدير | إدارة كاملة مع حماية آخر مالك | ملفه الشخصي المحدود |
| موظف التأجير واستلام الصيانة | ممنوع | ملفه فقط |
| موظف المبيعات | ممنوع | ملفه فقط |
| فني الصيانة | ممنوع | ملفه فقط |
| اتحاد أدوار تشغيلية | ممنوع | ملف المستخدم المطابق للمعاينة |

تعتمد قائمة الموظفين ومسارات التفاصيل على `employees.view` من Navigation Policy نفسها. تم تغيير `exactMatch` للمسار إلى `false` حتى تشمل الحماية `/employees/[employeeId]`. توجد بوابة دفاعية تستخدم المفتاح المركزي نفسه قبل تركيب مكونات البيانات، لذلك لا يظهر سجل الموظفين لحظة قبل Permission Denied.

`profile.view` ممنوحة لكل القوالب النهائية ولا تنشئ عنصر Sidebar. الوصول إليها من «الملف الشخصي» داخل قائمة المستخدم في Header، ولا تقبل `employeeId` لتغيير الهوية المعروضة.

## الفرق بين الإدارة والملف الشخصي

- الإدارة تعرض البحث والفلاتر والملخص والجدول والبطاقات، وتسمح بالإضافة والتعديل وتغيير الحالة والأدوار والفروع داخل Mock State.
- الملف الشخصي يعرض البيانات الذاتية فقط، ولا يعرض قائمة موظفين أو روابط إدارة أو راتبًا أو سجل نشاط شاملًا.
- الحقول الذاتية القابلة للتعديل: الرقم البديل، البريد، العنوان، جهة اتصال الطوارئ وهاتفها.
- الدور والفروع والحالة ورقم الموظف وتاريخ التعيين والصلاحيات للعرض فقط.
- اختيار هوية الملف في بيئة المعاينة حتمي حسب الدور المحدد؛ لا يوجد Auth حقيقي في هذه المرحلة.

## Mock Data

البيانات في `features/employees/fixtures.ts` وتغطي المالك والمدير والأدوار التشغيلية الثلاثة وموظفًا ثنائي الدور وموظفًا موقوفًا، موزعين على `BR01` و`BR02` و`BR03` و`WRK`. تستخدم أسماء وهواتف وبريدًا تجريبيًا فقط، ولا تستخدم `Math.random`.

مصدر الفروع المشترك لم يتغير؛ الواجهة تستهلك `useBranches` و`toBranchOption` الموجودين حاليًا.

## منع التكرار والقيود الأمنية

- تطبيع الهاتف يعيد استخدام Utility العملاء نفسها.
- الهاتف الأساسي ورقم الموظف فريدان؛ التكرار يمنع الحفظ ويعرض الموظف الموجود ورابط ملفه.
- مفاتيح الأدوار غير المعروفة أو القديمة تُرفض وقت التحقق.
- لا يمكن ترك الموظف بلا دور فعال.
- لا يمكن للمستخدم الحالي إيقاف نفسه داخل المعاينة.
- لا يمكن إزالة آخر مالك في النظام.
- لا توجد عملية Hard Delete أو API لها.
- كل إنشاء أو تحديث أو تغيير حالة أو تحديث ملف شخصي يضيف Mock Audit Event في الذاكرة.

## الواجهة والاستجابة

- Desktop وTablet: جدول متدرج الأعمدة، وبحث وفلاتر URL Search Params، وAuxiliary Drawer من اليسار بعرض 360px.
- Mobile: بطاقات بدل الجدول، وBottom Sheet، مع Padding سفلي يحمي آخر بطاقة من Mobile Navigation.
- حقول النموذج 44px، Padding داخلي موروث من معيار Auxiliary Drawer، Header ثابت وBody قابل للتمرير وFooter حفظ sticky.
- تمت معاينة القائمة وDrawer و`/profile` فعليًا على Production Build؛ RTL صحيح ولا يوجد horizontal overflow.
- تم تثبيت رقم الهاتف في جدول الإدارة على سطر واحد بعد المراجعة البصرية.

## الحالات

تدعم صفحة الإدارة `normal` و`loading` و`empty` و`error` و`offline`. حالة Offline تسمح بالقراءة وتمنع الإضافة والتعديل دون ادعاء وجود Sync Queue. صفحات التفاصيل والملف الشخصي تدعم Loading وOffline، والتفاصيل تدعم Error و404 أيضًا.

## الملفات المنشأة

- `app/(workspace)/employees/[employeeId]/page.tsx`
- `app/(workspace)/profile/page.tsx`
- `features/employees/types.ts`
- `features/employees/fixtures.ts`
- `features/employees/permissions.ts`
- `features/employees/hooks/use-employees.ts`
- `features/employees/schemas/employee-schema.ts`
- `features/employees/services/employee-store.ts`
- `features/employees/services/query-employees.ts`
- `features/employees/forms/EmployeeForm.tsx`
- مكونات القائمة والتفاصيل والملف الشخصي داخل `features/employees/components/`
- `features/employees/tests/employees.spec.ts`
- `tests/responsive/employees.spec.ts`
- `styles/employees.css`
- `docs/SPRINT_05_EMPLOYEES_REPORT.md`

## الملفات المعدلة

- `app/(workspace)/employees/page.tsx`
- `app/globals.css`
- `components/shell/Header.tsx`
- `components/shell/AppShell.tsx`
- `permissions/keys.ts`
- `permissions/types.ts`
- `permissions/role-templates.ts`
- `permissions/navigation-policy.ts`
- `styles/shell.css`
- `tests/permissions/navigation.spec.ts`
- `tests/component/shell/Sidebar.spec.tsx`
- `vitest.config.mts`

## نتائج الجودة

| الفحص | النتيجة |
|---|---|
| `npm run check:styles` | ناجح — 9 استيرادات CSS محلية |
| `npm run build` | ناجح — `/employees` و`/employees/[employeeId]` و`/profile` |
| `npm run lint` | ناجح دون أخطاء أو تحذيرات |
| `npm run typecheck` | ناجح |
| `npm test` | ناجح — 8 ملفات / 68 اختبارًا |
| `npm run test:e2e` | ناجح — 41 اختبارًا |

## الاختلاف عن Prototype والقيود المتبقية

- تم تطبيق شكل النظام الحالي وDesign Tokens بدل نسخ Claude Runtime أو منطق Prototype.
- بيانات الموظفين والحفظ والتدقيق مؤقتة في الذاكرة وتعود للوضع الأساسي عند إعادة التشغيل.
- لا يوجد Login أو جلسة مستخدم حقيقية؛ Role Preview تحدد هوية Mock المستخدمة في `/profile`.
- ملخصات الحضور والورديات والمستندات Placeholders فقط.
- لا توجد بيانات راتب أو سلف أو عمولات أو مالية داخل Feature الموظفين.

