"use client";

import { cn } from "@/lib/utils";
import { useInView } from "@/views/home-page/hooks/useInView";
import type { ReactNode } from "react";

type EventRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
  threshold?: number;
};

export function EventReveal({
  children,
  className,
  delay = 0,
  direction = "up",
  threshold = 0.12,
}: EventRevealProps) {
  const { ref, isInView } = useInView({ threshold });

  const hiddenOffset =
    direction === "left"
      ? "-translate-x-10"
      : direction === "right"
        ? "translate-x-10"
        : "translate-y-10";

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        isInView
          ? "translate-x-0 translate-y-0 opacity-100"
          : cn(
              hiddenOffset,
              "opacity-0 motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100",
            ),
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

type HeroEnterProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function HeroEnter({ children, className, delay = 0 }: HeroEnterProps) {
  return (
    <div
      className={cn(
        "motion-safe:[animation:event-detail-hero-in_1s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:opacity-100",
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
