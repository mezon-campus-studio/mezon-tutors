import { z } from 'zod';

export type PayoutBankValidationMessages = {
  bankNameRequired: string;
  bankNameMin: string;
  bankNameMax: string;
  accountNumberRequired: string;
  accountNumberDigits: string;
  accountNumberMin: string;
  accountNumberMax: string;
  accountNameRequired: string;
  accountNameMin: string;
  accountNameMax: string;
  accountNameInvalid: string;
};

export function createPayoutBankSchema(messages: PayoutBankValidationMessages) {
  return z.object({
    bankName: z
      .string()
      .trim()
      .min(1, messages.bankNameRequired)
      .min(2, messages.bankNameMin)
      .max(100, messages.bankNameMax),
    bankAccountNumber: z
      .string()
      .trim()
      .min(1, messages.accountNumberRequired)
      .regex(/^\d+$/, messages.accountNumberDigits)
      .min(6, messages.accountNumberMin)
      .max(50, messages.accountNumberMax),
    bankAccountName: z
      .string()
      .trim()
      .min(1, messages.accountNameRequired)
      .min(2, messages.accountNameMin)
      .max(255, messages.accountNameMax)
      .regex(/^[\p{L}\s.'-]+$/u, messages.accountNameInvalid),
  });
}

export type PayoutBankFormValues = z.infer<ReturnType<typeof createPayoutBankSchema>>;

export const WITHDRAW_MIN_AMOUNT = 10_000;

export type WithdrawAmountValidationMessages = {
  amountRequired: string;
  amountDigits: string;
  amountMin: string;
  amountMax: string;
};

export function createWithdrawSchema(
  bankMessages: PayoutBankValidationMessages,
  amountMessages: WithdrawAmountValidationMessages,
  maxAmount: number,
) {
  return createPayoutBankSchema(bankMessages).extend({
    amount: z
      .string()
      .trim()
      .min(1, amountMessages.amountRequired)
      .refine((value) => /^\d+$/.test(value.replace(/\D/g, '')), amountMessages.amountDigits)
      .transform((value) => Number(value.replace(/\D/g, '')))
      .pipe(
        z
          .number()
          .min(WITHDRAW_MIN_AMOUNT, amountMessages.amountMin)
          .max(maxAmount, amountMessages.amountMax),
      ),
  });
}

export type WithdrawFormValues = z.infer<ReturnType<typeof createWithdrawSchema>>;
