export const MEZON_SEND_MESSAGE_ERROR_CODES = {
  RESTORE_SESSION_FAILED: "RESTORE_SESSION_FAILED",
  REFRESH_SESSION_FAILED: "REFRESH_SESSION_FAILED",
  MISSING_USER_INFO: "MISSING_USER_INFO",
  CREATE_DM_CHANNEL_FAILED: "CREATE_DM_CHANNEL_FAILED",
  SAVE_DM_CHANNEL_FAILED: "SAVE_DM_CHANNEL_FAILED",
  SEND_MESSAGE_FAILED: "SEND_MESSAGE_FAILED",
} as const;

export type MezonSendMessageErrorCode =
  (typeof MEZON_SEND_MESSAGE_ERROR_CODES)[keyof typeof MEZON_SEND_MESSAGE_ERROR_CODES];

export type MezonSendMessageErrorI18nKey =
  | "restoreSessionFailed"
  | "refreshSessionFailed"
  | "missingUserInfo"
  | "createDmChannelFailed"
  | "saveDmChannelFailed"
  | "sendMessageFailed"
  | "sendFailed";

const CODE_TO_I18N_KEY: Record<MezonSendMessageErrorCode, MezonSendMessageErrorI18nKey> = {
  RESTORE_SESSION_FAILED: "restoreSessionFailed",
  REFRESH_SESSION_FAILED: "refreshSessionFailed",
  MISSING_USER_INFO: "missingUserInfo",
  CREATE_DM_CHANNEL_FAILED: "createDmChannelFailed",
  SAVE_DM_CHANNEL_FAILED: "saveDmChannelFailed",
  SEND_MESSAGE_FAILED: "sendMessageFailed",
};

export class MezonSendMessageError extends Error {
  readonly code: MezonSendMessageErrorCode;

  constructor(code: MezonSendMessageErrorCode) {
    super(code);
    this.name = "MezonSendMessageError";
    this.code = code;
  }
}

export function isMezonSendMessageError(error: unknown): error is MezonSendMessageError {
  return error instanceof MezonSendMessageError;
}

export function resolveMezonSendMessageError(
  error: unknown,
  t: (key: MezonSendMessageErrorI18nKey) => string,
): string {
  if (isMezonSendMessageError(error)) {
    return t(CODE_TO_I18N_KEY[error.code]);
  }

  return t("sendFailed");
}
