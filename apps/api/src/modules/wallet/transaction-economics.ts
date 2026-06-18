export type TransactionEconomicsFields = {
  grossAmount: bigint;
  tutorAmount: bigint;
  platformFee: bigint;
};

export function transactionEconomicsData(fields: TransactionEconomicsFields) {
  return {
    grossAmount: fields.grossAmount,
    tutorAmount: fields.tutorAmount,
    platformFee: fields.platformFee,
  };
}

export function transactionEconomicsFromGrossTutorFee(
  grossAmount: bigint,
  tutorAmount: bigint,
  platformFee: bigint,
): TransactionEconomicsFields {
  return { grossAmount, tutorAmount, platformFee };
}

export function transactionEconomicsFromAmount(amount: bigint): TransactionEconomicsFields {
  return {
    grossAmount: amount,
    tutorAmount: amount,
    platformFee: 0n,
  };
}
