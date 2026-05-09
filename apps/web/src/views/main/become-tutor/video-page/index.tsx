'use client';

import { useState, useRef } from 'react';
import { useAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { Button, Input, Card, CardContent, Badge } from '@/components/ui';
import { CheckCircle, XCircle, Check, X, Video, AlertCircle } from 'lucide-react';
import {
  tutorProfileVideoAtom,
  markStepCompletedAtom,
  tutorProfileLastSavedAtAtom,
} from '@/store';
import { formatLastSavedTime, BECOME_TUTOR_STEPS, calculateStepProgress, parseYouTubeId, parseVimeoId } from '@mezon-tutors/shared';

const CURRENT_STEP = BECOME_TUTOR_STEPS.VIDEO;
const PROGRESS_PERCENT = calculateStepProgress(CURRENT_STEP);

type VideoFormValues = {
  videoLink: string;
};

export default function VideoPage() {
  const t = useTranslations('TutorProfile.Video');
  const router = useRouter();
  const [videoState, setVideoState] = useAtom(tutorProfileVideoAtom);
  const [, markStepCompleted] = useAtom(markStepCompletedAtom);
  const { videoLink, videoId } = videoState;
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);
  const videoInputSectionRef = useRef<HTMLDivElement | null>(null);
  const [lastSavedAt, setLastSavedAt] = useAtom(tutorProfileLastSavedAtAtom);

  const form = useForm<VideoFormValues>({
    defaultValues: {
      videoLink: videoLink ?? '',
    },
    mode: 'onChange',
  });

  const { control, handleSubmit } = form;

  const draftSavedLabel =
    lastSavedAt && formatLastSavedTime(lastSavedAt)
      ? t('draftSaved', { time: formatLastSavedTime(lastSavedAt) })
      : '';

  const bestPractices = t.raw('bestPractices') as string[];
  const avoidItems = t.raw('avoidItems') as string[];

  const handleAddLink = async (values: VideoFormValues) => {
    setDurationError(null);
    setVideoDuration(null);

    const trimmed = (values.videoLink ?? '').trim();
    if (!trimmed) {
      setDurationError(t('errors.emptyLink'));
      return;
    }

    let nextId: { type: 'youtube' | 'vimeo'; id: string } | null = null;

    const ytId = parseYouTubeId(trimmed);
    if (ytId) {
      nextId = { type: 'youtube', id: ytId };
    } else {
      const vimeoId = parseVimeoId(trimmed);
      if (vimeoId) {
        nextId = { type: 'vimeo', id: vimeoId };
      }
    }

    if (!nextId) {
      setDurationError(t('errors.invalidLink'));
      setVideoState((prev) => ({ ...prev, videoLink: trimmed, videoId: null }));
      return;
    }

    try {
      const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = (await res.json()) as { duration?: number };
        const durationSeconds = typeof data.duration === 'number' ? data.duration : null;

        if (durationSeconds !== null) {
          setVideoDuration(durationSeconds);
          if (durationSeconds > 120) {
            setDurationError(t('errors.tooLong'));
            setVideoState((prev) => ({ ...prev, videoLink: trimmed, videoId: null }));
            return;
          }
        }
      }
    } catch {}

    setVideoState((prev) => ({ ...prev, videoLink: trimmed, videoId: nextId }));
    setLastSavedAt(new Date().toISOString());
  };

  const handleContinue = (values: VideoFormValues) => {
    if (!videoId) {
      setDurationError(t('errors.missingBeforeContinue'));
      const section = videoInputSectionRef.current;
      section?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (videoDuration !== null && videoDuration > 120) {
      setDurationError(t('errors.tooLong'));
      return;
    }
    markStepCompleted(CURRENT_STEP);
    router.push('/become-tutor/availability');
  };

  return (
    <div className="min-h-screen become-tutor-shell pb-20 md:pb-24">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 gap-2 flex-wrap">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{t('title')}</h1>
              <p className="text-gray-600 mt-0.5 sm:mt-1 text-xs sm:text-sm md:text-base">{t('subtitle')}</p>
            </div>
            {draftSavedLabel && (
              <Badge variant="secondary" className="text-xs sm:text-sm">
                {draftSavedLabel}
              </Badge>
            )}
          </div>

          <div className="mb-4 sm:mb-5 md:mb-6">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-xs sm:text-sm font-medium text-gray-700">{t('stepLabel')}</span>
              <span className="text-xs sm:text-sm text-gray-500">
                {t('progressPercentLabel', { percent: PROGRESS_PERCENT })}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
              <div
                className="bg-[#6c5ce7] h-1.5 sm:h-2 rounded-full transition-all duration-300"
                style={{ width: `${PROGRESS_PERCENT}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          <div className="lg:col-span-2 space-y-3 sm:space-y-4 md:space-y-6" ref={videoInputSectionRef}>
            <Card 
              className="overflow-hidden become-tutor-card rounded-lg md:rounded-xl shadow-sm border border-2"
              style={{ 
                borderColor: 'rgb(125, 211, 252)'
              }}
            >
              <CardContent className="p-0">
                <div 
                  className="relative bg-muted/80"
                  style={{ aspectRatio: '16/9', minHeight: '180px' }}
                >
                  {videoId ? (
                    <iframe
                      src={
                        videoId.type === 'youtube'
                          ? `https://www.youtube.com/embed/${videoId.id}?rel=0`
                          : `https://player.vimeo.com/video/${videoId.id}?autoplay=0`
                      }
                      title="Profile video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full border-0"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4 bg-muted/80">
                      <Video size={36} className="sm:w-10 sm:h-10 md:w-11 md:h-11 text-gray-400" />
                      <p className="text-gray-500 text-xs sm:text-sm text-center max-w-xs px-2">
                        {t('previewPlaceholder')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="become-tutor-card rounded-lg md:rounded-xl shadow-sm border">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="space-y-2.5 sm:space-y-3 md:space-y-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wide">
                      {t('link.label')}
                    </label>
                  </div>
                  <div className="flex gap-2 sm:gap-2.5 md:gap-3 flex-col sm:flex-row">
                    <Controller
                      control={control}
                      name="videoLink"
                      render={({ field: { value, onChange } }) => (
                        <Input
                          className="flex-1 become-tutor-field h-9 sm:h-10 md:h-11 text-sm"
                          placeholder={t('link.placeholder')}
                          value={value}
                          onChange={(e) => onChange(e.target.value)}
                        />
                      )}
                    />
                    <Button
                      onClick={handleSubmit(handleAddLink)}
                      className="bg-[#6c5ce7] hover:bg-[#5a4fcf] h-9 sm:h-10 md:h-11 text-xs sm:text-sm px-3 sm:px-4"
                    >
                      {t('link.addButton')}
                    </Button>
                  </div>
                  {durationError && (
                    <div className="flex items-center gap-1.5 sm:gap-2 text-red-600 text-xs sm:text-sm">
                      <AlertCircle size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                      {durationError}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            <Card className="border-green-200 bg-green-50 become-tutor-card rounded-lg md:rounded-xl shadow-sm border">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 mb-2.5 sm:mb-3 md:mb-4">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={20} className="sm:w-5 sm:h-5 md:w-6 md:h-6 text-success" />
                  </div>
                  <h3 className="font-bold text-sm sm:text-base md:text-lg text-success">
                    {t('bestPracticesTitle')}
                  </h3>
                </div>
                <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
                  {bestPractices.map((item, index) => (
                    <div key={index} className="flex items-start gap-1.5 sm:gap-2">
                      <Check size={14} className="sm:w-4 sm:h-4 mt-0.5 text-success" />
                      <span className="text-xs sm:text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50 become-tutor-card rounded-lg md:rounded-xl shadow-sm border">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 mb-2.5 sm:mb-3 md:mb-4">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <XCircle size={18} className="sm:w-5 sm:h-5 md:w-[22px] md:h-[22px] text-danger" />
                  </div>
                  <h3 className="font-bold text-sm sm:text-base md:text-lg text-danger">
                    {t('avoidTitle')}
                  </h3>
                </div>
                <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
                  {avoidItems.map((item, index) => (
                    <div key={index} className="flex items-start gap-1.5 sm:gap-2">
                      <X size={12} className="sm:w-3.5 sm:h-3.5 mt-0.5 text-danger" />
                      <span className="text-xs sm:text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200 p-2.5 sm:p-3 md:p-4 shadow-sm">
          <div className="max-w-4xl mx-auto flex justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/become-tutor/certification')}
              className="h-9 sm:h-10 md:h-11 text-xs sm:text-sm px-3 sm:px-4"
            >
              {t('back')}
            </Button>
            <Button
              onClick={handleSubmit(handleContinue)}
              className="bg-[#6c5ce7] hover:bg-[#5a4fcf] h-9 sm:h-10 md:h-11 text-xs sm:text-sm px-3 sm:px-4"
            >
              {t('continue')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

