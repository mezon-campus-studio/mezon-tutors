"use client";

import { Heart } from "lucide-react";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import type { MouseEvent } from "react";
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
  saveLabel?: string;
  savedLabel?: string;
  layout?: "button" | "stat";
  statSubtitle?: string;
  statSavedSubtitle?: string;
};

export function SaveTutorButton({
  tutorId,
  isSaved = false,
  disabled = false,
  className,
  iconOnly = false,
  saveLabel,
  savedLabel,
  layout = "button",
  statSubtitle,
  statSavedSubtitle,
}: SaveTutorButtonProps) {
  const t = useTranslations("Tutors.SaveTutor");
  const user = useAtomValue(userAtom);
  const saveTutor = useSaveTutorMutation();
  const unsaveTutor = useUnsaveTutorMutation();
  const canSave = Boolean(user?.id);
  const { data: savedTutors } = useGetSavedTutors(canSave);
  const savedFromCache = savedTutors?.some((tutor) => tutor.id === tutorId);
  const saved = savedFromCache ?? isSaved;
  const isPending = saveTutor.isPending || unsaveTutor.isPending;

  const label = saved ? (savedLabel ?? t("saved")) : (saveLabel ?? t("save"));
  const subtitle = saved
    ? (statSavedSubtitle ?? t("saved"))
    : (statSubtitle ?? t("save"));

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!canSave) return;
    if (saved) {
      unsaveTutor.mutate(tutorId);
    } else {
      saveTutor.mutate(tutorId);
    }
  };

  if (layout === "stat") {
    return (
      <button
        type="button"
        disabled={disabled || isPending || !canSave}
        title={!canSave ? t("loginHint") : label}
        aria-label={label}
        aria-pressed={saved}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left transition-colors sm:px-6",
          canSave && !disabled && !isPending
            ? "cursor-pointer hover:bg-violet-50/60"
            : "cursor-default",
          className,
        )}
        onClick={handleClick}
      >
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            saved
              ? "bg-violet-600 text-white"
              : "bg-violet-50 text-violet-600",
          )}
        >
          <Heart className={cn("size-5", saved ? "fill-current" : "")} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900 sm:text-base">
            {label}
          </p>
          <p className="truncate text-xs text-gray-500 sm:text-sm">{subtitle}</p>
        </div>
      </button>
    );
  }

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
      onClick={handleClick}
    >
      <Heart className={cn("size-4", saved ? "fill-current" : "")} />
      {iconOnly ? null : <span className="ml-1.5">{label}</span>}
    </Button>
  );
}
