import type { Prisma } from '@mezon-tutors/db';
import type { LessonComplaintAttachment } from '@mezon-tutors/shared';

export function parseLessonComplaintAttachments(
  value: Prisma.JsonValue | null | undefined
): LessonComplaintAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return [];
    }
    const url = 'url' in entry && typeof entry.url === 'string' ? entry.url : null;
    const publicId =
      'publicId' in entry && typeof entry.publicId === 'string'
        ? entry.publicId
        : 'public_id' in entry && typeof entry.public_id === 'string'
          ? entry.public_id
          : null;
    if (!url || !publicId) {
      return [];
    }
    return [{ url, public_id: publicId }];
  });
}

export function serializeLessonComplaintAttachments(
  attachments?: Array<{ url: string; publicId: string }>
): Prisma.InputJsonValue {
  if (!attachments?.length) {
    return [];
  }
  return attachments.map((item) => ({
    url: item.url.trim(),
    publicId: item.publicId.trim(),
  }));
}
