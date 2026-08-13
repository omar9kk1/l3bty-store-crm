import Link from "next/link";

export default function NotFound() {
  return (
    <main className="state-page">
      <div className="state-card">
        <span className="state-mark" aria-hidden="true">404</span>
        <h1>الصفحة غير موجودة</h1>
        <p>هذا الأساس يحتوي حاليًا على صفحة Foundation فقط.</p>
        <Link className="text-link" href="/">العودة إلى صفحة التأسيس</Link>
      </div>
    </main>
  );
}
