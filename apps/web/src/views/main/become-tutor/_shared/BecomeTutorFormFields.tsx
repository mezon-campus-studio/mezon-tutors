"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui";
import { cn } from "@/lib/utils";

type BecomeTutorRequiredNoteProps = {
  className?: string;
  variant?: "text" | "chip";
};

export function BecomeTutorRequiredNote({
  className,
  variant = "text",
}: BecomeTutorRequiredNoteProps) {
  const t = useTranslations("BecomeTutor.shell");

  if (variant === "chip") {
    return (
      <p
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-rose-100/80 bg-[linear-gradient(110deg,#fff1f2,#fdf2f8)] px-3 py-1.5 text-[11px] leading-none text-slate-600 shadow-sm shadow-rose-100/50 sm:text-xs",
          className,
        )}
      >
        <span
          aria-hidden
          className="flex size-4 shrink-0 items-center justify-center text-[10px] font-extrabold text-rose-600"
        >
          *
        </span>
        <span>{t("requiredNote")}</span>
      </p>
    );
  }

  return (
    <p className={cn("text-xs text-slate-500", className)}>
      <span className="font-semibold text-rose-500">*</span> {t("requiredNote")}
    </p>
  );
}

type BecomeTutorFieldLabelProps = {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function BecomeTutorFieldLabel({
  htmlFor,
  required = false,
  children,
  className,
}: BecomeTutorFieldLabelProps) {
  return (
    <Label
      htmlFor={htmlFor}
      className={cn("text-xs font-semibold text-slate-700", className)}
    >
      {children}
      {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
    </Label>
  );
}
