import { Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import type { BranchSort, BranchStatus, BranchType } from "../types";

const tabs = [
  { label: "الكل", type: "all", status: "all" }, { label: "الفروع", type: "branch", status: "all" },
  { label: "الورشة المركزية", type: "central_workshop", status: "all" }, { label: "نشط", type: "all", status: "active" },
  { label: "مغلق مؤقتًا", type: "all", status: "temporarily_closed" }, { label: "غير نشط", type: "all", status: "inactive" },
] as const;

export function BranchesFilters({ q, type, status, sort, onSearch, onFilter, onSort }: { q: string; type: BranchType | "all"; status: BranchStatus | "all"; sort: BranchSort; onSearch: (value: string) => void; onFilter: (type: BranchType | "all", status: BranchStatus | "all") => void; onSort: (value: BranchSort) => void }) {
  return <Card className="branches-filter-bar"><div className="branches-filter-bar__top"><label className="branches-search"><Search aria-hidden size={18} /><span className="sr-only">البحث في الفروع</span><input type="search" value={q} onChange={(event) => onSearch(event.target.value)} placeholder="ابحث بالاسم أو الكود أو المنطقة أو المدينة" /></label><Select label="ترتيب الفروع" value={sort} onChange={(event) => onSort(event.target.value as BranchSort)}><option value="name">الاسم</option><option value="code">الكود</option><option value="updated">آخر تحديث</option><option value="employees">عدد الموظفين</option></Select></div><div className="branches-tabs" role="tablist" aria-label="تصفية الفروع">{tabs.map((tab) => <button key={tab.label} type="button" role="tab" aria-selected={type === tab.type && status === tab.status} onClick={() => onFilter(tab.type, tab.status)}>{tab.label}</button>)}</div></Card>;
}
