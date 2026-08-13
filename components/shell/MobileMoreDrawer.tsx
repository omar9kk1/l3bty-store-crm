"use client";

import Link from "next/link";
import { AppIcon } from "@/components/ui/AppIcon";
import { Drawer } from "@/components/ui/Drawer";
import { getPrimaryMobileItems } from "./MobileNavigation";
import type { NavigationItem } from "@/permissions/types";

export function MobileMoreDrawer({
  open,
  onOpenChange,
  navigation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navigation: NavigationItem[];
}) {
  const primaryKeys = new Set(getPrimaryMobileItems(navigation).map((item) => item.key));
  const moreItems = navigation.filter((item) => !primaryKeys.has(item.key));

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="المزيد" description="الصفحات المتاحة حسب الأدوار المحددة" variant="bottom-sheet">
      <nav className="mobile-more-grid" aria-label="باقي صفحات النظام">
        {moreItems.map((item) => (
          <Link key={item.key} href={item.href} onClick={() => onOpenChange(false)}>
            <AppIcon name={item.icon} />
            <span>{item.labelAr}</span>
          </Link>
        ))}
      </nav>
    </Drawer>
  );
}
