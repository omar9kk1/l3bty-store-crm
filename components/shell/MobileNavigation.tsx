"use client";

import Link from "next/link";
import { Ellipsis } from "lucide-react";
import { AppIcon } from "@/components/ui/AppIcon";
import { isNavigationItemActive } from "@/permissions/navigation-policy";
import type { NavigationItem } from "@/permissions/types";

export function getPrimaryMobileItems(navigation: NavigationItem[]) {
  return navigation
    .filter((item) => item.mobilePriority !== undefined)
    .sort((a, b) => (a.mobilePriority ?? 99) - (b.mobilePriority ?? 99))
    .slice(0, 4);
}

export function MobileNavigation({
  navigation,
  pathname,
  onOpenMore,
}: {
  navigation: NavigationItem[];
  pathname: string;
  onOpenMore: () => void;
}) {
  const primaryItems = getPrimaryMobileItems(navigation);
  const primaryKeys = new Set(primaryItems.map((item) => item.key));
  const moreIsActive = navigation.some((item) => !primaryKeys.has(item.key) && isNavigationItemActive(item, pathname));

  return (
    <nav className="mobile-navigation" aria-label="التنقل السريع" data-testid="mobile-navigation">
      {primaryItems.map((item) => {
        const active = isNavigationItemActive(item, pathname);
        return (
          <Link key={item.key} href={item.href} aria-current={active ? "page" : undefined} data-active={active || undefined}>
            <AppIcon name={item.icon} size={22} />
            <span>{item.labelAr}</span>
          </Link>
        );
      })}
      <button type="button" onClick={onOpenMore} data-active={moreIsActive || undefined}>
        <Ellipsis aria-hidden size={22} />
        <span>المزيد</span>
      </button>
    </nav>
  );
}
