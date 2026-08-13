import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`ui-button ui-button--${variant} ui-button--${size} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
