"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="state-page">
      <div className="state-card">
        <span className="state-mark state-mark-error" aria-hidden="true">!</span>
        <h1>تعذر تحميل الصفحة</h1>
        <p>حدث خطأ مؤقت. يمكنك إعادة المحاولة من دون فقد اتجاه الصفحة.</p>
        <button className="button button-primary" type="button" onClick={reset}>
          إعادة المحاولة
        </button>
      </div>
    </main>
  );
}
