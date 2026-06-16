"use client";

import {
  TUTOR_SETUP_CHECKLIST_ACTION_HREFS,
  TUTOR_SETUP_CHECKLIST_GUIDE_HREF,
  TUTOR_SETUP_CHECKLIST_ITEM_IDS,
  ROUTES,
  buildUtilitiesChannelAppTipLinks,
  type TutorSetupChecklistItemId,
} from "@mezon-tutors/shared";
import {
  AppWindow,
  Bot,
  Check,
  ChevronDown,
  ExternalLink,
  ListChecks,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Checkbox } from "@/components/ui";
import { useTutorSetupChecklist } from "@/hooks/useTutorSetupChecklist";
import { cn } from "@/lib/utils";
import { usePublicAppSettings } from "@/services";

const ITEM_ICON_MAP: Record<
  TutorSetupChecklistItemId,
  React.ComponentType<{ className?: string }>
> = {
  createMezonClan: Users,
  setupMezonClan: Bot,
  channelApps: AppWindow,
};

const CHECKLIST_TO_ONBOARDING_STEP: Record<
  TutorSetupChecklistItemId,
  { section: string; step: string }
> = {
  createMezonClan: { section: "roleGuide", step: "createClan" },
  setupMezonClan: { section: "roleGuide", step: "inviteBot" },
  channelApps: { section: "utilities", step: "channelApps" },
};

