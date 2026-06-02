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
  onConfirm,
  emailNote,
  onEmailNoteChange,
  emailNoteLabel,
  emailNotePlaceholder,
}: ConfirmDialogProps) {
  const showEmailNote = onEmailNoteChange !== undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {showEmailNote ? (
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
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
