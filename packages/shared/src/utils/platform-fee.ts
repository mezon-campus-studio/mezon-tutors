export function calculatePlatformFeeAmounts(
  grossAmount: bigint,
  platformFeePercentage: number,
): { platformFee: bigint; tutorAmount: bigint } {
  const platformFeeBps = BigInt(Math.round(platformFeePercentage * 10_000));
  const platformFee = (grossAmount * platformFeeBps) / 10_000n;
  return {
    platformFee,
    tutorAmount: grossAmount - platformFee,
  };
}
