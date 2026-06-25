"use client";

import { BLOG_CONTENT_LIMITS, type BlogTagDto } from "@mezon-tutors/shared";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { Badge, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useBlogTags } from "@/services";

export type BlogTagDraft = {
  id?: string;
  name: string;
};

type BlogTagPickerProps = {
  value: BlogTagDraft[];
  onChange: (tags: BlogTagDraft[]) => void;
  disabled?: boolean;
};

function normalizeTagName(name: string) {
  return name.trim().toLowerCase();
}

function isSameTag(a: BlogTagDraft, b: BlogTagDraft) {
  const aNorm = normalizeTagName(a.name);
  const bNorm = normalizeTagName(b.name);
  if (a.id && b.id) return a.id === b.id;
  return aNorm === bNorm;
}

export function tagsToPayload(tags: BlogTagDraft[]) {
  const tagIds = tags.filter((tag) => tag.id).map((tag) => tag.id!);
  const tagNames = tags.filter((tag) => !tag.id).map((tag) => tag.name.trim());
  return {
    tagIds: tagIds.length ? tagIds : undefined,
    tagNames: tagNames.length ? tagNames : undefined,
  };
}

export function blogTagsToDrafts(tags: BlogTagDto[]): BlogTagDraft[] {
  return tags.map((tag) => ({ id: tag.id, name: tag.name }));
}

export function BlogTagPicker({ value, onChange, disabled }: BlogTagPickerProps) {
  const t = useTranslations("Blogs.create");
  const { data: availableTags = [], isLoading } = useBlogTags();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();
  const normalizedQuery = normalizeTagName(query);

  const suggestions = useMemo(() => {
    if (!trimmedQuery) {
      return availableTags
        .filter((tag) => !value.some((selected) => isSameTag(selected, { id: tag.id, name: tag.name })))
        .slice(0, 8);
    }

    return availableTags
      .filter((tag) => {
        if (value.some((selected) => isSameTag(selected, { id: tag.id, name: tag.name }))) {
          return false;
        }
        return tag.name.toLowerCase().includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [availableTags, normalizedQuery, trimmedQuery, value]);

  const exactMatch = useMemo(
    () => availableTags.find((tag) => normalizeTagName(tag.name) === normalizedQuery),
    [availableTags, normalizedQuery],
  );

  const canCreateNew =
    trimmedQuery.length > 0 &&
    trimmedQuery.length <= BLOG_CONTENT_LIMITS.tagName &&
    !value.some((tag) => normalizeTagName(tag.name) === normalizedQuery) &&
    !exactMatch;

  const addTag = (tag: BlogTagDraft) => {
    if (value.some((selected) => isSameTag(selected, tag))) return;
    onChange([...value, tag]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag: BlogTagDraft) => {
    onChange(value.filter((selected) => !isSameTag(selected, tag)));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!trimmedQuery) return;

      if (exactMatch) {
        addTag({ id: exactMatch.id, name: exactMatch.name });
        return;
      }

      if (canCreateNew) {
        addTag({ name: trimmedQuery });
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="blog-tags">{t("fields.tags")}</Label>

      <div
        ref={containerRef}
        className={cn(
          "rounded-xl border border-violet-100 bg-white p-3 shadow-sm transition-colors",
          open && "border-violet-200 ring-2 ring-violet-100",
          disabled && "opacity-60",
        )}
      >
        {value.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {value.map((tag) => (
              <Badge
                key={tag.id ?? tag.name}
                variant="secondary"
                className="gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-3 text-xs font-medium text-violet-800"
              >
                {tag.name}
                {!disabled ? (
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="cursor-pointer rounded-full p-0.5 text-violet-500 transition-colors hover:bg-violet-100 hover:text-violet-800"
                    aria-label={t("tags.remove", { name: tag.name })}
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="mb-3 text-xs text-slate-400">{t("tags.empty")}</p>
        )}

        <div className="relative">
          <Input
            ref={inputRef}
            id="blog-tags"
            value={query}
            disabled={disabled}
            placeholder={t("fields.tagsPlaceholder")}
            maxLength={BLOG_CONTENT_LIMITS.tagName}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={(e) => {
              if (containerRef.current?.contains(e.relatedTarget as Node)) return;
              setOpen(false);
            }}
            onKeyDown={handleKeyDown}
            className="border-violet-100 focus-visible:ring-violet-200"
          />

          {open && !disabled && (suggestions.length > 0 || canCreateNew) ? (
            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-violet-100 bg-white py-1 shadow-lg shadow-violet-100/60">
              {suggestions.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-violet-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag({ id: tag.id, name: tag.name })}
                >
                  <span>{tag.name}</span>
                  <span className="text-[11px] text-slate-400">
                    {t("tags.existing", { count: tag.postCount })}
                  </span>
                </button>
              ))}

              {canCreateNew ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 border-t border-violet-50 px-3 py-2 text-left text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag({ name: trimmedQuery })}
                >
                  <Plus className="size-4" />
                  {t("tags.create", { name: trimmedQuery })}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <p className="mt-2 text-[11px] text-slate-400">{t("tags.loading")}</p>
        ) : null}
      </div>
    </div>
  );
}
