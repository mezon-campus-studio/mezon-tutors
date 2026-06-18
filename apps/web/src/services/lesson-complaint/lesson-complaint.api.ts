import type {
  CreateLessonComplaintBody,
  LessonComplaintCreatedResult,
  StudentLessonComplaintItem,
} from "@mezon-tutors/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api-client";

const BASE = "/lesson-complaints";

export const lessonComplaintApi = {
  listMine(): Promise<StudentLessonComplaintItem[]> {
    return apiClient.get<StudentLessonComplaintItem[]>(`${BASE}/my`);
  },

  create(payload: CreateLessonComplaintBody): Promise<LessonComplaintCreatedResult> {
    return apiClient.post<LessonComplaintCreatedResult>(BASE, payload);
  },
};

export const useGetMyLessonComplaints = (enabled = true) => {
  return useQuery({
    queryKey: ["lesson-complaints", "my"],
    queryFn: () => lessonComplaintApi.listMine(),
    enabled,
  });
};

export const useCreateLessonComplaintMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLessonComplaintBody) =>
      lessonComplaintApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-lessons"] });
    },
  });
};
