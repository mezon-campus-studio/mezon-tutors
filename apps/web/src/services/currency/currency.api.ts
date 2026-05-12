import { ECurrency, fetchCurrencyRates } from '@mezon-tutors/shared';
import { useQuery } from '@tanstack/react-query';
import { currencyQueryKey } from './currency.qkey';

export const currencyApi = {
  getRates(baseCurrency: ECurrency): Promise<Record<string, number>> {
    return fetchCurrencyRates(baseCurrency);
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