"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export type DrawerVariant = "auxiliary" | "navigation" | "bottom-sheet";

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  variant: DrawerVariant;
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  variant,
}: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ui-drawer__overlay" />
        <Dialog.Content
          className={`ui-drawer ui-drawer--${variant}`}
          data-drawer-variant={variant}
          dir="rtl"
        >
          <div className="ui-drawer__header">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              {description ? <Dialog.Description>{description}</Dialog.Description> : null}
            </div>
            <Dialog.Close className="ui-icon-button" aria-label="إغلاق">
              <X aria-hidden size={20} />
            </Dialog.Close>
          </div>
          <div className="ui-drawer__body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
