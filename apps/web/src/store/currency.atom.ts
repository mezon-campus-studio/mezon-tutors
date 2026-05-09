import { ECurrency } from "@mezon-tutors/shared";
import { atomWithStorage } from "jotai/utils";

function resolveDefaultCurrencyByLocale(): ECurrency {
  if (typeof window === "undefined") {
    return ECurrency.VND;
  }

  const htmlLang = document.documentElement.lang?.toLowerCase();
  const browserLang = window.navigator.language?.toLowerCase();
  const locale = htmlLang || browserLang || "vi";

  if (locale.startsWith("vi")) {
    return ECurrency.VND;
  }

  return ECurrency.USD;
}

export const currencyAtom = atomWithStorage<ECurrency>(
  "app-currency",
  resolveDefaultCurrencyByLocale(),
  undefined,
  { getOnInit: true },
);
