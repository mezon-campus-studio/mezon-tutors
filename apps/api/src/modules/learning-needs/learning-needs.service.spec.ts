import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ELearningNeedsSyncStatus, EPaymentStatus, ETrialLessonStatus } from '@mezon-tutors/db';
import type { LearningNeedsAnswersV1 } from '@mezon-tutors/shared';
import { describe, expect, it, vi } from 'vitest';
import { LearningNeedsService } from './learning-needs.service';

const answers: LearningNeedsAnswersV1 = {
  schemaVersion: 1 as const,
  learningGoal: 'CAREER_BUSINESS' as const,
  usageSituations: [],
  focusAreas: [],
  currentLevel: null,
  workContext: null,
  industryKnowledgeRequired: null,
  industryContext: null,
  lessonsPerMonth: null,
  preferredWeekdays: [],
  preferredTimeWindows: [],
  timezone: 'Asia/Ho_Chi_Minh',
  nativeLanguage: null,
  otherLanguages: [],
  interests: [],
};

function booking(learningGoal: 'CAREER_BUSINESS' | null = 'CAREER_BUSINESS', hasRecord = true) {
  const now = new Date('2026-11-06T00:00:00.000Z');
  return {
    id: 'booking-1',
    tutorId: 'tutor-profile-1',
    studentId: 'student-1',
    startAt: now,
    durationMinutes: 60,
    status: ETrialLessonStatus.CONFIRMED,
    grossAmount: 1n,
    platformFee: 0n,
    tutorAmount: 1n,
    deductAmount: 0n,
    currency: 'VND',
    paymentStatus: EPaymentStatus.SUCCEEDED,
    idempotencyKey: null,
    paymentRef: null,
    paymentUrl: null,
    paidAt: now,
    failedAt: null,
    refundedAt: null,
    cancelReason: null,
    cancelMessage: null,
    createdAt: now,
    updatedAt: now,
    tutor: {
      id: 'tutor-profile-1',
      userId: 'tutor-user-1',
      firstName: 'Ada',
      lastName: 'Tutor',
      subject: 'English',
      user: { avatar: '', mezonUserId: 'mezon-tutor' },
    },
    student: { mezonUserId: 'mezon-student' },
    learningNeeds: hasRecord
      ? {
          id: 'needs-1',
          trialLessonBookingId: 'booking-1',
          studentId: 'student-1',
          tutorProfileId: 'tutor-profile-1',
          subjectSnapshot: 'English',
          draftAnswers: { ...answers, learningGoal },
          draftRevision: 1,
          sharedAnswers: learningGoal ? answers : null,
          sharedFromDraftRevision: learningGoal ? 1 : null,
          sharedRevision: learningGoal ? 1 : 0,
          sharedAt: learningGoal ? now : null,
          userDmChannelId: null,
          syncStatus: ELearningNeedsSyncStatus.NOT_REQUIRED as ELearningNeedsSyncStatus,
          syncAttempts: 0,
          lastSyncError: null as string | null,
          lastSyncAttemptAt: null as Date | null,
          createdAt: now,
          updatedAt: now,
          userDmChannel: null,
        }
      : null,
  };
}

