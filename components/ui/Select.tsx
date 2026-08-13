import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, className = "", children, ...props }, ref) {
    return (
      <label className={`ui-select ${className}`}>
        <span className="sr-only">{label}</span>
        <select ref={ref} aria-label={label} {...props}>
          {children}
        </select>
      </label>
    );
  },
);
