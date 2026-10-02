"use client";

import { type FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { resolvePreviewEmployee } from "@/features/employees/fixtures";
import { money } from "@/features/finance/components/finance-labels";
import { useExpenses } from "../hooks/use-expenses";
import { submitExpenseRequest } from "../services/expense-store";
import { expenseStatusLabels, expenseTone } from "./expense-labels";

export function MyExpensesPage() {
  const { roles, availableBranches } = useShell();
  const search = useSearchParams();
  const offline = search.get("state") === "offline";
  const data = useExpenses();
  const employee = resolvePreviewEmployee(roles);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [scope, setScope] = useState<"general" | "branch">("general");
  const branches = availableBranches.filter(
    (branch) => branch.id !== "all" && branch.type !== "central_workshop",
  );
  const assignedBranchIds = roles.includes("owner") || roles.includes("manager")
    ? branches.map((branch) => branch.id)
    : employee.assignedBranchIds;
  const selectableBranches = branches.filter((branch) => assignedBranchIds.includes(branch.id));
  const mine = search.get("state") === "empty"
    ? []
    : data.expenses.filter((expense) => expense.requestedByEmployeeId === employee.id);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const categoryName = String(form.get("categoryName") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const branchId = scope === "general" ? "general" : String(form.get("branchId") ?? "");
    const result = submitExpenseRequest({
      branchId,
      categoryId: `custom:${categoryName.toLocaleLowerCase("ar")}`,
      categoryName,
      amount: String(form.get("amount")),
      expenseDate: today,
      description,
      businessPurpose: description,
      paidPersonally: false,
      reimbursementRequested: false,
      requestedByEmployeeId: employee.id,
      assignedBranchIds: ["general", ...assignedBranchIds],
      idempotencyKey: `expense-request-${employee.id}-${today}-${branchId}-${categoryName}-${form.get("amount")}-${description}`,
    });
    setMessage(result.message);
    if (result.valid) {
      setOpen(false);
      setScope("general");
    }
  }

  return (
    <div className="expenses-page my-expenses-page">
      <header className="expenses-header">
        <div>
          <span>المصروفات</span>
          <h2>مصروفاتي</h2>
          <p>سجّل المصروف مباشرة ليظهر ضمن مصروفات المكان.</p>
        </div>
        <Button disabled={offline} variant="primary" onClick={() => setOpen(true)}>إضافة مصروف</Button>
      </header>

      {offline ? <div className="expenses-offline">أنت غير متصل الآن — إضافة المصروفات متوقفة مؤقتًا.</div> : null}
      {message ? <p role="status" className="expenses-feedback">{message}</p> : null}

      {mine.length ? (
        <section className="personal-expense-list">
          {mine.map((expense) => (
            <Card key={expense.id} className="personal-expense-card">
              <header><strong>{expense.categoryName}</strong><Badge tone={expenseTone(expense.status)}>{expenseStatusLabels[expense.status]}</Badge></header>
              <b>{money(Number(expense.amount))}</b>
              <p>{expense.description}</p>
              <footer><small>{expense.expenseNumber}</small><small>{expense.branchId === "general" ? "مصروف عام" : expense.expenseDate}</small></footer>
            </Card>
          ))}
        </section>
      ) : (
        <Card className="expense-empty expense-empty--main personal-expense-empty">
          <div className="expense-empty__icon" aria-hidden>+</div>
          <h3>لم تضف أي مصروفات بعد</h3>
          <p>ابدأ بإضافة أول مصروف، وبعدها ستتابع حالته من هنا.</p>
          <Button disabled={offline} variant="primary" onClick={() => setOpen(true)}>إضافة أول مصروف</Button>
        </Card>
      )}

      <Drawer open={open} onOpenChange={setOpen} title="إضافة مصروف" description="أدخل نوع المصروف والتكلفة والملاحظة فقط." variant="auxiliary">
        <form className="expense-form expense-form--simple" onSubmit={submit}>
          <label>
            نطاق المصروف
            <select value={scope} onChange={(event) => setScope(event.target.value as "general" | "branch")}>
              <option value="general">مصروف عام</option>
              <option value="branch">مصروف خاص بفرع</option>
            </select>
          </label>

          {scope === "branch" ? (
            <label>
              الفرع
              <select name="branchId" required>
                <option value="">اختر الفرع</option>
                {selectableBranches.map((branch) => <option value={branch.id} key={branch.id}>{branch.nameAr}</option>)}
              </select>
            </label>
          ) : null}

          <label>
            نوع المصروف
            <input name="categoryName" minLength={2} placeholder="اكتب نوع المصروف" required />
          </label>

          <label>
            التكلفة
            <input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" required />
          </label>

          <label>
            ملاحظة
            <textarea name="description" minLength={3} placeholder="اكتب ملاحظة مختصرة توضح المصروف" required />
          </label>

          <Button type="submit" variant="primary">حفظ المصروف</Button>
        </form>
      </Drawer>
    </div>
  );
}
