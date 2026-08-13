export default function Loading() {
  return (
    <main className="state-page" aria-live="polite" aria-busy="true">
      <div className="state-card">
        <span className="state-mark state-mark-loading" aria-hidden="true" />
        <h1>جارٍ تجهيز الأساس…</h1>
        <p>يتم تحميل رموز التصميم والواجهة العربية.</p>
      </div>
    </main>
  );
}
