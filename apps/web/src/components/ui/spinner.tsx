"use client"

import { cn } from "@/lib/utils"
import { Loader2Icon } from "lucide-react"
import { useId } from "react"


const GRADIENT_STOPS = [
  { offset: "0%", color: "#8332FF" },
  { offset: "100%", color: "#7022E8" },
] as const;

type SpinnerProps = React.ComponentProps<typeof Loader2Icon> & {
  gradient?: boolean;
};

function Spinner({
  className,
  stroke,
  gradient = false,
  "aria-label": ariaLabel = "Loading",
  ...props
}: SpinnerProps) {
  const gradientId = useId();
  const resolvedStroke =
    stroke ?? (gradient ? `url(#${gradientId})` : "currentColor");

  return (
    <>
      {gradient && !stroke ? (
        <svg aria-hidden className="absolute size-0 overflow-hidden">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              {GRADIENT_STOPS.map((stop) => (
                <stop
                  key={stop.offset}
                  offset={stop.offset}
                  stopColor={stop.color}
                />
              ))}
            </linearGradient>
          </defs>
        </svg>
      ) : null}
      <Loader2Icon
        aria-label={ariaLabel}
        stroke={resolvedStroke}
        className={cn("size-4 animate-spin", className)}
        {...props}
      />
    </>
  )
}

export { Spinner }
