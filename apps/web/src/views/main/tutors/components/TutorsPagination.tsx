"use client";

import type { ReactNode } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui";
import { useTranslations } from "next-intl";

type TutorsPaginationProps = {
  page: number;
  totalPages: number;
  isFetching?: boolean;
  onPageChangeAction: (nextPage: number) => void;
};

export default function TutorsPagination({
  page,
  totalPages,
  isFetching = false,
  onPageChangeAction,
}: TutorsPaginationProps) {
  const t = useTranslations("Tutors.Pagination");

  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const pushUnique = (p: number) => {
    if (p < 1 || p > totalPages) return;
    if (!pages.includes(p)) pages.push(p);
  };

  pushUnique(1);
  pushUnique(page - 1);
  pushUnique(page);
  pushUnique(page + 1);
  pushUnique(totalPages);
  pages.sort((a, b) => a - b);

  const items: ReactNode[] = [];
  let last = 0;
  for (const p of pages) {
    if (last && p - last > 1) {
      items.push(
        <PaginationItem key={`ellipsis-${last}`}>
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    items.push(
      <PaginationItem key={`page-${p}`}>
        <PaginationLink
          href="#"
          isActive={p === page}
          onClick={(e) => {
            e.preventDefault();
            if (isFetching) return;
            onPageChangeAction(p);
          }}
        >
          {p}
        </PaginationLink>
      </PaginationItem>
    );
    last = p;
  }

  return (
    <Pagination>
      <PaginationContent>
        {page > 1 ? (
          <PaginationItem>
            <PaginationPrevious
              href="#"
              text={t("previous")}
              onClick={(e) => {
                e.preventDefault();
                if (isFetching) return;
                onPageChangeAction(page - 1);
              }}
            />
          </PaginationItem>
        ) : null}

        {items}

        {page < totalPages ? (
          <PaginationItem>
            <PaginationNext
              href="#"
              text={t("next")}
              onClick={(e) => {
                e.preventDefault();
                if (isFetching) return;
                onPageChangeAction(page + 1);
              }}
            />
          </PaginationItem>
        ) : null}
      </PaginationContent>
    </Pagination>
  );
}
