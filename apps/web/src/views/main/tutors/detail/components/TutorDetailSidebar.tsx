'use client';

import { Calendar, Users, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { Button } from '@/components/ui';
import { TutorAboutDto, ECurrency, formatToCurrency } from '@mezon-tutors/shared';
import { userAtom } from '@/store/auth.atom';
import { useCurrency } from '@/hooks';
import { TutorMessageModal } from '../../components/TutorMessageModal';
import { TrialBookingSheet } from '../../components/TrialBookingSheet';

type TutorDetailSidebarProps = {
  tutor: TutorAboutDto;
};

export function TutorDetailSidebar({ tutor }: TutorDetailSidebarProps) {
  const t = useTranslations('Tutors.Detail');
  const { currency } = useCurrency();
  const currentUser = useAtomValue(userAtom);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isTrialBookingSheetOpen, setIsTrialBookingSheetOpen] = useState(false);

  const name = `${tutor.firstName} ${tutor.lastName}`.trim();
  const studentId = currentUser?.id;
  const studentMezonUserId = currentUser?.mezonUserId;
  const tutorId = tutor.userId;

  const lessonPrice =
    currency === ECurrency.USD
      ? tutor.prices.usd
      : currency === ECurrency.PHP
        ? tutor.prices.php
        : tutor.prices.vnd;

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-gray-900">
              {formatToCurrency(currency, lessonPrice)}
            </span>
            <span className="text-sm text-gray-500">{t('perLesson')}</span>
          </div>

          <Button
            onClick={() => setIsTrialBookingSheetOpen(true)}
            className="w-full font-semibold py-2.5 px-4 rounded-lg transition-colors"
          >
            {t('bookTrial')}
          </Button>

          <Button
            variant="outline"
            disabled={!studentId}
            onClick={() => setIsMessageModalOpen(true)}
            className="w-full font-semibold py-2.5 px-4 rounded-lg transition-colors"
          >
            {t('sendMessage')}
          </Button>

          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-primary" />
              <span className="text-sm text-gray-600">
                {t('bookedLast48h', { count: tutor.stats.bookedLessonsLast48h })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <span className="text-sm text-gray-600">
                {t('totalStudents', { count: tutor.stats.totalStudents })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={16} className="text-primary" />
              <span className="text-sm text-gray-600">
                {t('totalLessons', { count: tutor.stats.totalLessonsTaught })}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col gap-2.5">
          <h3 className="text-lg font-extrabold text-gray-900">
            {t('promoTitle')}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {t('promoDescription')}
          </p>
          <Button className="font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
            {t('promoAction')}
          </Button>
        </div>
      </div>

      <TutorMessageModal
        open={isMessageModalOpen}
        tutorFirstName={tutor.firstName}
        studentId={studentId ?? ''}
        studentMezonUserId={studentMezonUserId}
        tutorId={tutorId}
        tutorMezonUserId={tutor.mezonUserId}
        onOpenChangeAction={setIsMessageModalOpen}
      />

      <TrialBookingSheet
        open={isTrialBookingSheetOpen}
        onOpenChange={setIsTrialBookingSheetOpen}
        tutor={{
          id: tutor.id,
          name,
          title: tutor.subject,
          prices: tutor.prices,
          avatar: tutor.avatar,
        }}
      />
    </>
  );
}
