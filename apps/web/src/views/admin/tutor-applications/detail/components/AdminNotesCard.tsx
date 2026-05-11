"use client";

import type { TutorAdminNote } from "@mezon-tutors/shared";
import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button, Card, CardContent, Textarea } from "@/components/ui";
import { useCreateAdminNote } from "@/services";
import { userAtom } from "@/store";

type AdminNotesCardProps = {
  tutorId: string;
  notes: TutorAdminNote[];
};

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "—";
  const d = dayjs(date);
  return d.isValid() ? d.format("MMM DD, YYYY HH:mm") : "—";
};

export default function AdminNotesCard({
  tutorId,
  notes,
}: AdminNotesCardProps) {
  const t = useTranslations("AdminTutorApplicationDetail.sidebar.adminNotes");
  const user = useAtomValue(userAtom);
  const [content, setContent] = useState("");
  const createNote = useCreateAdminNote();

  const handleSave = () => {
    const trimmed = content.trim();
    if (!trimmed || !user) return;
    createNote.mutate(
      {
        tutorId,
        reviewerId: user.id,
        reviewerName: user.username ?? "Admin",
        content: trimmed,
      },
      {
        onSuccess: () => setContent(""),
      },
    );
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <h3 className="mb-3 text-base font-semibold text-slate-900">
          {t("title")}
        </h3>
        <Textarea
          rows={4}
          placeholder={t("placeholder")}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Button
          className="mt-3 w-full"
          onClick={handleSave}
          disabled={!content.trim() || createNote.isPending}
        >
          {t("save")}
        </Button>

        {notes.length > 0 ? (
          <div className="mt-5 border-t border-slate-200 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("previousNotes")}
            </p>
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                      {note.reviewerName}
                    </span>
                    <span>{formatDate(note.createdAt)}</span>
                  </div>
                  <p className="text-slate-700">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
