import type { TutorSetupChecklistItemId } from '../constants/tutor-setup-checklist';

export type TutorSetupChecklistItemsDto = Record<TutorSetupChecklistItemId, boolean>;

export type TutorSetupChecklistDto = {
  items: TutorSetupChecklistItemsDto;
  completedCount: number;
  totalCount: number;
  isAllComplete: boolean;
};

export type UpdateTutorSetupChecklistDto = {
  createMezonClanComplete?: boolean;
  channelAppsComplete?: boolean;
};
