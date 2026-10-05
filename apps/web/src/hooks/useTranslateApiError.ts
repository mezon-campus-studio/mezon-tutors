import { useTranslations } from "next-intl";
import { ERROR_TUTOR_HIDDEN, ERROR_TUTOR_BUSY } from "@mezon-tutors/shared";

export function useTranslateApiError() {
  const t = useTranslations("Common.Errors");

  return (error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    
    if (message === ERROR_TUTOR_HIDDEN) {
      return t("tutorHidden");
    }
    if (message === ERROR_TUTOR_BUSY) {
      return t("tutorBusy");
    }
    
    return message;
  };
}
