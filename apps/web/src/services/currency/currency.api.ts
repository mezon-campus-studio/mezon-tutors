import { ECurrency, CURRENCY_RATE_API_URLS } from "@mezon-tutors/shared";
import { useQuery } from "@tanstack/react-query";
import { currencyQueryKey } from "./currency.qkey";

type CurrencyAPIResponse = Record<string, Record<string, number>>;

export const currencyApi = {
  async getRates(baseCurrency: ECurrency): Promise<Record<string, number>> {
    const base = baseCurrency.toLowerCase();
    const urls = CURRENCY_RATE_API_URLS.map((url) => `${url}/${base}.json`);

    let lastError: unknown;
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as CurrencyAPIResponse;
        const rates = data[base] as Record<string, number> | undefined;
        if (!rates || typeof rates !== "object") {
          throw new Error(`Invalid response format for ${baseCurrency}`);
        }
        return rates;
      } catch (error) {
        lastError = error;
      }
    }

    console.error("All currency API endpoints failed:", lastError);
    throw new Error(`Failed to fetch exchange rates for ${baseCurrency}`);
  },
};

export function useGetCurrencyRates(baseCurrency: ECurrency, enabled = true) {
  return useQuery({
    queryKey: currencyQueryKey.rates(baseCurrency),
    queryFn: () => currencyApi.getRates(baseCurrency),
    enabled,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}