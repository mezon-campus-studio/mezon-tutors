export { PrismaClient, Prisma } from '@prisma/client';
export * from '@prisma/client';

/** Mirrors Prisma `ELessonChangeAction` — stable re-export without relying on generated client types. */
export const ELessonChangeAction = {
  CANCEL: 'CANCEL',
  RESCHEDULE: 'RESCHEDULE',
} as const;
export type ELessonChangeAction = (typeof ELessonChangeAction)[keyof typeof ELessonChangeAction];

/** Mirrors Prisma `ELessonChangeLessonType`. */
export const ELessonChangeLessonType = {
  TRIAL: 'TRIAL',
  SUBSCRIPTION: 'SUBSCRIPTION',
} as const;
export type ELessonChangeLessonType =
  (typeof ELessonChangeLessonType)[keyof typeof ELessonChangeLessonType];

/** Mirrors Prisma `ELessonChangeInitiatorRole`. */
export const ELessonChangeInitiatorRole = {
  STUDENT: 'STUDENT',
  TUTOR: 'TUTOR',
  SYSTEM: 'SYSTEM',
} as const;
export type ELessonChangeInitiatorRole =
  (typeof ELessonChangeInitiatorRole)[keyof typeof ELessonChangeInitiatorRole];