describe('LearningNeedsService authorization and snapshots', () => {
  it('never exposes the private draft to the intended tutor', async () => {
    const prisma = {
      trialLessonBooking: { findUnique: async () => booking() },
    };
    const service = new LearningNeedsService(prisma as never);

    const result = await service.getForBooking('tutor-user-1', 'booking-1');

    expect(result.canEdit).toBe(false);
    expect(result.draft).toBeNull();
    expect(result.shared?.revision).toBe(1);
    expect(result.sync).toEqual({
      status: 'NOT_REQUIRED',
      attempts: 0,
      lastAttemptAt: null,
      lastError: null,
    });
  });

  it('exposes a sanitized synchronization failure without leaking the provider error', async () => {
    const currentBooking = booking();
    if (!currentBooking.learningNeeds) throw new Error('Expected learning-needs fixture');
    currentBooking.learningNeeds.syncStatus = ELearningNeedsSyncStatus.FAILED;
    currentBooking.learningNeeds.syncAttempts = 2;
    currentBooking.learningNeeds.lastSyncError =
      'Authorization: Bearer secret-token; Mezon gateway timeout';
    currentBooking.learningNeeds.lastSyncAttemptAt = new Date('2026-11-06T01:02:03.000Z');
    const prisma = {
      trialLessonBooking: { findUnique: async () => currentBooking },
    };
    const service = new LearningNeedsService(prisma as never);

    const result = await service.getForBooking('student-1', 'booking-1');

    expect(result.sync).toEqual({
      status: 'FAILED',
      attempts: 2,
      lastAttemptAt: '2026-11-06T01:02:03.000Z',
      lastError: 'MEZON_SYNC_FAILED',
    });
    expect(JSON.stringify(result)).not.toContain('secret-token');
    expect(JSON.stringify(result)).not.toContain('gateway timeout');
  });

  it('keeps a newer student draft isolated from the tutor while preserving the last shared snapshot', async () => {
    const currentBooking = booking();
    if (!currentBooking.learningNeeds) throw new Error('Expected learning-needs fixture');
    currentBooking.learningNeeds.draftRevision = 2;
    currentBooking.learningNeeds.draftAnswers = {
      ...answers,
      learningGoal: 'CAREER_BUSINESS',
      workContext: 'Private revision',
    };
    currentBooking.learningNeeds.sharedAnswers = {
      ...answers,
      learningGoal: 'CAREER_BUSINESS',
      workContext: 'Previously shared revision',
    };
    const prisma = {
      trialLessonBooking: { findUnique: async () => currentBooking },
    };
    const service = new LearningNeedsService(prisma as never);

    const studentResult = await service.getForBooking('student-1', 'booking-1');
    const tutorResult = await service.getForBooking('tutor-user-1', 'booking-1');

    expect(studentResult.draft?.answers.workContext).toBe('Private revision');
    expect(tutorResult.draft).toBeNull();
    expect(tutorResult.shared?.answers.workContext).toBe('Previously shared revision');
  });

  it('hides a booking from unrelated authenticated users', async () => {
    const prisma = {
      trialLessonBooking: { findUnique: async () => booking() },
    };
    const service = new LearningNeedsService(prisma as never);

    await expect(service.getForBooking('unrelated-user', 'booking-1')).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('rejects sharing a draft without a learning goal', async () => {
    const prisma = {
      trialLessonBooking: { findUnique: async () => booking(null) },
    };
    const service = new LearningNeedsService(prisma as never);

    await expect(service.share('student-1', 'booking-1', 1)).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it('rejects channel reads for non-members without leaking state', async () => {
    const prisma = {
      userDmChannel: { findFirst: async () => null },
    };
    const service = new LearningNeedsService(prisma as never);

    await expect(
      service.getCurrentForChannel('unrelated-user', 'channel-1')
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('loads the latest shared snapshot from the server for both members of the mapped chat', async () => {
    const current = booking();
    if (!current.learningNeeds) throw new Error('Expected learning-needs fixture');
    const findShared = vi.fn().mockResolvedValue({
      ...current.learningNeeds,
      tutor: current.tutor,
    });
    const prisma = {
      userDmChannel: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'channel-db-id',
          senderId: 'student-1',
          recipientId: 'tutor-user-1',
          channelId: 'channel-1',
        }),
      },
      learningNeeds: { findFirst: findShared, updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };
    const service = new LearningNeedsService(prisma as never);

    const studentPin = await service.getCurrentForChannel('student-1', 'channel-1');
    const tutorPin = await service.getCurrentForChannel('tutor-user-1', 'channel-1');

    expect(studentPin).toMatchObject({ state: 'SHARED', canEdit: true });
    expect(tutorPin).toMatchObject({ state: 'SHARED', canEdit: false });
    expect(studentPin.shared).toEqual(tutorPin.shared);
    expect(findShared).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userDmChannelId: 'channel-db-id',
          syncStatus: ELearningNeedsSyncStatus.SYNCED,
          sharedAt: { not: null },
        },
        orderBy: { sharedAt: 'desc' },
      })
    );
  });

  it('reuses previously saved answers as an editable starting point without sharing with a new tutor', async () => {
    const priorAnswers = {
      ...answers,
      learningGoal: 'PERSONAL_DEVELOPMENT' as const,
      nativeLanguage: 'Vietnamese',
      timezone: 'Asia/Ho_Chi_Minh',
      interests: ['READING' as const],
    };

    const prisma = {
      trialLessonBooking: {
        findUnique: async () => booking('CAREER_BUSINESS', false), // hasRecord = false
      },
      learningNeeds: {
        findFirst: async () => ({
          id: 'prior-needs-id',
          draftAnswers: priorAnswers,
          sharedAnswers: priorAnswers,
          updatedAt: new Date('2026-11-05T00:00:00.000Z'),
        }),
      },
    };
    const service = new LearningNeedsService(prisma as never);

    // When student visits a new booking:
    const studentResult = await service.getForBooking('student-1', 'booking-1');
    expect(studentResult.canEdit).toBe(true);
    expect(studentResult.draft).not.toBeNull();
    expect(studentResult.draft?.revision).toBe(0);
    expect(studentResult.draft?.answers.nativeLanguage).toBe('Vietnamese');
    expect(studentResult.draft?.answers.learningGoal).toBe('PERSONAL_DEVELOPMENT');
    expect(studentResult.shared).toBeNull(); // Crucial: NOT shared automatically!

    // When the new tutor visits that same booking:
    const tutorResult = await service.getForBooking('tutor-user-1', 'booking-1');
    expect(tutorResult.canEdit).toBe(false);
    expect(tutorResult.draft).toBeNull(); // Tutor cannot see student's unshared draft
    expect(tutorResult.shared).toBeNull(); // Tutor sees nothing shared yet
  });

  it('reuses only global preferences when the previous answers belong to another subject', async () => {
    const mathBooking = booking('CAREER_BUSINESS', false);
    mathBooking.tutor.subject = 'Mathematics';
    const priorAnswers: LearningNeedsAnswersV1 = {
      ...answers,
      learningGoal: 'EXAMS_CERTIFICATIONS',
      usageSituations: ['MEETINGS'],
      focusAreas: ['VOCABULARY'],
      currentLevel: 'CONVERSATIONAL',
      workContext: 'English sales calls',
      industryKnowledgeRequired: true,
      industryContext: 'Fintech',
      lessonsPerMonth: 8,
      preferredWeekdays: ['MON'],
      nativeLanguage: 'Vietnamese',
      interests: ['SCIENCE'],
    };
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ draftAnswers: priorAnswers, sharedAnswers: priorAnswers });
    const prisma = {
      trialLessonBooking: { findUnique: async () => mathBooking },
      learningNeeds: { findFirst },
    };
    const service = new LearningNeedsService(prisma as never);

    const result = await service.getForBooking('student-1', 'booking-1');

    expect(result.draft?.answers).toMatchObject({
      learningGoal: null,
      usageSituations: [],
      focusAreas: [],
      currentLevel: null,
      workContext: null,
      industryKnowledgeRequired: null,
      industryContext: null,
      lessonsPerMonth: 8,
      preferredWeekdays: ['MON'],
      nativeLanguage: 'Vietnamese',
      interests: ['SCIENCE'],
    });
    expect(result.shared).toBeNull();
  });

  it('idempotently shares answers when already shared with the same draft revision', async () => {
    const currentBooking = booking('CAREER_BUSINESS', true);
    const prisma = {
      trialLessonBooking: { findUnique: async () => currentBooking },
      userDmChannel: { findUnique: async () => null },
    };
    const service = new LearningNeedsService(prisma as never);

    // Expected revision is 1, and sharedFromDraftRevision is already 1 with sharedAt set
    const result = await service.share('student-1', 'booking-1', 1);
    expect(result.shared?.revision).toBe(1);
  });

  it('publishes the current draft as a new immutable shared revision when resharing', async () => {
    const currentBooking = booking('CAREER_BUSINESS', true);
    if (!currentBooking.learningNeeds) throw new Error('Expected learning-needs fixture');
    currentBooking.learningNeeds.draftRevision = 2;
    currentBooking.learningNeeds.sharedFromDraftRevision = 1;
    currentBooking.learningNeeds.draftAnswers = {
      ...answers,
      learningGoal: 'CAREER_BUSINESS',
      workContext: 'New version for this tutor',
    };
    currentBooking.learningNeeds.sharedAnswers = {
      ...answers,
      learningGoal: 'CAREER_BUSINESS',
      workContext: 'Previously shared version',
    };
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      trialLessonBooking: { findUnique: async () => currentBooking },
      userDmChannel: { findUnique: async () => null },
      learningNeeds: { updateMany },
    };
    const service = new LearningNeedsService(prisma as never);

    await service.share('student-1', 'booking-1', 2);

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'needs-1', draftRevision: 2 }),
        data: expect.objectContaining({
          sharedAnswers: expect.objectContaining({ workContext: 'New version for this tutor' }),
          sharedFromDraftRevision: 2,
          sharedRevision: { increment: 1 },
          syncAttempts: 0,
          lastSyncError: null,
        }),
      })
    );
  });

  it('rejects saveDraft with conflicting draft revision', async () => {
    const currentBooking = booking('CAREER_BUSINESS', true);
    const prisma = {
      trialLessonBooking: { findUnique: async () => currentBooking },
      userDmChannel: { findUnique: async () => null },
    };
    const service = new LearningNeedsService(prisma as never);

    await expect(
      service.saveDraft('student-1', 'booking-1', {
        answers,
        expectedDraftRevision: 999, // Mismatched revision
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects tutor draft writes and draft writes before successful payment', async () => {
    const paidBooking = booking();
    const pendingBooking = {
      ...booking(),
      paymentStatus: EPaymentStatus.PENDING,
    };
    const prisma = {
      trialLessonBooking: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(paidBooking)
          .mockResolvedValueOnce(pendingBooking),
      },
    };
    const service = new LearningNeedsService(prisma as never);

    await expect(
      service.saveDraft('tutor-user-1', 'booking-1', { answers })
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.saveDraft('student-1', 'booking-1', { answers })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it('rejects invalid IANA timezone during saveDraft', async () => {
    const currentBooking = booking('CAREER_BUSINESS', true);
    const prisma = {
      trialLessonBooking: { findUnique: async () => currentBooking },
      userDmChannel: { findUnique: async () => null },
    };
    const service = new LearningNeedsService(prisma as never);

    await expect(
      service.saveDraft('student-1', 'booking-1', {
        answers: { ...answers, timezone: 'Invalid/City_Name' },
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects channel association if channel participants do not match student and tutor', async () => {
    const prisma = {
      learningNeeds: {
        findUnique: async () => ({
          id: 'needs-1',
          studentId: 'student-1',
          tutor: { userId: 'tutor-user-1' },
          trialLessonBookingId: 'booking-1',
        }),
      },
      userDmChannel: {
        findUnique: async () => ({
          id: 'channel-db-id',
          channelId: 'channel-external-id',
          senderId: 'student-1',
          recipientId: 'someone-else', // Does not match tutor-user-1!
        }),
      },
    };
    const service = new LearningNeedsService(prisma as never);

    await expect(
      service.associateChannel('student-1', 'needs-1', { channelId: 'channel-external-id' })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records synchronization failure with a stable non-sensitive error code', async () => {
    const updateSpy = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      learningNeeds: {
        findUnique: async () => ({
          id: 'needs-1',
          studentId: 'student-1',
        }),
        updateMany: updateSpy,
      },
    };
    const service = new LearningNeedsService(prisma as never);

    const result = await service.recordSyncFailure('student-1', 'needs-1', 'Mezon gateway timeout');
    expect(result.ok).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith({
      where: {
        id: 'needs-1',
        studentId: 'student-1',
        userDmChannelId: null,
        sharedAt: { not: null },
      },
      data: expect.objectContaining({
        syncStatus: ELearningNeedsSyncStatus.FAILED,
        lastSyncError: 'MEZON_SYNC_FAILED',
      }),
    });
  });

  it('does not overwrite a channel association that completed before a late failure report', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const prisma = {
      learningNeeds: {
        findUnique: async () => ({
          id: 'needs-1',
          studentId: 'student-1',
        }),
        updateMany,
      },
    };
    const service = new LearningNeedsService(prisma as never);

    const result = await service.recordSyncFailure('student-1', 'needs-1', 'Late timeout');

    expect(result.ok).toBe(true);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'needs-1',
          userDmChannelId: null,
        }),
      })
    );
  });
});
