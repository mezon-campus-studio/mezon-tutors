"use client";

import { Heart } from "lucide-react";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { useGetSavedTutors, useSaveTutorMutation, useUnsaveTutorMutation } from "@/services";
import { userAtom } from "@/store/auth.atom";
import { cn } from "@/lib/utils";

type SaveTutorButtonProps = {
  tutorId: string;
  isSaved?: boolean;
  disabled?: boolean;
  className?: string;
  iconOnly?: boolean;
};

export function SaveTutorButton({
  tutorId,
  isSaved = false,
  disabled = false,
  className,
  iconOnly = false,
}: SaveTutorButtonProps) {
  const t = useTranslations("Tutors.SaveTutor");
  const user = useAtomValue(userAtom);
  const saveTutor = useSaveTutorMutation();
  const unsaveTutor = useUnsaveTutorMutation();
  const canSave = Boolean(user?.id) && user?.role === "STUDENT";
  const { data: savedTutors } = useGetSavedTutors(canSave);
  const savedFromCache = savedTutors?.some((tutor) => tutor.id === tutorId);
  const saved = savedFromCache ?? isSaved;
  const isPending = saveTutor.isPending || unsaveTutor.isPending;

  const label = saved ? t("saved") : t("save");

  return (
    <Button
      type="button"
      variant={saved ? "default" : "outline"}
      size={iconOnly ? "icon" : "sm"}
      disabled={disabled || isPending || !canSave}
      title={!canSave ? t("loginHint") : label}
      aria-label={label}
      className={cn(
        iconOnly
          ? "size-9 rounded-full"
          : "h-9 rounded-full px-3 text-xs font-semibold",
        saved
          ? "bg-violet-600 text-white hover:bg-violet-700"
          : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50 hover:text-violet-800",
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        if (!canSave) return;
        if (saved) {
          unsaveTutor.mutate(tutorId);
        } else {
          saveTutor.mutate(tutorId);
        }
      }}
    >
      <Heart className={cn("size-4", saved ? "fill-current" : "")} />
      {iconOnly ? null : <span className="ml-1.5">{label}</span>}
    </Button>
  );
}
