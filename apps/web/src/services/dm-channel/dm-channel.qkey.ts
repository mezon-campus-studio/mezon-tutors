export function normalizeDmParticipantPair(a: string, b: string): readonly [string, string] {
  const sorted = [a, b].sort();
  return [sorted[0]!, sorted[1]!] as const;
}

export const dmChannelQueryKey = {
  byParticipantPair: (userA: string, userB: string) => {
    const [x, y] = normalizeDmParticipantPair(userA, userB);
    return ['dm-channel', 'pair', x, y] as const;
  },
} as const;
