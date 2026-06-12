"use client"

import { cn } from "@/lib/utils"
import { Loader2Icon } from "lucide-react"
import { useId } from "react"


const GRADIENT_STOPS = [
  { offset: "0%", color: "#7c3aed" },
  { offset: "50%", color: "#9333ea" },
  { offset: "100%", color: "#db2777" },
] as const;

function Spinner({
  className,
  stroke,
  "aria-label": ariaLabel = "Loading",
  ...props
}: React.ComponentProps<typeof Loader2Icon>) {
  const gradientId = useId();

  return (
    <>
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
      <Loader2Icon
        aria-label={ariaLabel}
        stroke={stroke ?? `url(#${gradientId})`}
        className={cn("size-4 animate-spin", className)}
        {...props}
      />
    </>
  )
}

export { Spinner }
