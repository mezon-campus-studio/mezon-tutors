import { parseYouTubeId } from '../constants/tutor-profile';
import type { TutorProfileVideoId } from '../types/tutor-profile';

export function isCloudinaryVideoUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.hostname.includes('res.cloudinary.com') && parsed.pathname.includes('/video/');
  } catch {
    return false;
  }
}

export function resolveVideoIdFromUrl(url: string): TutorProfileVideoId | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const youtubeId = parseYouTubeId(trimmed);
  if (youtubeId) {
    return { type: 'youtube', id: youtubeId };
  }

  if (isCloudinaryVideoUrl(trimmed)) {
    return { type: 'cloudinary', id: trimmed };
  }

  return null;
}
