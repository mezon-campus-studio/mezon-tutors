"use client";

import { cn } from "@/lib/utils";

type SectionCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function SectionCard({ children, className }: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-gray-200 bg-white p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}
