"use client";

import type { TutorAboutDto, TutorResumeDto } from "@mezon-tutors/shared";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { ResumeEntryList } from "./resume/ResumeEntry";

type TutorAboutDetailModalProps = {
  tutor: TutorAboutDto;
  resume?: TutorResumeDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const tabTriggerClassName = cn(
  "!flex-none cursor-pointer h-auto min-h-8 w-auto shrink-0 rounded-full border-0 bg-transparent px-3 py-1.5",
  "text-xs font-semibold text-slate-600 transition-colors sm:text-sm",
  "hover:text-violet-700 data-active:hover:text-white",
  "data-active:bg-brand-gradient data-active:text-white data-active:shadow-sm data-active:shadow-violet-300/40",
  "after:hidden focus-visible:ring-violet-300/50",
);

function AboutSection({
  title,
  children,
  withBorder = false,
}: {
  title: string;
  children: React.ReactNode;
  withBorder?: boolean;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-2",
        withBorder && "border-t border-gray-100 pt-4",
      )}
    >
      <h4 className="text-sm font-bold text-gray-900">{title}</h4>
      {children}
    </section>
  );
}

export function TutorAboutDetailModal({
  tutor,
  resume,
  open,
  onOpenChange,
}: TutorAboutDetailModalProps) {
  const t = useTranslations("Tutors.Detail");

  const headline = tutor.headline || t("defaultHeadline");
  const intro = tutor.introduce || t("emptySection");
  const education = resume?.education ?? [];
  const certifications = resume?.certifications ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,720px)] w-full flex-col overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-gray-100 px-6 py-4">
          <DialogTitle className="text-lg font-bold text-gray-900">
            {t("aboutDetailTitle")}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="about" className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="border-b border-gray-100 px-6 py-3">
            <TabsList
              variant="line"
              className="inline-flex h-auto w-fit gap-0 overflow-hidden !rounded-full border border-violet-100 bg-white/90 p-0 shadow-sm shadow-violet-100/40"
            >
              <TabsTrigger value="about" className={tabTriggerClassName}>
                {t("tabs.about")}
              </TabsTrigger>
              <TabsTrigger value="education" className={tabTriggerClassName}>
                {t("resumeTabs.education")}
              </TabsTrigger>
              <TabsTrigger value="certifications" className={tabTriggerClassName}>
                {t("resumeTabs.certifications")}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <TabsContent value="about" className="mt-0 flex flex-col gap-4">
              <AboutSection title={t("headlineTitle")}>
                <p className="whitespace-pre-line text-sm leading-7 text-gray-600">
                  {headline}
                </p>
              </AboutSection>

              <AboutSection title={t("aboutTitle")} withBorder>
                <p className="whitespace-pre-line text-sm leading-7 text-gray-600">
                  {intro}
                </p>
              </AboutSection>
            </TabsContent>

            <TabsContent value="education" className="mt-0">
              <ResumeEntryList
                items={education}
                emptyLabel={t("resumeEmptyEducation")}
                verifiedLabel={t("resumeDegreeVerified")}
              />
            </TabsContent>

            <TabsContent value="certifications" className="mt-0">
              <ResumeEntryList
                items={certifications}
                emptyLabel={t("resumeEmptyCertifications")}
                verifiedLabel={t("resumeVerified")}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
