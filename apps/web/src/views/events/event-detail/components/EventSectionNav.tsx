"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type EventSectionNavProps = {
  hasSpeakers: boolean;
};

const NAV_ITEMS = (hasSpeakers: boolean) =>
  [
    { href: "#about", labelKey: "sections.nav.about" as const },
    ...(hasSpeakers
      ? [{ href: "#speakers", labelKey: "sections.nav.featured" as const }]
      : []),
    { href: "#register", labelKey: "sections.nav.register" as const },
    { href: "#share", labelKey: "sections.nav.share" as const },
  ] as const;

export function EventSectionNav({ hasSpeakers }: EventSectionNavProps) {
  const t = useTranslations("Events.detail");
  const items = NAV_ITEMS(hasSpeakers);

  return (
    <nav
      aria-label="Event sections"
      className="sticky top-[4.5rem] z-40 border-b border-violet-100/90 bg-white/90 shadow-sm shadow-violet-100/30 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6 py-2.5 lg:px-10">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold text-slate-600 transition-colors",
              "hover:bg-violet-50 hover:text-violet-700",
            )}
          >
            {t(item.labelKey)}
          </a>
        ))}
      </div>
    </nav>
  );
}
