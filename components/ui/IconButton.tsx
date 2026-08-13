import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  selected?: boolean;
}

export function IconButton({
  label,
  children,
  selected = false,
  className = "",
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected || undefined}
      className={`ui-icon-button ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
