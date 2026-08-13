import type { HTMLAttributes, ReactNode } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "success" | "info" | "warning" | "danger" | "accent";
  children: ReactNode;
}

export function Badge({ tone = "neutral", className = "", children, ...props }: BadgeProps) {
  return (
    <span className={`ui-badge ui-badge--${tone} ${className}`} {...props}>
      {children}
    </span>
  );
}
