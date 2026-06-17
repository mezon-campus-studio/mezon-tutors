export interface GroupPricingInput {
  baseMonthlyPrice: number;
  memberCount: number;
  groupDiscountRate: number;
  platformFeeRate: number;
}

export interface GroupPricingResult {
  grossAmount: number;
  platformFee: number;
  tutorAmount: number;
  memberCount: number;
  groupDiscountRate: number;
  isGroupBooking: boolean;
  baseMonthlyPrice: number;
}

export function calculateGroupSubscriptionPrice(input: GroupPricingInput): GroupPricingResult {
  const {
    baseMonthlyPrice,
    memberCount,
    groupDiscountRate,
    platformFeeRate,
  } = input;

  const isGroupBooking = memberCount >= 2;

  // Formula: gross_amount = baseMonthlyPrice * memberCount * groupDiscountRate
  const grossAmount = Math.round(
    isGroupBooking
      ? baseMonthlyPrice * memberCount * groupDiscountRate
      : baseMonthlyPrice
  );

  const platformFee = Math.round(grossAmount * platformFeeRate);

  return {
    grossAmount,
    platformFee,
    tutorAmount: grossAmount - platformFee,
    memberCount: isGroupBooking ? memberCount : 1,
    groupDiscountRate: isGroupBooking ? groupDiscountRate : 1,
    isGroupBooking,
    baseMonthlyPrice,
  };
}
