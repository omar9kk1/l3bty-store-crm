"use client";

import { BadgePercent, BellRing, Boxes, Clock3, History, Landmark, MapPin, RotateCcw, Save, Settings2, ShieldCheck, Wrench } from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PERMISSION_KEYS } from "@/permissions/keys";
import { DEFAULT_SYSTEM_SETTINGS } from "../fixtures";
import { useSettings } from "../hooks/use-settings";
import { restoreDefaultSystemSettings, saveSystemSettings, validateSystemSettings } from "../services/settings-store";
import type { SettingsValidationErrors, SystemSettings } from "../types";

type FieldOption = { value: string; label: string };
type Field = {
  key: keyof SystemSettings;
  label: string;
  helper: string;
  kind: "number" | "toggle" | "select";
  min?: number;
  max?: number;
  suffix?: string;
  options?: readonly FieldOption[];
};
type Section = {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  fields: readonly Field[];
};

const sections: readonly Section[] = [
  {
    id: "rentals", title: "التأجير والتسعير", description: "سياسات التجربة والتنبيه والوقت الإضافي.", icon: Clock3,
    fields: [
      { key: "reminderMinutes", label: "التذكير قبل الانتهاء", helper: "نافذة ظهور تذكير واتساب قبل نهاية التأجير.", kind: "number", min: 1, max: 60, suffix: "دقيقة" },
      { key: "selectionTrialMinutes", label: "مدة الاختيار والتجربة", helper: "المدة المجانية قبل بدء حساب التأجير.", kind: "number", min: 0, max: 60, suffix: "دقيقة" },
      { key: "overtimePricing", label: "تسعير الوقت الإضافي", helper: "السياسة المطبقة بعد تجاوز الوقت المحدد.", kind: "select", options: [{ value: "same_rate", label: "بنفس سعر الساعة" }, { value: "custom", label: "سعر مخصص لاحقًا" }] },
    ],
  },
  {
    id: "approvals", title: "الخصومات والموافقات", description: "حدود الموظفين والقرارات التي تحتاج اعتمادًا إداريًا.", icon: BadgePercent,
    fields: [
      { key: "employeeDiscountLimitPercent", label: "حد خصم موظف المبيعات", helper: "ما يزيد عن هذا الحد يحتاج موافقة وسببًا.", kind: "number", min: 0, max: 100, suffix: "%" },
      { key: "requireSensitiveReason", label: "سبب إلزامي للإجراءات الحساسة", helper: "الخصومات والعكس والإلغاء والاعتمادات.", kind: "toggle" },
    ],
  },
  {
    id: "inventory", title: "الصيانة والمخزون", description: "الضمان وحدود التنبيه والتحويلات.", icon: Wrench,
    fields: [
      { key: "defaultWarrantyDays", label: "الضمان الافتراضي", helper: "القيمة الابتدائية للمنتجات الجديدة.", kind: "number", min: 0, max: 3650, suffix: "يوم" },
      { key: "defaultMinimumStock", label: "الحد الأدنى الافتراضي", helper: "يستخدم عند إنشاء رصيد منتج جديد.", kind: "number", min: 0, max: 100000, suffix: "وحدة" },
      { key: "transferApprovalQuantityLimit", label: "حد اعتماد التحويل", helper: "الكمية الأعلى تحتاج موافقة إدارية.", kind: "number", min: 1, max: 10000, suffix: "وحدة" },
    ],
  },
  {
    id: "finance", title: "المالية والخزائن", description: "التحصيل والمصروفات والورديات المالية.", icon: Landmark,
    fields: [
      { key: "expenseApprovalLimit", label: "حد اعتماد المصروف", helper: "مرجع افتراضي لفئات المصروفات الحساسة.", kind: "number", min: 0, max: 100000000, suffix: "ج.م" },
      { key: "requireShiftForCollection", label: "اشتراط وردية للتحصيل", helper: "يمنع التحصيل التشغيلي دون وردية مالية مفتوحة.", kind: "toggle" },
    ],
  },
  {
    id: "attendance", title: "الحضور والوقت الإضافي", description: "الموقع والدقة وبداية احتساب الإضافي.", icon: MapPin,
    fields: [
      { key: "defaultGeofenceRadiusMeters", label: "نطاق الحضور الافتراضي", helper: "القيمة المقترحة عند إنشاء فرع جديد.", kind: "number", min: 25, max: 2000, suffix: "متر" },
      { key: "maxLocationAccuracyMeters", label: "أقصى خطأ للموقع", helper: "القراءة الأقل دقة تنتقل للمراجعة.", kind: "number", min: 1, max: 500, suffix: "متر" },
      { key: "overtimeStartsAfterMinutes", label: "بدء الوقت الإضافي", helper: "بعد نهاية الدوام المعتمد.", kind: "number", min: 0, max: 1440, suffix: "دقيقة" },
    ],
  },
  {
    id: "payroll", title: "الرواتب والسلف", description: "إقفال الدورة وحد طلب السلفة.", icon: Boxes,
    fields: [
      { key: "payrollCutoffDay", label: "يوم إقفال دورة الراتب", helper: "من 1 إلى 28 لتفادي اختلاف طول الشهور.", kind: "number", min: 1, max: 28, suffix: "من الشهر" },
      { key: "advanceLimitPercent", label: "حد السلفة من الراتب", helper: "النسبة القصوى المقترحة للطلب.", kind: "number", min: 0, max: 100, suffix: "%" },
    ],
  },
  {
    id: "communications", title: "WhatsApp والطباعة والإشعارات", description: "قنوات التواصل ومقاس الإيصال الافتراضي.", icon: BellRing,
    fields: [
      { key: "whatsappEnabled", label: "تفعيل إجراءات WhatsApp", helper: "إظهار أزرار التذكير وإرسال الفواتير.", kind: "toggle" },
      { key: "defaultPrintSize", label: "مقاس الطباعة الافتراضي", helper: "يمكن تغييره يدويًا عند الطباعة.", kind: "select", options: [{ value: "80mm", label: "إيصال 80mm" }, { value: "58mm", label: "إيصال 58mm" }, { value: "a4", label: "A4" }] },
      { key: "notificationsEnabled", label: "إشعارات النظام", helper: "تشغيل التنبيهات التشغيلية داخل البرنامج.", kind: "toggle" },
    ],
  },
  {
    id: "security", title: "الأمان وسجل النشاط", description: "مدة الجلسة والاحتفاظ بسجل التدقيق.", icon: ShieldCheck,
    fields: [
      { key: "sessionTimeoutMinutes", label: "انتهاء الجلسة بعد عدم النشاط", helper: "سيُطبق عند ربط تسجيل الدخول الحقيقي.", kind: "number", min: 5, max: 1440, suffix: "دقيقة" },
      { key: "auditRetentionDays", label: "مدة الاحتفاظ بسجل النشاط", helper: "مرجع سياسة التخزين عند ربط قاعدة البيانات.", kind: "number", min: 30, max: 3650, suffix: "يوم" },
    ],
  },
];

