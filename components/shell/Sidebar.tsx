"use client";

import { useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import type { NavigationItem, NavigationSection } from "@/permissions/types";
import { SidebarSection } from "./SidebarSection";

const sectionOrder: NavigationSection[] = [
  "الرئيسية", "التشغيل", "المبيعات", "الصيانة", "المخزون", "المالية", "الموظفون", "الإدارة",
];

export function Sidebar({
  navigation,
  pathname,
  collapsed,
  onCollapsedChange,
  mode = "desktop",
  onNavigate,
}: {
  navigation: NavigationItem[];
  pathname: string;
  collapsed: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  mode?: "desktop" | "drawer";
  onNavigate?: () => void;
}) {
  const [openSections, setOpenSections] = useState<NavigationSection[]>(sectionOrder);
  const effectiveCollapsed = mode === "drawer" ? false : collapsed;

  function toggleSection(section: NavigationSection) {
    setOpenSections((current) =>
      current.includes(section)
        ? current.filter((item) => item !== section)
        : [...current, section],
    );
  }

  return (
    <aside className={`sidebar ${effectiveCollapsed ? "sidebar--collapsed" : ""}`} data-testid="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark brand-latin">{effectiveCollapsed ? "L3" : "L3BTY"}</span>
        {!effectiveCollapsed ? <span>لعبتي</span> : null}
      </div>
      <nav className="sidebar__nav" aria-label="التنقل الرئيسي">
        {sectionOrder.map((section) => {
          const items = navigation.filter((item) => item.section === section);
          return items.length ? (
            <SidebarSection
              key={section}
              section={section}
              items={items}
              pathname={pathname}
              collapsed={effectiveCollapsed}
              open={openSections.includes(section)}
              onToggle={() => toggleSection(section)}
              onNavigate={onNavigate}
            />
          ) : null;
        })}
      </nav>
      {mode === "desktop" && onCollapsedChange ? (
        <div className="sidebar__footer">
          <IconButton
            label={effectiveCollapsed ? "توسيع القائمة" : "تصغير القائمة"}
            onClick={() => onCollapsedChange(!effectiveCollapsed)}
          >
            {effectiveCollapsed ? <PanelRightOpen aria-hidden /> : <PanelRightClose aria-hidden />}
          </IconButton>
          {!effectiveCollapsed ? <span>تصغير القائمة</span> : null}
        </div>
      ) : null}
    </aside>
  );
}
