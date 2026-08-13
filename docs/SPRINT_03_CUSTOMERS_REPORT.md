# تقرير Sprint 03 — Feature العملاء

التاريخ: 5 أغسطس 2026  
النطاق المنفذ: قائمة العملاء `/customers` وملف العميل `/customers/[customerId]` فقط.

## النتيجة

- تحوّل مسار العملاء من Placeholder إلى صفحة فعلية تعمل ببيانات Mock ثابتة وحتمية.
- أضيف مسار حقيقي قابل لإعادة الفتح لملف العميل.
- تعمل إضافة العميل وتعديل بياناته الأساسية داخل Mock Store في ذاكرة الجلسة، من دون قاعدة بيانات أو Auth أو Supabase.
- لم تُنفذ أي معاملة بيع أو تأجير أو صيانة، ولم تُربط النماذج بأي صفحة تشغيل أخرى.
- بقي App Shell وDashboard وSidebar وHeader وMobile Navigation كما هي، واستُخدم نظام Drawer المشترك المعتمد.

## الملفات المنشأة

### المسارات

- `app/(workspace)/customers/[customerId]/page.tsx`

### Feature العملاء

- `features/customers/types.ts`
- `features/customers/fixtures.ts`
- `features/customers/permissions.ts`
- `features/customers/hooks/use-customers.ts`
- `features/customers/schemas/customer-schema.ts`
- `features/customers/services/customer-store.ts`
- `features/customers/services/find-duplicate-customer.ts`
- `features/customers/services/normalize-phone.ts`
- `features/customers/services/query-customers.ts`
- `features/customers/forms/CustomerForm.tsx`
- `features/customers/forms/QuickCustomerForm.tsx`
- `features/customers/components/CustomersPage.tsx`
- `features/customers/components/CustomersHeader.tsx`
- `features/customers/components/CustomersSummary.tsx`
- `features/customers/components/CustomersFilters.tsx`
- `features/customers/components/CustomersTable.tsx`
- `features/customers/components/CustomerMobileCard.tsx`
- `features/customers/components/CustomerDetailsPage.tsx`
- `features/customers/components/CustomerOverview.tsx`
- `features/customers/components/CustomerActivityTimeline.tsx`
- `features/customers/components/CustomerFlags.tsx`
- `features/customers/components/CustomerContactCard.tsx`
- `features/customers/components/CustomerEmptyState.tsx`
- `features/customers/components/CustomerSkeleton.tsx`
- `features/customers/tests/customers.spec.ts`

### العرض والاختبارات

- `styles/customers.css`
- `tests/responsive/customers.spec.ts`

## الملفات المعدلة

- `app/(workspace)/customers/page.tsx`: استبدال الـPlaceholder بمكون `CustomersPage`.
- `app/globals.css`: استيراد `customers.css` مرة واحدة.
- `permissions/navigation-policy.ts`: جعل مسار العملاء أصلًا للمسار التفصيلي وتحديث الوصف.
- `permissions/role-templates.ts`: إتاحة صفحة العملاء لفني الصيانة؛ ويظل المحتوى نفسه مقيدًا بالأوامر المسندة.
- `vitest.config.mts`: إدراج اختبارات Feature العملاء.

## عقد بيانات العميل

يحتوي `Customer` على: المعرّف، رقم العميل، الاسم، الهاتف الأساسي، الهواتف البديلة، الفروع، بيانات الإنشاء وآخر نشاط، إجماليات الأنشطة، الرصيد المتبقي، رسوم التلف غير المسددة، الحالة، التنبيهات، وعدد الملاحظات. أضيفت حقول Mock داخلية لتحديد أنواع النشاط وما إذا كانت الصيانة مسندة للفني؛ وهي مؤقتة إلى حين وجود نموذج بيانات وخدمة صلاحيات حقيقيين.

الحالات المدعومة: نشط، غير نشط، موقوف.  
التنبيهات المدعومة: مديونية، رسوم تلف غير مسددة، منع من التأجير، وبيانات تحتاج مراجعة.

## البحث وتطبيع الهاتف ومنع التكرار

- يبحث المسار بالاسم، رقم الهاتف الأساسي أو البديل، ورقم العميل.
- تُزال المسافات والعلامات من الهاتف قبل المقارنة.
- تُوحّد بادئة مصر الدولية إلى الشكل المحلي، ويُعاد الصفر الأول عند الحاجة.
- يفحص `validateCustomerForm` الرقم الأساسي والرقم البديل ضد جميع الأرقام المسجلة.
- التطابق التام يمنع الحفظ، ويعرض بطاقة السجل الموجود مع رابط مباشر لفتحه.
- يستخدم `QuickCustomerForm` نفس Schema ونفس عقد الحفظ وفحص التكرار، لكنه غير مربوط بصفحات العمليات في هذه المهمة.

## الرؤية حسب الدور

