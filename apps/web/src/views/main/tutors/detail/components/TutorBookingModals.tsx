"use client";

import type { TutorAboutDto } from "@mezon-tutors/shared";
import { SendMessageModal } from "@/components/common/SendMessageModal";
import { TrialBookingSheet } from "../../components/TrialBookingSheet";
import type { useTutorBookingActions } from "../hooks/useTutorBookingActions";

type TutorBookingModalsProps = {
  tutor: TutorAboutDto;
  booking: ReturnType<typeof useTutorBookingActions>;
};

export function TutorBookingModals({ tutor, booking }: TutorBookingModalsProps) {
  return (
    <>
      <SendMessageModal
        open={booking.isMessageModalOpen}
        title={tutor.firstName}
        senderId={booking.senderId ?? ""}
        senderMezonUserId={booking.senderMezonUserId ?? ""}
        recipientId={booking.recipientId}
        recipientMezonUserId={tutor.mezonUserId}
        onOpenChangeAction={booking.setIsMessageModalOpen}
      />

      <TrialBookingSheet
        open={booking.isTrialBookingSheetOpen}
        onOpenChange={booking.setIsTrialBookingSheetOpen}
        tutor={{
          id: tutor.id,
          name: booking.name,
          title: tutor.subject,
          prices: tutor.prices,
          avatar: tutor.avatar,
        }}
      />
    </>
  );
}
