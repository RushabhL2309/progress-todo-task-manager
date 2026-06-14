"use client";

interface DeleteIconButtonProps {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  size?: "sm" | "md";
}

export function DeleteIconButton({
  label,
  disabled,
  onClick,
  className = "",
  size = "md",
}: DeleteIconButtonProps) {
  const dim = size === "sm" ? 14 : 15;
  const box = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex ${box} shrink-0 items-center justify-center rounded-full text-muted/55 transition-colors hover:bg-red-50 hover:text-red-600 active:bg-red-50 active:text-red-600 disabled:opacity-40 ${className}`}
      aria-label={label}
      title="Delete"
    >
      <svg width={dim} height={dim} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M3 4.5H13M6 4.5V3.25C6 2.56 6.56 2 7.25 2H8.75C9.44 2 10 2.56 10 3.25V4.5M6.25 7V11.25M9.75 7V11.25M4.5 4.5L5 13.25C5 13.94 5.56 14.5 6.25 14.5H9.75C10.44 14.5 11 13.94 11 13.25L11.5 4.5"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
