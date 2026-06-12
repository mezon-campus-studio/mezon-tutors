import { MEZON_URL, MEZON_CHAT_URL } from './mezon';
import { ROUTES } from './routes';

export const TUTOR_SETUP_CHECKLIST_ITEM_IDS = [
  'createMezonClan',
  'setupMezonClan',
  'channelApps',
] as const;

export const TUTOR_SETUP_CHECKLIST_AUTO_ITEM_IDS = [
  'setupMezonClan',
] as const satisfies readonly TutorSetupChecklistItemId[];

export type TutorSetupChecklistItemId = (typeof TUTOR_SETUP_CHECKLIST_ITEM_IDS)[number];

export const TUTOR_SETUP_CHECKLIST_MANUAL_ITEM_IDS = [
  'createMezonClan',
  'channelApps',
] as const satisfies readonly TutorSetupChecklistItemId[];

export type TutorSetupChecklistManualItemId =
  (typeof TUTOR_SETUP_CHECKLIST_MANUAL_ITEM_IDS)[number];

export const TUTOR_SETUP_CHECKLIST_GUIDE_HREF = ROUTES.SUPPORT.ONBOARDING;

export const TUTOR_SETUP_CHECKLIST_ACTION_HREFS: Record<
  TutorSetupChecklistItemId,
  string
> = {
  createMezonClan: MEZON_URL,
  setupMezonClan: MEZON_CHAT_URL,
  channelApps: MEZON_CHAT_URL,
};
