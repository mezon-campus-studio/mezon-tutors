"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Spinner,
  Textarea,
} from "@/components/ui";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  loadingMessage?: string;
  onConfirm: () => void;
  emailNote?: string;
  onEmailNoteChange?: (value: string) => void;
  emailNoteLabel?: string;
  emailNotePlaceholder?: string;
};

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "default",
  loading,
  loadingMessage,
  onConfirm,
  emailNote,
  onEmailNoteChange,
  emailNoteLabel,
  emailNotePlaceholder,
}: ConfirmDialogProps) {
  const showEmailNote = onEmailNoteChange !== undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && loading) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {loading && loadingMessage ? (
          <div className="flex items-start gap-2 rounded-lg border border-violet-100 bg-violet-50 px-3 py-3 text-sm text-violet-900">
            <Spinner className="mt-0.5 size-4 shrink-0 text-violet-600" />
            <p>{loadingMessage}</p>
          </div>
        ) : null}
        {showEmailNote && !loading ? (
          <div className="space-y-2">
            <Label htmlFor="tutor-application-email-note">{emailNoteLabel}</Label>
            <Textarea
              id="tutor-application-email-note"
              rows={3}
              value={emailNote ?? ""}
              placeholder={emailNotePlaceholder}
              onChange={(e) => onEmailNoteChange(e.target.value)}
              disabled={loading}
            />
          </div>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Spinner className="mr-2 size-4" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
