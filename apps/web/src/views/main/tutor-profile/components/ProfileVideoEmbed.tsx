'use client';

import { parseYouTubeId } from '@mezon-tutors/shared';
import { Video } from 'lucide-react';
import { useMemo } from 'react';

export function getProfileVideoEmbedSrc(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const youtubeId = parseYouTubeId(trimmed);
  if (youtubeId) {
    return `https://www.youtube.com/embed/${youtubeId}?rel=0`;
  }

  return null;
}

type ProfileVideoEmbedProps = {
  url: string;
  placeholder?: string;
};

export default function ProfileVideoEmbed({ url, placeholder }: ProfileVideoEmbedProps) {
  const embedSrc = useMemo(() => getProfileVideoEmbedSrc(url), [url]);

  return (
    <div
      className="relative aspect-video w-full min-h-[200px] overflow-hidden rounded-2xl border border-violet-100 bg-[linear-gradient(135deg,#faf7ff,#fdf2f8)]"
      aria-label="Video preview"
    >
      {embedSrc ? (
        <iframe
          src={embedSrc}
          title="Profile video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-gradient-135 text-white shadow-md shadow-violet-300/40">
            <Video className="size-6" />
          </div>
          {placeholder ? (
            <p className="max-w-xs text-center text-xs text-slate-500 sm:text-sm">{placeholder}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
