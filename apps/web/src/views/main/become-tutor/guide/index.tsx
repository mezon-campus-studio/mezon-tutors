'use client';

import { ArrowRight, Wallet, Clock, TrendingUp } from 'lucide-react';
import { GUIDE_HIGHLIGHTS, GUIDE_STEPS, type GuideStep, type GuideHighlight, type GuideHighlightIconKey } from '@mezon-tutors/shared';
import { useTranslations } from 'next-intl';
import { LoginButton } from '@/components/auth/LoginButton';

const HIGHLIGHT_ICON_BY_KEY: Record<GuideHighlightIconKey, typeof Wallet> = {
  setOwnRate: Wallet,
  teachAnytime: Clock,
  growProfessionally: TrendingUp,
};

function GuideStepCard({ step }: { step: GuideStep }) {
  const t = useTranslations('BecomeTutorGuide');

  return (
    <div className="flex-1 flex flex-col items-center gap-2 px-3 py-2">
      <div className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center bg-primary/10 border border-primary/20">
        <span className="text-primary text-[27px] font-extrabold leading-[27px]">
          {step.number}
        </span>
      </div>
      <h2 className="text-foreground font-bold text-2xl leading-[30px]">
        {t(step.titleKey)}
      </h2>
      <p className="text-muted-foreground max-w-[250px] text-[11px] leading-4 text-center">
        {t(step.descriptionKey)}
      </p>
    </div>
  );
}

function GuideHighlightCard({ item }: { item: GuideHighlight }) {
  const t = useTranslations('BecomeTutorGuide');
  const Icon = HIGHLIGHT_ICON_BY_KEY[item.iconKey];

  return (
    <div className="flex-1 relative overflow-hidden rounded-[20px] border border-border bg-card shadow-sm transition-all duration-300 cursor-pointer group hover:border-primary hover:bg-primary hover:shadow-xl hover:-translate-y-0.5 min-h-[252px] p-[18px]">
      <div className="absolute -top-[34px] -right-[30px] w-[92px] h-[92px] rounded-full bg-primary/10 group-hover:bg-white/20 transition-colors" />

      <div className="flex flex-col gap-3 relative z-10 h-full">
        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-primary/10 group-hover:bg-white/20 transition-colors">
          <Icon className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
        </div>

        <h2 className="text-foreground font-extrabold text-[38px] leading-[44px] group-hover:text-white transition-colors">
          {t(item.titleKey)}
        </h2>

        <p className="text-muted-foreground text-xs leading-[18px] group-hover:text-white/90 transition-colors">
          {t(item.descriptionKey)}
        </p>

        <div className="flex-1" />

        <div className="flex items-center justify-between">
          <span className="text-primary text-[9px] font-bold uppercase tracking-wider group-hover:text-white transition-colors">
            {t(item.tagKey)}
          </span>
          <ArrowRight className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
        </div>
      </div>
    </div>
  );
}

export function BecomeTutorGuide() {
  const t = useTranslations('BecomeTutorGuide');

  return (
    <div className="min-h-screen bg-muted/50 pt-20 sm:pt-[92px] pb-9 px-3 sm:px-5">
      <div className="max-w-[960px] w-full mx-auto rounded-md overflow-hidden bg-muted/30">
        <div className="h-10 bg-muted/30" />

        <div className="px-4 sm:px-7 pt-[26px] sm:pt-[42px] pb-6 sm:pb-9 bg-card flex flex-col gap-3.5">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-foreground text-[34px] sm:text-[50px] leading-10 sm:leading-[58px] text-center font-extrabold">
              {t('title')}
            </h1>
            <p className="text-muted-foreground text-center max-w-[640px] text-xs sm:text-[13px] leading-[18px] sm:leading-[19px]">
              {t('subtitle')}
            </p>
          </div>

          <div className="relative mt-1 sm:mt-2.5">
            <div className="hidden sm:block absolute top-[34px] left-[52px] right-[52px] h-px bg-border opacity-55" />

            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-2">
              {GUIDE_STEPS.map((step) => (
                <GuideStepCard key={step.id} step={step} />
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 mt-2 sm:mt-3 mb-0.5 sm:mb-1">
            <div className="rounded-full p-0.5 bg-primary shadow-lg shadow-primary/45">
              <LoginButton label={t('loginNow')} />
            </div>
            <p className="text-muted-foreground text-xs sm:text-[13px] text-center">
              {t('ctaNote')}
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-[22px] bg-muted/50 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2.5">
            {GUIDE_HIGHLIGHTS.map((item) => (
              <GuideHighlightCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
