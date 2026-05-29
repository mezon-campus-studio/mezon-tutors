"use client";

import {
  APP_SETTINGS_LIMITS,
  type AppSettings,
  type AppSettingsFormValues,
  createAppSettingsFormSchema,
  mapAppSettingsFormErrors,
} from "@mezon-tutors/shared";
import { Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Spinner,
} from "@/components/ui";
import { useAdminAppSettings, useUpdateAdminAppSettings } from "@/services";

const limits = APP_SETTINGS_LIMITS;

function toFormState(settings: AppSettings): AppSettingsFormValues {
  return {
    platformFeePercent: String(Math.round(settings.platformFeePercentage * 10_000) / 100),
    settlementPeriodHours: String(settings.settlementPeriodHours),
    disputePeriodHours: String(settings.disputePeriodHours),
    lessonChangePeriodHours: String(settings.lessonChangePeriodHours),
    minWithdrawalAmountVnd: String(settings.minWithdrawalAmountVnd),
    minWithdrawalAmountUsd: String(settings.minWithdrawalAmountUsd),
    minWithdrawalAmountPhp: String(settings.minWithdrawalAmountPhp),
  };
}

type NumberFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: string;
};

function NumberField({
  id,
  label,
  hint,
  error,
  value,
  onChange,
  min = 0,
  max,
  step = "1",
}: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        className={`h-10 ${error ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

type SettingsSectionProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 mb-4 text-sm text-slate-600">{description}</p>
        {children}
      </CardContent>
    </Card>
  );
}

export default function AdminAppSettingsView() {
  const t = useTranslations("Admin.AppSettings");
  const tValidation = useTranslations("Admin.AppSettings.validation");
  const { data, isLoading, isError } = useAdminAppSettings();
  const updateMutation = useUpdateAdminAppSettings();
  const [form, setForm] = useState<AppSettingsFormValues | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof AppSettingsFormValues, string>>>(
    {},
  );

  const schema = useMemo(
    () =>
      createAppSettingsFormSchema({
        required: tValidation("required"),
        invalidNumber: tValidation("invalidNumber"),
        integerOnly: tValidation("integerOnly"),
        platformFeePercentRange: tValidation("platformFeePercentRange", {
          min: limits.platformFeePercent.min,
          max: limits.platformFeePercent.max,
        }),
        settlementPeriodHoursRange: tValidation("settlementPeriodHoursRange", {
          min: limits.settlementPeriodHours.min,
          max: limits.settlementPeriodHours.max,
        }),
        disputePeriodHoursRange: tValidation("disputePeriodHoursRange", {
          min: limits.disputePeriodHours.min,
          max: limits.disputePeriodHours.max,
        }),
        lessonChangePeriodHoursRange: tValidation("lessonChangePeriodHoursRange", {
          min: limits.lessonChangePeriodHours.min,
          max: limits.lessonChangePeriodHours.max,
        }),
        minWithdrawalAmountVndRange: tValidation("minWithdrawalAmountVndRange", {
          min: limits.minWithdrawalAmountVnd.min,
          max: limits.minWithdrawalAmountVnd.max,
        }),
        minWithdrawalAmountUsdRange: tValidation("minWithdrawalAmountUsdRange", {
          min: limits.minWithdrawalAmountUsd.min,
          max: limits.minWithdrawalAmountUsd.max,
        }),
        minWithdrawalAmountPhpRange: tValidation("minWithdrawalAmountPhpRange", {
          min: limits.minWithdrawalAmountPhp.min,
          max: limits.minWithdrawalAmountPhp.max,
        }),
      }),
    [tValidation],
  );

  useEffect(() => {
    if (data) {
      setForm(toFormState(data));
      setErrors({});
    }
  }, [data]);

  const setField = (key: keyof AppSettingsFormValues, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(mapAppSettingsFormErrors(parsed.error));
      toast.error(tValidation("summary"));
      return;
    }

    setErrors({});

    try {
      await updateMutation.mutateAsync(parsed.data);
      toast.success(t("saveSuccess"));
    } catch {
      toast.error(t("saveFailed"));
    }
  };

  if (isLoading || !form) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-[1280px] p-4 md:p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {t("loadFailed")}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] p-4 md:p-6">
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-slate-900">{t("title")}</h2>
            <p className="text-sm text-slate-600">{t("description")}</p>
            {data?.updatedAt ? (
              <p className="text-xs text-slate-500">
                {data.updatedBy?.username
                  ? t("lastUpdated", {
                      date: new Date(data.updatedAt).toLocaleString(),
                      user: data.updatedBy.username,
                    })
                  : t("lastUpdatedNoUser", {
                      date: new Date(data.updatedAt).toLocaleString(),
                    })}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={updateMutation.isPending} className="shrink-0">
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {t("save")}
          </Button>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">{t("formTitle")}</h3>
        </div>

        <div className="space-y-4">
          <SettingsSection
            title={t("sections.fees.title")}
            description={t("sections.fees.description")}
          >
            <div className="max-w-sm">
              <NumberField
                id="platformFeePercent"
                label={t("fields.platformFeePercentage")}
                hint={t("fields.platformFeePercentageHint")}
                error={errors.platformFeePercent}
                value={form.platformFeePercent}
                onChange={(v) => setField("platformFeePercent", v)}
                min={limits.platformFeePercent.min}
                max={limits.platformFeePercent.max}
                step="0.01"
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title={t("sections.periods.title")}
            description={t("sections.periods.description")}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <NumberField
                id="settlementPeriodHours"
                label={t("fields.settlementPeriodHours")}
                hint={t("fields.settlementPeriodHoursHint")}
                error={errors.settlementPeriodHours}
                value={form.settlementPeriodHours}
                onChange={(v) => setField("settlementPeriodHours", v)}
                min={limits.settlementPeriodHours.min}
                max={limits.settlementPeriodHours.max}
                step="1"
              />
              <NumberField
                id="disputePeriodHours"
                label={t("fields.disputePeriodHours")}
                hint={t("fields.disputePeriodHoursHint")}
                error={errors.disputePeriodHours}
                value={form.disputePeriodHours}
                onChange={(v) => setField("disputePeriodHours", v)}
                min={limits.disputePeriodHours.min}
                max={limits.disputePeriodHours.max}
                step="1"
              />
              <NumberField
                id="lessonChangePeriodHours"
                label={t("fields.lessonChangePeriodHours")}
                hint={t("fields.lessonChangePeriodHoursHint")}
                error={errors.lessonChangePeriodHours}
                value={form.lessonChangePeriodHours}
                onChange={(v) => setField("lessonChangePeriodHours", v)}
                min={limits.lessonChangePeriodHours.min}
                max={limits.lessonChangePeriodHours.max}
                step="1"
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title={t("sections.withdrawal.title")}
            description={t("sections.withdrawal.description")}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <NumberField
                id="minWithdrawalAmountVnd"
                label={t("fields.minWithdrawalAmountVnd")}
                error={errors.minWithdrawalAmountVnd}
                value={form.minWithdrawalAmountVnd}
                onChange={(v) => setField("minWithdrawalAmountVnd", v)}
                min={limits.minWithdrawalAmountVnd.min}
                max={limits.minWithdrawalAmountVnd.max}
                step="1"
              />
              <NumberField
                id="minWithdrawalAmountUsd"
                label={t("fields.minWithdrawalAmountUsd")}
                error={errors.minWithdrawalAmountUsd}
                value={form.minWithdrawalAmountUsd}
                onChange={(v) => setField("minWithdrawalAmountUsd", v)}
                min={limits.minWithdrawalAmountUsd.min}
                max={limits.minWithdrawalAmountUsd.max}
                step="0.01"
              />
              <NumberField
                id="minWithdrawalAmountPhp"
                label={t("fields.minWithdrawalAmountPhp")}
                error={errors.minWithdrawalAmountPhp}
                value={form.minWithdrawalAmountPhp}
                onChange={(v) => setField("minWithdrawalAmountPhp", v)}
                min={limits.minWithdrawalAmountPhp.min}
                max={limits.minWithdrawalAmountPhp.max}
                step="0.01"
              />
            </div>
          </SettingsSection>
        </div>
      </form>
    </div>
  );
}
