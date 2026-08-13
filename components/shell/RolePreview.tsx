"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { ROLE_TEMPLATES } from "@/permissions/role-templates";
import { ROLE_IDS } from "@/permissions/types";
import { useShell } from "./ShellContext";

export function RolePreview() {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { roles, toggleRole } = useShell();
  const summary = roles.map((role) => ROLE_TEMPLATES[role].shortLabelAr).join(" + ");

  const roleControls = (
    <div className="role-preview__controls">
      <div className="role-preview__heading">
        <strong>معاينة الأدوار</strong>
        <span>يمكن اختيار أكثر من دور، وتُجمع الصلاحيات.</span>
      </div>
      {ROLE_IDS.map((role) => (
        <label key={role} className="role-preview__option">
          <input type="checkbox" checked={roles.includes(role)} onChange={() => toggleRole(role)} />
          <span>{ROLE_TEMPLATES[role].labelAr}</span>
        </label>
      ))}
      <a href="/ui-states" className="role-preview__dev-link">معاينة حالات الواجهة</a>
    </div>
  );

  return (
    <div className="role-preview">
      <div className="role-preview__desktop">
        <button
          type="button"
          className="role-preview__trigger"
          aria-label={`معاينة الأدوار: ${summary}`}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="role-preview__copy">
            <Badge tone="accent">تجريبي</Badge>
            <span>{summary}</span>
          </span>
          <ChevronDown aria-hidden size={16} />
        </button>
        {open ? <div className="role-preview__panel">{roleControls}</div> : null}
      </div>
      <button type="button" className="role-preview__mobile-trigger" onClick={() => setMobileOpen(true)}>
        معاينة
      </button>
      <Drawer
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        title="معاينة الأدوار"
        description="أداة تطوير لتجربة دور واحد أو عدة أدوار"
        variant="bottom-sheet"
      >
        <div className="role-preview__drawer">{roleControls}</div>
      </Drawer>
    </div>
  );
}
