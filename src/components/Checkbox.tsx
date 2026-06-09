"use client";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function Checkbox({ checked, onChange, label, disabled, size = "md" }: CheckboxProps) {
  const box = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const hit = size === "sm" ? "h-9 w-9" : "h-11 w-11";

  return (
    <label
      className={`checkbox-cell cursor-pointer ${hit} ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
        aria-label={label}
      />
      <span
        className={`flex ${box} items-center justify-center rounded-[6px] border-2 transition-all duration-150 ${
          checked
            ? "scale-100 border-accent bg-accent text-white shadow-sm shadow-accent/25"
            : "scale-95 border-border bg-surface hover:border-accent/50 hover:scale-100"
        }`}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2 6L5 9L10 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </label>
  );
}
