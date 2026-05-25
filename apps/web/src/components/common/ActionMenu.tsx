"use client";

import { useTranslations } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";

export type ActionMenuItem = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
};

type ActionMenuProps = {
  trigger: ReactElement;
  items: ActionMenuItem[];
};

export function ActionMenu({ trigger, items }: ActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {items.map((item, index) => (
          <DropdownMenuItem
            key={index}
            disabled={item.disabled}
            onClick={item.disabled ? undefined : item.onClick}
            variant={item.variant}
            className="flex items-center gap-2 px-3 py-2.5 cursor-pointer font-medium"
          >
            {item.icon}
            <span className="text-xs sm:text-sm">{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
