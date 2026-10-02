"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { AppIcon } from "@/components/ui/AppIcon";
import { Tooltip } from "@/components/ui/Tooltip";
import { isNavigationItemActive } from "@/permissions/navigation-policy";
import type { NavigationItem, NavigationSection } from "@/permissions/types";

export function SidebarSection({
  section,
  items,
  pathname,
  collapsed,
  open,
  onToggle,
  onNavigate,
}: {
  section: NavigationSection;
  items: NavigationItem[];
  pathname: string;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const isOpen = open;

  return (
    <section className="sidebar-section">
      {!collapsed ? (
        <button
          type="button"
          className="sidebar-section__trigger"
          aria-expanded={isOpen}
          onClick={onToggle}
        >
          <span>{section}</span>
          <ChevronDown aria-hidden size={16} className={isOpen ? "is-open" : ""} />
        </button>
      ) : null}
      <div className="sidebar-section__items" hidden={!collapsed && !isOpen}>
        {items.map((item) => {
          const active = isNavigationItemActive(item, pathname);
          const link = (
            <Link
              href={item.href}
              className="sidebar-link"
              aria-current={active ? "page" : undefined}
              data-active={active || undefined}
              onClick={onNavigate}
            >
              <AppIcon name={item.icon} />
              {!collapsed ? <span>{item.labelAr}</span> : null}
            </Link>
          );
          return collapsed ? <Tooltip key={item.key} label={item.labelAr}>{link}</Tooltip> : <span key={item.key}>{link}</span>;
        })}
      </div>
    </section>
  );
}
