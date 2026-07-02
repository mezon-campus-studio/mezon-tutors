"use client";

import type { TutorAboutDto } from "@mezon-tutors/shared";
import { createContext, useContext } from "react";
import { useTutorBookingActions } from "../hooks/useTutorBookingActions";

type TutorBookingContextValue = ReturnType<typeof useTutorBookingActions>;

const TutorBookingContext = createContext<TutorBookingContextValue | null>(null);

export function TutorBookingProvider({
  tutor,
  children,
}: {
  tutor: TutorAboutDto;
  children: React.ReactNode;
}) {
  const booking = useTutorBookingActions(tutor);
  return (
    <TutorBookingContext.Provider value={booking}>
      {children}
    </TutorBookingContext.Provider>
  );
}

export function useTutorBooking() {
  const context = useContext(TutorBookingContext);
  if (!context) {
    throw new Error("useTutorBooking must be used within TutorBookingProvider");
  }
  return context;
}
