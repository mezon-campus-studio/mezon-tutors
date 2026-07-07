"use client";

import { COMMUNITY_CONTENT_LIMITS, type CommunityTagDto } from "@mezon-tutors/shared";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useCommunityTags } from "@/services/community/community.api";

export type CommunityTagDraft = {
  id?: string;
  name: string;
};

type CommunityTagPickerProps = {
  value: CommunityTagDraft[];
  onChange: (tags: CommunityTagDraft[]) => void;
  disabled?: boolean;
};

function normalizeTagName(name: string) {
  return name.trim().toLowerCase();
}

function isSameTag(a: CommunityTagDraft, b: CommunityTagDraft) {
  const aNorm = normalizeTagName(a.name);
  const bNorm = normalizeTagName(b.name);
  if (a.id && b.id) return a.id === b.id;
  return aNorm === bNorm;
}

export function communityTagsToPayload(tags: CommunityTagDraft[]) {
  const tagIds = tags.filter((tag) => tag.id).map((tag) => tag.id!);
  const tagNames = tags.filter((tag) => !tag.id).map((tag) => tag.name.trim());
  return {
    tagIds: tagIds.length ? tagIds : undefined,
    tagNames: tagNames.length ? tagNames : undefined,
  };
}

export function communityTagsToDrafts(tags: CommunityTagDto[]): CommunityTagDraft[] {
  return tags.map((tag) => ({ id: tag.id, name: tag.name }));
}

export function CommunityTagPicker({ value, onChange, disabled }: CommunityTagPickerProps) {
  const t = useTranslations("Community.create.fields");
  const { data: availableTags = [] } = useCommunityTags();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();
  const normalizedQuery = normalizeTagName(query);

  const suggestions = useMemo(() => {
    if (!trimmedQuery) {
      return availableTags
        .filter((tag) => !value.some((s) => isSameTag(s, { id: tag.id, name: tag.name })))
        .slice(0, 8);
    }
    return availableTags
      .filter((tag) => {
        if (value.some((s) => isSameTag(s, { id: tag.id, name: tag.name }))) return false;
        return tag.name.toLowerCase().includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [availableTags, normalizedQuery, trimmedQuery, value]);

  const canCreateNew =
    trimmedQuery.length > 0 &&
    !value.some((tag) => normalizeTagName(tag.name) === normalizedQuery) &&
    !availableTags.some((tag) => normalizeTagName(tag.name) === normalizedQuery);

  const totalItems = suggestions.length + (canCreateNew ? 1 : 0);

  const addTag = useCallback(
    (tag: CommunityTagDraft) => {
      if (value.some((item) => isSameTag(item, tag))) return;
      onChange([...value, tag]);
      setQuery("");
      setOpen(false);
      setHighlightedIndex(-1);
    },
    [onChange, value],
  );

  const removeTag = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [onChange],
  );

  const close = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const visible = open && totalItems > 0;

  useEffect(() => {
    if (!visible) setHighlightedIndex(-1);
  }, [visible]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [close]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [close]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!visible) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      if (highlightedIndex < suggestions.length) {
        const tag = suggestions[highlightedIndex];
        addTag({ id: tag.id, name: tag.name });
      } else if (canCreateNew) {
        addTag({ name: trimmedQuery });
      }
    }
  };

  useEffect(() => {
    if (!visible || highlightedIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, visible]);

  return (
    <div ref={containerRef} className="space-y-2">
      <Label>{t("tags")}</Label>
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag, index) => (
          <Badge
            key={`${tag.id ?? tag.name}-${index}`}
            variant="secondary"
            className="gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700"
          >
            <span className="text-violet-700">#</span>{tag.name}
            {!disabled ? (
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="ml-0.5 rounded-sm p-0.5 opacity-60 transition-opacity hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            ) : null}
          </Badge>
        ))}
      </div>
      {!disabled ? (
        <div className="relative">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={t("addTagPlaceholder") ?? "Thêm tag..."}
            maxLength={COMMUNITY_CONTENT_LIMITS.tagName}
            className="h-8 border-violet-100 text-sm"
          />
          {visible ? (
            <div
              ref={listRef}
              className="absolute bottom-full z-50 mb-1 w-full overflow-hidden rounded-lg border bg-white py-1 shadow-md"
            >
              {suggestions.map((tag, index) => (
                <button
                  key={tag.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors",
                    highlightedIndex === index
                      ? "bg-violet-100 text-violet-900"
                      : "text-violet-700 hover:bg-violet-50",
                  )}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => addTag({ id: tag.id, name: tag.name })}
                >
                  <span className="text-violet-700">#</span>{tag.name}
                </button>
              ))}
              {canCreateNew ? (
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-sm transition-colors",
                    highlightedIndex === suggestions.length
                      ? "bg-violet-100 text-violet-900"
                      : "text-violet-700 hover:bg-violet-50",
                  )}
                  onMouseEnter={() => setHighlightedIndex(suggestions.length)}
                  onClick={() => addTag({ name: trimmedQuery })}
                >
                  <Plus className="size-3.5 shrink-0" />
                  <span>{t("createTag", { name: `#${trimmedQuery}` })}</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
