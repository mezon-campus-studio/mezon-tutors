import { ECurrency } from "@mezon-tutors/shared";

export const currencyQueryKey = {
  all: ["currency"] as const,
  rates: (baseCurrency: ECurrency) => [...currencyQueryKey.all, "rates", baseCurrency] as const,
} as const;