export function SettingsPage() {
  const { permissions } = useShell();
  if (!permissions.has(PERMISSION_KEYS.settings)) return <PermissionDeniedState />;
  return <SettingsAdminPage />;
}

function SettingsAdminPage() {
  const data = useSettings();
  const { roles } = useShell();
  const [active, setActive] = useState(sections[0].id);
  const [draft, setDraft] = useState<SystemSettings>({ ...data.settings });
  const [errors, setErrors] = useState<SettingsValidationErrors>({});
  const [notice, setNotice] = useState("");
  const current = sections.find((section) => section.id === active) ?? sections[0];
  const ActiveIcon = current.icon;
  const actor = roles.includes("owner") ? "employee-owner" : "employee-manager";
  const dirty = useMemo(() => (Object.keys(draft) as (keyof SystemSettings)[]).some((key) => draft[key] !== data.settings[key]), [data.settings, draft]);

  function update(key: keyof SystemSettings, value: SystemSettings[keyof SystemSettings]) {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [key]: undefined }));
  }

  function save() {
    const validation = validateSystemSettings(draft);
    if (!validation.valid) {
      setErrors(validation.errors);
      setNotice("راجع الحقول المحددة قبل الحفظ.");
      return;
    }
    const result = saveSystemSettings(draft, actor);
    setNotice(result.message);
    if (!result.valid) setErrors(result.errors);
  }

  function restore() {
    const result = restoreDefaultSystemSettings(actor);
    setDraft({ ...DEFAULT_SYSTEM_SETTINGS });
    setNotice(result.message);
    setErrors({});
  }

  return <div className="settings-page">
    <header className="settings-header">
      <div><span>إدارة النظام</span><h2>الإعدادات والسياسات</h2><p>مرجع مركزي للقيم المستخدمة حاليًا والمحفوظة محليًا.</p></div>
      <div className="settings-header__actions">
        <Badge tone={dirty ? "warning" : "success"}>{dirty ? "تغييرات غير محفوظة" : "الإعدادات محفوظة"}</Badge>
        <Button icon={<RotateCcw size={16} />} onClick={restore}>القيم الافتراضية</Button>
        <Button variant="primary" icon={<Save size={16} />} disabled={!dirty} onClick={save}>حفظ التغييرات</Button>
      </div>
    </header>

    {notice ? <div className="settings-notice" role="status">{notice}</div> : null}

    <section className="settings-summary">
      <Card><span>مجموعات السياسات</span><strong>{sections.length}</strong></Card>
      <Card><span>القيم القابلة للإدارة</span><strong>{Object.keys(data.settings).length}</strong></Card>
      <Card><span>آخر تعديل بواسطة</span><strong>{data.updatedBy === "employee-owner" ? "المالك" : "المدير"}</strong></Card>
      <Card><span>تغييرات الجلسة</span><strong>{data.audits.length}</strong></Card>
    </section>

    <div className="settings-layout">
      <nav className="settings-nav" aria-label="أقسام الإعدادات">
        {sections.map((section) => {
          const Icon = section.icon;
          return <button type="button" className={active === section.id ? "is-active" : ""} aria-current={active === section.id ? "page" : undefined} onClick={() => setActive(section.id)} key={section.id}><Icon aria-hidden size={18} /><span><strong>{section.title}</strong><small>{section.description}</small></span></button>;
        })}
      </nav>

      <Card className="settings-panel">
        <header><div className="settings-panel__icon"><ActiveIcon aria-hidden size={22} /></div><div><h3>{current.title}</h3><p>{current.description}</p></div></header>
        <div className="settings-fields">
          {current.fields.map((field) => <SettingField field={field} value={draft[field.key]} error={errors[field.key]} onChange={(value) => update(field.key, value)} key={field.key} />)}
        </div>
        <footer><span>{dirty ? "لن تؤثر التغييرات حتى تضغط حفظ." : "لا توجد تغييرات معلقة."}</span><Button variant="primary" icon={<Save size={16} />} disabled={!dirty} onClick={save}>حفظ هذا التعديل</Button></footer>
      </Card>
    </div>

    <Card className="settings-audit">
      <header><div><History aria-hidden size={20} /><h3>سجل تغييرات الإعدادات</h3></div><Badge tone="neutral">سجل التغييرات</Badge></header>
      {data.audits.length ? data.audits.map((event) => <div className="settings-audit__row" key={event.id}><div><strong>{event.reason}</strong><span>{event.changedKeys.length} قيمة · {event.actorEmployeeId}</span></div><time>{new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(event.at))}</time></div>) : <div className="settings-audit__empty"><Settings2 aria-hidden size={28} /><p>لم تُحفظ تغييرات في هذه الجلسة بعد.</p></div>}
    </Card>
  </div>;
}

function SettingField({ field, value, error, onChange }: { field: Field; value: SystemSettings[keyof SystemSettings]; error?: string; onChange: (value: SystemSettings[keyof SystemSettings]) => void }) {
  if (field.kind === "toggle") {
    return <label className="settings-field settings-field--toggle" data-setting-key={field.key}><span><strong>{field.label}</strong><small>{field.helper}</small></span><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden /></label>;
  }
  return <label className="settings-field" data-setting-key={field.key}><span><strong>{field.label}</strong><small>{field.helper}</small></span><div className="settings-field__control">{field.kind === "select" ? <select value={String(value)} onChange={(event) => onChange(event.target.value as SystemSettings[keyof SystemSettings])}>{field.options?.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select> : <input type="number" min={field.min} max={field.max} value={Number(value)} onChange={(event) => onChange(Number(event.target.value))} dir="ltr" />}{field.suffix ? <em>{field.suffix}</em> : null}</div>{error ? <small className="settings-field__error" role="alert">{error}</small> : null}</label>;
}
