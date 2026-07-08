import type { TutorAboutDto, TutorResumeDto, TutorReviewsDto } from '@mezon-tutors/shared';
import { serverFetch } from '@/services/api-server';

const BASE = '/tutor-profiles';

export async function fetchTutorAboutById(id: string): Promise<TutorAboutDto | null> {
  return serverFetch<TutorAboutDto>(`${BASE}/${id}/about`);
}

export async function fetchTutorResumeById(id: string): Promise<TutorResumeDto | null> {
  return serverFetch<TutorResumeDto>(`${BASE}/${id}/resume`);
}

export async function fetchTutorReviewsById(id: string): Promise<TutorReviewsDto | null> {
  return serverFetch<TutorReviewsDto>(`${BASE}/${id}/reviews`);
}
