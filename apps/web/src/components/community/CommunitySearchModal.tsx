'use client';

import { useTranslations } from 'next-intl';
import { Search, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui';
import { useCommunitySearch } from '@/services';
import { CommunityPostCard } from './CommunityPostCard';

type CommunitySearchModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommunitySearchModal({ open, onOpenChange }: CommunitySearchModalProps) {
  const t = useTranslations('Community.feed');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    if (open) {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const isSearching = debouncedQuery.trim().length > 0;

  const { data, isFetching } = useCommunitySearch(
    {
      q: debouncedQuery.trim() || undefined,
      page: 1,
      limit: 20,
    },
    isSearching,
  );

  const results = data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden gap-0 rounded-3xl p-0">
        <div className="flex items-center border-b border-neutral-200 px-4 py-3">
          <Search className="mr-3 size-5 shrink-0 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchByKeyword')}
            className="flex-1 text-sm outline-none placeholder:text-neutral-400"
            autoFocus
          />
          {isFetching ? (
            <Loader2 className="size-4 animate-spin shrink-0 text-primary" />
          ) : null}
        </div>
        <div className="max-h-[65vh] overflow-y-auto">
          {results.length > 0 ? (
            <div className="divide-y divide-neutral-100">
              {results.map((post) => (
                <CommunityPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-20">
              {isFetching ? (
                <Loader2 className="size-8 animate-spin text-neutral-300" />
              ) : isSearching ? (
                <>
                  <Search className="mb-4 size-10 text-neutral-200" />
                  <p className="text-sm text-neutral-400">No results found</p>
                </>
              ) : (
                <>
                  <Search className="mb-4 size-10 text-neutral-200" />
                  <p className="text-sm text-neutral-400">Type to search posts</p>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
