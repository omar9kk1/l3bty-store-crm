"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { PermissionGuard } from "@/components/permissions/PermissionGuard";
import { findNavigationItem } from "@/permissions/navigation-policy";
import { ActiveRentalStrip } from "./ActiveRentalStrip";
import { Header } from "./Header";
import { MobileMoreDrawer } from "./MobileMoreDrawer";
import { MobileNavigation } from "./MobileNavigation";
import { ShellProvider, useShell } from "./ShellContext";
import { Sidebar } from "./Sidebar";
import { WorkspaceContent } from "./WorkspaceContent";

function AppShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navigationDrawerOpen, setNavigationDrawerOpen] = useState(false);
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);
  const { navigation, sidebarCollapsed, setSidebarCollapsed } = useShell();
  const currentItem = findNavigationItem(pathname);
  const roleAwareCurrentItem = currentItem ? navigation.find((item) => item.key === currentItem.key) : undefined;
  const title = roleAwareCurrentItem?.labelAr ?? currentItem?.labelAr ?? (pathname === "/profile" ? "الملف الشخصي" : pathname === "/ui-states" ? "حالات الواجهة" : "مساحة العمل");

  const guardedContent = currentItem ? (
    <PermissionGuard permission={currentItem.requiredPermission}>{children}</PermissionGuard>
  ) : children;

  return (
    <div className={`app-shell ${sidebarCollapsed ? "app-shell--rail" : ""}`}>
      <a className="skip-link" href="#workspace-content">تجاوز إلى المحتوى</a>
      <Sidebar
        navigation={navigation}
        pathname={pathname}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className="app-shell__body">
        <Header title={title} onOpenNavigation={() => setNavigationDrawerOpen(true)} />
        <ActiveRentalStrip />
        <WorkspaceContent>{guardedContent}</WorkspaceContent>
      </div>
      <Drawer open={navigationDrawerOpen} onOpenChange={setNavigationDrawerOpen} title="التنقل" description="الصفحات المتاحة حسب الصلاحيات الحالية" variant="navigation">
        <Sidebar navigation={navigation} pathname={pathname} collapsed={false} mode="drawer" onNavigate={() => setNavigationDrawerOpen(false)} />
      </Drawer>
      <MobileNavigation navigation={navigation} pathname={pathname} onOpenMore={() => setMoreDrawerOpen(true)} />
      <MobileMoreDrawer open={moreDrawerOpen} onOpenChange={setMoreDrawerOpen} navigation={navigation} />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return <ShellProvider><AppShellInner>{children}</AppShellInner></ShellProvider>;
}
