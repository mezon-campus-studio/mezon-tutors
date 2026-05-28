/** Cancel reasons from CancelLessonDialog (MyLessons.panels.lessons.cancellation). */
export function getStudentFacingCancelReasonLabel(
  t: (key: string) => string,
  reasonKey: string,
): string {
  const labels: Record<string, string> = {
    timeNotWork: t("reasons.timeNotWork"),
    technicalIssue: t("reasons.technicalIssue"),
    avoidBalanceLoss: t("reasons.avoidBalanceLoss"),
    notMotivated: t("reasons.notMotivated"),
    tutorRescheduledUnavail: t("reasons.tutorRescheduledUnavail"),
    tutorAskedCancel: t("reasons.tutorAskedCancel"),
    noLongerLearnTutor: t("reasons.noLongerLearnTutor"),
    other: t("reasons.other"),
  };
  return labels[reasonKey] ?? reasonKey;
}

/** Reschedule request reasons (Dashboard.bookingRequests.reschedule). */
export function getTutorRescheduleReasonLabel(
  t: (key: string) => string,
  reasonKey: string,
): string {
  const labels: Record<string, string> = {
    scheduleConflict: t("reasons.scheduleConflict"),
    personalEmergency: t("reasons.personalEmergency"),
    studentUnavailable: t("reasons.studentUnavailable"),
    other: t("reasons.other"),
  };
  return labels[reasonKey] ?? reasonKey;
}
