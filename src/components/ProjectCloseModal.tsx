"use client";

interface ProjectCloseModalProps {
  open: boolean;
  projectName: string;
  onClose: () => void;
  onSubmit: (paymentReceived: boolean) => Promise<void>;
}

export function ProjectCloseModal({
  open,
  projectName,
  onClose,
  onSubmit,
}: ProjectCloseModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-ink">Close project</h2>
        <p className="mt-2 text-sm text-muted">
          Close <span className="font-medium text-ink">{projectName}</span>? The linked client
          in Daily client update will move to{" "}
          <span className="font-medium">Payment due</span> or{" "}
          <span className="font-medium">Closed</span> based on payment status.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => onSubmit(false)}
            className="btn-ghost flex-1 !min-h-11 text-sm"
          >
            Close — payment pending
          </button>
          <button
            type="button"
            onClick={() => onSubmit(true)}
            className="btn-primary flex-1 !min-h-11 text-sm"
          >
            Close — payment received
          </button>
        </div>
        <button type="button" onClick={onClose} className="mt-3 w-full text-xs text-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
