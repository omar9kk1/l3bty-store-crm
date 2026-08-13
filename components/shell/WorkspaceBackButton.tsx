"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function WorkspaceBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const currentPathRef = useRef(pathname);
  const hasPreviousAppRouteRef = useRef(false);

  useEffect(() => {
    if (currentPathRef.current !== pathname) {
      hasPreviousAppRouteRef.current = true;
      currentPathRef.current = pathname;
    }
  }, [pathname]);

  if (pathname === "/dashboard") return null;

  const goBack = () => {
    const navigation = (window as Window & {
      navigation?: {
        currentEntry?: { index: number };
        entries: () => Array<{ index: number; url: string }>;
      };
    }).navigation;
    const currentIndex = navigation?.currentEntry?.index;
    const previousEntry = currentIndex === undefined
      ? undefined
      : navigation?.entries().find((entry) => entry.index === currentIndex - 1);
    const hasSameOriginPreviousEntry = previousEntry
      ? new URL(previousEntry.url).origin === window.location.origin
      : false;

    if (hasPreviousAppRouteRef.current || hasSameOriginPreviousEntry) {
      router.back();
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="workspace-content__back-row">
      <button
        type="button"
        className="workspace-back-button"
        aria-label="الرجوع للصفحة السابقة"
        title="رجوع"
        onClick={goBack}
      >
        <ArrowRight aria-hidden size={18} />
        <span>رجوع</span>
      </button>
    </div>
  );
}