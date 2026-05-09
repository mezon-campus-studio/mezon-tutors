export const dmChannelQueryKey = {
  byStudentAndTutor: (studentId: string, tutorId: string) =>
    ["dm-channel", "student-tutor", studentId, tutorId] as const,
} as const;
