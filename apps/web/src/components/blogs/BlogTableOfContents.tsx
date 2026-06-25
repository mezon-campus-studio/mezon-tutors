"use client";

import { ChevronDown } from "lucide-react";
import type { TocItem } from "@/lib/blog-toc";
import { cn } from "@/lib/utils";

type BlogTableOfContentsProps = {
  items: TocItem[];
  activeId: string | null;
  onItemClick: (id: string) => void;
  title: string;
  variant?: "desktop" | "mobile";
  className?: string;
};

function TocLinks({
  items,
  activeId,
  onItemClick,
  variant = "desktop",
}: Pick<
  BlogTableOfContentsProps,
  "items" | "activeId" | "onItemClick" | "variant"
>) {
  return (
    <ul
      className={cn(
        "border-slate-200",
        variant === "desktop" && "border-l",
        variant === "mobile" && "ml-1 border-l pl-1",
      )}
    >
      {items.map((item) => {
        const isActive = activeId === item.id;

        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onItemClick(item.id)}
              className={cn(
                "cursor-pointer relative block w-full border-l-2 py-1.5 text-left text-sm leading-snug transition-[color,border-color] duration-200",
                item.level === 2 && "pl-3.5",
                item.level === 3 && "pl-6",
                isActive
                  ? "border-violet-600 font-medium text-violet-700"
                  : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              {item.text}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function BlogTableOfContents({
  items,
  activeId,
  onItemClick,
  title,
  variant = "desktop",
  className,
}: BlogTableOfContentsProps) {
  if (items.length === 0) return null;

  if (variant === "mobile") {
    return (
      <details
        className={cn(
          "group rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-sm",
          className,
        )}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-bold text-violet-700 [&::-webkit-details-marker]:hidden">
          <span>{title}</span>
          <ChevronDown className="size-4 shrink-0 text-violet-700 transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <nav
          aria-label={title}
          className="max-h-52 overflow-y-auto border-t border-slate-100 px-4 py-3"
        >
          <TocLinks
            items={items}
            activeId={activeId}
            onItemClick={onItemClick}
            variant="mobile"
          />
        </nav>
      </details>
    );
  }

  return (
    <aside
      className={cn(
        "absolute top-0 bottom-0 right-full hidden w-64 pr-6 xl:block",
        className,
      )}
    >
      <nav
        aria-label={title}
        className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <p className="mb-3 pl-3.5 text-md font-bold uppercase tracking-[0.12em] text-violet-700">
          {title}
        </p>
        <TocLinks
          items={items}
          activeId={activeId}
          onItemClick={onItemClick}
          variant="desktop"
        />
      </nav>
    </aside>
  );
}
