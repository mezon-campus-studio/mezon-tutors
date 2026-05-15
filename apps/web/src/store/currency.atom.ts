import { ECurrency } from "@mezon-tutors/shared";
import { atomWithStorage } from "jotai/utils";

export const currencyAtom = atomWithStorage<ECurrency>(
  "app-currency",
  ECurrency.VND,
  undefined,
  { getOnInit: true },
);
