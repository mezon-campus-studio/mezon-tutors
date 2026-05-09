import { atomWithStorage } from "jotai/utils";

export const accessTokenAtom = atomWithStorage<string | null>(
  "accessToken",
  null,
  undefined,
  { getOnInit: true },
);
