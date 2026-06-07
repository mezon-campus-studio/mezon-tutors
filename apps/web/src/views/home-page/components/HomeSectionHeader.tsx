"use client";

import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

type HomeSectionHeaderProps = {
  badge: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  align?: "center" | "left";
  className?: string;
};

export default function HomeSectionHeader({
  badge,
  title,
  description,
  icon: Icon,
  align = "center",
  className,
}: HomeSectionHeaderProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "mb-14 max-w-2xl space-y-3",
        centered ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      <Badge
        className={cn(
          "h-auto rounded-full border border-violet-200/80 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-violet-700 shadow-sm shadow-violet-100/50 backdrop-blur-sm",
          centered && "mx-auto",
        )}
      >
        {Icon ? <Icon className="mr-1.5 inline size-3.5" /> : null}
        {badge}
      </Badge>
      <h2 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="text-base leading-7 text-slate-600">{description}</p>
      ) : null}
    </div>
  );
}
