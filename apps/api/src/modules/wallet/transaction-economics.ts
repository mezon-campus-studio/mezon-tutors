export type TransactionEconomicsFields = {
  grossAmount: bigint;
  platformFee: bigint;
};

export function transactionEconomicsData(fields: TransactionEconomicsFields) {
  return {
    grossAmount: fields.grossAmount,
    platformFee: fields.platformFee,
  };
}

export function transactionEconomicsFromGrossTutorFee(
  grossAmount: bigint,
  _tutorAmount: bigint,
  platformFee: bigint,
): TransactionEconomicsFields {
  return { grossAmount, platformFee };
}

export function transactionEconomicsFromAmount(
  amount: bigint,
  platformFee: bigint = 0n,
): TransactionEconomicsFields {
  return {
    grossAmount: amount + platformFee,
    platformFee,
  };
}
