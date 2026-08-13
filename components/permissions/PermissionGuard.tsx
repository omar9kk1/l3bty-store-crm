"use client";

import type { ReactNode } from "react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import type { PermissionKey } from "@/permissions/types";

export function PermissionGuard({
  permission,
  children,
  fallback,
}: {
  permission: PermissionKey;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { permissions } = useShell();
  if (!permissions.has(permission)) {
    return fallback ?? <PermissionDeniedState />;
  }
  return children;
}
