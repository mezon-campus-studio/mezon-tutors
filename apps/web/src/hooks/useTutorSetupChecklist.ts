"use client";

import {
  TUTOR_SETUP_CHECKLIST_ITEM_IDS,
  TUTOR_SETUP_CHECKLIST_MANUAL_ITEM_IDS,
  type TutorSetupChecklistItemId,
  type TutorSetupChecklistManualItemId,
  type UpdateTutorSetupChecklistDto,
} from "@mezon-tutors/shared";
import { useCallback } from "react";
import {
  useGetMySetupChecklist,
  useUpdateMySetupChecklistMutation,
} from "@/services";

const MANUAL_ITEM_API_FIELD: Record<
  TutorSetupChecklistManualItemId,
  keyof UpdateTutorSetupChecklistDto
> = {
  createMezonClan: "createMezonClanComplete",
  channelApps: "channelAppsComplete",
};

export function useTutorSetupChecklist(enabled: boolean) {
  const { data, isLoading, isError } = useGetMySetupChecklist({ enabled });
  const updateMutation = useUpdateMySetupChecklistMutation();

  const completionByItem = data?.items ?? {
    createMezonClan: false,
    setupMezonClan: false,
    channelApps: false,
  };

  const completedCount = data?.completedCount ?? 0;
  const totalCount = data?.totalCount ?? TUTOR_SETUP_CHECKLIST_ITEM_IDS.length;
  const isAllComplete = data?.isAllComplete ?? false;
  const isVisible = enabled && !isLoading && !isError && !isAllComplete;

  const toggleManualItem = useCallback(
    (itemId: TutorSetupChecklistManualItemId, checked: boolean) => {
      updateMutation.mutate({
        [MANUAL_ITEM_API_FIELD[itemId]]: checked,
      });
    },
    [updateMutation],
  );

  const isItemAutoCompleted = useCallback(
    (itemId: TutorSetupChecklistItemId) =>
      itemId === "setupMezonClan" && completionByItem.setupMezonClan,
    [completionByItem.setupMezonClan],
  );

  const isItemManual = (
    itemId: TutorSetupChecklistItemId,
  ): itemId is TutorSetupChecklistManualItemId =>
    TUTOR_SETUP_CHECKLIST_MANUAL_ITEM_IDS.includes(
      itemId as TutorSetupChecklistManualItemId,
    );

  return {
    completionByItem,
    completedCount,
    totalCount,
    isAllComplete,
    isVisible,
    isLoading,
    isUpdating: updateMutation.isPending,
    toggleManualItem,
    isItemAutoCompleted,
    isItemManual,
  };
}
