"use client";

import { AlertTriangle, Search, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useShell } from "@/components/shell/ShellContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { CustomerForm } from "../forms/CustomerForm";
import { useCustomers } from "../hooks/use-customers";
import { resolveCustomerAccess } from "../permissions";
import { createCustomer, updateCustomer } from "../services/customer-store";
import { filterCustomers, paginateCustomers, scopeCustomers, summarizeCustomers } from "../services/query-customers";
import type { Customer, CustomerActivityType, CustomerFlag, CustomerFormValues, CustomerSort, CustomerStatus, CustomerViewState } from "../types";
import { CustomerEmptyState } from "./CustomerEmptyState";
import { CustomerMobileCard } from "./CustomerMobileCard";
import { CustomerSkeleton } from "./CustomerSkeleton";
import { CustomersFilters } from "./CustomersFilters";
import { CustomersHeader } from "./CustomersHeader";
import { CustomersSummary } from "./CustomersSummary";
import { CustomersTable } from "./CustomersTable";

const validStatuses = ["all", "active", "inactive", "blocked"];
const validFlags = ["all", "debt", "rental_ban", "needs_review"];
const validActivities = ["all", "sales", "rental", "maintenance"];
const validSorts = ["recent", "name", "balance"];
const validStates = ["normal", "loading", "empty", "error", "offline"];

export function CustomersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const customers = useCustomers();
  const { roles, activeBranch, availableBranches, setActiveBranchId } = useShell();
  const access = useMemo(() => resolveCustomerAccess(roles), [roles]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer>();
  const [notice, setNotice] = useState("");
  const q = params.get("q") ?? "";
  const status = (validStatuses.includes(params.get("status") ?? "") ? params.get("status") : "all") as CustomerStatus | "all";
  const flag = (validFlags.includes(params.get("flag") ?? "") ? params.get("flag") : "all") as CustomerFlag | "all";
  const requestedActivity = (validActivities.includes(params.get("activity") ?? "") ? params.get("activity") : "all") as CustomerActivityType | "all";
  const activity = requestedActivity === "all" || access.allowedActivityTypes.includes(requestedActivity) ? requestedActivity : "all";
  const requestedSort = (validSorts.includes(params.get("sort") ?? "") ? params.get("sort") : "recent") as CustomerSort;
  const sort = requestedSort === "balance" && !access.canViewFinancial ? "recent" : requestedSort;
  const state = (validStates.includes(params.get("state") ?? "") ? params.get("state") : "normal") as CustomerViewState;
  const requestedPage = Number(params.get("page") ?? "1");
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const scoped = useMemo(() => scopeCustomers(customers, roles, activeBranch.id, availableBranches.map((branch) => branch.id)), [activeBranch.id, availableBranches, customers, roles]);
  const filtered = useMemo(() => filterCustomers(scoped, { q, status, flag, activity, sort, page }), [activity, flag, page, q, scoped, sort, status]);
  const pagination = paginateCustomers(state === "empty" ? [] : filtered, page);
  const branchNames = Object.fromEntries(availableBranches.map((branch) => [branch.id, branch.nameAr]));

  function updateQuery(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all" || (key === "sort" && value === "recent")) next.delete(key); else next.set(key, value);
    if (key !== "page") next.delete("page");
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  function openAdd() { setEditingCustomer(undefined); setFormOpen(true); }
  function openEdit(customer: Customer) { setEditingCustomer(customer); setFormOpen(true); }
  function save(values: CustomerFormValues) {
    if (editingCustomer) updateCustomer(editingCustomer.id, values); else createCustomer(values);
    setFormOpen(false);
    setNotice(editingCustomer ? "تم تحديث بيانات العميل في الحالة التجريبية." : "تمت إضافة العميل إلى الحالة التجريبية.");
  }
  async function copyPhone(customer: Customer) {
    await navigator.clipboard?.writeText(customer.primaryPhone);
    setNotice(`تم نسخ رقم ${customer.name}.`);
  }

  return (
    <div className="customers-page" data-customers-state={state}>
      {state === "offline" ? <div className="customers-offline" role="status"><WifiOff aria-hidden size={17} /><span>وضع دون اتصال — تعرض آخر بيانات تجريبية محفوظة، والحفظ معطل.</span></div> : null}
      <CustomersHeader canCreate={access.canCreate} offline={state === "offline"} onAdd={openAdd} onOpenFilters={() => setFiltersOpen(true)} />
      <CustomersFilters open={filtersOpen} onOpenChange={setFiltersOpen} branches={availableBranches} branchId={activeBranch.id} status={status} flag={flag} activity={activity} sort={sort} access={access} onBranchChange={(value) => { setActiveBranchId(value); setFiltersOpen(false); setNotice("تم تحديث نطاق العملاء حسب الفرع المختار."); }} onFilterChange={(key, value) => updateQuery(key, value)} />
      <Drawer open={formOpen} onOpenChange={setFormOpen} title={editingCustomer ? "تعديل العميل" : "إضافة عميل"} description="تُحفظ التغييرات داخل الحالة التجريبية لهذه الجلسة." variant="auxiliary">
        <CustomerForm customers={customers} branches={availableBranches} initialCustomer={editingCustomer} offline={state === "offline"} onCancel={() => setFormOpen(false)} onSave={save} />
      </Drawer>
      {notice ? <div className="customers-notice" role="status"><span>{notice}</span><button type="button" aria-label="إغلاق الرسالة" onClick={() => setNotice("")}>×</button></div> : null}
      {state === "loading" ? <CustomerSkeleton /> : (
        <>
          <CustomersSummary data={summarizeCustomers(scoped)} showFinancial={access.canViewFinancial} />
          <Card className="customers-toolbar">
            <label className="customers-search"><Search aria-hidden size={18} /><span className="sr-only">البحث في العملاء</span><input type="search" value={q} onChange={(event) => updateQuery("q", event.target.value)} placeholder="ابحث بالاسم أو الهاتف أو رقم العميل" /></label>
            <span>{filtered.length.toLocaleString("ar-EG-u-nu-latn")} نتيجة</span>
          </Card>
          {state === "error" ? <Card className="customers-state customers-state--error"><span className="customers-state__icon"><AlertTriangle aria-hidden /></span><h3>تعذر تحميل العملاء</h3><p>حدث خطأ تجريبي. رمز المرجع: CUS-MOCK-503</p><Button type="button" variant="primary" onClick={() => updateQuery("state", "normal")}>إعادة المحاولة</Button></Card> : pagination.items.length === 0 ? <CustomerEmptyState canCreate={access.canCreate && state !== "offline"} onAdd={openAdd} /> : (
            <>
              <CustomersTable customers={pagination.items} access={access} branchNames={branchNames} onEdit={openEdit} onCopy={copyPhone} />
              <div className="customers-mobile-list">{pagination.items.map((customer) => <CustomerMobileCard key={customer.id} customer={customer} access={access} onEdit={() => openEdit(customer)} onCopy={() => copyPhone(customer)} />)}</div>
              {pagination.pageCount > 1 ? <nav className="customers-pagination" aria-label="صفحات العملاء"><Button type="button" size="sm" disabled={pagination.page === 1} onClick={() => updateQuery("page", String(pagination.page - 1))}>السابق</Button><span>صفحة {pagination.page.toLocaleString("ar-EG-u-nu-latn")} من {pagination.pageCount.toLocaleString("ar-EG-u-nu-latn")}</span><Button type="button" size="sm" disabled={pagination.page === pagination.pageCount} onClick={() => updateQuery("page", String(pagination.page + 1))}>التالي</Button></nav> : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
