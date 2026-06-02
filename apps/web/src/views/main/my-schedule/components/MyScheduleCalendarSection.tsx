"use client";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { SendMessageModal } from "@/components/common/SendMessageModal";
import { DashboardScheduleCalendar } from "@/components/schedule";
import { userAtom } from "@/store";
import MyScheduleEventCard from "./MyScheduleEventCard";
import ScheduleEventModal from "./ScheduleEventModal";

export type ScheduleEventItem = {
  id: string;
  tutorId: string;
  studentId: string;
  studentMezonUserId: string | null;
  studentName: string;
  studentAvatarUrl?: string;
  startAt: string;
  durationMinutes: number;
  dayIndex: number;
  startHour: number;
  endHour: number;
  dateLabel: string;
  timeLabel: string;
  isCompleted: boolean;
  lessonKind: "trial" | "subscription";
};

type MyScheduleCalendarSectionProps = {
  weekDays: { shortLabel: string; dateLabel: string }[];
  calendarTitle: string;
  events: ScheduleEventItem[];
  currentDayIndex?: number;
  currentHour?: number;
  isCurrentWeek?: boolean;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onGoToToday?: () => void;
};

dayjs.extend(utc);
dayjs.extend(timezone);

export default function MyScheduleCalendarSection({
  weekDays,
  calendarTitle,
  events,
  currentDayIndex,
  currentHour,
  isCurrentWeek,
  onPrevWeek,
  onNextWeek,
  onGoToToday,
}: MyScheduleCalendarSectionProps) {
  const t = useTranslations("Dashboard.mySchedule");
  const tModal = useTranslations("Dashboard.scheduleEventModal");
  const user = useAtomValue(userAtom);
  const [pickedEvent, setPickedEvent] = useState<ScheduleEventItem | null>(null);
  const [eventAnchorRect, setEventAnchorRect] = useState<DOMRect | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);

  const scheduleEventDetailRows = useMemo(() => {
    if (!pickedEvent) return undefined;
    return [
      {
        label: tModal("detailLessonType"),
        value:
          pickedEvent.lessonKind === "subscription"
            ? t("lessonTypePlan")
            : t("lessonTypeTrial"),
      },
      {
        label: tModal("detailDuration"),
        value: tModal("durationMinutes", {
          minutes: pickedEvent.durationMinutes,
        }),
      },
      {
        label: tModal("detailStatus"),
        value: pickedEvent.isCompleted ? t("completedBadge") : tModal("statusUpcoming"),
      },
    ];
  }, [pickedEvent, t, tModal]);

  const studentPeerFirstName =
    pickedEvent?.studentName.trim().split(/\s+/)[0] ?? "";

  return (
    <>
      <DashboardScheduleCalendar<ScheduleEventItem>
        title={calendarTitle}
        weekDays={weekDays}
        events={events}
        currentDayIndex={currentDayIndex}
        currentHour={currentHour}
        isCurrentWeek={isCurrentWeek}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
        onGoToToday={onGoToToday}
        labels={{
          today: t("calendar.today"),
          weekBadge: t("calendar.week"),
        }}
        renderEvent={(event) => <MyScheduleEventCard event={event} />}
        onEventClick={(ev, rect) => {
          setPickedEvent(ev);
          setEventAnchorRect(rect);
        }}
      />

      <ScheduleEventModal
        open={pickedEvent !== null && !messageOpen}
        anchorRect={eventAnchorRect}
        onOpenChange={(open) => {
          if (!open) {
            setPickedEvent(null);
            setEventAnchorRect(null);
          }
        }}
        variant="tutor"
        peerName={pickedEvent?.studentName ?? ""}
        dateLabel={pickedEvent?.dateLabel ?? ""}
        timeLabel={pickedEvent?.timeLabel ?? ""}
        avatarUrl={pickedEvent?.studentAvatarUrl}
        avatarAlt={pickedEvent?.studentName}
        detailRows={scheduleEventDetailRows}
        onSendMessage={() => setMessageOpen(true)}
      />

      <SendMessageModal
        open={messageOpen && pickedEvent !== null}
        title={studentPeerFirstName}
        senderId={user?.id ?? ""}
        senderMezonUserId={user?.mezonUserId ?? ""}
        recipientId={pickedEvent?.studentId ?? ""}
        recipientMezonUserId={pickedEvent?.studentMezonUserId ?? ""}
        onOpenChangeAction={(open) => {
          setMessageOpen(open);
          if (!open) setPickedEvent(null);
        }}
      />
    </>
  );
}
