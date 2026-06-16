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
  const hit = size === "sm" ? "h-10 w-10" : "h-11 w-11";

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`checkbox-cell flex shrink-0 items-center justify-center rounded-lg ${hit} ${
        disabled ? "pointer-events-none opacity-50" : ""
      }`}
      style={{ touchAction: "manipulation" }}
    >
      <span
        className={`flex ${box} items-center justify-center rounded-[6px] border-2 transition-colors duration-150 ${
          checked
            ? "border-accent bg-accent text-white shadow-sm shadow-accent/25"
            : "border-border bg-surface"
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
    </button>
  );
}
