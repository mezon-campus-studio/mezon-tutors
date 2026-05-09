import { useAtom } from "jotai";
import { ECurrency } from "@mezon-tutors/shared";
import { currencyAtom } from "@/store/currency.atom";

export function useCurrency() {
  const [currency, setCurrency] = useAtom(currencyAtom);

  return {
    currency,
    setCurrency,
    currencyOptions: Object.values(ECurrency),
  };
}