export function TutorSetupChecklistWidget() {
  const t = useTranslations("Dashboard.tutorSetupChecklist");
  const [open, setOpen] = useState(false);
  const { data: publicSettings } = usePublicAppSettings();
  const {
    completionByItem,
    completedCount,
    totalCount,
    isVisible,
    isLoading,
    toggleManualItem,
    isItemAutoCompleted,
    isItemManual,
  } = useTutorSetupChecklist(true);

  const mezonLinks = publicSettings?.mezonLinks ?? null;
  const channelAppLinks = buildUtilitiesChannelAppTipLinks(mezonLinks);
  const botInviteLink = mezonLinks?.botInviteLink?.trim() || null;

  const remainingCount = totalCount - completedCount;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, open]);

  const getActionHref = (itemId: TutorSetupChecklistItemId) => {
    if (itemId === "setupMezonClan" && botInviteLink) {
      return botInviteLink;
    }
    return TUTOR_SETUP_CHECKLIST_ACTION_HREFS[itemId];
  };

  const getActionLabel = (itemId: TutorSetupChecklistItemId) => {
    if (itemId === "setupMezonClan" && botInviteLink) {
      return t("actions.inviteBot");
    }
    return t("actions.openMezon");
  };

  const getGuideHref = (itemId: TutorSetupChecklistItemId) => {
    const mapping = CHECKLIST_TO_ONBOARDING_STEP[itemId];
    return `${ROUTES.SUPPORT.ONBOARDING}?section=${mapping.section}&step=${mapping.step}`;
  };

  if (isLoading || !isVisible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[70] flex justify-end p-4 md:p-6">
      <div className="pointer-events-auto flex w-full max-w-[400px] flex-col items-end gap-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={t("widget.open")}
          className={cn(
            "group relative flex cursor-pointer items-center gap-2.5 overflow-hidden rounded-full border border-white/20 bg-[linear-gradient(110deg,#7c3aed_0%,#a855f7_45%,#ec4899_100%)] px-4 py-3 text-left text-white shadow-[0_12px_40px_-8px_rgba(124,58,237,0.65)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_16px_48px_-8px_rgba(124,58,237,0.75)] active:scale-[0.98] sm:px-5 sm:py-3.5",
            open && "ring-2 ring-violet-300 ring-offset-2",
          )}
        >
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.22),transparent_55%)]" />
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-1 rounded-full bg-violet-400/35 blur-md animate-pulse"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-violet-300/50 animate-ping [animation-duration:2.4s]"
          />

          <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            <Sparkles className="size-5" />
            <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-extrabold text-amber-950 shadow-md ring-2 ring-white">
              {remainingCount}
            </span>
          </span>

          <span className="relative min-w-0 pr-1">
            <span className="block text-sm font-extrabold leading-tight sm:text-[15px]">
              {t("widget.triggerTitle")}
            </span>
            <span className="mt-0.5 block text-[11px] font-semibold text-white/85 sm:text-xs">
              {t("widget.triggerSubtitle", { remaining: remainingCount })}
            </span>
          </span>

          <ChevronDown
            className={cn(
              "relative size-4 shrink-0 text-white/90 transition-transform duration-300",
              open && "rotate-180",
            )}
          />
        </button>

        {open ? (
          <>
            <button
              type="button"
              aria-label={t("widget.close")}
              className="fixed inset-0 z-[-1] cursor-pointer bg-slate-900/25 backdrop-blur-[2px] animate-in fade-in duration-200 md:bg-slate-900/10"
              onClick={close}
            />

            <section
              className="relative w-full overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-2xl shadow-violet-500/25 animate-in slide-in-from-top-4 fade-in zoom-in-95 duration-300"
              aria-label={t("title")}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(110deg,#7c3aed,#ec4899)]" />

              <div className="border-b border-violet-100 bg-[linear-gradient(180deg,#faf5ff_0%,#ffffff_100%)] px-4 py-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-lg shadow-violet-400/40">
                    <ListChecks className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-base font-extrabold text-slate-900">{t("title")}</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">{t("subtitle")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-700"
                    aria-label={t("widget.close")}
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600">
                    <span>{t("progress")}</span>
                    <span>
                      {t("progressCount", { completed: completedCount, total: totalCount })}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-violet-100">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(110deg,#7c3aed,#ec4899)] transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <ul className="max-h-[min(52vh,420px)] space-y-2 overflow-y-auto p-3">
                {TUTOR_SETUP_CHECKLIST_ITEM_IDS.map((itemId) => {
                  const Icon = ITEM_ICON_MAP[itemId];
                  const isComplete = completionByItem[itemId];
                  const isAutoCompleted = isItemAutoCompleted(itemId);
                  const canToggle = isItemManual(itemId) && !isAutoCompleted;

                  return (
                    <li
                      key={itemId}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 transition-colors",
                        isComplete
                          ? "border-emerald-100 bg-emerald-50/70"
                          : "border-violet-100 bg-violet-50/40",
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        {canToggle ? (
                          <Checkbox
                            checked={isComplete}
                            onCheckedChange={(checked) =>
                              toggleManualItem(itemId, checked === true)
                            }
                            className="mt-0.5 cursor-pointer"
                            aria-label={t(`items.${itemId}.label`)}
                          />
                        ) : (
                          <span
                            className={cn(
                              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                              isComplete
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-input bg-white",
                            )}
                          >
                            {isComplete ? <Check className="size-3" /> : null}
                          </span>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Icon
                              className={cn(
                                "size-3.5 shrink-0",
                                isComplete ? "text-emerald-600" : "text-violet-500",
                              )}
                            />
                            <p
                              className={cn(
                                "text-sm font-semibold leading-5",
                                isComplete ? "text-emerald-900" : "text-slate-900",
                              )}
                            >
                              {t(`items.${itemId}.label`)}
                            </p>
                          </div>
                          <p className="mt-0.5 text-xs leading-5 text-slate-500">
                            {t(`items.${itemId}.description`)}
                          </p>
                          {isAutoCompleted ? (
                            <p className="mt-1 text-[11px] font-medium text-emerald-700">
                              {t("autoVerified")}
                            </p>
                          ) : null}

                          {!isComplete ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2.5">
                              {itemId !== "channelApps" ? (
                                <a
                                  href={getActionHref(itemId)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900"
                                >
                                  {getActionLabel(itemId)}
                                  <ExternalLink className="size-3" />
                                </a>
                              ) : null}
                              <Link
                                href={getGuideHref(itemId)}
                                className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-violet-700"
                                onClick={close}
                              >
                                {t("actions.guide")}
                              </Link>
                            </div>
                          ) : null}

                          {!isComplete && itemId === "channelApps" ? (
                            <ul className="mt-2 space-y-1">
                              {(
                                [
                                  ["homeLink", channelAppLinks.homeLink],
                                  ["walletLink", channelAppLinks.walletLink],
                                  ["myLessonsLink", channelAppLinks.myLessonsLink],
                                  ["myScheduleLink", channelAppLinks.myScheduleLink],
                                ] as const
                              )
                                .filter(([, href]) => Boolean(href))
                                .map(([linkKey, href]) => (
                                  <li key={linkKey}>
                                    <a
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-violet-600 hover:text-violet-800"
                                    >
                                      {t(`channelApps.${linkKey}`)}
                                      <ExternalLink className="size-2.5" />
                                    </a>
                                  </li>
                                ))}
                            </ul>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
