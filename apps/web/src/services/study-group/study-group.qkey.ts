import { useQuery } from "@tanstack/react-query";
import { studyGroupApi } from "./study-group.api";

export const studyGroupQKey = {
  all: ["study-groups"] as const,
  lists: () => [...studyGroupQKey.all, "list"] as const,
  details: () => [...studyGroupQKey.all, "detail"] as const,
  detail: (id: string) => [...studyGroupQKey.details(), id] as const,
  invite: (inviteId: string) => [...studyGroupQKey.all, "invite", inviteId] as const,
};

export function useGetStudyGroups() {
  return useQuery({
    queryKey: studyGroupQKey.lists(),
    queryFn: () => studyGroupApi.list(),
  });
}

export function useGetStudyGroup(id: string, enabled = true) {
  return useQuery({
    queryKey: studyGroupQKey.detail(id),
    queryFn: () => studyGroupApi.getDetail(id),
    enabled: !!id && enabled,
  });
}

export function useGetGroupByInvite(inviteId: string, enabled = true) {
  return useQuery({
    queryKey: studyGroupQKey.invite(inviteId),
    queryFn: () => studyGroupApi.findByInvite(inviteId),
    enabled: !!inviteId && enabled,
  });
}