- مالك النشاط والمدير: كل العملاء في كل الفروع وكل أقسام الملف.
- موظف المبيعات: العملاء المرتبطون بالمبيعات داخل الفروع المسندة، مع أقسام المبيعات والبيانات ذات الصلة.
- موظف التأجير واستلام الصيانة: العملاء المرتبطون بالتأجير أو الصيانة داخل الفروع المسندة، مع الأقسام التشغيلية ذات الصلة.
- فني الصيانة: العملاء المرتبطون بأوامر صيانة مسندة فقط؛ يرى بيانات التواصل والصيانة الضرورية ولا يرى الملخص المالي العام أو المبيعات أو أزرار الإضافة والتعديل.
- تعدد الأدوار: اتحاد الوصول من دون تكرار العميل أو الأقسام.
- وجود المالك أو المدير ضمن الأدوار يمنح الوصول الكامل.

## نطاق الفرع

لا يوجد State مستقل للفرع داخل Feature العملاء. تعتمد القائمة والتفاصيل والفلاتر على `activeBranch` و`availableBranches` من `ShellContext`. تغيير الفرع من Header أو Drawer يغيّر النتائج مباشرة، بينما تبقى معاملات URL مخصصة للبحث والحالة والتنبيه والنشاط والصفحة والترتيب.

## الواجهات والحالات

- Desktop وTablet: جدول مرن يخفي الأعمدة الثانوية تدريجيًا ولا ينشئ تمريرًا أفقيًا.
- Mobile: بطاقات مستقلة، ولا يُعرض الجدول الأفقي.
- حالات URL المدعومة: `normal` و`loading` و`empty` و`error` و`offline`.
- Offline يسمح بالقراءة ويعطل الحفظ بوضوح، ولا يدّعي وجود طابور مزامنة.
- صفحة الملف تعرض الأقسام المتاحة للدور فقط: النظرة العامة، التواصل، الملخص المالي، المبيعات، التأجير، الصيانة، رسوم التلف المستقلة، وسجل النشاط.

## Drawer وResponsive

- نموذج الإضافة والتعديل وفلتر العملاء يستخدمان `variant="auxiliary"`.
- Desktop: Drawer من اليسار بعرض 360px.
- Tablet: Drawer من اليسار بعرض 340px تقريبًا.
- Mobile: يتحول تلقائيًا إلى Bottom Sheet بعرض المساحة المتاحة.
- حافظت الحقول على ارتفاع 44px وPadding الداخلي المعتمد، مع Header ثابت وجسم قابل للتمرير.
- جرى التحقق من المقاسات: 1920×1080، 1440×900، 1366×768، 1024×768، 834×1112، 768×1024، 390×844.

## الاختلاف عن الـPrototype

استُخدم الـPrototype كمرجع بصري وسلوكي فقط. التنفيذ الجديد مكونات React/Next مستقلة، من دون iframe أو Claude Runtime. أضيف فصل صريح بين البيانات والخدمات والصلاحيات والمكونات والنماذج، وتحول عرض الموبايل إلى Cards بدل ضغط جدول Desktop. هذه الاختلافات لازمة لجعل الواجهة قابلة للتطوير والاختبار مع الحفاظ على الهوية المعتمدة.

## نتائج الجودة

- `npm run build`: ناجح — يتضمن `/customers` و`/customers/[customerId]`.
- `npm run lint`: ناجح، بلا أخطاء أو تحذيرات.
- `npm run typecheck`: ناجح.
- `npm test`: ناجح — 30 اختبارًا.
- `npm run test:e2e`: ناجح — 27 اختبارًا، تشمل المقاسات المعتمدة وتراجع App Shell وDashboard.
- فحص المفردات المتقاعدة داخل Feature العملاء: ناجح.
- فحص Horizontal Overflow على المقاسات المعتمدة: ناجح.

## ملاحظة تشغيلية

كان المنفذ 3000 مستخدمًا مسبقًا بواسطة Dev Server قديم لم يلتقط ملف CSS الجديد. لم تُوقف عملية المستخدم القائمة. بُني التطبيق بنجاح، وشُغلت اختبارات الإنتاج على منفذ مؤقت 3103 ثم أُوقفت العملية المؤقتة. يلزم إعادة تشغيل Dev Server القديم قبل المراجعة اليدوية على المنفذ 3000.

## عناصر تحتاج مراجعة لاحقًا

- Mock Store غير دائم ويُعاد عند إعادة تحميل الصفحة؛ هذا مقصود في نطاق المهمة.
- ربط السجلات بمعاملات حقيقية، وتجميع الهواتف البديلة المتعددة، وسجل التدقيق، وخدمات الصلاحيات على الخادم مؤجلة لما بعد اعتماد طبقة البيانات.
- `QuickCustomerForm` جاهز لإعادة الاستخدام لكنه غير مربوط بأي Feature أخرى التزامًا بالنطاق.
